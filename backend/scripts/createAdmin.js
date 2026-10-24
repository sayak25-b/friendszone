import "../src/config/loadEnv.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../src/models/Admin.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
if (!email || !password || password.length < 12) {
  throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.");
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.findOneAndUpdate(
    { email },
    { $set: { passwordHash } },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`Admin account ready for ${email}.`);
} finally {
  await mongoose.disconnect();
}
