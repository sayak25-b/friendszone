import { Router } from "express";
import mongoose from "mongoose";
import Member from "../models/Member.js";
import { requireAdmin } from "../middleware/auth.js";
import { DailyTrivia, GamePrompt, TruthRound } from "../models/PlayZone.js";

const router = Router();

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function triviaInput(body) {
  const { date, question, options, correctIndex } = body || {};
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest("Choose a valid date for the question.");
  }
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date < todayKey()) {
    throw badRequest("Questions can only be scheduled for today or a future date.");
  }
  if (typeof question !== "string" || !question.trim() || question.trim().length > 240) {
    throw badRequest("Enter a question no longer than 240 characters.");
  }
  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some((option) => typeof option !== "string" || !option.trim() || option.trim().length > 160)
  ) {
    throw badRequest("Enter four answer options, each no longer than 160 characters.");
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw badRequest("Choose the correct answer.");
  }
  const normalizedOptions = options.map((option) => option.trim());
  if (new Set(normalizedOptions.map((option) => option.toLocaleLowerCase())).size !== 4) {
    throw badRequest("Each answer option must be different.");
  }
  return {
    date,
    question: question.trim(),
    options: normalizedOptions,
    correctIndex,
  };
}

async function findActiveMember(memberId) {
  if (!mongoose.isValidObjectId(memberId)) {
    throw badRequest("Choose a valid member profile.");
  }
  const member = await Member.findOne({ _id: memberId, isActive: true })
    .select("name imageUrl")
    .lean();
  if (!member) throw badRequest("Choose an active member profile.");
  return member;
}

function safeRound(round, memberId) {
  const viewerGuess = round.guesses.find(
    (guess) => String(guess.member) === String(memberId)
  );
  return {
    _id: round._id,
    author: round.author,
    statements: round.statements,
    guessesCount: round.guesses.length,
    hasGuessed: Boolean(viewerGuess),
    isClosed: round.isClosed,
    isModerated: round.isModerated,
  };
}

router.use("/admin", requireAdmin);

router.get("/admin", async (req, res, next) => {
  try {
    const [prompts, truths, trivia] = await Promise.all([
      GamePrompt.find().sort({ game: 1, createdAt: -1 }).lean(),
      TruthRound.find().populate({ path: "author", select: "name" })
        .sort({ date: -1, createdAt: -1 }).limit(100).lean(),
      DailyTrivia.find().populate({ path: "author", select: "name" })
        .sort({ date: -1 }).limit(100).lean(),
    ]);
    return res.json({ prompts, truths, trivia });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/prompts", async (req, res, next) => {
  try {
    const { game, text } = req.body || {};
    if (!["truths", "trivia"].includes(game)) {
      throw badRequest("Choose a game for this prompt.");
    }
    if (typeof text !== "string" || !text.trim() || text.trim().length > 240) {
      throw badRequest("Enter a prompt no longer than 240 characters.");
    }
    const prompt = await GamePrompt.create({ game, text: text.trim() });
    return res.status(201).json(prompt);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "That prompt already exists for this game." });
    }
    return next(error);
  }
});

router.delete("/admin/prompts/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Prompt not found." });
    }
    const prompt = await GamePrompt.findByIdAndDelete(req.params.id);
    if (!prompt) return res.status(404).json({ error: "Prompt not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/trivia", async (req, res, next) => {
  try {
    const scheduled = await DailyTrivia.create({
      ...triviaInput(req.body),
      isClosed: false,
    });
    return res.status(201).json(scheduled);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "A question is already scheduled for that date." });
    }
    return next(error);
  }
});

router.put("/admin/trivia/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Trivia question not found." });
    }
    const input = triviaInput(req.body);
    const trivia = await DailyTrivia.findOneAndUpdate(
      {
        _id: req.params.id,
        isClosed: { $ne: true },
        answers: { $size: 0 },
      },
      { $set: input },
      { new: true, runValidators: true }
    );
    if (!trivia) {
      const existing = await DailyTrivia.findById(req.params.id).select("isClosed answers");
      if (!existing) return res.status(404).json({ error: "Trivia question not found." });
      return res.status(409).json({
        error: existing.isClosed
          ? "Closed trivia cannot be edited."
          : "Trivia cannot be edited after members have answered.",
      });
    }
    return res.json(trivia);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "A question is already scheduled for that date." });
    }
    return next(error);
  }
});

router.patch("/admin/truths/:id/moderation", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.isModerated !== "boolean") {
      throw badRequest("Choose whether to hide or restore this round.");
    }
    const round = await TruthRound.findByIdAndUpdate(
      req.params.id,
      { $set: { isModerated: req.body.isModerated } },
      { new: true }
    );
    if (!round) return res.status(404).json({ error: "Round not found." });
    return res.json({ id: String(round._id), isModerated: round.isModerated });
  } catch (error) {
    return next(error);
  }
});

router.patch("/admin/trivia/:id/moderation", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.isModerated !== "boolean") {
      throw badRequest("Choose whether to hide or restore this question.");
    }
    const trivia = await DailyTrivia.findByIdAndUpdate(
      req.params.id,
      { $set: { isModerated: req.body.isModerated } },
      { new: true }
    );
    if (!trivia) return res.status(404).json({ error: "Question not found." });
    return res.json({ id: String(trivia._id), isModerated: trivia.isModerated });
  } catch (error) {
    return next(error);
  }
});

router.patch("/admin/truths/:id/close", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Round not found." });
    }
    const round = await TruthRound.findByIdAndUpdate(
      req.params.id,
      { $set: { isClosed: true } },
      { new: true }
    );
    if (!round) return res.status(404).json({ error: "Round not found." });
    return res.json({ id: String(round._id), isClosed: round.isClosed });
  } catch (error) {
    return next(error);
  }
});

router.patch("/admin/trivia/:id/close", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Question not found." });
    }
    const trivia = await DailyTrivia.findByIdAndUpdate(
      req.params.id,
      { $set: { isClosed: true } },
      { new: true }
    );
    if (!trivia) return res.status(404).json({ error: "Question not found." });
    return res.json({ id: String(trivia._id), isClosed: trivia.isClosed });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const memberId = req.query.memberId || "";
    if (memberId) await findActiveMember(memberId);
    const date = todayKey();
    const roundQuery = { date };
    if (memberId) {
      roundQuery.$or = [
        { isModerated: { $ne: true } },
        { author: memberId },
      ];
    } else {
      roundQuery.isModerated = { $ne: true };
    }
    const [members, rounds, trivia, truthScores, triviaScores] = await Promise.all([
      Member.find({ isActive: true }).select("name imageUrl").sort({ name: 1 }).lean(),
      TruthRound.find(roundQuery)
        .populate({ path: "author", select: "name imageUrl" })
        .lean(),
      DailyTrivia.findOne({ date, isModerated: { $ne: true } })
        .populate({ path: "author", select: "name imageUrl" })
        .lean(),
      TruthRound.aggregate([
        { $match: { isModerated: { $ne: true } } },
        { $unwind: "$guesses" },
        { $match: { "guesses.isCorrect": true } },
        { $group: { _id: "$guesses.member", points: { $sum: 1 } } },
      ]),
      DailyTrivia.aggregate([
        { $match: { isModerated: { $ne: true } } },
        { $unwind: "$answers" },
        {
          $group: {
            _id: "$answers.member",
            points: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } },
            triviaDays: { $sum: 1 },
          },
        },
      ]),
    ]);

    const scores = new Map();
    for (const { _id, points } of truthScores) {
      scores.set(String(_id), { points, triviaDays: 0 });
    }
    for (const { _id, points, triviaDays } of triviaScores) {
      const score = scores.get(String(_id)) || { points: 0, triviaDays: 0 };
      score.points += points;
      score.triviaDays = triviaDays;
      scores.set(String(_id), score);
    }

    const leaderboard = members
      .map((member) => ({
        ...member,
        points: scores.get(String(member._id))?.points || 0,
        triviaDays: scores.get(String(member._id))?.triviaDays || 0,
      }))
      .sort((a, b) => b.points - a.points || b.triviaDays - a.triviaDays || a.name.localeCompare(b.name));

    const triviaAnswer = trivia?.answers.find(
      (answer) => String(answer.member) === String(memberId)
    );
    const triviaAuthor = trivia?.author && String(trivia.author._id) === String(memberId);

    return res.json({
      date,
      truths: rounds
        .filter((round) => round.author)
        .map((round) => safeRound(round, memberId)),
      trivia: trivia
        ? {
            _id: trivia._id,
            author: trivia.author,
            authorName: trivia.author?.name || "FriendsZone admin",
            question: trivia.question,
            options: trivia.options,
            isAuthor: Boolean(triviaAuthor),
            isClosed: trivia.isClosed,
            isModerated: trivia.isModerated,
            answersCount: trivia.answers.length,
            hasAnswered: Boolean(triviaAnswer),
          }
        : null,
      triviaParticipants: trivia?.answers.length || 0,
      prompts: await GamePrompt.find().sort({ createdAt: -1 }).limit(30).lean(),
      leaderboard,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/truths", async (req, res, next) => {
  try {
    const { memberId, statements, lieIndex } = req.body || {};
    const member = await findActiveMember(memberId);
    if (
      !Array.isArray(statements) ||
      statements.length !== 3 ||
      statements.some((statement) => typeof statement !== "string" || !statement.trim() || statement.trim().length > 240)
    ) {
      throw badRequest("Enter three statements, each no longer than 240 characters.");
    }
    if (!Number.isInteger(lieIndex) || lieIndex < 0 || lieIndex > 2) {
      throw badRequest("Choose which statement is the lie.");
    }
    const distinctStatements = new Set(statements.map((statement) => statement.trim().toLocaleLowerCase()));
    if (distinctStatements.size !== 3) throw badRequest("Each statement must be different.");

    const round = await TruthRound.create({
      date: todayKey(),
      author: member._id,
      statements: statements.map((statement) => statement.trim()),
      lieIndex,
    });
    return res.status(201).json({ id: round._id, message: "Your three statements are live!" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "You have already posted today's round." });
    }
    return next(error);
  }
});

router.post("/truths/:id/guess", async (req, res, next) => {
  try {
    const { memberId, statementIndex } = req.body || {};
    const member = await findActiveMember(memberId);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "That round was not found." });
    }
    if (!Number.isInteger(statementIndex) || statementIndex < 0 || statementIndex > 2) {
      throw badRequest("Choose one of the three statements.");
    }
    const existingRound = await TruthRound.findOne({
      _id: req.params.id,
      date: todayKey(),
    isModerated: { $ne: true },
    }).select("author lieIndex isClosed");
    if (!existingRound) return res.status(404).json({ error: "That round was not found." });
    if (String(existingRound.author) === String(member._id)) {
    throw badRequest("You cannot guess your own round.");
    }
    if (existingRound.isClosed) {
    return res.status(409).json({ error: "This round is closed to new guesses." });
    }
    const round = await TruthRound.findOneAndUpdate(
    {
      _id: existingRound._id,
      author: { $ne: member._id },
      isClosed: { $ne: true },
      isModerated: { $ne: true },
        guesses: { $not: { $elemMatch: { member: member._id } } },
      },
      {
        $push: {
          guesses: {
            member: member._id,
            statementIndex,
            isCorrect: statementIndex === existingRound.lieIndex,
          },
        },
      },
      { new: true }
    );
    if (!round) {
      return res.status(409).json({ error: "You have already guessed this round." });
    }

    return res.json({
      message: "Your guess has been recorded.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/trivia", async (req, res, next) => {
  try {
    const { memberId, question, options, correctIndex } = req.body || {};
    const member = await findActiveMember(memberId);
    if (typeof question !== "string" || !question.trim() || question.trim().length > 240) {
      throw badRequest("Enter a question no longer than 240 characters.");
    }
    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((option) => typeof option !== "string" || !option.trim() || option.trim().length > 160)
    ) {
      throw badRequest("Enter four answer options, each no longer than 160 characters.");
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      throw badRequest("Choose the correct answer.");
    }
    if (new Set(options.map((option) => option.trim().toLocaleLowerCase())).size !== 4) {
      throw badRequest("Each answer option must be different.");
    }

    const trivia = await DailyTrivia.create({
      date: todayKey(),
      author: member._id,
      question: question.trim(),
      options: options.map((option) => option.trim()),
      correctIndex,
    });
    return res.status(201).json({ id: trivia._id, message: "Today's trivia is ready for the group!" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Today's trivia question has already been set." });
    }
    return next(error);
  }
});

router.post("/trivia/answer", async (req, res, next) => {
  try {
    const { memberId, optionIndex } = req.body || {};
    const member = await findActiveMember(memberId);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
      throw badRequest("Choose one of the four answer options.");
    }
    const existingTrivia = await DailyTrivia.findOne({
      date: todayKey(),
      isModerated: { $ne: true },
    }).select("correctIndex isClosed answers");
    if (!existingTrivia) {
      return res.status(404).json({ error: "Today's trivia question is not ready yet." });
    }
    if (existingTrivia.isClosed) {
      return res.status(409).json({ error: "Today's trivia is closed to new answers." });
    }
    if (existingTrivia.answers.some((answer) => String(answer.member) === String(member._id))) {
      return res.status(409).json({ error: "You have already answered today's trivia." });
    }
    const trivia = await DailyTrivia.findOneAndUpdate(
      {
        _id: existingTrivia._id,
        isClosed: { $ne: true },
        isModerated: { $ne: true },
        answers: { $not: { $elemMatch: { member: member._id } } },
      },
      {
        $push: {
          answers: {
            member: member._id,
            optionIndex,
            isCorrect: optionIndex === existingTrivia.correctIndex,
          },
        },
      },
      { new: true }
    );
    if (!trivia) {
      return res.status(409).json({ error: "You have already answered today's trivia." });
    }

    return res.json({
      message: "Your answer has been recorded.",
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
