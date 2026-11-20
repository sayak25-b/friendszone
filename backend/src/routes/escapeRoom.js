import { Router } from "express";
import mongoose from "mongoose";
import Member from "../models/Member.js";
import { requireAdmin } from "../middleware/auth.js";
import { EscapeAttempt, EscapeRoom } from "../models/EscapeRoom.js";

const router = Router();

const defaultRoom = {
  title: "The Secret Room",
  description: "The door has locked behind you. Search the room, solve every puzzle, and escape before time runs out.",
  durationMinutes: 10,
  hintPenaltySeconds: 30,
  objects: [
    { id: "clock", name: "Broken clock", icon: "🕰️", clue: "The clock stopped at 3:15. A note reads: “The hour is your first digit; the minutes give your remaining digits.”", unlockAfter: 0 },
    { id: "painting", name: "Old painting", icon: "🖼️", clue: "The painted symbols show the order: ★ → 🌙 → 🔑 → ☀️. Use that order to read the letters hidden on the book spines.", unlockAfter: 0 },
    { id: "bookshelf", name: "Secret bookshelf", icon: "📚", clue: "The four spines map their symbols to letters: ★ = S, 🌙 = T, 🔑 = A, ☀️ = R. Arrange them using the painting’s order.", unlockAfter: 1 },
    { id: "safe", name: "Locked safe", icon: "🔐", clue: "The safe’s note shows the sequence 1, 1, 2, 3, 5. Enter the next number as a four-digit code.", unlockAfter: 2 },
    { id: "exit", name: "Exit door", icon: "🚪", clue: "The lock needs the clock code, the secret word, and the safe code—in that order.", unlockAfter: 3 },
  ],
  puzzles: [
    { id: "clock-code", title: "The Broken Clock", prompt: "Enter the four-digit time code.", answer: "0315", hint: "Keep the leading zero: 3:15 becomes 0315.", objectId: "clock" },
    { id: "bookshelf-word", title: "The Secret Bookshelf", prompt: "Enter the word revealed by the books, in the painting’s order.", answer: "STAR", hint: "The painting’s first symbol is a star. Read the spine letters in that order.", objectId: "bookshelf" },
    { id: "safe-code", title: "The Locked Safe", prompt: "Enter the next number in the sequence as a four-digit code.", answer: "0008", hint: "Each number is the sum of the two before it. Pad 8 to four digits.", objectId: "safe" },
    { id: "exit-password", title: "Find the Exit Key", prompt: "Combine the clock code, secret word, and safe code with no spaces.", answer: "0315STAR0008", hint: "Use the three answers you have already found, in puzzle order.", objectId: "exit" },
  ],
};

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function roomInput(body) {
  const { title, description = "", durationMinutes, hintPenaltySeconds, objects, puzzles } = body || {};
  if (typeof title !== "string" || !title.trim() || title.trim().length > 100) {
    throw badRequest("Enter a room title no longer than 100 characters.");
  }
  if (typeof description !== "string" || description.length > 500) {
    throw badRequest("Enter a room description no longer than 500 characters.");
  }
  if (![5, 10, 15].includes(durationMinutes)) {
    throw badRequest("Choose a 5, 10, or 15 minute timer.");
  }
  if (!Number.isInteger(hintPenaltySeconds) || hintPenaltySeconds < 0 || hintPenaltySeconds > 300) {
    throw badRequest("Set a hint penalty between 0 and 300 seconds.");
  }
  if (!Array.isArray(objects) || objects.length < 1 || objects.length > 20) {
    throw badRequest("Add between 1 and 20 clickable room objects.");
  }
  if (!Array.isArray(puzzles) || puzzles.length < 1 || puzzles.length > 10) {
    throw badRequest("Add between 1 and 10 puzzles.");
  }
  const objectIds = new Set();
  for (const [index, item] of objects.entries()) {
    if (
      typeof item?.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(item.id) ||
      typeof item.name !== "string" || !item.name.trim() || item.name.trim().length > 80 ||
      typeof item.clue !== "string" || !item.clue.trim() || item.clue.length > 500 ||
      typeof item.icon !== "string" || item.icon.length > 12 ||
      !Number.isInteger(item.unlockAfter) || item.unlockAfter < 0 || item.unlockAfter >= puzzles.length
    ) {
      throw badRequest(`Check the name, clue, icon, and unlock condition for object ${index + 1}.`);
    }
    if (objectIds.has(item.id)) throw badRequest("Each room object needs a unique ID.");
    objectIds.add(item.id);
  }
  const puzzleIds = new Set();
  for (const [index, item] of puzzles.entries()) {
    if (
      typeof item?.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(item.id) ||
      typeof item.title !== "string" || !item.title.trim() || item.title.trim().length > 100 ||
      typeof item.prompt !== "string" || !item.prompt.trim() || item.prompt.length > 500 ||
      typeof item.answer !== "string" || !item.answer.trim() || item.answer.trim().length > 100 ||
      typeof item.hint !== "string" || !item.hint.trim() || item.hint.length > 300 ||
      !objectIds.has(item.objectId)
    ) {
      throw badRequest(`Check the title, prompt, answer, hint, and linked object for puzzle ${index + 1}.`);
    }
    if (puzzleIds.has(item.id)) throw badRequest("Each puzzle needs a unique ID.");
    puzzleIds.add(item.id);
  }
  return {
    title: title.trim(),
    description: description.trim(),
    durationMinutes,
    hintPenaltySeconds,
    objects,
    puzzles,
    isActive: true,
  };
}

async function findActiveMember(memberId) {
  if (!mongoose.isValidObjectId(memberId)) throw badRequest("Choose a valid member profile.");
  const member = await Member.findOne({ _id: memberId, isActive: true }).select("name");
  if (!member) throw badRequest("Choose an active member profile.");
  return member;
}

function publicRoom(room) {
  const puzzles = room.puzzles.map((puzzle) => {
    const safePuzzle = { ...puzzle };
    delete safePuzzle.answer;
    delete safePuzzle.hint;
    return safePuzzle;
  });
  return {
    _id: room._id,
    title: room.title,
    description: room.description,
    durationMinutes: room.durationMinutes,
    hintPenaltySeconds: room.hintPenaltySeconds,
    objects: room.objects,
    puzzles,
  };
}

function publicAttempt(attempt) {
  return {
    _id: attempt._id,
    room: attempt.room,
    member: attempt.member,
    startedAt: attempt.startedAt,
    durationMinutes: attempt.durationMinutes,
    status: attempt.status,
    discoveredObjects: attempt.discoveredObjects,
    solvedPuzzles: attempt.solvedPuzzles,
    hintedPuzzles: attempt.hintedPuzzles,
    hintPenaltySeconds: attempt.hintPenaltySeconds,
    incorrectAnswers: attempt.incorrectAnswers,
    completionSeconds: attempt.completionSeconds,
  };
}

async function loadAttempt(req, memberId) {
  if (!mongoose.isValidObjectId(req.params.attemptId)) return null;
  const attempt = await EscapeAttempt.findOne({ _id: req.params.attemptId, member: memberId });
  if (!attempt) return null;
  if (attempt.status === "playing") {
    const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    if (elapsed + attempt.hintPenaltySeconds >= attempt.durationMinutes * 60) {
      attempt.status = "time-up";
      attempt.completedAt = new Date();
      await attempt.save();
    }
  }
  return attempt;
}

router.get("/rooms", async (req, res, next) => {
  try {
    let rooms = await EscapeRoom.find({ isActive: true }).sort({ createdAt: 1 }).lean();
    if (!rooms.length) {
      const room = await EscapeRoom.findOneAndUpdate(
        { title: defaultRoom.title },
        { $setOnInsert: defaultRoom },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      rooms = [room];
    }
    let attempt = null;
    if (req.query.memberId) {
      await findActiveMember(req.query.memberId);
      attempt = await EscapeAttempt.findOne({
        member: req.query.memberId,
        status: "playing",
      }).sort({ startedAt: -1 });
      if (attempt) {
        const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
        if (elapsed + attempt.hintPenaltySeconds >= attempt.durationMinutes * 60) {
          attempt.status = "time-up";
          attempt.completedAt = new Date();
          await attempt.save();
          attempt = null;
        }
      }
    }
    const leaderboard = await EscapeAttempt.find({ status: "escaped" })
      .populate({ path: "member", select: "name" })
      .populate({ path: "room", select: "title" })
      .sort({ completionSeconds: 1, completedAt: 1 })
      .limit(10)
      .lean();
    return res.json({
      rooms: rooms.map(publicRoom),
      attempt: attempt ? publicAttempt(attempt) : null,
      leaderboard: leaderboard.map((item) => ({
        memberName: item.member?.name || "Former member",
        roomTitle: item.room?.title || "Secret Room",
        completionSeconds: item.completionSeconds,
        hintsUsed: item.hintedPuzzles.length,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.use("/admin", requireAdmin);

router.get("/admin", async (req, res, next) => {
  try {
    const [rooms, attempts] = await Promise.all([
      EscapeRoom.find().sort({ createdAt: 1 }).lean(),
      EscapeAttempt.find()
        .populate({ path: "room", select: "title" })
        .populate({ path: "member", select: "name" })
        .sort({ startedAt: -1 })
        .limit(200)
        .lean(),
    ]);
    return res.json({ rooms, attempts });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/rooms", async (req, res, next) => {
  try {
    const room = await EscapeRoom.create(roomInput(req.body));
    return res.status(201).json(room);
  } catch (error) {
    return next(error);
  }
});

router.put("/admin/rooms/:roomId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.roomId)) return res.status(404).json({ error: "Room not found." });
    if (await EscapeAttempt.exists({ room: req.params.roomId, status: "playing" })) {
      return res.status(409).json({ error: "This room cannot be edited while a mission is in progress." });
    }
    const room = await EscapeRoom.findByIdAndUpdate(
      req.params.roomId,
      { $set: roomInput(req.body) },
      { new: true, runValidators: true }
    );
    if (!room) return res.status(404).json({ error: "Room not found." });
    return res.json(room);
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/rooms/:roomId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.roomId)) return res.status(404).json({ error: "Room not found." });
    if (await EscapeAttempt.exists({ room: req.params.roomId, status: "playing" })) {
      return res.status(409).json({ error: "This room cannot be deleted while a mission is in progress." });
    }
    const room = await EscapeRoom.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/rooms/:roomId/start", async (req, res, next) => {
  try {
    const member = await findActiveMember(req.body?.memberId);
    if (!mongoose.isValidObjectId(req.params.roomId)) return res.status(404).json({ error: "Room not found." });
    const room = await EscapeRoom.findOne({ _id: req.params.roomId, isActive: true });
    if (!room) return res.status(404).json({ error: "Room not found." });
    const active = await EscapeAttempt.findOne({ room: room._id, member: member._id, status: "playing" });
    if (active) return res.status(409).json({ error: "You already have a mission in progress." });
    const attempt = await EscapeAttempt.create({
      room: room._id,
      member: member._id,
      durationMinutes: room.durationMinutes,
    });
    return res.status(201).json({ attempt: publicAttempt(attempt) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "You already have a mission in progress." });
    return next(error);
  }
});

router.patch("/attempts/:attemptId/object", async (req, res, next) => {
  try {
    const member = await findActiveMember(req.body?.memberId);
    const attempt = await loadAttempt(req, member._id);
    if (!attempt) return res.status(404).json({ error: "Mission not found." });
    if (attempt.status !== "playing") return res.status(409).json({ error: "This mission is no longer active." });
    const room = await EscapeRoom.findById(attempt.room).lean();
    const object = room?.objects.find((item) => item.id === req.body?.objectId);
    if (!object) throw badRequest("That object is not in this room.");
    if (attempt.solvedPuzzles.length < object.unlockAfter) throw badRequest("Solve the earlier puzzle to unlock this area.");
    if (!attempt.discoveredObjects.includes(object.id)) {
      attempt.discoveredObjects.push(object.id);
      await attempt.save();
    }
    return res.json({ attempt: publicAttempt(attempt), clue: object.clue });
  } catch (error) {
    return next(error);
  }
});

router.post("/attempts/:attemptId/answer", async (req, res, next) => {
  try {
    const member = await findActiveMember(req.body?.memberId);
    const attempt = await loadAttempt(req, member._id);
    if (!attempt) return res.status(404).json({ error: "Mission not found." });
    if (attempt.status !== "playing") return res.status(409).json({ error: "This mission is no longer active." });
    const room = await EscapeRoom.findById(attempt.room);
    const puzzleIndex = room?.puzzles.findIndex((item) => item.id === req.body?.puzzleId) ?? -1;
    if (!room || puzzleIndex < 0) throw badRequest("That puzzle is not in this room.");
    const puzzle = room.puzzles[puzzleIndex];
    if (attempt.solvedPuzzles.includes(puzzle.id)) throw badRequest("You already solved this puzzle.");
    if (attempt.solvedPuzzles.length !== puzzleIndex) throw badRequest("Solve the previous puzzle first.");
    if (!attempt.discoveredObjects.includes(puzzle.objectId)) throw badRequest("Explore the linked object first.");
    if (typeof req.body?.answer !== "string" || !req.body.answer.trim() || req.body.answer.length > 100) {
      throw badRequest("Enter your answer.");
    }
    const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    if (req.body.answer.trim().toLocaleUpperCase().replace(/[^A-Z0-9]/g, "") !== puzzle.answer.toLocaleUpperCase().replace(/[^A-Z0-9]/g, "")) {
      attempt.incorrectAnswers += 1;
      await attempt.save();
      return res.status(400).json({ error: "Not quite. Search the room and try again." });
    }
    attempt.solvedPuzzles.push(puzzle.id);
    const escaped = attempt.solvedPuzzles.length === room.puzzles.length;
    if (escaped) {
      attempt.status = "escaped";
      attempt.completedAt = new Date();
      attempt.completionSeconds = elapsed + attempt.hintPenaltySeconds;
    }
    await attempt.save();
    return res.json({
      attempt: publicAttempt(attempt),
      message: escaped ? "You escaped the Secret Room!" : "Puzzle solved. A new area has opened.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/attempts/:attemptId/hint", async (req, res, next) => {
  try {
    const member = await findActiveMember(req.body?.memberId);
    const attempt = await loadAttempt(req, member._id);
    if (!attempt) return res.status(404).json({ error: "Mission not found." });
    if (attempt.status !== "playing") return res.status(409).json({ error: "This mission is no longer active." });
    const room = await EscapeRoom.findById(attempt.room);
    const puzzleIndex = room?.puzzles.findIndex((item) => item.id === req.body?.puzzleId) ?? -1;
    if (!room || puzzleIndex < 0) throw badRequest("That puzzle is not in this room.");
    const puzzle = room.puzzles[puzzleIndex];
    if (attempt.solvedPuzzles.length !== puzzleIndex || !attempt.discoveredObjects.includes(puzzle.objectId)) {
      throw badRequest("Explore the unlocked puzzle before requesting a hint.");
    }
    if (attempt.hintedPuzzles.includes(puzzle.id)) throw badRequest("You have already used this hint.");
    attempt.hintedPuzzles.push(puzzle.id);
    attempt.hintPenaltySeconds += room.hintPenaltySeconds;
    await attempt.save();
    return res.json({
      attempt: publicAttempt(attempt),
      hint: puzzle.hint,
      penaltySeconds: room.hintPenaltySeconds,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/attempts/:attemptId/expire", async (req, res, next) => {
  try {
    const member = await findActiveMember(req.body?.memberId);
    const attempt = await loadAttempt(req, member._id);
    if (!attempt) return res.status(404).json({ error: "Mission not found." });
    if (attempt.status === "playing") {
      return res.status(409).json({ error: "There is still time left on your mission." });
    }
    return res.json({ attempt: publicAttempt(attempt) });
  } catch (error) {
    return next(error);
  }
});

export default router;
