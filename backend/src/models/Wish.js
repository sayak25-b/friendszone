import mongoose from "mongoose";

const wishSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    theme: {
      type: String,
      enum: ["celebration", "elegant", "playful", "festive"],
      default: "celebration",
    },
    backgroundColor: {
      type: String,
      match: /^#[0-9a-fA-F]{6}$/,
      default: "#6d28d9",
    },
    accentColor: {
      type: String,
      match: /^#[0-9a-fA-F]{6}$/,
      default: "#ec4899",
    },
    publishAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Wish", wishSchema);
