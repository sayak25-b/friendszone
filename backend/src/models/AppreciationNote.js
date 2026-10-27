import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    type: { type: String, enum: ["heart", "hug", "cheer"], required: true },
  },
  { _id: false }
);

const appreciationNoteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    category: {
      type: String,
      enum: ["thank-you", "compliment", "motivation", "memory"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved"], default: "pending" },
    pinned: { type: Boolean, default: false },
    recipientReadAt: { type: Date, default: null },
    reactions: { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);

appreciationNoteSchema.index({ status: 1, pinned: -1, createdAt: -1 });
appreciationNoteSchema.index({ recipient: 1, status: 1, recipientReadAt: 1 });

export default mongoose.model("AppreciationNote", appreciationNoteSchema);
