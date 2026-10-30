import mongoose from "mongoose";

const guessSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    statementIndex: { type: Number, required: true, min: 0, max: 2 },
    isCorrect: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const truthRoundSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    statements: {
      type: [{ type: String, required: true, trim: true, maxlength: 240 }],
      validate: {
        validator: (statements) => statements.length === 3,
        message: "A round must contain exactly three statements.",
      },
    },
    lieIndex: { type: Number, required: true, min: 0, max: 2 },
    guesses: { type: [guessSchema], default: [] },
  },
  { timestamps: true }
);

truthRoundSchema.index({ date: 1, author: 1 }, { unique: true });

const triviaAnswerSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    optionIndex: { type: Number, required: true, min: 0, max: 3 },
    isCorrect: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const dailyTriviaSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    question: { type: String, required: true, trim: true, maxlength: 240 },
    options: {
      type: [{ type: String, required: true, trim: true, maxlength: 160 }],
      validate: {
        validator: (options) => options.length === 4,
        message: "A trivia question must have exactly four options.",
      },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    answers: { type: [triviaAnswerSchema], default: [] },
  },
  { timestamps: true }
);

export const TruthRound = mongoose.model("TruthRound", truthRoundSchema);
export const DailyTrivia = mongoose.model("DailyTrivia", dailyTriviaSchema);
