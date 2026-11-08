import { useEffect, useState } from "react";
import { Eye, Gift, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";
import WishBanner from "./WishBanner";

const themes = [
  { value: "celebration", label: "Celebration" },
  { value: "elegant", label: "Elegant" },
  { value: "playful", label: "Playful" },
  { value: "festive", label: "Festive" },
];

function localDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function newWish() {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + 7);
  return {
    title: "",
    message: "",
    imageUrl: "",
    theme: "celebration",
    backgroundColor: "#6d28d9",
    accentColor: "#ec4899",
    publishAt: localDateTime(now),
    expiresAt: localDateTime(expiry),
    isActive: true,
  };
}

function wishStatus(wish) {
  const now = Date.now();
  if (!wish.isActive) return "Deactivated";
  if (new Date(wish.publishAt).getTime() > now) return "Scheduled";
  if (new Date(wish.expiresAt).getTime() <= now) return "Expired";
  return "Published";
}

export default function WishesAdmin({ token }) {
  const [wishes, setWishes] = useState([]);
  const [form, setForm] = useState(newWish);
  const [editingId, setEditingId] = useState("");
  const [imageSource, setImageSource] = useState("url");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/admin/wishes", { token, signal: controller.signal })
      .then(setWishes)
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
    setForm(newWish());
    setImageSource("url");
    setPreview(false);
    setError("");
    setNotice("");
  }

  function editWish(wish) {
    setEditingId(wish._id);
    setForm({
      ...wish,
      publishAt: localDateTime(wish.publishAt),
      expiresAt: localDateTime(wish.expiresAt),
    });
    setImageSource("url");
    setPreview(false);
    setError("");
    setNotice("");
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await apiRequest("/admin/uploads", {
        method: "POST",
        body,
        token,
      });
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setNotice("Image uploaded. Save the wish to attach it.");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveWish(event) {
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
      if (expiresAt <= publishAt) {
        throw new Error("The expiry date must be after the publication date.");
      }
      const payload = {
        ...form,
        publishAt: publishAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      const savedWish = await apiRequest(
        editingId ? `/admin/wishes/${editingId}` : "/admin/wishes",
        { method: editingId ? "PUT" : "POST", body: payload, token }
      );
      setWishes((current) =>
        editingId
          ? current.map((wish) => (wish._id === savedWish._id ? savedWish : wish))
          : [savedWish, ...current]
      );
      setNotice(editingId ? "Wish updated." : "Wish saved.");
      setEditingId("");
      setForm(newWish());
      setImageSource("url");
      setPreview(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(wish) {
    setBusyId(wish._id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest(`/admin/wishes/${wish._id}`, {
        method: "PUT",
        token,
        body: { ...wish, isActive: !wish.isActive },
      });
      setWishes((current) => current.map((item) => item._id === updated._id ? updated : item));
      setNotice(updated.isActive ? "Wish activated." : "Wish deactivated.");
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyId("");
    }
  }

  async function deleteWish(wish) {
    if (!window.confirm(`Delete “${wish.title}”? This cannot be undone.`)) return;
    setBusyId(wish._id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/wishes/${wish._id}`, {
        method: "DELETE",
        token,
      });
      setWishes((current) => current.filter((item) => item._id !== wish._id));
      if (editingId === wish._id) startNew();
      setNotice("Wish deleted.");
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
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-700"><Gift size={22} /></span>
            <div>
              <h2 className="text-xl font-black text-slate-900">Manage Wishes</h2>
              <p className="text-sm text-slate-500">Share a celebration with everyone on the homepage.</p>
            </div>
          </div>
          <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700">
            <Plus size={17} /> New wish
          </button>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

        <div className="mt-6 divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading wishes…</p>
          ) : wishes.length ? wishes.map((wish) => (
            <article key={wish._id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
              {wish.imageUrl ? (
                <img src={apiAssetUrl(wish.imageUrl)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 rounded-xl" style={{ background: `linear-gradient(135deg, ${wish.backgroundColor}, ${wish.accentColor})` }} />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-slate-900">{wish.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {wishStatus(wish)} · {new Date(wish.publishAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => editWish(wish)} className="rounded-lg px-2 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 sm:px-3">Edit</button>
                <button type="button" disabled={busyId === wish._id} onClick={() => toggleActive(wish)} className="rounded-lg px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  {wish.isActive ? "Deactivate" : "Activate"}
                </button>
                <button type="button" disabled={busyId === wish._id} onClick={() => deleteWish(wish)} aria-label={`Delete ${wish.title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /></button>
              </div>
            </article>
          )) : (
            <p className="py-8 text-center text-sm text-slate-500">No wishes yet. Create one to celebrate with your members.</p>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-slate-900">{editingId ? "Edit wish" : "Create a wish"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Set the greeting, design and dates. It appears automatically during its scheduled window.</p>
        <form onSubmit={saveWish} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Occasion title</span>
            <input name="title" value={form.title} onChange={changeField} maxLength={120} required className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Happy New Year!" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Greeting message</span>
            <textarea name="message" value={form.message} onChange={changeField} rows={4} maxLength={2000} required className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Send a warm message to all our members…" />
          </label>

          <fieldset className="space-y-3 rounded-2xl border border-violet-100 p-4">
            <legend className="px-2 text-sm font-bold text-slate-700">Background image or banner</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-violet-100 px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="radio" name="wishImageSource" checked={imageSource === "url"} onChange={() => setImageSource("url")} className="accent-violet-600" /> Image URL
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-violet-100 px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="radio" name="wishImageSource" checked={imageSource === "upload"} onChange={() => setImageSource("upload")} className="accent-violet-600" /> Upload image
              </label>
            </div>
            {imageSource === "url" ? (
              <input aria-label="Background image URL" name="imageUrl" type="url" value={form.imageUrl} onChange={changeField} placeholder="https://example.com/banner.jpg (optional)" className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-violet-200 px-4 py-3 text-sm font-semibold text-slate-600">
                <ImagePlus size={18} className="text-violet-600" />
                <span>{uploading ? "Uploading image…" : "Choose JPEG, PNG, WebP or GIF (max 5 MB)"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} disabled={uploading} className="sr-only" />
              </label>
            )}
            {form.imageUrl && <img src={apiAssetUrl(form.imageUrl)} alt="Selected banner preview" className="h-28 w-full rounded-xl object-cover" />}
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Festive theme</span>
            <select name="theme" value={form.theme} onChange={changeField} className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
              {themes.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[["backgroundColor", "Background colour"], ["accentColor", "Accent colour"]].map(([name, label]) => (
              <label key={name} className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input type="color" name={name} value={form[name]} onChange={changeField} className="h-12 w-full cursor-pointer rounded-xl border border-violet-100 bg-white p-1" />
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Publish date &amp; time</span>
              <input type="datetime-local" name="publishAt" value={form.publishAt} onChange={changeField} required className="w-full rounded-xl border border-violet-100 px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Expiry date &amp; time</span>
              <input type="datetime-local" name="expiresAt" value={form.expiresAt} onChange={changeField} required className="w-full rounded-xl border border-violet-100 px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="isActive" checked={Boolean(form.isActive)} onChange={changeField} className="h-4 w-4 accent-violet-600" />
            Active (show during the scheduled dates)
          </label>

          {preview && (
            <div className="overflow-hidden rounded-2xl border border-violet-100">
              <p className="bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-violet-700">Homepage preview</p>
              <WishBanner wish={form} onClose={() => setPreview(false)} preview />
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={() => setPreview((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-5 py-3 font-bold text-violet-700 hover:bg-violet-50">
              <Eye size={17} /> {preview ? "Hide preview" : "Preview greeting"}
            </button>
            <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              <Save size={17} /> {saving ? "Saving…" : editingId ? "Save changes" : "Save wish"}
            </button>
            {editingId && <button type="button" onClick={startNew} className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancel</button>}
          </div>
        </form>
      </div>
    </section>
  );
}
