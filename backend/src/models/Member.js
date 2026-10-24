import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    role: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "FriendsZone Member",
    },
    city: { type: String, trim: true, maxlength: 120, default: "" },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    imageUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    joinedAt: { type: Date, default: Date.now },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
      default: undefined,
    },
    instagram: { type: String, trim: true, maxlength: 2048, default: "" },
    website: { type: String, trim: true, maxlength: 2048, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

memberSchema.index({ email: 1 }, { unique: true, sparse: true });

export default mongoose.model("Member", memberSchema);
