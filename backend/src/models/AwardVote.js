import mongoose from "mongoose";

const awardVoteSchema = new mongoose.Schema(
  {
    award: { type: mongoose.Schema.Types.ObjectId, ref: "Award", required: true },
    voter: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    nominee: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
      required: true,
      validate: {
        validator: (nominees) => nominees.length >= 1 && nominees.length <= 2 &&
          new Set(nominees.map(String)).size === nominees.length,
        message: "A ballot must include one or two different nominees.",
      },
    },
  },
  { timestamps: true }
);

awardVoteSchema.index({ award: 1, voter: 1 }, { unique: true });

export default mongoose.model("AwardVote", awardVoteSchema);
