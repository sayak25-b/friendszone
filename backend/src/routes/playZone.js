import { Router } from "express";
import mongoose from "mongoose";
import Member from "../models/Member.js";
import { DailyTrivia, TruthRound } from "../models/PlayZone.js";

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
  const ownRound = String(round.author._id) === String(memberId);
  return {
    _id: round._id,
    author: round.author,
    statements: round.statements,
    guessesCount: round.guesses.length,
    hasGuessed: Boolean(viewerGuess),
    guessedCorrectly: viewerGuess?.isCorrect ?? null,
    lieIndex: ownRound || viewerGuess ? round.lieIndex : null,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const memberId = req.query.memberId || "";
    if (memberId) await findActiveMember(memberId);
    const date = todayKey();
    const [members, rounds, trivia, truthScores, triviaScores] = await Promise.all([
      Member.find({ isActive: true }).select("name imageUrl").sort({ name: 1 }).lean(),
      TruthRound.find({ date })
        .populate({ path: "author", select: "name imageUrl" })
        .lean(),
      DailyTrivia.findOne({ date })
        .populate({ path: "author", select: "name imageUrl" })
        .lean(),
      TruthRound.aggregate([
        { $unwind: "$guesses" },
        { $match: { "guesses.isCorrect": true } },
        { $group: { _id: "$guesses.member", points: { $sum: 1 } } },
      ]),
      DailyTrivia.aggregate([
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
    const triviaAuthor = trivia && String(trivia.author._id) === String(memberId);

    return res.json({
      date,
      truths: rounds
        .filter((round) => round.author)
        .map((round) => safeRound(round, memberId)),
      trivia: trivia
        ? {
            _id: trivia._id,
            author: trivia.author,
            question: trivia.question,
            options: trivia.options,
            isAuthor: Boolean(triviaAuthor),
            answersCount: trivia.answers.length,
            hasAnswered: Boolean(triviaAnswer),
            answerIsCorrect: triviaAnswer?.isCorrect ?? null,
            answerIndex: triviaAnswer?.optionIndex ?? null,
            correctIndex: triviaAnswer || triviaAuthor ? trivia.correctIndex : null,
          }
        : null,
      triviaParticipants: trivia?.answers.length || 0,
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
    }).select("author lieIndex");
    if (!existingRound) return res.status(404).json({ error: "That round was not found." });
    if (String(existingRound.author) === String(member._id)) {
      throw badRequest("You cannot guess your own round.");
    }
    const round = await TruthRound.findOneAndUpdate(
      {
        _id: existingRound._id,
        author: { $ne: member._id },
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

    const isCorrect = statementIndex === existingRound.lieIndex;
    return res.json({
      isCorrect,
      lieIndex: existingRound.lieIndex,
      message: isCorrect ? "You spotted the lie! +1 point." : "Not quite — the lie is revealed.",
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
    const existingTrivia = await DailyTrivia.findOne({ date: todayKey() })
      .select("correctIndex");
    if (!existingTrivia) {
      return res.status(404).json({ error: "Today's trivia question is not ready yet." });
    }
    const trivia = await DailyTrivia.findOneAndUpdate(
      {
        _id: existingTrivia._id,
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

    const isCorrect = optionIndex === existingTrivia.correctIndex;
    return res.json({
      isCorrect,
      correctIndex: existingTrivia.correctIndex,
      message: isCorrect ? "Correct! +1 point." : "Not quite — answer revealed.",
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
