import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Lightbulb, Plus, Save, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

const blankRoom = {
  title: "The Secret Room",
  description: "Search the room, solve each puzzle, and escape before time runs out.",
  durationMinutes: 10,
  hintPenaltySeconds: 30,
  objects: [{ id: "clock", name: "Broken clock", icon: "🕰️", clue: "A stopped clock holds the first code.", unlockAfter: 0 }],
  puzzles: [{ id: "first-code", title: "The first code", prompt: "Enter the code.", answer: "0315", hint: "Keep any leading zeroes.", objectId: "clock" }],
};

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function displayDate(value) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default function EscapeRoomAdmin({ token }) {
  const [rooms, setRooms] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [form, setForm] = useState(blankRoom);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const result = await apiRequest("/escape-room/admin", { token });
    setRooms(result.rooms);
    setAttempts(result.attempts);
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest("/escape-room/admin", { token })
      .then((result) => {
        if (active) {
          setRooms(result.rooms);
          setAttempts(result.attempts);
        }
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

  function editRoom(room) {
    setEditingId(room._id);
    setForm({
      title: room.title,
      description: room.description || "",
      durationMinutes: room.durationMinutes,
      hintPenaltySeconds: room.hintPenaltySeconds,
      objects: room.objects.map((item) => ({ ...item })),
      puzzles: room.puzzles.map((item) => ({ ...item })),
    });
    setError("");
    setNotice("");
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...blankRoom, objects: blankRoom.objects.map((item) => ({ ...item })), puzzles: blankRoom.puzzles.map((item) => ({ ...item })) });
  }

  async function saveRoom(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(editingId ? `/escape-room/admin/rooms/${editingId}` : "/escape-room/admin/rooms", {
        method: editingId ? "PUT" : "POST",
        token,
        body: {
          ...form,
          durationMinutes: Number(form.durationMinutes),
          hintPenaltySeconds: Number(form.hintPenaltySeconds),
          objects: form.objects.map((item) => ({ ...item, unlockAfter: Number(item.unlockAfter) })),
        },
      });
      setNotice(editingId ? "Escape room updated." : "Escape room created.");
      resetForm();
      await refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRoom(room) {
    if (!window.confirm(`Delete “${room.title}”? Its saved attempts will remain in the results.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/escape-room/admin/rooms/${room._id}`, { method: "DELETE", token });
      if (editingId === room._id) resetForm();
      setNotice("Escape room deleted.");
      await refresh();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function updateObject(index, field, value) {
    setForm((current) => ({
      ...current,
      objects: current.objects.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function updatePuzzle(index, field, value) {
    setForm((current) => ({
      ...current,
      puzzles: current.puzzles.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function addObject() {
    const id = makeId("object");
    setForm((current) => ({
      ...current,
      objects: [...current.objects, { id, name: "New object", icon: "🔎", clue: "", unlockAfter: 0 }],
    }));
  }

  function removeObject(index) {
    setForm((current) => {
      const nextObjects = current.objects.filter((_, itemIndex) => itemIndex !== index);
      const fallbackId = nextObjects[0]?.id || "";
      return {
        ...current,
        objects: nextObjects,
        puzzles: current.puzzles.map((item) => item.objectId === current.objects[index].id ? { ...item, objectId: fallbackId } : item),
      };
    });
  }

  function addPuzzle() {
    const id = makeId("puzzle");
    setForm((current) => ({
      ...current,
      puzzles: [...current.puzzles, { id, title: "New puzzle", prompt: "", answer: "", hint: "", objectId: current.objects[0]?.id || "" }],
    }));
  }

  function removePuzzle(index) {
    setForm((current) => ({
      ...current,
      puzzles: current.puzzles.filter((_, itemIndex) => itemIndex !== index),
      objects: current.objects.map((item) => ({ ...item, unlockAfter: Math.min(item.unlockAfter, Math.max(0, current.puzzles.length - 2)) })),
    }));
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  const sectionClass = "rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-indigo-900/10 bg-[#151833] p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300"><Clock3 size={15} /> Mission control</p>
        <h3 className="mt-3 text-2xl font-black">Escape room creator</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100/65">Build rooms, add clickable clues, link puzzles to objects, set the countdown and hint penalty, and review every attempt.</p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">{editingId ? "Edit escape room" : "Create an escape room"}</h3>
            <p className="mt-1 text-sm text-slate-500">Answers stay private on the server and are never sent to players before they solve a puzzle.</p>
          </div>
          {!editingId && <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">Room · objects · puzzles · locks</span>}
        </div>

        <form onSubmit={saveRoom} className="mt-6 space-y-7">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Room name</span>
              <input required maxLength={100} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Countdown timer</span>
              <select value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))} className={inputClass}>
                {[5, 10, 15].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Mission briefing</span>
              <textarea rows={2} maxLength={500} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
            </label>
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><Lightbulb size={15} /> Penalty per hint · seconds</span>
              <input required type="number" min={0} max={300} value={form.hintPenaltySeconds} onChange={(event) => setForm((current) => ({ ...current, hintPenaltySeconds: event.target.value }))} className={inputClass} />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h4 className="font-black text-slate-900">Clickable objects</h4><p className="mt-1 text-xs text-slate-500">Give each object a clue and choose how many puzzles must be solved before it appears.</p></div>
              <button type="button" onClick={addObject} disabled={form.objects.length >= 20} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><Plus size={15} /> Add object</button>
            </div>
            <div className="mt-4 space-y-3">
              {form.objects.map((item, index) => (
                <article key={item.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[90px_minmax(0,1fr)_170px_auto]">
                  <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Icon</span><input aria-label="Object icon" maxLength={12} value={item.icon} onChange={(event) => updateObject(index, "icon", event.target.value)} className={inputClass} /></label>
                  <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Object name</span><input required maxLength={80} value={item.name} onChange={(event) => updateObject(index, "name", event.target.value)} className={inputClass} /></label>
                  <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Unlocked after puzzles</span><select value={item.unlockAfter} onChange={(event) => updateObject(index, "unlockAfter", event.target.value)} className={inputClass}>{form.puzzles.map((puzzle, puzzleIndex) => <option key={puzzle.id} value={puzzleIndex}>{puzzleIndex === 0 ? "Start" : `${puzzleIndex} solved`}</option>)}</select></label>
                  <button type="button" onClick={() => removeObject(index)} disabled={form.objects.length <= 1} aria-label={`Remove ${item.name}`} className="self-end rounded-xl p-3 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={17} /></button>
                  <label className="md:col-span-4"><span className="mb-1.5 block text-xs font-bold text-slate-500">Clue revealed when clicked</span><textarea required rows={2} maxLength={500} value={item.clue} onChange={(event) => updateObject(index, "clue", event.target.value)} className={inputClass} /></label>
                </article>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h4 className="font-black text-slate-900">Puzzle manager & locks</h4><p className="mt-1 text-xs text-slate-500">Puzzles unlock in order. Connect each one to an object players must discover first.</p></div>
              <button type="button" onClick={addPuzzle} disabled={form.puzzles.length >= 10} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><Plus size={15} /> Add puzzle</button>
            </div>
            <div className="mt-4 space-y-3">
              {form.puzzles.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-violet-100 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-violet-700">Puzzle {index + 1} · {index ? `unlocks after puzzle ${index}` : "starting puzzle"}</p>
                    <button type="button" onClick={() => removePuzzle(index)} disabled={form.puzzles.length <= 1} aria-label={`Remove puzzle ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={16} /></button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Puzzle title</span><input required maxLength={100} value={item.title} onChange={(event) => updatePuzzle(index, "title", event.target.value)} className={inputClass} /></label>
                    <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Required room object</span><select value={item.objectId} onChange={(event) => updatePuzzle(index, "objectId", event.target.value)} className={inputClass}>{form.objects.map((object) => <option key={object.id} value={object.id}>{object.icon} {object.name}</option>)}</select></label>
                    <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-500">Riddle / prompt</span><textarea required rows={2} maxLength={500} value={item.prompt} onChange={(event) => updatePuzzle(index, "prompt", event.target.value)} className={inputClass} /></label>
                    <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Correct answer · private</span><input required maxLength={100} value={item.answer} onChange={(event) => updatePuzzle(index, "answer", event.target.value)} className={inputClass} /></label>
                    <label><span className="mb-1.5 block text-xs font-bold text-slate-500">Hint revealed on request</span><textarea required rows={2} maxLength={300} value={item.hint} onChange={(event) => updatePuzzle(index, "hint", event.target.value)} className={inputClass} /></label>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"><Save size={16} /> {saving ? "Saving…" : editingId ? "Save room" : "Create room"}</button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel edit</button>}
          </div>
        </form>
      </section>

      <section className={sectionClass}>
        <h3 className="text-lg font-black text-slate-900">Rooms</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rooms.map((room) => (
            <article key={room._id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-2xl">🗝️</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-900">{room.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">{room.durationMinutes} min · {room.objects.length} objects · {room.puzzles.length} puzzles · {room.hintPenaltySeconds}s per hint</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-500">{room.description}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => editRoom(room)} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800"><Check size={13} /> Edit room</button>
                <button type="button" onClick={() => deleteRoom(room)} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={13} /> Delete</button>
              </div>
            </article>
          ))}
          {!loading && !rooms.length && <p className="text-sm text-slate-400">No rooms have been created yet. The default Secret Room appears when a player first opens Play Zone.</p>}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-lg font-black text-slate-900">Mission results</h3>
        <p className="mt-1 text-sm text-slate-500">Player attempts, progress, hints, and successful completion times.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr><th className="py-2 pr-4">Player</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Puzzles</th><th className="py-2 pr-4">Hints</th><th className="py-2 pr-4">Wrong answers</th><th className="py-2">Started</th></tr>
            </thead>
            <tbody>
              {attempts.map((item) => (
                <tr key={item._id} className="border-b border-slate-50 text-slate-700">
                  <td className="py-3 pr-4 font-semibold">{item.member?.name || "Former member"}</td>
                  <td className="py-3 pr-4">{item.room?.title || "Deleted room"}</td>
                  <td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "escaped" ? "bg-emerald-50 text-emerald-700" : item.status === "time-up" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "escaped" ? `Escaped · ${item.completionSeconds}s` : item.status === "time-up" ? "Time up" : "In progress"}</span></td>
                  <td className="py-3 pr-4">{item.solvedPuzzles.length}</td>
                  <td className="py-3 pr-4">{item.hintedPuzzles.length}</td>
                  <td className="py-3 pr-4">{item.incorrectAnswers}</td>
                  <td className="py-3">{displayDate(item.startedAt)}</td>
                </tr>
              ))}
              {!loading && !attempts.length && <tr><td colSpan={7} className="py-5 text-slate-400">No mission attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
