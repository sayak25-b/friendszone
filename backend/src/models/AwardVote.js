import mongoose from "mongoose";

const awardVoteSchema = new mongoose.Schema(
  {
    award: { type: mongoose.Schema.Types.ObjectId, ref: "Award", required: true },
    voter: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    nominee: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
      required: true,
      validate: {
        validator: (nominees) => {
          if (!Array.isArray(nominees) || nominees.length !== 4) {
            return false;
          }
          const voteCounts = new Map();
          for (const nominee of nominees) {
            const nomineeId = String(nominee);
            voteCounts.set(nomineeId, (voteCounts.get(nomineeId) || 0) + 1);
          }
          const counts = [...voteCounts.values()].sort();
          return voteCounts.size >= 2 &&
            voteCounts.size <= 3 &&
            counts.every((count) => count === 1 || count === 2);
        },
        message: "A ballot must use four votes across two or three nominees, with no nominee receiving more than two votes.",
      },
    },
  },
  { timestamps: true }
);

awardVoteSchema.index({ award: 1, voter: 1 }, { unique: true });

export default mongoose.model("AwardVote", awardVoteSchema);
