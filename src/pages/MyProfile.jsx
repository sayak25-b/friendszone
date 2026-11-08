import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, LogOut, Save, UserRound } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

const VOTER_TOKEN_KEY = "friendszone-voter-token";
const currentDate = new Date();
const MAX_BIRTHDAY = [
  currentDate.getFullYear(),
  String(currentDate.getMonth() + 1).padStart(2, "0"),
  String(currentDate.getDate()).padStart(2, "0"),
].join("-");

const emptyProfile = {
  name: "",
  nickname: "",
  bio: "",
  birthday: "",
  city: "",
  hobbies: "",
  interests: "",
  favoriteThings: "",
  imageUrl: "",
  instagram: "",
  website: "",
  otherLinks: "",
};

function birthdayInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function Field({ label, name, value, onChange, type = "text", ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        {...props}
      />
    </label>
  );
}

export default function MyProfile() {
  const [token, setToken] = useState(() => localStorage.getItem(VOTER_TOKEN_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(VOTER_TOKEN_KEY)));
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        await apiRequest("/auth/voter/me", { token, signal: controller.signal });
        const profile = await apiRequest("/member/profile", { token, signal: controller.signal });
        setForm({
          ...emptyProfile,
          ...profile,
          birthday: birthdayInput(profile.birthday),
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError.message);
        if (loadError.message.toLowerCase().includes("session") || loadError.message.toLowerCase().includes("token")) {
          localStorage.removeItem(VOTER_TOKEN_KEY);
          setToken("");
          setLoading(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [token]);

  function changeField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function signIn(event) {
    event.preventDefault();
    setSigningIn(true);
    setError("");
    try {
      const result = await apiRequest("/auth/voter/login", {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem(VOTER_TOKEN_KEY, result.token);
      setPassword("");
      setToken(result.token);
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setSigningIn(false);
    }
  }

  function signOut() {
    localStorage.removeItem(VOTER_TOKEN_KEY);
    setToken("");
    setForm(emptyProfile);
    setPassword("");
    setNotice("");
    setError("");
  }

  async function uploadPhoto(field, event) {
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
    setUploading(field);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await apiRequest("/member/profile/uploads", {
        method: "POST",
        body,
        token,
      });
      setForm((current) => ({ ...current, [field]: result.imageUrl }));
      setNotice("Image uploaded. Save your profile to apply it.");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const profile = await apiRequest("/member/profile", {
        method: "PUT",
        token,
        body: {
          ...form,
          birthday: form.birthday
            ? new Date(`${form.birthday}T00:00:00.000Z`).toISOString()
            : null,
        },
      });
      setForm({
        ...emptyProfile,
        ...profile,
        birthday: birthdayInput(profile.birthday),
      });
      setNotice("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf8ff] px-5 py-16">
        <form onSubmit={signIn} className="w-full max-w-md rounded-[2rem] border border-violet-100 bg-white p-7 shadow-xl sm:p-9">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><UserRound size={24} /></span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">FriendsZone member</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Sign in to your profile</h1>
          <p className="mt-3 leading-7 text-slate-500">Use your voter account to update your member profile.</p>
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 space-y-5">
            <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
            <Field label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="submit" disabled={signingIn} className="w-full rounded-full bg-violet-600 px-5 py-3.5 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </div>
          <p className="mt-5 text-center text-sm text-slate-500">
            Don’t have a voter account? <Link to="/awards" className="font-bold text-violet-700 hover:text-pink-600">Create one on Awards</Link>
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8ff] px-5 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">FriendsZone member</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">My Profile</h1>
            <p className="mt-2 text-slate-500">Share a little more about yourself with your friends.</p>
          </div>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

        {loading ? (
          <p className="mt-8 rounded-3xl border border-violet-100 bg-white p-8 text-center text-slate-500">Loading your profile…</p>
        ) : (
          <form onSubmit={saveProfile} className="mt-8 space-y-7">
            <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black text-slate-900">Profile photos</h2>
              <p className="mt-1 text-sm text-slate-500">Upload a profile picture (JPG, PNG, WebP or GIF up to 5 MB).</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Profile picture</p>
                  {form.imageUrl ? (
                    <img src={apiAssetUrl(form.imageUrl)} alt="Profile picture preview" className="h-36 w-36 rounded-2xl border border-violet-100 bg-violet-50 object-cover" />
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
                      <Camera size={28} />
                    </div>
                  )}
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">
                    <Camera size={16} /> {uploading === "imageUrl" ? "Uploading…" : "Upload profile picture"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadPhoto("imageUrl", event)} disabled={Boolean(uploading)} className="sr-only" />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black text-slate-900">About you</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Name" name="name" value={form.name} onChange={changeField} required maxLength={100} />
                <Field label="Nickname" name="nickname" value={form.nickname} onChange={changeField} maxLength={100} />
                <Field label="Birthday" name="birthday" type="date" value={form.birthday} onChange={changeField} max={MAX_BIRTHDAY} />
                <Field label="Location" name="city" value={form.city} onChange={changeField} maxLength={120} />
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Bio</span>
                <textarea name="bio" value={form.bio} onChange={changeField} rows={4} maxLength={2000} className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="A little about you…" />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Hobbies" name="hobbies" value={form.hobbies} onChange={changeField} maxLength={1000} placeholder="e.g. hiking, painting, music" />
                <Field label="Interests" name="interests" value={form.interests} onChange={changeField} maxLength={1000} placeholder="e.g. travel, films, technology" />
                <Field label="Favourite things" name="favoriteThings" value={form.favoriteThings} onChange={changeField} maxLength={1000} placeholder="e.g. books, foods, places" />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black text-slate-900">Social links</h2>
              <p className="mt-1 text-sm text-slate-500">Only add links you’re comfortable sharing with other members.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Instagram URL" name="instagram" type="url" value={form.instagram} onChange={changeField} maxLength={2048} placeholder="https://instagram.com/yourname" />
                <Field label="Website or other profile" name="website" type="url" value={form.website} onChange={changeField} maxLength={2048} placeholder="https://example.com" />
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Other social links</span>
                <textarea name="otherLinks" value={form.otherLinks} onChange={changeField} rows={2} maxLength={2048} className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Paste HTTP(S) links separated by commas or spaces" />
              </label>
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving || Boolean(uploading)} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                <Save size={17} /> {saving ? "Saving…" : "Save profile"}
              </button>
              <Link to="/members" className="rounded-full border border-violet-200 bg-white px-6 py-3 font-bold text-violet-700 hover:bg-violet-50">View members</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
