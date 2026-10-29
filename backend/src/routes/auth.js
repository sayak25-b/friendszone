import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import Admin from "../models/Admin.js";
import Member from "../models/Member.js";
import VoterAccount from "../models/VoterAccount.js";
import { requireAdmin, requireVoter } from "../middleware/auth.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});
const voterAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many account attempts. Please try again later." },
});

function createVoterToken(account) {
  return jwt.sign({ type: "voter" }, process.env.JWT_SECRET, {
    subject: String(account._id),
    expiresIn: "8h",
  });
}

function voterResponse(account, member) {
  return {
    token: createVoterToken(account),
    voter: {
      id: String(account._id),
      memberId: String(member._id),
      name: member.name,
      email: account.email,
    },
  };
}

router.post("/voter/register", voterAuthLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (!/^\d{4}$/.test(password)) {
      return res.status(400).json({ error: "Your password must be exactly 4 digits." });
    }

    const member = await Member.findOne({ email, isActive: true }).select("_id name");
    if (!member) {
      return res.status(400).json({
        error: "This email is not linked to an active member profile. Contact an administrator for help.",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const account = await VoterAccount.create({ email, passwordHash, member: member._id });
    return res.status(201).json(voterResponse(account, member));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "An account already exists for this email or member profile. Please sign in." });
    }
    return next(error);
  }
});

router.post("/voter/login", voterAuthLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const account = await VoterAccount.findOne({ email }).select("+passwordHash");
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const member = await Member.findOne({ _id: account.member, isActive: true }).select("_id name");
    if (!member) return res.status(403).json({ error: "Your linked member profile is inactive." });
    return res.json(voterResponse(account, member));
  } catch (error) {
    return next(error);
  }
});

router.get("/voter/me", requireVoter, async (req, res, next) => {
  try {
    const account = await VoterAccount.findOne({ member: req.voterId }).select("email member");
    if (!account) return res.status(401).json({ error: "Voter account not found." });
    const member = await Member.findById(account.member).select("_id name");
    if (!member) return res.status(403).json({ error: "Your linked member profile is inactive." });
    return res.json({
      id: String(account._id),
      memberId: String(member._id),
      name: member.name,
      email: account.email,
    });
  } catch (error) {
    return next(error);
  }
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

    const token = jwt.sign({ type: "admin" }, process.env.JWT_SECRET, {
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
