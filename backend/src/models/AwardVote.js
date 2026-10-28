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
          if (!Array.isArray(nominees) || nominees.length < 1 || nominees.length > 4) {
            return false;
          }
          const voteCounts = new Map();
          for (const nominee of nominees) {
            const nomineeId = String(nominee);
            voteCounts.set(nomineeId, (voteCounts.get(nomineeId) || 0) + 1);
          }
          return voteCounts.size <= 3 && [...voteCounts.values()].every((count) => count <= 2);
        },
        message: "A ballot can include up to four votes for three nominees, with at most two votes per nominee.",
      },
    },
  },
  { timestamps: true }
);

awardVoteSchema.index({ award: 1, voter: 1 }, { unique: true });

export default mongoose.model("AwardVote", awardVoteSchema);
