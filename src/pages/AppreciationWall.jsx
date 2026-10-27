import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Heart,
  MessageCircleHeart,
  Pin,
  Send,
  Sparkles,
} from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

const MEMBER_KEY = "friendszone-appreciation-member";
const categories = [
  { value: "thank-you", label: "Thank you", emoji: "💌" },
  { value: "compliment", label: "Compliment", emoji: "✨" },
  { value: "motivation", label: "Motivation", emoji: "🌱" },
  { value: "memory", label: "Friendship memory", emoji: "📸" },
];
const reactions = [
  { value: "heart", label: "Heart", emoji: "❤️" },
  { value: "hug", label: "Hug", emoji: "🤗" },
  { value: "cheer", label: "Cheer", emoji: "🙌" },
];

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppreciationWall() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState(() => localStorage.getItem(MEMBER_KEY) || "");
  const [wall, setWall] = useState({ notes: [], notificationCount: 0 });
  const [form, setForm] = useState({
    recipientId: "",
    category: "thank-you",
    message: "",
    anonymous: false,
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/members", { signal: controller.signal })
      .then((result) => {
        setMembers(result);
        const savedId = localStorage.getItem(MEMBER_KEY) || "";
        if (savedId && result.some((member) => member._id === savedId)) {
          setMemberId(savedId);
        } else {
          localStorage.removeItem(MEMBER_KEY);
          setMemberId("");
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    apiRequest(`/appreciation-wall${query}`, { signal: controller.signal })
      .then(setWall)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [memberId]);

  const visibleNotes = useMemo(
    () => categoryFilter === "all"
      ? wall.notes
      : wall.notes.filter((note) => note.category === categoryFilter),
    [categoryFilter, wall.notes]
  );

  function chooseMember(event) {
    const nextMemberId = event.target.value;
    setLoading(true);
    setMemberId(nextMemberId);
    if (nextMemberId) localStorage.setItem(MEMBER_KEY, nextMemberId);
    else localStorage.removeItem(MEMBER_KEY);
    setError("");
  }

  async function submitNote(event) {
    event.preventDefault();
    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/appreciation-wall", {
        method: "POST",
        body: { ...form, memberId },
      });
      setNotice(result.message);
      setForm((current) => ({ ...current, message: "", anonymous: false }));
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(note, type) {
    if (!memberId) {
      setError("Choose your member profile before reacting.");
      return;
    }
    setError("");
    try {
      const result = await apiRequest(`/appreciation-wall/${note._id}/reactions`, {
        method: "POST",
        body: { memberId, type },
      });
      setWall((current) => ({
        ...current,
        notes: current.notes.map((item) => item._id === note._id
          ? { ...item, reactionCounts: result.reactionCounts, myReactions: result.myReactions }
          : item),
      }));
    } catch (reactionError) {
      setError(reactionError.message);
    }
  }

  async function markNotificationsRead() {
    if (!memberId || !wall.notificationCount) return;
    setError("");
    try {
      await apiRequest("/appreciation-wall/notifications/read", {
        method: "POST",
        body: { memberId },
      });
      setWall((current) => ({ ...current, notificationCount: 0 }));
    } catch (readError) {
      setError(readError.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8ff]">
      <section className="relative overflow-hidden bg-[#171329] text-white">
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-pink-500/25 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-pink-200">
            <Heart size={16} fill="currentColor" /> A little kindness goes a long way
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            The <span className="text-pink-300">Appreciation Wall</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Thank a friend, celebrate who they are, or remind them of a moment you’ll always remember.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-8">
        <div className="mb-7 flex flex-col gap-3 rounded-3xl border border-violet-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-bold text-slate-900">Your member profile</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Choose your profile to write notes, react, and see messages addressed to you.</p>
          </div>
          <select
            value={memberId}
            onChange={chooseMember}
            aria-label="Choose your member profile"
            className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:max-w-xs"
          >
            <option value="">Choose your name…</option>
            {members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
          </select>
        </div>

        {wall.notificationCount > 0 && (
          <div role="status" className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 p-4 text-pink-900">
            <Bell size={20} className="shrink-0 text-pink-600" />
            <p className="flex-1 font-semibold">
              You have {wall.notificationCount} new appreciation {wall.notificationCount === 1 ? "note" : "notes"}!
            </p>
            <button type="button" onClick={markNotificationsRead} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-pink-700 hover:bg-pink-100">
              Mark as read
            </button>
          </div>
        )}

        {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><MessageCircleHeart size={22} /></span>
              <div>
                <h2 className="text-xl font-black text-slate-900">Write a note</h2>
                <p className="text-sm text-slate-500">A few sincere words can make someone’s day.</p>
              </div>
            </div>
            <form onSubmit={submitNote} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">To</span>
                <select
                  required
                  value={form.recipientId}
                  onChange={(event) => setForm((current) => ({ ...current, recipientId: event.target.value }))}
                  className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">Choose a friend…</option>
                  {members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Message type</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  {categories.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Your message</span>
                <textarea
                  required
                  minLength={1}
                  maxLength={1000}
                  rows={5}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Let them know what you appreciate about them…"
                  className="w-full resize-y rounded-xl border border-violet-100 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <span className="mt-1 block text-right text-xs text-slate-400">{form.message.length}/1000</span>
              </label>
              <label className="flex items-start gap-3 rounded-xl bg-violet-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={(event) => setForm((current) => ({ ...current, anonymous: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-violet-600"
                />
                <span><strong>Post anonymously</strong><span className="mt-0.5 block text-xs text-slate-500">Your name is hidden from the public wall, but admins can see who submitted it.</span></span>
              </label>
              <p className="text-xs leading-5 text-slate-500">Notes appear on the wall after admin approval.</p>
              <button
                type="submit"
                disabled={!memberId || sending || !members.length}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Submitting…" : "Send for approval"} <Send size={16} />
              </button>
            </form>
          </section>

          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600">Good words, shared</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">From the community</h2>
              </div>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter by message type"
                className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="all">All messages</option>
                {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </div>

            {loading ? (
              <p className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-slate-500">Loading the wall…</p>
            ) : visibleNotes.length ? (
              <div className="space-y-4">
                {visibleNotes.map((note) => {
                  const category = categories.find((item) => item.value === note.category);
                  return (
                    <article key={note._id} className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${note.pinned ? "border-amber-200 ring-1 ring-amber-100" : "border-violet-100"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{category?.emoji} {category?.label}</span>
                        {note.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><Pin size={12} /> Pinned</span>}
                        {note.forMe && <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">For you</span>}
                        <time className="ml-auto text-xs text-slate-400">{formatDate(note.createdAt)}</time>
                      </div>
                      <blockquote className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">“{note.message}”</blockquote>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="flex min-w-0 items-center gap-2">
                          {note.author?.imageUrl && <img src={apiAssetUrl(note.author.imageUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />}
                          <span className="text-sm font-bold text-slate-700">{note.anonymous ? "A friend" : note.author?.name || "A friend"}</span>
                          <span className="text-xs text-slate-400">to</span>
                          <span className="text-sm font-bold text-slate-700">{note.recipient?.name || "a friend"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {reactions.map((reaction) => (
                            <button
                              key={reaction.value}
                              type="button"
                              title={reaction.label}
                              aria-label={`${reaction.label}, ${note.reactionCounts?.[reaction.value] || 0}`}
                              aria-pressed={note.myReactions?.includes(reaction.value)}
                              onClick={() => toggleReaction(note, reaction.value)}
                              disabled={!memberId}
                              className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${note.myReactions?.includes(reaction.value) ? "border-pink-200 bg-pink-50" : "border-slate-200 bg-white hover:bg-violet-50"}`}
                            >
                              {reaction.emoji} <span className="text-xs font-bold text-slate-600">{note.reactionCounts?.[reaction.value] || 0}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center">
                <Sparkles size={32} className="mx-auto text-violet-400" />
                <h3 className="mt-3 font-bold text-slate-900">A little space for kindness</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">No approved messages here yet. Be the first to share something kind.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
