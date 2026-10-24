import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import Admin from "../models/Admin.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash"
    );
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: admin.id,
      expiresIn: "8h",
    });
    return res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAdmin, async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.adminId).select("email");
    if (!admin) return res.status(401).json({ error: "Admin account not found." });
    return res.json({ id: admin.id, email: admin.email });
  } catch (error) {
    return next(error);
  }
});

export default router;
