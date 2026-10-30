import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, Eye, EyeOff, Plus, Shield, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateString(tomorrow);
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PlayZoneAdmin({ token }) {
  const [data, setData] = useState({ prompts: [], truths: [], trivia: [] });
  const [prompt, setPrompt] = useState("");
  const [promptGame, setPromptGame] = useState("trivia");
  const [question, setQuestion] = useState("");
  const [date, setDate] = useState(tomorrowString);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setData(await apiRequest("/play-zone/admin", { token }));
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest("/play-zone/admin", { token })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submitPrompt(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/play-zone/admin/prompts", {
        method: "POST",
        token,
        body: { game: promptGame, text: prompt },
      });
      setPrompt("");
      setNotice("Prompt added to the Play Zone.");
      await refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function scheduleTrivia(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/play-zone/admin/trivia", {
        method: "POST",
        token,
        body: { date, question, options, correctIndex },
      });
      setQuestion("");
      setOptions(["", "", "", ""]);
      setDate(tomorrowString());
      setCorrectIndex(0);
      setNotice("Trivia question scheduled.");
      await refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function performAction(path, method, body, successMessage) {
    setError("");
    setNotice("");
    try {
      await apiRequest(path, { method, token, body });
      setNotice(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  const inputClass = "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  const sectionClass = "rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7";

  return (
    <section className="space-y-6 lg:col-span-2">
      <header className="flex items-start gap-4 rounded-3xl bg-violet-900 p-6 text-white sm:p-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Shield size={24} />
        </span>
        <div>
          <h2 className="text-2xl font-black">Play Zone controls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-100">
            Create prompts, schedule daily trivia, moderate member posts, and close rounds when they are ready.
          </p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={sectionClass}>
          <h3 className="text-lg font-black text-slate-900">Create a prompt</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add an idea members can use when posting truths or creating trivia.
          </p>
          <form onSubmit={submitPrompt} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Game</span>
              <select value={promptGame} onChange={(event) => setPromptGame(event.target.value)} className={inputClass}>
                <option value="truths">Two Truths and a Lie</option>
                <option value="trivia">Daily Friend Trivia</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Prompt</span>
              <textarea required maxLength={240} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} className={inputClass} placeholder="What is a memory from our first year together?" />
            </label>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              <Plus size={16} /> Add prompt
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-extrabold text-slate-700">Saved prompts</h4>
            {data.prompts.map((item) => (
              <div key={item._id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <p className="min-w-0 flex-1 text-sm text-slate-700">
                  <span className="mr-2 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-extrabold uppercase text-violet-700">{item.game === "truths" ? "Truths" : "Trivia"}</span>
                  {item.text}
                </p>
                <button type="button" onClick={() => performAction(`/play-zone/admin/prompts/${item._id}`, "DELETE", undefined, "Prompt deleted.")} aria-label={`Delete prompt ${item.text}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!data.prompts.length && <p className="text-sm text-slate-400">No prompts yet.</p>}
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className="text-lg font-black text-slate-900">Schedule daily trivia</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">A scheduled question goes live on its selected date.</p>
          <form onSubmit={scheduleTrivia} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Go-live date</span>
              <input required type="date" min={localDateString()} value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Question</span>
              <textarea required maxLength={240} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} className={inputClass} placeholder="Ask the group about a shared memory…" />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">Answer options · select the correct one</p>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input required maxLength={160} value={option} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} className={`${inputClass} min-w-0 flex-1`} />
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <input type="radio" name="scheduled-correct-index" checked={correctIndex === index} onChange={() => setCorrectIndex(index)} className="accent-violet-600" />
                    Correct
                  </label>
                </div>
              ))}
            </div>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              <CalendarDays size={16} /> Schedule question
            </button>
          </form>
        </section>
      </div>

      <section className={sectionClass}>
        <div className="flex items-center gap-3">
          <Eye size={20} className="text-violet-600" />
          <div>
            <h3 className="text-lg font-black text-slate-900">Moderate rounds</h3>
            <p className="text-sm text-slate-500">Hidden content is removed from the games and leaderboard scoring.</p>
          </div>
        </div>
        {loading ? <p className="py-6 text-sm text-slate-500">Loading Play Zone records…</p> : (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Two Truths and a Lie</h4>
              {data.truths.map((round) => (
                <article key={round._id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{round.author?.name || "Former member"} · {formatDate(round.date)}</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
                        {round.statements.map((statement, index) => <li key={index}>{statement}</li>)}
                      </ol>
                      <p className="mt-2 text-xs text-slate-500">{round.guesses.length} {round.guesses.length === 1 ? "guess" : "guesses"}{round.isClosed ? " · closed" : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!round.isClosed && (
                        <button type="button" onClick={() => performAction(`/play-zone/admin/truths/${round._id}/close`, "PATCH", {}, "Round closed.")} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                          <Clock3 size={14} /> Close
                        </button>
                      )}
                      <button type="button" onClick={() => performAction(`/play-zone/admin/truths/${round._id}/moderation`, "PATCH", { isModerated: !round.isModerated }, round.isModerated ? "Round restored." : "Round hidden from members.")} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                        {round.isModerated ? <><Eye size={14} /> Restore</> : <><EyeOff size={14} /> Hide</>}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!data.truths.length && <p className="text-sm text-slate-400">No rounds submitted.</p>}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Trivia schedule and polls</h4>
              {data.trivia.map((item) => (
                <article key={item._id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-violet-600">{formatDate(item.date)} · {item.answers.length} {item.answers.length === 1 ? "answer" : "answers"}</p>
                      <p className="mt-1 font-bold text-slate-900">{item.question}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.author?.name || "Scheduled by admin"}{item.isClosed ? " · closed" : ""}{item.isModerated ? " · hidden" : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!item.isClosed && item.date <= localDateString() && !item.isModerated && (
                        <button type="button" onClick={() => performAction(`/play-zone/admin/trivia/${item._id}/close`, "PATCH", {}, "Trivia poll closed.")} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                          <Check size={14} /> Close
                        </button>
                      )}
                      <button type="button" onClick={() => performAction(`/play-zone/admin/trivia/${item._id}/moderation`, "PATCH", { isModerated: !item.isModerated }, item.isModerated ? "Question restored." : "Question hidden from members.")} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                        {item.isModerated ? <><Eye size={14} /> Restore</> : <><EyeOff size={14} /> Hide</>}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!data.trivia.length && <p className="text-sm text-slate-400">No scheduled questions yet.</p>}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
