import { useEffect, useState } from "react";
import { Check, Clock3, Images, Trash2 } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";

export default function MemoryLaneAdmin({ token }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/admin/memory-lane", { token, signal: controller.signal })
      .then(setSubmissions)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  async function publishMemory(memory) {
    setUpdatingId(memory._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/memory-lane/${memory._id}/publish`, {
        method: "PUT",
        token,
      });
      setSubmissions((current) => current.map((item) => (
        item._id === memory._id ? { ...item, published: true } : item
      )));
      setNotice(`“${memory.title}” is now published.`);
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteMemory(memory) {
    if (!window.confirm(`Delete “${memory.title}”? This cannot be undone.`)) return;
    setUpdatingId(memory._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/memory-lane/${memory._id}`, {
        method: "DELETE",
        token,
      });
      setSubmissions((current) => current.filter((item) => item._id !== memory._id));
      setNotice("Submission deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const pending = submissions.filter((memory) => !memory.published);
  const published = submissions.filter((memory) => memory.published);

  return (
    <section className="mt-8 rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Images size={22} /></span>
        <div>
          <h2 className="text-xl font-black text-slate-900">Memory Lane submissions</h2>
          <p className="text-sm text-slate-500">Review community memories before they appear in the scrapbook.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading submissions…</p>
      ) : (
        <>
          <h3 className="mb-3 mt-7 flex items-center gap-2 font-bold text-slate-800"><Clock3 size={17} className="text-amber-500" /> Awaiting approval ({pending.length})</h3>
          {pending.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pending.map((memory) => (
                <article key={memory._id} className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/40">
                  <img src={apiAssetUrl(memory.imageUrl)} alt={memory.title} className="h-52 w-full bg-violet-50 object-cover" />
                  <div className="p-4">
                    <p className="text-xs font-semibold text-violet-600">{formatMonthYear(memory.date)} · Submitted by {memory.submittedBy?.name || "Member"}</p>
                    <h4 className="mt-2 font-bold text-slate-900">{memory.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{memory.description}</p>
                    {memory.tags?.length > 0 && <p className="mt-2 text-xs text-slate-500">Tags: {memory.tags.join(", ")}</p>}
                    <div className="mt-4 flex gap-2">
                      <button type="button" disabled={Boolean(updatingId)} onClick={() => publishMemory(memory)} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check size={15} /> {updatingId === memory._id ? "Working…" : "Approve & publish"}</button>
                      <button type="button" disabled={Boolean(updatingId)} onClick={() => deleteMemory(memory)} aria-label={`Delete ${memory.title}`} className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">There are no memories waiting for approval.</p>
          )}

          <h3 className="mb-3 mt-8 font-bold text-slate-800">Published submissions ({published.length})</h3>
          {published.length ? (
            <div className="divide-y divide-slate-100">
              {published.map((memory) => (
                <article key={memory._id} className="flex items-center gap-4 py-3">
                  <img src={apiAssetUrl(memory.imageUrl)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-bold text-slate-900">{memory.title}</h4>
                    <p className="text-xs text-slate-500">By {memory.submittedBy?.name || "Member"} · {formatMonthYear(memory.date)}</p>
                  </div>
                  <button type="button" disabled={Boolean(updatingId)} onClick={() => deleteMemory(memory)} aria-label={`Delete ${memory.title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No community submissions have been published yet.</p>
          )}
        </>
      )}
    </section>
  );
}
