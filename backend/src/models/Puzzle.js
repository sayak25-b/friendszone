import mongoose from "mongoose";

const puzzleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    imageUrl: { type: String, required: true, trim: true },
    size: { type: Number, enum: [3, 4, 5], required: true },
    scheduleType: { type: String, enum: ["daily", "weekly"], required: true },
    scheduleDate: { type: String, required: true },
    weeklyDay: { type: Number, min: 0, max: 6, default: null },
    timeLimitSeconds: { type: Number, required: true, min: 30, max: 3600 },
  },
  { timestamps: true }
);

puzzleSchema.index({ scheduleDate: 1, scheduleType: 1 });

const puzzleScoreSchema = new mongoose.Schema(
  {
    puzzle: { type: mongoose.Schema.Types.ObjectId, ref: "Puzzle", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    challengeDate: { type: String, required: true },
    timeSeconds: { type: Number, required: true, min: 1 },
    moves: { type: Number, required: true, min: 1 },
    hintsUsed: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 10 },
  },
  { timestamps: true }
);

puzzleScoreSchema.index({ puzzle: 1, member: 1, challengeDate: 1 }, { unique: true });

export const Puzzle = mongoose.model("Puzzle", puzzleSchema);
export const PuzzleScore = mongoose.model("PuzzleScore", puzzleScoreSchema);
