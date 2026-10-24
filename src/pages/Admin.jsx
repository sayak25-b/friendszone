import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Images, LogOut, Plus, Save, Trash2, Users } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";

const TOKEN_KEY = "friendszone-admin-token";
const emptyMemory = {
  title: "",
  description: "",
  date: "",
  imageUrl: "",
  location: "",
  album: "",
  tags: "",
  featured: false,
  published: true,
};
const emptyMember = {
  name: "",
  role: "FriendsZone Member",
  city: "",
  bio: "",
  imageUrl: "",
  joinedAt: new Date().toISOString().slice(0, 10),
  email: "",
  instagram: "",
  website: "",
  isActive: true,
};

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function Field({ label, name, value, onChange, required, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function TextAreaField({ label, name, value, onChange, required }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        rows={4}
        className="w-full resize-y rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function ToggleField({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
      <input
        name={name}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={onChange}
        className="h-4 w-4 accent-violet-600"
      />
      {label}
    </label>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("memories");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyMemory);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isMemory = tab === "memories";
  const blankForm = isMemory ? emptyMemory : emptyMember;
  const requestToken = token;

  useEffect(() => {
    if (!requestToken) return undefined;
    let cancelled = false;
    apiRequest(`/admin/${tab}`, { token: requestToken })
      .then((records) => {
        if (!cancelled) setItems(records);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message);
          if (loadError.message.includes("session") || loadError.message.includes("token")) {
            localStorage.removeItem(TOKEN_KEY);
            setToken("");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestToken, tab]);

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startNew() {
    setEditingId("");
    setForm({ ...blankForm });
    setError("");
    setNotice("");
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm(
      isMemory
        ? {
            ...item,
            date: dateInputValue(item.date),
            tags: (item.tags || []).join(", "),
          }
        : {
            ...item,
            joinedAt: dateInputValue(item.joinedAt),
          }
    );
    setError("");
    setNotice("");
  }

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setPassword("");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setItems([]);
    setLoading(false);
    startNew();
  }

  async function uploadImage(event) {
    const image = event.target.files?.[0];
    if (!image) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", image);
      const result = await apiRequest("/admin/uploads", {
        method: "POST",
        body,
        token,
      });
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = isMemory
      ? {
          ...form,
          date: new Date(`${form.date}T12:00:00`).toISOString(),
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }
      : {
          ...form,
          joinedAt: form.joinedAt
            ? new Date(`${form.joinedAt}T12:00:00`).toISOString()
            : undefined,
          email: form.email?.trim() || undefined,
        };

    try {
      const record = await apiRequest(
        editingId
          ? `/admin/${tab}/${editingId}`
          : `/admin/${tab}`,
        {
          method: editingId ? "PUT" : "POST",
          body: payload,
          token,
        }
      );
      setItems((current) => {
        if (!editingId) return [record, ...current];
        return current.map((item) => (item._id === record._id ? record : item));
      });
      setNotice(editingId ? "Changes saved." : "Record created.");
      setEditingId("");
      setForm({ ...blankForm });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(item) {
    if (!window.confirm(`Delete "${isMemory ? item.title : item.name}"? This cannot be undone.`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/${tab}/${item._id}`, {
        method: "DELETE",
        token,
      });
      setItems((current) => current.filter((record) => record._id !== item._id));
      if (editingId === item._id) startNew();
      setNotice("Record deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf8ff] px-5 py-16">
        <form
          onSubmit={signIn}
          className="w-full max-w-md rounded-[2rem] border border-violet-100 bg-white p-7 shadow-xl sm:p-9"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">
            FriendsZone dashboard
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Admin sign in</h1>
          <p className="mt-3 leading-7 text-slate-500">
            Sign in to manage community memories and member profiles.
          </p>
          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 space-y-5">
            <Field
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-violet-600 px-5 py-3.5 font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8ff] px-5 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">
              FriendsZone dashboard
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Manage your community
            </h1>
            <p className="mt-2 text-slate-500">
              Add, edit, publish, or remove site content.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50"
            >
              View website
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 rounded-full bg-violet-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setTab("memories");
                    setEditingId("");
                    setForm({ ...emptyMemory });
                    setError("");
                    setNotice("");
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                    isMemory ? "bg-violet-600 text-white" : "text-slate-600"
                  }`}
                >
                  <Images size={16} /> Memories
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setTab("members");
                    setEditingId("");
                    setForm({ ...emptyMember });
                    setError("");
                    setNotice("");
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                    !isMemory ? "bg-violet-600 text-white" : "text-slate-600"
                  }`}
                >
                  <Users size={16} /> Members
                </button>
              </div>
              <button
                type="button"
                onClick={startNew}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"
              >
                <Plus size={17} /> New {isMemory ? "memory" : "member"}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                {notice}
              </p>
            )}

            <div className="mt-6 divide-y divide-slate-100">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading records…</p>
              ) : items.length ? (
                items.map((item) => (
                  <article
                    key={item._id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <img
                      src={apiAssetUrl(item.imageUrl)}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl bg-violet-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-slate-900">
                        {isMemory ? item.title : item.name}
                      </h2>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {isMemory
                          ? `${formatMonthYear(item.date)}${item.published ? " · Published" : " · Draft"}`
                          : `${item.role || "Member"}${item.isActive ? " · Active" : " · Hidden"}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecord(item)}
                      aria-label={`Delete ${isMemory ? item.title : item.name}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No {tab} yet. Add your first one.
                </p>
              )}
            </div>
          </section>

          <section className="h-fit rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-slate-900">
              {editingId ? "Edit" : "Add"} {isMemory ? "memory" : "member"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isMemory
                ? "Add the story, date, and photo details for this memory."
                : "Add the profile information that should appear in the community directory."}
            </p>

            <form onSubmit={saveRecord} className="mt-6 space-y-4">
              {isMemory ? (
                <>
                  <Field label="Title" name="title" value={form.title} onChange={updateForm} required />
                  <Field label="Date" name="date" type="date" value={form.date} onChange={updateForm} required />
                  <TextAreaField label="Description" name="description" value={form.description} onChange={updateForm} required />
                  <Field label="Location" name="location" value={form.location} onChange={updateForm} />
                  <Field label="Album" name="album" value={form.album} onChange={updateForm} />
                  <Field label="Tags (comma separated)" name="tags" value={form.tags} onChange={updateForm} />
                </>
              ) : (
                <>
                  <Field label="Full name" name="name" value={form.name} onChange={updateForm} required />
                  <Field label="Role" name="role" value={form.role} onChange={updateForm} />
                  <Field label="City" name="city" value={form.city} onChange={updateForm} />
                  <Field label="Joined on" name="joinedAt" type="date" value={form.joinedAt} onChange={updateForm} />
                  <TextAreaField label="Bio" name="bio" value={form.bio} onChange={updateForm} />
                  <Field label="Contact email (private)" name="email" type="email" value={form.email} onChange={updateForm} />
                  <Field label="Instagram URL" name="instagram" type="url" value={form.instagram} onChange={updateForm} />
                  <Field label="Website URL" name="website" type="url" value={form.website} onChange={updateForm} />
                </>
              )}

              <Field
                label="Image URL"
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={updateForm}
                required
              />
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Upload an image (JPEG, PNG, WebP, GIF; max 5 MB)
                </span>
                <span className="mb-2 block text-xs leading-5 text-slate-500">
                  Choose a file from your device. After its preview appears, save
                  the record to keep the image with this {isMemory ? "memory" : "member"}.
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={uploadImage}
                  disabled={uploading}
                  className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-bold file:text-violet-700"
                />
                {uploading && <span className="mt-2 block text-xs text-violet-600">Uploading image…</span>}
                {form.imageUrl && (
                  <img
                    src={apiAssetUrl(form.imageUrl)}
                    alt="Selected image preview"
                    className="mt-3 h-32 w-32 rounded-xl border border-violet-100 bg-violet-50 object-cover"
                  />
                )}
              </label>

              {isMemory ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleField label="Feature this memory" name="featured" checked={form.featured} onChange={updateForm} />
                  <ToggleField label="Published on the site" name="published" checked={form.published} onChange={updateForm} />
                </div>
              ) : (
                <ToggleField label="Show in public members directory" name="isActive" checked={form.isActive} onChange={updateForm} />
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  <Save size={17} /> {saving ? "Saving…" : "Save"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={startNew}
                    className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
