import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Heart, Images, LogOut, Plus, Save, Trash2, Users } from "lucide-react";
import AwardsAdmin from "../components/AwardsAdmin";
import AppreciationWallAdmin from "../components/AppreciationWallAdmin";
import MemoryLaneAdmin from "../components/MemoryLaneAdmin";
import { apiAssetUrl, apiRequest } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";


const TOKEN_KEY = "friendszone-admin-token";
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
const emptyMemory = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  imageUrl: "",
  location: "",
  album: "",
  tags: "",
  featured: false,
  published: true,
};

function dateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function TextField({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function CheckField({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        name={name}
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
  const [tab, setTab] = useState("members");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyMember);
  const [imageSource, setImageSource] = useState("url");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isMember = tab === "members";
  const emptyForm = isMember ? emptyMember : emptyMemory;

  useEffect(() => {
    if (!token || tab === "awards" || tab === "memory-lane" || tab === "appreciation-wall") return undefined;
    const controller = new AbortController();
    apiRequest(`/admin/${tab}`, { token, signal: controller.signal })
      .then((records) => setItems(records))
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setError(loadError.message);
        if (loadError.message.includes("session") || loadError.message.includes("token")) {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, tab]);

  function changeField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function newRecord() {
    setEditingId("");
    setForm({ ...emptyForm });
    setImageSource("url");
    setError("");
    setNotice("");
  }

  function editRecord(item) {
    setEditingId(item._id);
    setImageSource("url");
    setForm(
      isMember
        ? { ...item, joinedAt: dateInput(item.joinedAt) }
        : { ...item, date: dateInput(item.date), tags: (item.tags || []).join(", ") }
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
    newRecord();
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
    setNotice("");
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await apiRequest("/admin/uploads", {
        method: "POST",
        body,
        token,
      });
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setNotice("Image uploaded. Save the record to attach it.");
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
    let payload;
    try {
      payload = isMember
        ? {
            ...form,
            joinedAt: form.joinedAt
              ? new Date(`${form.joinedAt}T12:00:00`).toISOString()
              : undefined,
            email: form.email?.trim() || undefined,
          }
        : {
            ...form,
            date: new Date(`${form.date}T12:00:00`).toISOString(),
            tags: form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          };

      if (!form.imageUrl) {
          setError(
            imageSource === "url"
              ? "Enter an image URL or choose Upload image."
              : "Choose an image and wait for the upload to finish."
          );
          return;
      }

      const record = await apiRequest(
        editingId ? `/admin/${tab}/${editingId}` : `/admin/${tab}`,
        {
          method: editingId ? "PUT" : "POST",
          body: payload,
          token,
        }
      );
      setItems((current) =>
        editingId
          ? current.map((item) => (item._id === record._id ? record : item))
          : [record, ...current]
      );
      setNotice(editingId ? "Changes saved." : "Record added.");
      setEditingId("");
      setForm({ ...emptyForm });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(item) {
    const label = isMember ? item.name : item.title;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/${tab}/${item._id}`, { method: "DELETE", token });
      setItems((current) => current.filter((record) => record._id !== item._id));
      if (editingId === item._id) newRecord();
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
            Sign in to manage members and memories.
          </p>
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 space-y-5">
            <TextField label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField label="Password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-violet-600 px-5 py-3.5 font-bold text-white hover:bg-violet-700 disabled:opacity-60"
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
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">FriendsZone dashboard</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Manage your community</h1>
            <p className="mt-2 text-slate-500">Add, edit, and remove members and memories.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50">View website</Link>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 rounded-full bg-violet-50 p-1">
                {[
                  { id: "members", label: "Members", Icon: Users },
                  { id: "memories", label: "Memories", Icon: Images },
                  { id: "memory-lane", label: "Memory Lane", Icon: Images },
                  { id: "awards", label: "Awards", Icon: Award },
                  { id: "appreciation-wall", label: "Appreciation Wall", Icon: Heart },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setLoading(id !== "awards" && id !== "memory-lane" && id !== "appreciation-wall");
                      setTab(id);
                      setEditingId("");
                      setForm({ ...(id === "members" ? emptyMember : emptyMemory) });
                      setError("");
                      setNotice("");
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === id ? "bg-violet-600 text-white" : "text-slate-600"}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
              {(tab === "members" || tab === "memories") && (
                <button type="button" onClick={newRecord} className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700">
                  <Plus size={17} /> New {isMember ? "member" : "memory"}
                </button>
              )}
            </div>
          </section>

            {tab === "awards" ? <AwardsAdmin token={token} /> : tab === "memory-lane" ? <MemoryLaneAdmin token={token} /> : tab === "appreciation-wall" ? <AppreciationWallAdmin token={token} /> : (
            <>
            <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

            <div className="mt-6 divide-y divide-slate-100">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading records…</p>
              ) : items.length ? (
                items.map((item) => (
                  <article key={item._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <img src={apiAssetUrl(item.imageUrl)} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-violet-100 object-cover" />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-slate-900">{isMember ? item.name : item.title}</h2>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {isMember
                          ? `${item.role || "Member"} · ${item.isActive ? "Active" : "Hidden"}`
                          : `${formatMonthYear(item.date)} · ${item.published ? "Published" : "Draft"}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => editRecord(item)} className="rounded-lg px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">Edit</button>
                    <button type="button" onClick={() => deleteRecord(item)} aria-label={`Delete ${isMember ? item.name : item.title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
                  </article>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No {tab} yet.</p>
              )}
            </div>
          </section>

          <section className="h-fit rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-slate-900">{editingId ? "Edit" : "Add"} {isMember ? "member" : "memory"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose an image from your device. Once uploaded, save the record to attach it.
            </p>

            <form onSubmit={saveRecord} className="mt-6 space-y-4">
              {isMember ? (
                <>
                  <TextField label="Full name" name="name" value={form.name} onChange={changeField} required />
                  <TextField label="Role" name="role" value={form.role} onChange={changeField} />
                  <TextField label="City" name="city" value={form.city} onChange={changeField} />
                  <TextField label="Joined on" name="joinedAt" type="date" value={form.joinedAt} onChange={changeField} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Bio</span>
                    <textarea name="bio" value={form.bio} onChange={changeField} rows={3} className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <TextField label="Contact email (private)" name="email" type="email" value={form.email} onChange={changeField} />
                  <TextField label="Instagram URL" name="instagram" type="url" value={form.instagram} onChange={changeField} />
                  <TextField label="Website URL" name="website" type="url" value={form.website} onChange={changeField} />
                </>
              ) : (
                <>
                  <TextField label="Title" name="title" value={form.title} onChange={changeField} required />
                  <TextField label="Date" name="date" type="date" value={form.date} onChange={changeField} required />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Description</span>
                    <textarea name="description" value={form.description} onChange={changeField} rows={3} required className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <TextField label="Location" name="location" value={form.location} onChange={changeField} />
                  <TextField label="Album" name="album" value={form.album} onChange={changeField} />
                  <TextField label="Tags (comma separated)" name="tags" value={form.tags} onChange={changeField} />
                </>
              )}

              <fieldset className="space-y-4 rounded-2xl border border-violet-100 p-4">
                <legend className="px-2 text-sm font-bold text-slate-700">
                  Member image
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="imageSource"
                      value="url"
                      checked={imageSource === "url"}
                      onChange={() => {
                        setImageSource("url");
                        setForm((current) => ({ ...current, imageUrl: "" }));
                      }}
                      className="h-4 w-4 accent-violet-600"
                    />
                    Image URL
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="imageSource"
                      value="upload"
                      checked={imageSource === "upload"}
                      onChange={() => {
                        setImageSource("upload");
                        setForm((current) => ({ ...current, imageUrl: "" }));
                      }}
                      className="h-4 w-4 accent-violet-600"
                    />
                    Upload image
                  </label>
                </div>

                {imageSource === "url" ? (
                  <TextField
                    label="Image URL"
                    name="imageUrl"
                    type="url"
                    value={form.imageUrl}
                    onChange={changeField}
                    required
                  />
                ) : (
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Choose a JPEG, PNG, WebP, or GIF (max 5 MB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={uploadImage}
                      disabled={uploading}
                      className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-bold file:text-violet-700"
                    />
                    {uploading && (
                      <span className="mt-2 block text-sm text-violet-600">
                        Uploading image…
                      </span>
                    )}
                  </label>
                )}

                {form.imageUrl && (
                  <img
                    src={apiAssetUrl(form.imageUrl)}
                    alt="Selected image preview"
                    className="h-32 w-32 rounded-xl border border-violet-100 bg-violet-50 object-cover"
                  />
                )}
              </fieldset>

              {isMember ? (
                <CheckField label="Show in public members directory" name="isActive" checked={form.isActive} onChange={changeField} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckField label="Feature memory" name="featured" checked={form.featured} onChange={changeField} />
                  <CheckField label="Published" name="published" checked={form.published} onChange={changeField} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  <Save size={17} /> {saving ? "Saving…" : "Save"}
                </button>
                {editingId && <button type="button" onClick={newRecord} className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancel</button>}
              </div>
            </form>
          </section>
            </>
            )}
        </div>
      </div>
    </main>
  );
}
