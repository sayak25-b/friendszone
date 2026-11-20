import mongoose from "mongoose";

const objectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    icon: { type: String, default: "🔎", maxlength: 12 },
    clue: { type: String, required: true, trim: true, maxlength: 500 },
    unlockAfter: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const puzzleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    prompt: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, required: true, trim: true, maxlength: 100 },
    hint: { type: String, required: true, trim: true, maxlength: 300 },
    objectId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const escapeRoomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    durationMinutes: { type: Number, enum: [5, 10, 15], required: true, default: 10 },
    hintPenaltySeconds: { type: Number, min: 0, max: 300, default: 30 },
    objects: { type: [objectSchema], default: [] },
    puzzles: { type: [puzzleSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const escapeAttemptSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "EscapeRoom", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMinutes: { type: Number, enum: [5, 10, 15], required: true },
    status: { type: String, enum: ["playing", "escaped", "time-up"], default: "playing" },
    discoveredObjects: { type: [String], default: [] },
    solvedPuzzles: { type: [String], default: [] },
    hintedPuzzles: { type: [String], default: [] },
    hintPenaltySeconds: { type: Number, min: 0, default: 0 },
    incorrectAnswers: { type: Number, min: 0, default: 0 },
    completionSeconds: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
);

escapeAttemptSchema.index({ room: 1, member: 1, status: 1 });
escapeAttemptSchema.index(
  { room: 1, member: 1 },
  { unique: true, partialFilterExpression: { status: "playing" } }
);
escapeAttemptSchema.index({ room: 1, status: 1, completionSeconds: 1 });

export const EscapeRoom = mongoose.model("EscapeRoom", escapeRoomSchema);
export const EscapeAttempt = mongoose.model("EscapeAttempt", escapeAttemptSchema);
