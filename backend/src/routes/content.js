import { Router } from "express";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Award from "../models/Award.js";
import AwardVote from "../models/AwardVote.js";
import AppreciationNote from "../models/AppreciationNote.js";
import Memory from "../models/Memory.js";
import Member from "../models/Member.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
const memoryFields = [
  "title",
  "description",
  "date",
  "imageUrl",
  "location",
  "album",
  "tags",
  "featured",
  "published",
];
const memberFields = [
  "name",
  "role",
  "city",
  "bio",
  "imageUrl",
  "joinedAt",
  "email",
  "instagram",
  "website",
  "isActive",
];
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function getImageBucket() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB is not connected.");
  return new GridFSBucket(database, { bucketName: "images" });
}

function recordInput(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object.");
    error.status = 400;
    throw error;
  }
  return Object.fromEntries(
    fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]])
  );
}

function awardInput(body) {
  const input = recordInput(body, ["title", "description", "closesAt", "nominees"]);
  if (typeof input.title !== "string" || !input.title.trim()) {
    const error = new Error("Award title is required.");
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(input.nominees) || input.nominees.length < 2) {
    const error = new Error("Choose at least two nominees.");
    error.status = 400;
    throw error;
  }
  if (input.nominees.some((id) => !mongoose.isValidObjectId(id))) {
    const error = new Error("One or more nominees are invalid.");
    error.status = 400;
    throw error;
  }
  input.nominees = [...new Set(input.nominees.map(String))];
  if (input.nominees.length < 2) {
    const error = new Error("Choose at least two different nominees.");
    error.status = 400;
    throw error;
  }
  const closesAt = new Date(input.closesAt);
  if (!input.closesAt || Number.isNaN(closesAt.getTime())) {
    const error = new Error("Choose a valid closing date and time.");
    error.status = 400;
    throw error;
  }
  input.closesAt = closesAt;
  return input;
}

function ballotNomineeIds(ballot) {
  const nomineeIds = Array.isArray(ballot.nominee) ? ballot.nominee : [ballot.nominee];
  return nomineeIds.filter(Boolean).map(String);
}

async function uploadImageBuffer(buffer) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const error = new Error("Image uploads are not configured on the backend.");
    error.status = 503;
    throw error;
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const imageStream = cloudinary.uploader.upload_stream(
        {
          folder: "friendszone",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        },
        (uploadError, uploadedImage) => {
          if (uploadError) return reject(uploadError);
          return resolve(uploadedImage);
        }
      );
      imageStream.end(buffer);
    });
    if (!result?.secure_url) throw new Error("Cloudinary did not return a secure image URL.");
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary image upload failed:", error);
    const uploadError = new Error("Cloudinary could not save this image. Check the backend image configuration.");
    uploadError.status = 502;
    throw uploadError;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, WebP, or GIF image.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.get("/memories", async (req, res, next) => {
  try {
    let memberId;
    if (req.query.memberId) {
      if (!mongoose.isValidObjectId(req.query.memberId)) {
        return res.status(400).json({ error: "Member selection is invalid." });
      }
      const member = await Member.exists({ _id: req.query.memberId, isActive: true });
      if (!member) return res.status(404).json({ error: "Member not found." });
      memberId = String(req.query.memberId);
    }
    const memories = await Memory.find({ published: true })
      .populate({ path: "submittedBy", select: "name" })
      .populate({ path: "comments.author", select: "name" })
      .slice("comments", -100)
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json(memories.map((memory) => ({
      ...memory,
      likeCount: (memory.likes || []).length,
      likedByMember: memberId
        ? (memory.likes || []).some((id) => String(id) === memberId)
        : false,
      likes: undefined,
    })));
  } catch (error) {
    return next(error);
  }
});

router.post("/memory-lane", (req, res, next) => {
  upload.single("image")(req, res, async (uploadError) => {
    if (uploadError) return next(uploadError);
    try {
      const { title, description, date, tags, memberId } = req.body || {};
      if (!req.file) return res.status(400).json({ error: "Choose a photo for your memory." });
      if (!mongoose.isValidObjectId(memberId)) {
        return res.status(400).json({ error: "Choose your member profile before sharing." });
      }
      const author = await Member.findOne({ _id: memberId, isActive: true }).select("_id");
      if (!author) return res.status(404).json({ error: "Member not found." });
      if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
        return res.status(400).json({ error: "Add a caption between 1 and 120 characters." });
      }
      if (typeof description !== "string" || !description.trim() || description.trim().length > 2000) {
        return res.status(400).json({ error: "Add a story between 1 and 2,000 characters." });
      }
      const memoryDate = new Date(date);
      if (!date || Number.isNaN(memoryDate.getTime())) {
        return res.status(400).json({ error: "Choose a valid memory date." });
      }
      const memoryTags = typeof tags === "string"
        ? [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))]
        : [];
      if (memoryTags.length > 10 || memoryTags.some((tag) => tag.length > 30)) {
        return res.status(400).json({ error: "Add up to 10 tags, each 30 characters or fewer." });
      }

      const imageUrl = await uploadImageBuffer(req.file.buffer);
      const memory = await Memory.create({
        title: title.trim(),
        description: description.trim(),
        date: memoryDate,
        imageUrl,
        tags: memoryTags,
        submittedBy: author._id,
        published: false,
      });
      return res.status(201).json({
        message: "Memory submitted for admin approval.",
        memoryId: memory._id,
      });
    } catch (error) {
      return next(error);
    }
  });
});

router.post("/memories/:id/comments", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Memory not found." });
    }
    const { memberId, text } = req.body || {};
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Choose your member profile to comment." });
    }
    if (typeof text !== "string" || !text.trim() || text.trim().length > 500) {
      return res.status(400).json({ error: "Write a comment up to 500 characters." });
    }
    const author = await Member.findOne({ _id: memberId, isActive: true }).select("_id");
    if (!author) return res.status(404).json({ error: "Member not found." });
    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, published: true },
      { $push: { comments: { $each: [{ author: author._id, text: text.trim() }], $slice: -100 } } },
      { new: true }
    );
    if (!memory) return res.status(404).json({ error: "Memory not found." });
    return res.status(201).json({ message: "Comment added." });
  } catch (error) {
    return next(error);
  }
});

router.post("/memories/:id/likes", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Memory not found." });
    }
    const { memberId } = req.body || {};
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Choose your member profile to like a memory." });
    }
    const member = await Member.findOne({ _id: memberId, isActive: true }).select("_id");
    if (!member) return res.status(404).json({ error: "Member not found." });
    const liked = await Memory.updateOne(
      { _id: req.params.id, published: true, likes: member._id },
      { $pull: { likes: member._id } }
    );
    if (!liked.matchedCount) {
      const added = await Memory.updateOne(
        { _id: req.params.id, published: true, likes: { $ne: member._id } },
        { $addToSet: { likes: member._id } }
      );
      if (!added.matchedCount) {
        const exists = await Memory.exists({ _id: req.params.id, published: true });
        if (!exists) return res.status(404).json({ error: "Memory not found." });
      }
    }
    const memory = await Memory.findById(req.params.id).select("likes").lean();
    return res.json({
      likeCount: memory.likes.length,
      likedByMember: memory.likes.some((id) => String(id) === String(member._id)),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/members", async (req, res, next) => {
  try {
    const members = await Member.find({ isActive: true })
      .select("-email")
      .sort({ joinedAt: -1, name: 1 })
      .lean();
    return res.json(members);
  } catch (error) {
    return next(error);
  }
});

const appreciationCategories = ["thank-you", "compliment", "motivation", "memory"];
const appreciationReactions = ["heart", "hug", "cheer"];

router.get("/appreciation-wall", async (req, res, next) => {
  try {
    let memberId;
    if (req.query.memberId) {
      if (!mongoose.isValidObjectId(req.query.memberId)) {
        return res.status(400).json({ error: "Member selection is invalid." });
      }
      const member = await Member.exists({ _id: req.query.memberId, isActive: true });
      if (!member) return res.status(404).json({ error: "Member not found." });
      memberId = String(req.query.memberId);
    }

    const notes = await AppreciationNote.find({ status: "approved" })
      .populate({ path: "author", select: "name imageUrl" })
      .populate({ path: "recipient", select: "name imageUrl" })
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    const notificationCount = memberId
      ? await AppreciationNote.countDocuments({
          recipient: memberId,
          status: "approved",
          recipientReadAt: null,
        })
      : 0;

    return res.json({
      notificationCount,
      notes: notes.map((note) => {
        const reactionCounts = Object.fromEntries(
          appreciationReactions.map((type) => [
            type,
            note.reactions.filter((reaction) => reaction.type === type).length,
          ])
        );
        return {
          ...note,
          author: note.anonymous ? null : note.author,
          reactions: undefined,
          reactionCounts,
          myReactions: memberId
            ? note.reactions
                .filter((reaction) => String(reaction.member) === memberId)
                .map((reaction) => reaction.type)
            : [],
          forMe: memberId === String(note.recipient?._id),
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/appreciation-wall", async (req, res, next) => {
  try {
    const { memberId, recipientId, category, message, anonymous = false } = req.body || {};
    if (!mongoose.isValidObjectId(memberId) || !mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ error: "Choose your profile and the friend you’re writing to." });
    }
    if (typeof category !== "string" || !appreciationCategories.includes(category)) {
      return res.status(400).json({ error: "Choose a valid message category." });
    }
    if (typeof message !== "string" || !message.trim() || message.trim().length > 1000) {
      return res.status(400).json({ error: "Write a message between 1 and 1,000 characters." });
    }
    if (typeof anonymous !== "boolean") {
      return res.status(400).json({ error: "Anonymous must be true or false." });
    }

    const activeMembers = await Member.find({
      _id: { $in: [memberId, recipientId] },
      isActive: true,
    }).select("_id");
    if (new Set(activeMembers.map((member) => String(member._id))).size !== 2) {
      return res.status(404).json({ error: "One or both selected members could not be found." });
    }

    const note = await AppreciationNote.create({
      author: memberId,
      recipient: recipientId,
      category,
      message: message.trim(),
      anonymous,
    });
    return res.status(201).json({
      message: "Your note was submitted for admin approval.",
      noteId: note._id,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/appreciation-wall/:id/reactions", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Appreciation note not found." });
    }
    const { memberId, type } = req.body || {};
    if (!mongoose.isValidObjectId(memberId) || !appreciationReactions.includes(type)) {
      return res.status(400).json({ error: "Choose your member profile and a valid reaction." });
    }
    const member = await Member.exists({ _id: memberId, isActive: true });
    if (!member) return res.status(404).json({ error: "Member not found." });

    const note = await AppreciationNote.findOne({
      _id: req.params.id,
      status: "approved",
    });
    if (!note) return res.status(404).json({ error: "Appreciation note not found." });
    const existingIndex = note.reactions.findIndex(
      (reaction) => String(reaction.member) === String(memberId) && reaction.type === type
    );
    if (existingIndex >= 0) note.reactions.splice(existingIndex, 1);
    else note.reactions.push({ member: memberId, type });
    await note.save();

    return res.json({
      reactionCounts: Object.fromEntries(
        appreciationReactions.map((reactionType) => [
          reactionType,
          note.reactions.filter((reaction) => reaction.type === reactionType).length,
        ])
      ),
      myReactions: note.reactions
        .filter((reaction) => String(reaction.member) === String(memberId))
        .map((reaction) => reaction.type),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/appreciation-wall/notifications/read", async (req, res, next) => {
  try {
    const { memberId } = req.body || {};
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Choose your member profile." });
    }
    const member = await Member.exists({ _id: memberId, isActive: true });
    if (!member) return res.status(404).json({ error: "Member not found." });
    await AppreciationNote.updateMany(
      { recipient: memberId, status: "approved", recipientReadAt: null },
      { $set: { recipientReadAt: new Date() } }
    );
    return res.json({ notificationCount: 0 });
  } catch (error) {
    return next(error);
  }
});

router.get("/awards", async (req, res, next) => {
  try {
    const awards = await Award.find().populate({
      path: "nominees",
      select: "name imageUrl",
    }).sort({ closesAt: -1, createdAt: -1 }).lean();
    const now = new Date();
    const closedAwards = awards.filter((award) => award.closesAt <= now);
    const counts = closedAwards.length
      ? await AwardVote.aggregate([
          { $match: { award: { $in: closedAwards.map((award) => award._id) } } },
          { $unwind: "$nominee" },
          { $group: { _id: { award: "$award", nominee: "$nominee" }, votes: { $sum: 1 } } },
        ])
      : [];
    const resultsByAward = new Map();
    for (const count of counts) {
      const awardId = String(count._id.award);
      if (!resultsByAward.has(awardId)) resultsByAward.set(awardId, {});
      resultsByAward.get(awardId)[String(count._id.nominee)] = count.votes;
    }

    const votesUsedByAward = new Map();
    if (req.query.memberId) {
      if (!mongoose.isValidObjectId(req.query.memberId)) {
        return res.status(400).json({ error: "Member selection is invalid." });
      }
      const member = await Member.exists({ _id: req.query.memberId, isActive: true });
      if (!member) return res.status(404).json({ error: "Member not found." });
      const ballots = await AwardVote.find({
        voter: req.query.memberId,
        award: { $in: awards.map((award) => award._id) },
      }).select("award nominee").lean();
      for (const ballot of ballots) {
        votesUsedByAward.set(String(ballot.award), ballotNomineeIds(ballot).length);
      }
    }

    return res.json(awards.map((award) => {
      const closed = award.closesAt <= now;
      return {
        ...award,
        closed,
        votesUsed: votesUsedByAward.get(String(award._id)) || 0,
        votesRemaining: Math.max(0, 2 - (votesUsedByAward.get(String(award._id)) || 0)),
        results: closed
          ? award.nominees.map((nominee) => ({
              nomineeId: String(nominee._id),
              votes: resultsByAward.get(String(award._id))?.[String(nominee._id)] || 0,
            }))
          : null,
      };
    }));
  } catch (error) {
    return next(error);
  }
});

router.post("/awards/:id/votes", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Award not found." });
    }
    const { voterId } = req.body || {};
    let nomineeIds = req.body?.nomineeIds ||
      (req.body?.nomineeId ? [req.body.nomineeId] : []);
    if (!mongoose.isValidObjectId(voterId)) {
      return res.status(400).json({ error: "Choose your member profile and a nominee." });
    }
    if (
      !Array.isArray(nomineeIds) ||
      nomineeIds.length < 1 ||
      nomineeIds.length > 2 ||
      nomineeIds.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(nomineeIds.map(String)).size !== nomineeIds.length
    ) {
      return res.status(400).json({ error: "Choose one or two different nominees." });
    }
    nomineeIds = nomineeIds.map((id) => new mongoose.Types.ObjectId(id));
    const [award, voter] = await Promise.all([
      Award.findById(req.params.id),
      Member.findOne({ _id: voterId, isActive: true }).select("_id"),
    ]);
    if (!award) return res.status(404).json({ error: "Award not found." });
    if (!voter) return res.status(404).json({ error: "Member not found." });
    if (award.closesAt <= new Date()) {
      return res.status(409).json({ error: "Voting for this award has closed." });
    }
    if (nomineeIds.some((nomineeId) => String(voter._id) === String(nomineeId))) {
      return res.status(400).json({ error: "You cannot vote for yourself." });
    }
    if (nomineeIds.some((nomineeId) =>
      !award.nominees.some((id) => String(id) === String(nomineeId))
    )) {
      return res.status(400).json({ error: "That member is not nominated for this award." });
    }

    const existingBallot = await AwardVote.findOne({
      award: award._id,
      voter: voter._id,
    }).select("nominee").lean();
    if (existingBallot) {
      await AwardVote.updateOne(
        { _id: existingBallot._id, nominee: { $not: { $type: "array" } } },
        [{
          $set: {
            nominee: {
              $cond: [
                { $eq: [{ $type: "$nominee" }, "missing"] },
                [],
                ["$nominee"],
              ],
            },
          },
        }]
      );
    }

    const existingNominees = {
      $cond: [
        { $isArray: "$nominee" },
        "$nominee",
        { $cond: [{ $eq: [{ $type: "$nominee" }, "missing"] }, [], ["$nominee"]] },
      ],
    };
    const ballot = await AwardVote.findOneAndUpdate(
      {
        award: award._id,
        voter: voter._id,
        $expr: {
          $and: [
            {
              $lte: [
                { $size: { $setUnion: [existingNominees, nomineeIds] } },
                2,
              ],
            },
            {
              $eq: [
                { $size: { $setIntersection: [existingNominees, nomineeIds] } },
                0,
              ],
            },
          ],
        },
      },
      { $addToSet: { nominee: { $each: nomineeIds } } },
      { new: true, runValidators: true }
    );
    if (ballot) {
      return res.status(201).json({ message: "Your votes have been counted." });
    }

    try {
      await AwardVote.create({
        award: award._id,
        voter: voter._id,
        nominee: nomineeIds,
      });
      return res.status(201).json({ message: "Your votes have been counted." });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const currentBallot = await AwardVote.findOne({
        award: award._id,
        voter: voter._id,
      }).select("nominee").lean();
      const currentNominees = currentBallot ? ballotNomineeIds(currentBallot) : [];
      if (nomineeIds.some((id) => currentNominees.includes(String(id)))) {
        return res.status(409).json({
          error: "One or more selected nominees were already chosen. Your existing votes remain private.",
        });
      }
      if (currentNominees.length + nomineeIds.length > 2) {
        return res.status(409).json({ error: "You can vote for only two different nominees per award." });
      }
      return res.status(409).json({ error: "Your ballot changed. Please refresh and try again." });
    }
  } catch (error) {
    return next(error);
  }
});

router.get("/media/:id", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Image not found." });
  }

  try {
    const bucket = getImageBucket();
    const imageId = new ObjectId(req.params.id);
    const [file] = await bucket.find({ _id: imageId }, { limit: 1 }).toArray();
    if (!file) return res.status(404).json({ error: "Image not found." });

    res.set("Content-Type", file.metadata?.contentType || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    const imageStream = bucket.openDownloadStream(imageId);
    imageStream.on("error", (error) => {
      if (res.headersSent) return next(error);
      return res.status(404).json({ error: "Image not found." });
    });
    imageStream.pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
});

router.use("/admin", requireAdmin);

router.get("/admin/appreciation-wall", async (req, res, next) => {
  try {
    const notes = await AppreciationNote.find()
      .populate({ path: "author", select: "name" })
      .populate({ path: "recipient", select: "name" })
      .sort({ status: 1, createdAt: -1 })
      .lean();
    return res.json(notes);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/appreciation-wall/:id/approve", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Appreciation note not found." });
    }
    const note = await AppreciationNote.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "approved" } },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: "Appreciation note not found." });
    return res.json(note);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/appreciation-wall/:id/pin", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Appreciation note not found." });
    }
    if (typeof req.body?.pinned !== "boolean") {
      return res.status(400).json({ error: "Pinned must be true or false." });
    }
    const note = await AppreciationNote.findOneAndUpdate(
      { _id: req.params.id, status: "approved" },
      { $set: { pinned: req.body.pinned } },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: "Approved appreciation note not found." });
    return res.json(note);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/appreciation-wall/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Appreciation note not found." });
    }
    const note = await AppreciationNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: "Appreciation note not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/memory-lane", async (req, res, next) => {
  try {
    const submissions = await Memory.find({ submittedBy: { $ne: null } })
      .populate({ path: "submittedBy", select: "name" })
      .sort({ published: 1, createdAt: -1 })
      .lean();
    return res.json(submissions);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/memory-lane/:id/publish", async (req, res, next) => {
  try {
    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, submittedBy: { $ne: null } },
      { $set: { published: true } },
      { new: true, runValidators: true }
    );
    if (!memory) return res.status(404).json({ error: "Memory submission not found." });
    return res.json(memory);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/memory-lane/:id", async (req, res, next) => {
  try {
    const memory = await Memory.findOneAndDelete({
      _id: req.params.id,
      submittedBy: { $ne: null },
    });
    if (!memory) return res.status(404).json({ error: "Memory submission not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/awards", async (req, res, next) => {
  try {
    const awards = await Award.find().populate({
      path: "nominees",
      select: "name",
    }).sort({ closesAt: -1, createdAt: -1 }).lean();
    const counts = await AwardVote.aggregate([
      { $match: { award: { $in: awards.map((award) => award._id) } } },
      { $group: { _id: "$award", votes: { $sum: 1 } } },
    ]);
    const countByAward = new Map(counts.map((entry) => [String(entry._id), entry.votes]));
    return res.json(awards.map((award) => ({
      ...award,
      voteCount: countByAward.get(String(award._id)) || 0,
    })));
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/awards", async (req, res, next) => {
  try {
    const input = awardInput(req.body);
    const activeNominees = await Member.countDocuments({
      _id: { $in: input.nominees },
      isActive: true,
    });
    if (activeNominees !== input.nominees.length) {
      return res.status(400).json({ error: "Every nominee must be an active member." });
    }
    const award = await Award.create(input);
    return res.status(201).json(award);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/awards/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Award not found." });
    }
    const input = awardInput(req.body);
    const award = await Award.findById(req.params.id);
    if (!award) return res.status(404).json({ error: "Award not found." });
    const activeNominees = await Member.countDocuments({
      _id: { $in: input.nominees },
      isActive: true,
    });
    if (activeNominees !== input.nominees.length) {
      return res.status(400).json({ error: "Every nominee must be an active member." });
    }
    const removedNominees = award.nominees.filter(
      (nomineeId) => !input.nominees.includes(String(nomineeId))
    );
    if (removedNominees.length && await AwardVote.exists({
      award: award._id,
      nominee: { $in: removedNominees },
    })) {
      return res.status(409).json({
        error: "A nominee who has already received votes cannot be removed.",
      });
    }
    Object.assign(award, input);
    await award.save();
    return res.json(award);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/awards/:id", async (req, res, next) => {
  try {
    const award = await Award.findByIdAndDelete(req.params.id);
    if (!award) return res.status(404).json({ error: "Award not found." });
    await AwardVote.deleteMany({ award: award._id });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/uploads", (req, res, next) => {
  upload.single("image")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
    try {
      const imageUrl = await uploadImageBuffer(req.file.buffer);
      return res.status(201).json({ imageUrl });
    } catch (uploadFailure) {
      return next(uploadFailure);
    }
  });
});

router.get("/admin/memories", async (req, res, next) => {
  try {
    const memories = await Memory.find().sort({ date: -1, createdAt: -1 }).lean();
    return res.json(memories);
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/memories", async (req, res, next) => {
  try {
    const memory = await Memory.create(recordInput(req.body, memoryFields));
    return res.status(201).json(memory);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/memories/:id", async (req, res, next) => {
  try {
    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      recordInput(req.body, memoryFields),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!memory) return res.status(404).json({ error: "Memory not found." });
    return res.json(memory);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/memories/:id", async (req, res, next) => {
  try {
    const memory = await Memory.findByIdAndDelete(req.params.id);
    if (!memory) return res.status(404).json({ error: "Memory not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/members", async (req, res, next) => {
  try {
    const members = await Member.find().select("+email").sort({ name: 1 }).lean();
    return res.json(members);
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/members", async (req, res, next) => {
  try {
    const member = await Member.create(recordInput(req.body, memberFields));
    return res.status(201).json(member);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/members/:id", async (req, res, next) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      recordInput(req.body, memberFields),
      {
        new: true,
        runValidators: true,
        overwrite: true,
      }
    ).select("+email");
    if (!member) return res.status(404).json({ error: "Member not found." });
    return res.json(member);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/members/:id", async (req, res, next) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ error: "Member not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
