import { useEffect, useState } from "react";
import { Check, Heart, Pin, PinOff, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

const categoryLabels = {
  "thank-you": "Thank you",
  compliment: "Compliment",
  motivation: "Motivation",
  memory: "Friendship memory",
};

export default function AppreciationWallAdmin({ token }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/admin/appreciation-wall", { token, signal: controller.signal })
      .then(setNotes)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  async function moderate(note, action) {
    setUpdatingId(note._id);
    setError("");
    setNotice("");
    try {
      if (action === "delete") {
        if (!window.confirm("Delete this appreciation note? This cannot be undone.")) return;
        await apiRequest(`/admin/appreciation-wall/${note._id}`, { method: "DELETE", token });
        setNotes((current) => current.filter((item) => item._id !== note._id));
        setNotice("Appreciation note deleted.");
      } else {
        const path = action === "approve" ? "approve" : "pin";
        const body = action === "pin" ? { pinned: !note.pinned } : undefined;
        await apiRequest(`/admin/appreciation-wall/${note._id}/${path}`, {
          method: "PUT",
          body,
          token,
        });
        setNotes((current) => current.map((item) => item._id === note._id
          ? action === "approve" ? { ...item, status: "approved" } : { ...item, pinned: !item.pinned }
          : item));
        setNotice(action === "approve" ? "Note approved and shared." : note.pinned ? "Note unpinned." : "Note pinned.");
      }
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const pending = notes.filter((note) => note.status === "pending");
  const approved = notes.filter((note) => note.status === "approved");

  function NoteCard({ note, isPending }) {
    return (
      <article className={`rounded-2xl border p-4 ${isPending ? "border-amber-100 bg-amber-50/40" : "border-slate-100 bg-white"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-violet-50 px-3 py-1 font-bold text-violet-700">{categoryLabels[note.category]}</span>
          <span className="text-slate-500">To {note.recipient?.name || "Unknown member"}</span>
          <span className="text-slate-400">{note.anonymous ? "Anonymous (author: " + (note.author?.name || "Unknown") + ")" : "By " + (note.author?.name || "Unknown")}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {isPending && (
            <button type="button" disabled={Boolean(updatingId)} onClick={() => moderate(note, "approve")} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Check size={15} /> {updatingId === note._id ? "Working…" : "Approve"}
            </button>
          )}
          {!isPending && (
            <button type="button" disabled={Boolean(updatingId)} onClick={() => moderate(note, "pin")} className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
              {note.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              {note.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          <button type="button" disabled={Boolean(updatingId)} onClick={() => moderate(note, "delete")} aria-label="Delete appreciation note" className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-700"><Heart size={22} /></span>
        <div>
          <h2 className="text-xl font-black text-slate-900">Appreciation Wall moderation</h2>
          <p className="text-sm text-slate-500">Review notes before they appear publicly. Anonymous authors remain visible to admins.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading appreciation notes…</p>
      ) : (
        <>
          <h3 className="mb-3 mt-7 font-bold text-slate-800">Awaiting approval ({pending.length})</h3>
          {pending.length ? (
            <div className="grid gap-4 md:grid-cols-2">{pending.map((note) => <NoteCard key={note._id} note={note} isPending />)}</div>
          ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">There are no notes waiting for approval.</p>}

          <h3 className="mb-3 mt-8 font-bold text-slate-800">Published notes ({approved.length})</h3>
          {approved.length ? (
            <div className="grid gap-4 md:grid-cols-2">{approved.map((note) => <NoteCard key={note._id} note={note} isPending={false} />)}</div>
          ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No notes have been published yet.</p>}
        </>
      )}
    </section>
  );
}
