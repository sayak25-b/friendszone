import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { BACKEND_ROOT } from "../config/loadEnv.js";
import Memory from "../models/Memory.js";
import Member from "../models/Member.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
const uploadDirectory = path.join(BACKEND_ROOT, "uploads");
const cloudinaryCredentials = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
];
const cloudinaryConfigured = cloudinaryCredentials.every(Boolean);

if (cloudinaryCredentials.some(Boolean) && !cloudinaryConfigured) {
  throw new Error(
    "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together."
  );
}

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
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
  storage: cloudinaryConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: async (req, file, callback) => {
          try {
            await fs.mkdir(uploadDirectory, { recursive: true });
            callback(null, uploadDirectory);
          } catch (error) {
            callback(error);
          }
        },
        filename: (req, file, callback) => {
          const extension = allowedImageTypes.get(file.mimetype);
          if (!extension) {
            const error = new Error("Only image files are allowed.");
            error.status = 400;
            return callback(error);
          }
          return callback(null, `${randomUUID()}${extension}`);
        },
      }),
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

router.use("/admin", requireAdmin);

router.post("/admin/uploads", (req, res, next) => {
  if (process.env.NODE_ENV === "production" && !cloudinaryConfigured) {
    return res.status(503).json({
      error:
        "Persistent image storage is not configured. Add the Cloudinary credentials to the backend environment.",
    });
  }

  upload.single("image")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });

    if (cloudinaryConfigured) {
      try {
        const result = await new Promise((resolve, reject) => {
          const imageUpload = cloudinary.uploader.upload_stream(
            { folder: "friendszone", resource_type: "image" },
            (uploadError, uploadedImage) => {
              if (uploadError) return reject(uploadError);
              return resolve(uploadedImage);
            }
          );
          imageUpload.end(req.file.buffer);
        });
        if (!result?.secure_url) {
          return next(new Error("Cloudinary did not return a secure image URL."));
        }
        return res.status(201).json({ imageUrl: result.secure_url });
      } catch (uploadError) {
        return next(uploadError);
      }
    }

    const serverUrl = (process.env.PUBLIC_SERVER_URL || "").replace(/\/$/, "");
    return res.status(201).json({
      imageUrl: `${serverUrl}/uploads/${req.file.filename}`,
    });
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
