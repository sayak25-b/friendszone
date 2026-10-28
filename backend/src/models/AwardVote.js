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
          return voteCounts.size === 3 && counts[0] === 1 && counts[1] === 1 && counts[2] === 2;
        },
        message: "A ballot must include three nominees: one with two votes and two with one vote each.",
      },
    },
  },
  { timestamps: true }
);

awardVoteSchema.index({ award: 1, voter: 1 }, { unique: true });

export default mongoose.model("AwardVote", awardVoteSchema);
