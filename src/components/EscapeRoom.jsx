import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  DoorOpen,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { apiRequest } from "../lib/api";

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export default function EscapeRoom({ memberId }) {
  const [rooms, setRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [attempt, setAttempt] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(0);
  const [expired, setExpired] = useState(false);
  const expiryAttemptId = useRef("");
  const [loadedForMember, setLoadedForMember] = useState(null);

  const room = rooms.find((item) => item._id === roomId) || rooms[0];
  const loading = loadedForMember !== memberId;
  const currentPuzzleIndex = attempt?.solvedPuzzles.length || 0;
  const remainingSeconds = useMemo(() => {
    if (!attempt || attempt.status !== "playing") return 0;
    const elapsed = Math.floor((clock - new Date(attempt.startedAt).getTime()) / 1000);
    return attempt.durationMinutes * 60 - elapsed - attempt.hintPenaltySeconds;
  }, [attempt, clock]);
  const isPlaying = attempt?.status === "playing" && remainingSeconds > 0;

  async function loadRooms() {
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    const result = await apiRequest(`/escape-room/rooms${query}`);
    setRooms(result.rooms);
    setLeaderboard(result.leaderboard);
    if (result.attempt) {
      setAttempt(result.attempt);
      setRoomId(String(result.attempt.room));
    } else {
      setAttempt(null);
      setRoomId((current) => current || result.rooms[0]?._id || "");
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest(`/escape-room/rooms${memberId ? `?memberId=${encodeURIComponent(memberId)}` : ""}`)
      .then((result) => {
        if (!active) return;
        setRooms(result.rooms);
        setLeaderboard(result.leaderboard);
        setAttempt(result.attempt);
        setClock(Date.now());
        setRoomId(result.attempt ? String(result.attempt.room) : result.rooms[0]?._id || "");
        setError("");
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoadedForMember(memberId);
      });
    return () => {
      active = false;
    };
  }, [memberId]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!attempt || attempt.status !== "playing" || remainingSeconds > 0 || expired) return;
    if (expiryAttemptId.current === attempt._id) return;
    expiryAttemptId.current = attempt._id;
    apiRequest(`/escape-room/attempts/${attempt._id}/expire`, {
      method: "PATCH",
      body: { memberId },
    })
      .then(() => {
        setExpired(true);
        setMessage("Time is up. The door remains locked—start a new mission when you’re ready.");
      })
      .catch((expireError) => setError(expireError.message));
  }, [attempt, expired, memberId, remainingSeconds]);

  async function startMission() {
    if (!memberId || !room) return;
    setBusy(true);
    setError("");
    setMessage("");
    setExpired(false);
    expiryAttemptId.current = "";
    setSelectedObject(null);
    try {
      const result = await apiRequest(`/escape-room/rooms/${room._id}/start`, {
        method: "POST",
        body: { memberId },
      });
      setAttempt(result.attempt);
      setClock(Date.now());
      setMessage("The door clicks shut. Your mission starts now.");
    } catch (startError) {
      setError(startError.message);
    } finally {
      setBusy(false);
    }
  }

  async function explore(object) {
    if (!attempt || !isPlaying) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest(`/escape-room/attempts/${attempt._id}/object`, {
        method: "PATCH",
        body: { memberId, objectId: object.id },
      });
      setAttempt(result.attempt);
      setSelectedObject({ ...object, clue: result.clue });
    } catch (exploreError) {
      setError(exploreError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event, puzzle) {
    event.preventDefault();
    if (!attempt || !isPlaying) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest(`/escape-room/attempts/${attempt._id}/answer`, {
        method: "POST",
        body: { memberId, puzzleId: puzzle.id, answer },
      });
      setAttempt(result.attempt);
      setAnswer("");
      setSelectedObject(null);
      setMessage(result.message);
      if (result.attempt.status === "escaped") {
        await loadRooms();
        setAttempt(result.attempt);
      }
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestHint(puzzle) {
    if (!attempt || !isPlaying) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest(`/escape-room/attempts/${attempt._id}/hint`, {
        method: "POST",
        body: { memberId, puzzleId: puzzle.id },
      });
      setAttempt(result.attempt);
      setSelectedObject((current) => current ? { ...current, hint: result.hint } : current);
      setMessage(`Hint revealed · +${result.penaltySeconds} seconds added to your time.`);
    } catch (hintError) {
      setError(hintError.message);
    } finally {
      setBusy(false);
    }
  }

  const completed = attempt?.status === "escaped";

  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] border border-indigo-900/10 bg-[#101329] text-white shadow-xl shadow-indigo-950/10">
      <div className="relative overflow-hidden px-6 py-8 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.23em] text-amber-300">
              <Sparkles size={15} /> New mission · Escape room
            </p>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{room?.title || "The Secret Room"}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100/70">
                  {room?.description || "Search for hidden clues, crack the codes, and find your way out."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!isPlaying && rooms.length > 1 && (
                  <label className="sr-only" htmlFor="escape-room-choice">Choose escape room</label>
                )}
                {!isPlaying && rooms.length > 1 && (
                  <select id="escape-room-choice" value={room?._id || ""} onChange={(event) => { setRoomId(event.target.value); setAttempt(null); setSelectedObject(null); setMessage(""); setError(""); }} className="rounded-xl border border-white/10 bg-[#202440] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-300">
                    {rooms.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
                  </select>
                )}
                <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 font-mono text-lg font-black tabular-nums ${remainingSeconds <= 60 && isPlaying ? "border-red-300/40 bg-red-500/20 text-red-200" : "border-white/10 bg-white/5 text-amber-200"}`}>
                  <Clock3 size={18} />
                  {isPlaying ? formatTime(remainingSeconds) : `${room?.durationMinutes || 10}:00`}
                </div>
              </div>
            </div>

            {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            {message && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p>}

            {!memberId && (
              <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100/80">
                Choose your member profile above to start a mission and appear on the escape leaderboard.
              </p>
            )}

            {loading ? (
              <p className="mt-8 text-sm text-indigo-100/60">Unlocking the room…</p>
            ) : !isPlaying && !completed ? (
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button type="button" onClick={startMission} disabled={!memberId || busy || !room} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3.5 text-sm font-black text-indigo-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                  <KeyRound size={17} /> {busy ? "Unlocking…" : expired ? "Try again" : "Start mission"} <ArrowRight size={16} />
                </button>
                <p className="text-xs font-medium text-indigo-100/50">Your timer begins as soon as the door locks.</p>
              </div>
            ) : null}

            {isPlaying && room && (
              <>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-100/50">
                    Area {Math.min(currentPuzzleIndex + 1, room.puzzles.length)} of {room.puzzles.length} · {attempt.solvedPuzzles.length} solved
                  </p>
                  <p className="text-xs text-indigo-100/50">
                    {attempt.hintedPuzzles.length} hint{attempt.hintedPuzzles.length === 1 ? "" : "s"} used · {attempt.incorrectAnswers} wrong {attempt.incorrectAnswers === 1 ? "answer" : "answers"}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-violet-400 transition-all" style={{ width: `${(attempt.solvedPuzzles.length / room.puzzles.length) * 100}%` }} />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {room.objects.map((object) => {
                    const unlocked = attempt.solvedPuzzles.length >= object.unlockAfter;
                    const discovered = attempt.discoveredObjects.includes(object.id);
                    return (
                      <button
                        key={object.id}
                        type="button"
                        disabled={!unlocked || busy}
                        onClick={() => explore(object)}
                        className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition ${selectedObject?.id === object.id ? "border-amber-300 bg-amber-300/10" : discovered ? "border-emerald-300/20 bg-emerald-300/5" : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-2xl">{unlocked ? object.icon : <LockKeyhole size={19} />}</span>
                        <span className="min-w-0">
                          <span className="block font-bold">{object.name}</span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-indigo-100/45">
                            {discovered ? <><Check size={12} /> Clue found</> : unlocked ? <><Search size={12} /> Explore</> : "Area locked"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedObject && (
                  <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-100/[0.07] p-5">
                    <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-amber-200">{selectedObject.icon} {selectedObject.name} · clue</p>
                    <p className="mt-2 text-sm leading-6 text-indigo-50/85">{selectedObject.clue}</p>
                    {selectedObject.hint && <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-amber-100"><Lightbulb size={15} className="mr-2 inline" />{selectedObject.hint}</p>}
                  </div>
                )}

                <div className="mt-5 grid gap-3">
                  {room.puzzles.map((puzzle, index) => {
                    const solved = attempt.solvedPuzzles.includes(puzzle.id);
                    const isNext = index === currentPuzzleIndex;
                    const unlocked = isNext && attempt.discoveredObjects.includes(puzzle.objectId);
                    return (
                      <article key={puzzle.id} className={`rounded-2xl border p-4 sm:p-5 ${solved ? "border-emerald-300/20 bg-emerald-300/[0.05]" : unlocked ? "border-violet-300/30 bg-violet-300/[0.06]" : "border-white/5 bg-white/[0.025] opacity-60"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${solved ? "bg-emerald-300 text-emerald-950" : unlocked ? "bg-violet-300 text-indigo-950" : "bg-white/10 text-indigo-100/50"}`}>{solved ? <Check size={16} /> : index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold">{puzzle.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-indigo-100/65">{solved ? "Solved — a new area is unlocked." : unlocked ? puzzle.prompt : "Explore the previous area to unlock this puzzle."}</p>
                          </div>
                          {!unlocked && !solved && <LockKeyhole size={16} className="mt-1 shrink-0 text-indigo-100/30" />}
                        </div>
                        {unlocked && (
                          <form onSubmit={(event) => submitAnswer(event, puzzle)} className="mt-4 flex flex-wrap gap-2 pl-11">
                            <input value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={100} aria-label={`Answer for ${puzzle.title}`} placeholder="Enter your answer" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-indigo-100/30 focus:border-violet-300/60" />
                            <button type="submit" disabled={busy || !answer.trim()} className="rounded-xl bg-violet-300 px-4 py-3 text-sm font-extrabold text-indigo-950 hover:bg-violet-200 disabled:opacity-50">Unlock</button>
                            {!attempt.hintedPuzzles.includes(puzzle.id) && (
                              <button type="button" disabled={busy} onClick={() => requestHint(puzzle)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-indigo-100/70 hover:bg-white/5 disabled:opacity-50">
                                <Lightbulb size={15} /> Hint
                              </button>
                            )}
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {completed && (
              <div className="mt-7 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-6 sm:p-7">
                <div className="flex items-center gap-3 text-emerald-200">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/15"><DoorOpen size={24} /></span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.15em]">Mission accomplished</p>
                    <h3 className="mt-1 text-2xl font-black">You made it out!</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-indigo-50/75">
                  Escape time: {formatDuration(attempt.completionSeconds)} · {attempt.hintedPuzzles.length} hint{attempt.hintedPuzzles.length === 1 ? "" : "s"} used.
                </p>
                <button type="button" onClick={startMission} disabled={busy || !memberId} className="mt-5 rounded-full bg-emerald-300 px-5 py-3 text-sm font-extrabold text-emerald-950 hover:bg-emerald-200 disabled:opacity-50">Play again</button>
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-black/15 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Trophy size={20} /></span>
              <div>
                <h3 className="font-black">Escape leaderboard</h3>
                <p className="text-xs text-indigo-100/45">Fastest successful escapes</p>
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {leaderboard.map((entry, index) => (
                <li key={`${entry.memberName}-${entry.completionSeconds}-${index}`} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-black text-amber-200">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{entry.memberName}</span>
                    <span className="block truncate text-[11px] text-indigo-100/40">{entry.roomTitle} · {entry.hintsUsed} hints</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-100/70">{formatDuration(entry.completionSeconds)}</span>
                </li>
              ))}
              {!leaderboard.length && <li className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-indigo-100/40">No escapes recorded yet. Be the first!</li>}
            </ol>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-100/45">Mission rules</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-indigo-100/55">
                <li className="flex gap-2"><Search size={14} className="mt-0.5 shrink-0 text-amber-200" /> Explore objects to reveal hidden clues.</li>
                <li className="flex gap-2"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-amber-200" /> Solve each puzzle to open the next area.</li>
                <li className="flex gap-2"><Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-200" /> Hints add a time penalty.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
