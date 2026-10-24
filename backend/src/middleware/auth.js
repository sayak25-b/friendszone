import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const authorization = req.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Admin authentication is required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return res.status(401).json({ error: "Invalid admin token." });
    }
    req.adminId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Your admin session has expired." });
  }
}
