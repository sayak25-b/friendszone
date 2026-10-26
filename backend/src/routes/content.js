import { Router } from "express";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Award from "../models/Award.js";
import AwardVote from "../models/AwardVote.js";
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
    const error = new Error("Choose a valid closing date.");
    error.status = 400;
    throw error;
  }
  input.closesAt = closesAt;
  return input;
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
    const memories = await Memory.find({ published: true })
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json(memories);
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
          { $group: { _id: { award: "$award", nominee: "$nominee" }, votes: { $sum: 1 } } },
        ])
      : [];
    const resultsByAward = new Map();
    for (const count of counts) {
      const awardId = String(count._id.award);
      if (!resultsByAward.has(awardId)) resultsByAward.set(awardId, {});
      resultsByAward.get(awardId)[String(count._id.nominee)] = count.votes;
    }

    let votesByAward = new Set();
    if (req.query.memberId) {
      if (!mongoose.isValidObjectId(req.query.memberId)) {
        return res.status(400).json({ error: "Member selection is invalid." });
      }
      const member = await Member.exists({ _id: req.query.memberId, isActive: true });
      if (!member) return res.status(404).json({ error: "Member not found." });
      const votes = await AwardVote.find({
        voter: req.query.memberId,
        award: { $in: awards.map((award) => award._id) },
      }).select("award").lean();
      votesByAward = new Set(votes.map((vote) => String(vote.award)));
    }

    return res.json(awards.map((award) => {
      const closed = award.closesAt <= now;
      return {
        ...award,
        closed,
        hasVoted: votesByAward.has(String(award._id)),
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
    const { voterId, nomineeId } = req.body || {};
    if (!mongoose.isValidObjectId(voterId) || !mongoose.isValidObjectId(nomineeId)) {
      return res.status(400).json({ error: "Choose your member profile and a nominee." });
    }
    const [award, voter] = await Promise.all([
      Award.findById(req.params.id),
      Member.findOne({ _id: voterId, isActive: true }).select("_id"),
    ]);
    if (!award) return res.status(404).json({ error: "Award not found." });
    if (!voter) return res.status(404).json({ error: "Member not found." });
    if (award.closesAt <= new Date()) {
      return res.status(409).json({ error: "Voting for this award has closed." });
    }
    if (String(voter._id) === String(nomineeId)) {
      return res.status(400).json({ error: "You cannot vote for yourself." });
    }
    if (!award.nominees.some((id) => String(id) === String(nomineeId))) {
      return res.status(400).json({ error: "That member is not nominated for this award." });
    }
    await AwardVote.create({ award: award._id, voter: voter._id, nominee: nomineeId });
    return res.status(201).json({ message: "Your vote has been counted." });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "You have already voted for this award." });
    }
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

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({
        error: "Image uploads are not configured. Set the Cloudinary credentials on the backend.",
      });
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
        imageStream.end(req.file.buffer);
      });

      if (!result?.secure_url) {
        return next(new Error("Cloudinary did not return a secure image URL."));
      }

      return res.status(201).json({ imageUrl: result.secure_url });
    } catch (uploadError) {
      console.error("Cloudinary image upload failed:", uploadError);
      return res.status(502).json({
        error:
          "Cloudinary could not save this image. Check the Cloudinary credentials configured on the backend.",
      });
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
        overwrite: true,
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
