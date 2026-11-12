import { useEffect, useRef, useState } from "react";
import {
  Award,
  Lightbulb,
  Puzzle as PuzzleIcon,
  RotateCcw,
  Shuffle,
  Timer,
  Trophy,
} from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

function shuffledBoard(size) {
  let tiles = Array.from({ length: size * size }, (_, index) => index + 1);
  do {
    for (let index = tiles.length - 1; index > 0; index -= 1) {
      const nextIndex = Math.floor(Math.random() * (index + 1));
      [tiles[index], tiles[nextIndex]] = [tiles[nextIndex], tiles[index]];
    }
  } while (tiles.every((tile, index) => tile === index + 1));
  return tiles;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function currentTimestamp() {
  return Date.now();
}

export default function PicturePuzzle({ memberId }) {
  const [game, setGame] = useState(null);
  const [loadedMemberId, setLoadedMemberId] = useState(null);
  const [board, setBoard] = useState([]);
  const [startingBoard, setStartingBoard] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const startedAtRef = useRef(null);
  const activeMemberIdRef = useRef(memberId);

  useEffect(() => {
    activeMemberIdRef.current = memberId;
  }, [memberId]);

  useEffect(() => {
    const controller = new AbortController();
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    apiRequest(`/play-zone/puzzle${query}`, { signal: controller.signal })
      .then((result) => {
        setGame(result);
        setLoadedMemberId(memberId);
        setError("");
        setStartedAt(null);
        startedAtRef.current = null;
        setElapsedSeconds(0);
        setMoves(0);
        setHintsUsed(0);
        setShowHint(false);
        setSelectedIndex(null);
        setExpired(false);
        if (result.puzzle && !result.completed) {
          const nextBoard = shuffledBoard(result.puzzle.size);
          setBoard(nextBoard);
          setStartingBoard(nextBoard);
        } else {
          setBoard([]);
          setStartingBoard([]);
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      });
    return () => controller.abort();
  }, [memberId]);

  const activeGame = loadedMemberId === memberId ? game : null;
  const puzzle = activeGame?.puzzle;
  const isSolved = Boolean(board.length && board.every((tile, index) => tile === index + 1));
  const scoreSaved = activeGame?.completed || false;

  useEffect(() => {
    if (!startedAt || !puzzle || scoreSaved || expired) return undefined;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(seconds);
      if (seconds >= puzzle.timeLimitSeconds) setExpired(true);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startedAt, scoreSaved, expired, puzzle]);

  async function saveScore(timeSeconds, moveCount) {
    const scoringMemberId = memberId;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest("/play-zone/puzzle/complete", {
        method: "POST",
        body: {
          memberId,
          puzzleId: puzzle._id,
          challengeDate: activeGame.challengeDate,
          timeSeconds,
          moves: moveCount,
          hintsUsed,
        },
      });
      if (activeMemberIdRef.current === scoringMemberId) {
        setGame((current) => ({ ...current, completed: true, ownScore: result.score }));
      }
      try {
        const refreshed = await apiRequest(
          `/play-zone/puzzle?memberId=${encodeURIComponent(scoringMemberId)}`
        );
        if (activeMemberIdRef.current === scoringMemberId) {
          setGame(refreshed);
          setError("");
        }
      } catch (refreshError) {
        if (activeMemberIdRef.current === scoringMemberId) {
          setError(`Your score was saved, but the leaderboard could not be refreshed: ${refreshError.message}`);
        }
      }
      return result;
    } catch (saveError) {
      if (activeMemberIdRef.current === scoringMemberId) setError(saveError.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  function moveTile(sourceIndex, targetIndex) {
    if (!memberId || expired || scoreSaved || saving || isSolved) return;
    const tile = board[sourceIndex];
    if (sourceIndex === targetIndex || tile !== targetIndex + 1) return;

    const now = currentTimestamp();
    const start = startedAtRef.current || now;
    if (!startedAtRef.current) {
      startedAtRef.current = now;
      setStartedAt(now);
    }
    const nextBoard = [...board];
    [nextBoard[sourceIndex], nextBoard[targetIndex]] = [
      nextBoard[targetIndex],
      nextBoard[sourceIndex],
    ];
    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setMoves(nextMoves);
    setSelectedIndex(null);

    if (nextBoard.every((nextTile, tileIndex) => nextTile === tileIndex + 1)) {
      const timeSeconds = Math.max(1, Math.ceil((now - start) / 1000));
      setElapsedSeconds(timeSeconds);
      void saveScore(timeSeconds, nextMoves);
    }
    return true;
  }

  function handleTileClick(index) {
    if (selectedIndex === null) {
      if (board[index] !== index + 1) setSelectedIndex(index);
      return;
    }

    if (moveTile(selectedIndex, index)) return;
    setSelectedIndex(board[index] !== index + 1 ? index : null);
  }

  function resetBoard(shuffle = false) {
    if (!puzzle || scoreSaved || saving) return;
    const nextBoard = shuffle ? shuffledBoard(puzzle.size) : [...startingBoard];
    setBoard(nextBoard);
    setSelectedIndex(null);
    if (shuffle) setStartingBoard(nextBoard);
    setStartedAt(null);
    startedAtRef.current = null;
    setElapsedSeconds(0);
    setMoves(0);
    setHintsUsed(0);
    setExpired(false);
    setShowHint(false);
    setError("");
  }

  function toggleHint() {
    setShowHint((visible) => !visible);
    if (!showHint) setHintsUsed((count) => count + 1);
  }

  if (!activeGame && !error) {
    return (
      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-7 text-center text-sm text-slate-500">
        Loading today's picture puzzle…
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <PuzzleIcon size={24} />
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-pink-600">
              {puzzle?.scheduleType === "weekly" ? "Weekly picture puzzle" : "Daily picture puzzle"}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              {puzzle?.title || "Picture Jigsaw Puzzle"}
            </h2>
            {puzzle?.description && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{puzzle.description}</p>
            )}
          </div>
        </div>
        {puzzle && (
          <div className="flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800">
            <Timer size={16} /> {formatTime(Math.max(0, puzzle.timeLimitSeconds - elapsedSeconds))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!puzzle ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          {error ? "The picture puzzle could not be loaded." : "No picture puzzle is scheduled for today yet."}
        </p>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{puzzle.size} × {puzzle.size}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{moves} moves</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">−10 points per hint</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => resetBoard(true)} disabled={scoreSaved || saving} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
                  <Shuffle size={14} /> Shuffle
                </button>
                <button type="button" onClick={() => resetBoard(false)} disabled={scoreSaved || saving} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
                  <RotateCcw size={14} /> Restart
                </button>
                <button type="button" onClick={toggleHint} className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-200">
                  <Lightbulb size={14} /> {showHint ? "Hide hint" : "Hint"}
                </button>
              </div>
            </div>
            {showHint && (
              <img src={apiAssetUrl(puzzle.imageUrl)} alt="Original completed puzzle image" className="mb-4 max-h-56 w-full rounded-2xl object-contain bg-slate-50" />
            )}
            {activeGame.completed && activeGame.ownScore && (
              <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Puzzle complete! {game.ownScore.points} points · {formatTime(game.ownScore.timeSeconds)} · {game.ownScore.moves} moves
              </p>
            )}
            {expired && !scoreSaved && (
              <p role="status" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Time is up. Shuffle the board to try again.
              </p>
            )}
            {!memberId && (
              <p className="mb-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800">
                Choose your member profile above to start and save a score.
              </p>
            )}
            <p className="mb-3 text-sm text-slate-600">
              Drag each piece to its matching spot. Pieces swap places; you can also select a piece, then select its destination.
            </p>
            <div
              className="mx-auto grid aspect-square w-full max-w-[500px] overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg"
              style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}
              aria-label={`${puzzle.size} by ${puzzle.size} picture jigsaw puzzle`}
            >
              {board.map((tile, index) => {
                const sourceIndex = tile - 1;
                const isPlaced = tile === index + 1;
                const canMove = memberId && !expired && !scoreSaved && !saving && !isSolved;
                return (
                  <button
                    key={tile}
                    type="button"
                    onClick={() => handleTileClick(index)}
                    draggable={Boolean(canMove && !isPlaced)}
                    onDragStart={(event) => {
                      if (!canMove || isPlaced) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragOver={(event) => {
                      if (canMove && !isPlaced) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
                      if (Number.isInteger(sourceIndex)) moveTile(sourceIndex, index);
                    }}
                    disabled={!canMove || isPlaced}
                    aria-label={`Piece ${tile} of ${board.length}, destination ${tile}${isPlaced ? ", correctly placed" : ""}`}
                    aria-pressed={selectedIndex === index}
                    className={`m-0.5 min-h-0 min-w-0 rounded-lg border bg-no-repeat shadow-sm transition hover:brightness-110 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-default ${
                      isPlaced
                        ? "border-emerald-300 ring-2 ring-inset ring-emerald-400"
                        : selectedIndex === index
                          ? "border-violet-700 ring-4 ring-inset ring-violet-500"
                          : "border-white/60"
                    }`}
                    style={{
                      backgroundImage: `url("${apiAssetUrl(puzzle.imageUrl)}")`,
                      backgroundSize: `${puzzle.size * 100}% ${puzzle.size * 100}%`,
                      backgroundPosition: `${(sourceIndex % puzzle.size) * 100 / (puzzle.size - 1)}% ${Math.floor(sourceIndex / puzzle.size) * 100 / (puzzle.size - 1)}%`,
                    }}
                  />
                );
              })}
            </div>
            {isSolved && !scoreSaved && (
              <div className="mt-3 text-center">
                <p className="text-sm font-bold text-violet-700">
                  {saving ? "Saving your completion…" : "Puzzle solved!"}
                </p>
                {!saving && error && (
                  <button type="button" onClick={() => void saveScore(Math.max(1, elapsedSeconds), moves)} className="mt-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                    Retry saving score
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 p-5">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <Trophy size={18} className="text-amber-500" /> Fastest friends
              </div>
              <ol className="mt-4 space-y-3">
                {activeGame.leaderboard.map((entry, index) => (
                  <li key={`${entry.memberId}-${index}`} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-center font-black text-violet-600">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{entry.name}</span>
                    <span className="font-black text-violet-700">{formatTime(entry.timeSeconds)}</span>
                  </li>
                ))}
                {!activeGame.leaderboard.length && <li className="text-sm text-slate-500">Be the first to set a time!</li>}
              </ol>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <Award size={18} /> Puzzle badges
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeGame.badges.map((badge) => (
                  <span key={badge} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-800">{badge}</span>
                ))}
                {!activeGame.badges.length && <p className="text-sm text-amber-800">Complete puzzles to earn champion badges.</p>}
              </div>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Earn {puzzle.size * 100} points for a finish, minus 10 for each hint. Your best daily time appears on the leaderboard.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
