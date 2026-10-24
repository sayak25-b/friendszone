import { Router } from "express";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
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

router.post("/admin/uploads", (req, res, next) => {
  upload.single("image")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });

    try {
      const bucket = getImageBucket();
      const imageId = new ObjectId();
      const imageStream = bucket.openUploadStreamWithId(
        imageId,
        req.file.originalname,
        {
          contentType: req.file.mimetype,
          metadata: { contentType: req.file.mimetype },
        }
      );

      await new Promise((resolve, reject) => {
        imageStream.once("error", reject);
        imageStream.once("finish", resolve);
        imageStream.end(req.file.buffer);
      });

      return res.status(201).json({ imageUrl: `/api/media/${imageId.toString()}` });
    } catch (uploadError) {
      return next(uploadError);
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
