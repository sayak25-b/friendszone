import { useEffect, useState } from "react";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

function localDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function newAnnouncement() {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + 7);
  return {
    title: "",
    message: "",
    linkLabel: "",
    linkUrl: "",
    publishAt: localDateTime(now),
    expiresAt: localDateTime(expiry),
    isActive: true,
  };
}

function announcementStatus(announcement) {
  const now = Date.now();
  if (!announcement.isActive) return "Deactivated";
  if (new Date(announcement.publishAt).getTime() > now) return "Scheduled";
  if (new Date(announcement.expiresAt).getTime() <= now) return "Expired";
  return "Published";
}

export default function AnnouncementsAdmin({ token }) {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(newAnnouncement);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/admin/announcements", { token, signal: controller.signal })
      .then(setAnnouncements)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  function changeField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startNew() {
    setEditingId("");
    setForm(newAnnouncement());
    setError("");
    setNotice("");
  }

  function editAnnouncement(announcement) {
    setEditingId(announcement._id);
    setForm({
      ...announcement,
      publishAt: localDateTime(announcement.publishAt),
      expiresAt: localDateTime(announcement.expiresAt),
    });
    setError("");
    setNotice("");
  }

  async function saveAnnouncement(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const publishAt = new Date(form.publishAt);
      const expiresAt = new Date(form.expiresAt);
      if (Number.isNaN(publishAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
        throw new Error("Choose valid publication and expiry dates.");
      }
      if (expiresAt <= publishAt) throw new Error("The expiry date must be after the publication date.");

      const saved = await apiRequest(
        editingId ? `/admin/announcements/${editingId}` : "/admin/announcements",
        {
          method: editingId ? "PUT" : "POST",
          token,
          body: { ...form, publishAt: publishAt.toISOString(), expiresAt: expiresAt.toISOString() },
        }
      );
      setAnnouncements((current) =>
        editingId
          ? current.map((item) => (item._id === saved._id ? saved : item))
          : [saved, ...current]
      );
      setNotice(editingId ? "Announcement updated." : "Announcement published.");
      startNew();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(announcement) {
    if (!window.confirm(`Delete “${announcement.title}”? This cannot be undone.`)) return;
    setBusyId(announcement._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/announcements/${announcement._id}`, { method: "DELETE", token });
      setAnnouncements((current) => current.filter((item) => item._id !== announcement._id));
      if (editingId === announcement._id) startNew();
      setNotice("Announcement deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
      <div className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Megaphone size={22} /></span>
            <div>
              <h2 className="text-xl font-black text-slate-900">Manage Announcements</h2>
              <p className="text-sm text-slate-500">Display an important update on the homepage.</p>
            </div>
          </div>
          <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700">
            <Plus size={17} /> New announcement
          </button>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

        <div className="mt-6 divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading announcements…</p>
          ) : announcements.length ? announcements.map((announcement) => (
            <article key={announcement._id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Megaphone size={20} /></span>
              <button type="button" onClick={() => editAnnouncement(announcement)} className="min-w-0 flex-1 text-left">
                <h3 className="truncate font-bold text-slate-900">{announcement.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{announcementStatus(announcement)} · {new Date(announcement.publishAt).toLocaleString()}</p>
              </button>
              <button type="button" onClick={() => deleteAnnouncement(announcement)} disabled={busyId === announcement._id} aria-label={`Delete ${announcement.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={18} />
              </button>
            </article>
          )) : (
            <p className="py-8 text-center text-sm text-slate-500">No announcements yet.</p>
          )}
        </div>
      </div>

      <form onSubmit={saveAnnouncement} className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-black text-slate-900">{editingId ? "Edit announcement" : "Create announcement"}</h2>
        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-bold text-slate-700">
            Title
            <input name="title" value={form.title} onChange={changeField} required maxLength={160} className="mt-2 w-full rounded-xl border border-violet-100 px-4 py-3 font-normal outline-none focus:border-violet-400" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Message
            <textarea name="message" value={form.message} onChange={changeField} required maxLength={2000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-violet-100 px-4 py-3 font-normal outline-none focus:border-violet-400" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Button label
              <input name="linkLabel" value={form.linkLabel} onChange={changeField} maxLength={60} placeholder="View details" className="mt-2 w-full rounded-xl border border-violet-100 px-4 py-3 font-normal outline-none focus:border-violet-400" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Button URL
              <input name="linkUrl" value={form.linkUrl} onChange={changeField} maxLength={2048} placeholder="https://" className="mt-2 w-full rounded-xl border border-violet-100 px-4 py-3 font-normal outline-none focus:border-violet-400" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Publish at
              <input type="datetime-local" name="publishAt" value={form.publishAt} onChange={changeField} required className="mt-2 w-full rounded-xl border border-violet-100 px-3 py-3 text-sm outline-none focus:border-violet-400" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Expires at
              <input type="datetime-local" name="expiresAt" value={form.expiresAt} onChange={changeField} required className="mt-2 w-full rounded-xl border border-violet-100 px-3 py-3 text-sm outline-none focus:border-violet-400" />
            </label>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="isActive" checked={Boolean(form.isActive)} onChange={changeField} className="h-4 w-4 accent-violet-600" />
            Active
          </label>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
            <Save size={18} /> {saving ? "Saving…" : editingId ? "Update announcement" : "Save announcement"}
          </button>
        </div>
      </form>
    </section>
  );
}
