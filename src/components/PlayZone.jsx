import { useEffect, useState } from "react";
import {
  Brain,
  Check,
  CircleHelp,
  Gamepad2,
  Lightbulb,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";

const MEMBER_KEY = "friendszone-play-zone-member";

function todayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function PlayZone() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState(() => localStorage.getItem(MEMBER_KEY) || "");
  const [gameState, setGameState] = useState(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statements, setStatements] = useState(["", "", ""]);
  const [lieIndex, setLieIndex] = useState(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/members", { signal: controller.signal })
      .then((result) => {
        setMembers(result);
        const savedMemberId = localStorage.getItem(MEMBER_KEY) || "";
        const activeMember = result.some((member) => member._id === savedMemberId);
        const nextMemberId = activeMember ? savedMemberId : "";
        setMemberId(nextMemberId);
        if (nextMemberId) localStorage.setItem(MEMBER_KEY, nextMemberId);
        else localStorage.removeItem(MEMBER_KEY);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMembersLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    apiRequest(`/play-zone${query}`, { signal: controller.signal })
      .then(setGameState)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [memberId]);

  function chooseMember(event) {
    const nextMemberId = event.target.value;
    setMemberId(nextMemberId);
    setLoading(true);
    if (nextMemberId) localStorage.setItem(MEMBER_KEY, nextMemberId);
    else localStorage.removeItem(MEMBER_KEY);
    setError("");
    setNotice("");
  }

  async function refreshGameState() {
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    setGameState(await apiRequest(`/play-zone${query}`));
  }

  async function submitTruths(event) {
    event.preventDefault();
    if (lieIndex === null) {
      setError("Mark which statement is the lie before posting.");
      return;
    }
    setSaving("truths");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/play-zone/truths", {
        method: "POST",
        body: { memberId, statements, lieIndex },
      });
      setNotice(result.message);
      setStatements(["", "", ""]);
      setLieIndex(null);
      await refreshGameState();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving("");
    }
  }

  async function guessLie(roundId, statementIndex) {
    setSaving(`guess-${roundId}`);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/play-zone/truths/${roundId}/guess`, {
        method: "POST",
        body: { memberId, statementIndex },
      });
      setNotice(result.message);
      await refreshGameState();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving("");
    }
  }

  async function submitQuestion(event) {
    event.preventDefault();
    setSaving("question");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/play-zone/trivia", {
        method: "POST",
        body: { memberId, question, options, correctIndex },
      });
      setNotice(result.message);
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      await refreshGameState();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving("");
    }
  }

  async function answerTrivia(optionIndex) {
    setSaving("trivia-answer");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/play-zone/trivia/answer", {
        method: "POST",
        body: { memberId, optionIndex },
      });
      setNotice(result.message);
      await refreshGameState();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving("");
    }
  }

  const ownRound = gameState?.truths?.some(
    (round) => round.author._id === memberId
  );
  const activeTrivia = gameState?.trivia;
  const selectedMember = members.find((member) => member._id === memberId);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em] text-violet-600">
              <Gamepad2 size={17} /> Play Zone
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              More laughs, <span className="text-violet-600">more points.</span>
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-500">
              Take a turn, test your friend knowledge, and see who knows the
              group best.
            </p>
            <Link to="/admin" className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:text-pink-600">
              Admin controls <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>
          <label className="min-w-52">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Playing as
            </span>
            <select
              value={memberId}
              onChange={chooseMember}
              disabled={membersLoading || !members.length}
              className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
            >
              <option value="">
                {membersLoading ? "Loading friends…" : "Choose your profile"}
              </option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {notice}
          </p>
        )}
        {!selectedMember && !membersLoading && members.length > 0 && (
          <p className="mb-5 rounded-2xl border border-violet-200 bg-white px-5 py-3 text-sm text-violet-800">
            Choose your member profile to submit statements, guess, and earn points.
          </p>
        )}
        {!membersLoading && members.length === 0 && (
          <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            Add active members before starting the games.
          </p>
        )}

        {loading ? (
          <div className="rounded-3xl border border-violet-100 bg-white p-8 text-center text-sm text-slate-500">
            Loading today's games…
          </div>
        ) : gameState ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
            <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                  <Sparkles size={24} />
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Two Truths and a Lie
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Post three things about yourself. Friends get one guess to spot the lie.
                  </p>
                </div>
              </div>

              {selectedMember && !ownRound && (
                <form onSubmit={submitTruths} className="mt-6 rounded-2xl bg-violet-50 p-4">
                  <p className="mb-3 text-sm font-extrabold text-violet-900">
                    Your turn to fool the group
                  </p>
                  {gameState.prompts?.some((item) => item.game === "truths") && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {gameState.prompts.filter((item) => item.game === "truths").slice(0, 4).map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => setStatements((current) => {
                            const index = current.findIndex((statement) => !statement.trim());
                            const targetIndex = index < 0 ? 0 : index;
                            return current.map((statement, itemIndex) => itemIndex === targetIndex ? item.text : statement);
                          })}
                          className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-violet-800 hover:bg-violet-100"
                        >
                          Idea: {item.text}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    {statements.map((statement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          required
                          maxLength={240}
                          value={statement}
                          onChange={(event) => setStatements((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                          )}
                          placeholder={`Statement ${index + 1}`}
                          aria-label={`Statement ${index + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
                          <input
                            type="radio"
                            name="lie-index"
                            checked={lieIndex === index}
                            onChange={() => setLieIndex(index)}
                            aria-label={`Statement ${index + 1} is the lie`}
                            className="accent-violet-600"
                          />
                          Lie
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={saving === "truths"}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    <Send size={15} /> {saving === "truths" ? "Posting…" : "Post my round"}
                  </button>
                </form>
              )}
              {selectedMember && ownRound && (
                <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-medium text-violet-800">
                  Your round is live! Come back tomorrow to post another.
                </p>
              )}
              {!selectedMember && (
                <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">
                  Choose your profile to post or guess.
                </p>
              )}

              <div className="mt-6 space-y-4">
                {gameState.truths.map((round) => {
                  const isOwnRound = round.author._id === memberId;
                  return (
                    <div key={round._id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-extrabold text-slate-800">
                          {isOwnRound ? "Your round" : `${round.author.name}'s round`}
                          {round.isModerated ? " · hidden by admin" : ""}
                        </p>
                        <span className="text-xs font-medium text-slate-400">
                          {round.guessesCount} {round.guessesCount === 1 ? "guess" : "guesses"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {round.statements.map((statement, index) => {
                          const isLie = round.lieIndex === index;
                          const revealed = round.lieIndex !== null;
                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={!selectedMember || isOwnRound || round.hasGuessed || round.isClosed || round.isModerated || saving === `guess-${round._id}`}
                              onClick={() => guessLie(round._id, index)}
                              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                                revealed && isLie
                                  ? "border-pink-300 bg-pink-50 text-pink-900"
                                  : revealed
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                    : "border-slate-100 text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                              } disabled:cursor-default`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-violet-600">
                                {index + 1}
                              </span>
                              <span className="flex-1">{statement}</span>
                              {revealed && isLie && <span className="text-xs font-extrabold">Lie</span>}
                            </button>
                          );
                        })}
                      </div>
                      {round.hasGuessed && (
                        <p className={`mt-3 text-xs font-bold ${round.guessedCorrectly ? "text-emerald-700" : "text-slate-500"}`}>
                          {round.guessedCorrectly ? "Correct guess — +1 point!" : "The lie is revealed above."}
                        </p>
                      )}
                      {round.isClosed && (
                        <p className="mt-3 text-xs font-bold text-slate-500">This round is closed.</p>
                      )}
                      {isOwnRound && (
                        <p className="mt-3 text-xs font-semibold text-violet-600">
                          Your lie is statement {round.lieIndex + 1}.
                        </p>
                      )}
                      {selectedMember && !isOwnRound && !round.hasGuessed && (
                        <p className="mt-3 text-xs text-slate-400">Tap a statement to lock in your guess.</p>
                      )}
                    </div>
                  );
                })}
                {!gameState.truths.length && (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
                    No rounds yet today. Be the first to share yours!
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Brain size={24} />
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Daily Friend Trivia</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {todayLabel()} · one question, one answer, every day.
                  </p>
                </div>
              </div>

              {!activeTrivia && selectedMember && (
                <form onSubmit={submitQuestion} className="mt-6 rounded-2xl bg-amber-50 p-4">
                  <p className="mb-3 text-sm font-extrabold text-amber-900">
                    Set today's question
                  </p>
                  <p className="mb-3 text-xs leading-5 text-amber-800">
                    Pick a group memory, college moment, favourite or inside joke.
                  </p>
                  {gameState.prompts?.some((item) => item.game === "trivia") && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {gameState.prompts.filter((item) => item.game === "trivia").slice(0, 4).map((item) => (
                        <button key={item._id} type="button" onClick={() => setQuestion(item.text)} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100">
                          {item.text}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    required
                    maxLength={240}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What was our first group trip?"
                    aria-label="Today's trivia question"
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="mt-3 space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          required
                          maxLength={160}
                          value={option}
                          onChange={(event) => setOptions((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                          )}
                          placeholder={`Answer ${index + 1}`}
                          aria-label={`Answer option ${index + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
                          <input
                            type="radio"
                            name="correct-option"
                            checked={correctIndex === index}
                            onChange={() => setCorrectIndex(index)}
                            aria-label={`Answer option ${index + 1} is correct`}
                            className="accent-amber-500"
                          />
                          Correct
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={saving === "question"}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                  >
                    <Send size={15} /> {saving === "question" ? "Setting…" : "Set today's trivia"}
                  </button>
                </form>
              )}
              {!activeTrivia && !selectedMember && (
                <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  Today's trivia is waiting for a friend to set the question.
                </p>
              )}

              {activeTrivia ? (
                <div className="mt-6 rounded-2xl bg-amber-50 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-700">
                    <CircleHelp size={15} /> Today's question · by {activeTrivia.authorName}{activeTrivia.isClosed ? " · closed" : ""}
                  </div>
                  <h4 className="text-lg font-extrabold leading-7 text-slate-900">
                    {activeTrivia.question}
                  </h4>
                  <div className="mt-4 space-y-2">
                    {activeTrivia.options.map((option, index) => {
                      const revealed = activeTrivia.correctIndex !== null;
                      const isCorrect = index === activeTrivia.correctIndex;
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={!selectedMember || activeTrivia.isAuthor || activeTrivia.hasAnswered || activeTrivia.isClosed || saving === "trivia-answer"}
                          onClick={() => answerTrivia(index)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                            revealed && isCorrect
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : revealed
                                ? "border-amber-100 bg-white/70 text-slate-500"
                                : "border-amber-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-100"
                          } disabled:cursor-default`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                            {revealed && isCorrect ? <Check size={14} /> : String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  {activeTrivia.hasAnswered && (
                    <p className={`mt-4 text-sm font-bold ${activeTrivia.answerIsCorrect ? "text-emerald-700" : "text-slate-600"}`}>
                      {activeTrivia.answerIsCorrect ? "That's right — +1 point!" : "Not quite. The answer is highlighted."}
                    </p>
                  )}
                  {activeTrivia.isAuthor && (
                    <p className="mt-4 text-sm font-semibold text-amber-800">
                      You set today's question — see how many friends get it right!
                    </p>
                  )}
                  {activeTrivia.isClosed && (
                    <p className="mt-4 text-sm font-semibold text-slate-600">This trivia poll is closed.</p>
                  )}
                  {!activeTrivia.isAuthor && !activeTrivia.hasAnswered && !activeTrivia.isClosed && selectedMember && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-amber-800">
                      <Lightbulb size={14} /> One chance to answer today.
                    </p>
                  )}
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-100 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-600">Today's participation</span>
                <span className="font-extrabold text-amber-700">
                  {gameState.triviaParticipants} / {members.length}
                </span>
              </div>
            </article>

            <aside className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Trophy size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Friend leaderboard</h3>
                  <p className="text-xs text-slate-500">One point for each correct answer</p>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {gameState.leaderboard.map((member, index) => (
                  <li
                    key={member._id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                      member._id === memberId ? "bg-violet-50" : "bg-slate-50"
                    }`}
                  >
                    <span className="w-5 text-center text-sm font-black text-violet-500">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">
                        {member.name}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {member.triviaDays} trivia {member.triviaDays === 1 ? "day" : "days"}
                      </span>
                    </span>
                    <span className="text-sm font-black text-violet-700">
                      {member.points} pts
                    </span>
                  </li>
                ))}
              </ol>
              {!gameState.leaderboard.length && (
                <p className="mt-5 text-sm text-slate-500">No active members yet.</p>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
