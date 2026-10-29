import jwt from "jsonwebtoken";
import VoterAccount from "../models/VoterAccount.js";
import Member from "../models/Member.js";

export function requireAdmin(req, res, next) {
  const authorization = req.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Admin authentication is required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      (payload.type !== undefined && payload.type !== "admin")
    ) {
      return res.status(401).json({ error: "Invalid admin token." });
    }
    req.adminId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Your admin session has expired." });
  }
}

export async function requireVoter(req, res, next) {
  const authorization = req.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Sign in to vote." });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Your voter session has expired. Please sign in again." });
  }
  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    payload.type !== "voter"
  ) {
    return res.status(401).json({ error: "Invalid voter session." });
  }

  try {
    const account = await VoterAccount.findById(payload.sub).select("member");
    if (!account) return res.status(401).json({ error: "Voter account not found. Please sign in again." });
    const member = await Member.findOne({ _id: account.member, isActive: true }).select("_id");
    if (!member) return res.status(403).json({ error: "Your linked member profile is inactive." });
    req.voterId = String(member._id);
    return next();
  } catch (error) {
    return next(error);
  }
}
