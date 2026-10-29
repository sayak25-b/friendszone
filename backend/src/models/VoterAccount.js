import mongoose from "mongoose";

const voterAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("VoterAccount", voterAccountSchema);
