import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Heart,
  ImagePlus,
  MessageCircle,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

const MEMBER_KEY = "friendszone-memory-lane-member";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MemoryLane() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState(() => localStorage.getItem(MEMBER_KEY) || "");
  const [memories, setMemories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: localDateString(),
    tags: "",
    image: null,
  });
  const [commentDrafts, setCommentDrafts] = useState({});
  const [activeTag, setActiveTag] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/members", { signal: controller.signal })
      .then((result) => {
        setMembers(result);
        const savedMemberId = localStorage.getItem(MEMBER_KEY);
        if (savedMemberId && result.some((member) => member._id === savedMemberId)) {
          setMemberId(savedMemberId);
        } else {
          localStorage.removeItem(MEMBER_KEY);
          setMemberId("");
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMembersLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    apiRequest(`/memories${query}`, { signal: controller.signal })
      .then(setMemories)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [memberId]);

  const tags = useMemo(
    () => [...new Set(memories.flatMap((memory) => memory.tags || []))].sort(),
    [memories]
  );
  const visibleMemories = useMemo(
    () => activeTag
      ? memories.filter((memory) => memory.tags?.includes(activeTag))
      : memories,
    [activeTag, memories]
  );

  function selectMember(event) {
    const nextId = event.target.value;
    setMemberId(nextId);
    setLoading(true);
    setError("");
    setNotice("");
    if (nextId) localStorage.setItem(MEMBER_KEY, nextId);
    else localStorage.removeItem(MEMBER_KEY);
  }

  async function refreshMemories() {
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    setMemories(await apiRequest(`/memories${query}`));
  }

  async function submitMemory(event) {
    event.preventDefault();
    if (!memberId) {
      setError("Choose your member profile before sharing a memory.");
      return;
    }
    if (!form.image) {
      setError("Choose a photo to add to your memory.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("memberId", memberId);
      body.append("title", form.title);
      body.append("description", form.description);
      body.append("date", new Date(`${form.date}T12:00:00`).toISOString());
      body.append("tags", form.tags);
      body.append("image", form.image);
      const result = await apiRequest("/memory-lane", { method: "POST", body });
      setNotice(result.message);
      setForm({ title: "", description: "", date: localDateString(), tags: "", image: null });
      event.target.reset();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(memory) {
    if (!memberId) {
      setError("Choose your member profile before liking a memory.");
      return;
    }
    setError("");
    try {
      const result = await apiRequest(`/memories/${memory._id}/likes`, {
        method: "POST",
        body: { memberId },
      });
      setMemories((current) => current.map((item) => item._id === memory._id
        ? { ...item, likeCount: result.likeCount, likedByMember: result.likedByMember }
        : item));
    } catch (likeError) {
      setError(likeError.message);
    }
  }

  async function submitComment(event, memoryId) {
    event.preventDefault();
    const text = (commentDrafts[memoryId] || "").trim();
    if (!memberId || !text) return;
    setError("");
    try {
      await apiRequest(`/memories/${memoryId}/comments`, {
        method: "POST",
        body: { memberId, text },
      });
      setCommentDrafts((current) => ({ ...current, [memoryId]: "" }));
      await refreshMemories();
    } catch (commentError) {
      setError(commentError.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8ff]">
      <section className="relative overflow-hidden bg-[#171329] text-white">
        <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-pink-500/20 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-violet-200">
            <Sparkles size={16} /> Our shared friendship scrapbook
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            Memory <span className="text-pink-300">Lane.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Save the photos, stories, and little moments we never want to forget. Share a memory and help our timeline grow.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
        <aside className="h-fit rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
          <h2 className="text-2xl font-black text-slate-900">Add a page to the scrapbook</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a photo, a caption, the date, and a few tags. Admins review contributions before they appear here.
          </p>
          <form onSubmit={submitMemory} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Sharing as</span>
              <select
                value={memberId}
                onChange={selectMember}
                required
                disabled={membersLoading}
                className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Choose your member profile…</option>
                {members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.files?.[0] || null }))}
                className="w-full rounded-xl border border-violet-100 px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-bold file:text-violet-700"
              />
              <span className="mt-1 block text-xs text-slate-400">JPEG, PNG, WebP, or GIF · up to 5 MB</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Caption</span>
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="A short title for this moment"
                className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">The story</span>
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What made this moment special?"
                className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">When it happened</span>
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tags</span>
              <input
                maxLength={320}
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="Trip, reunion, birthday…"
                className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              <span className="mt-1 block text-xs text-slate-400">Separate tags with commas (up to 10).</span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

            <button
              type="submit"
              disabled={submitting || !memberId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus size={18} /> {submitting ? "Sharing memory…" : "Submit for approval"}
            </button>
            <p className="text-xs leading-5 text-slate-400">
              Profile names are selected, not verified by sign-in. Only share photos you have permission to post.
            </p>
          </form>
        </aside>

        <section aria-labelledby="memory-timeline-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">Our friendship, in moments</p>
              <h2 id="memory-timeline-title" className="mt-2 text-3xl font-black text-slate-900">The memory timeline</h2>
            </div>
            <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">{memories.length} {memories.length === 1 ? "memory" : "memories"}</span>
          </div>

          {tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setActiveTag("")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeTag ? "bg-white text-slate-600 ring-1 ring-slate-200" : "bg-violet-600 text-white"}`}>All moments</button>
              {tags.map((tag) => (
                <button key={tag} type="button" onClick={() => setActiveTag(tag)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${activeTag === tag ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-100"}`}><Tag size={12} />{tag}</button>
              ))}
            </div>
          )}

          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? (
            <p className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-slate-500">Loading memories…</p>
          ) : visibleMemories.length ? (
            <div className="space-y-5">
              {visibleMemories.map((memory) => (
                <article key={memory._id} className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
                  <div className="relative max-h-[520px] overflow-hidden bg-slate-100">
                    <img src={apiAssetUrl(memory.imageUrl)} alt={memory.title} loading="lazy" className="max-h-[520px] w-full object-contain" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-violet-800 shadow-sm">
                      <CalendarDays size={14} className="text-pink-500" />{formatDate(memory.date)}
                    </span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Shared by {memory.submittedBy?.name || "FriendsZone"}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">{memory.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{memory.description}</p>
                    {memory.tags?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {memory.tags.map((tag) => <button key={tag} type="button" onClick={() => setActiveTag(tag)} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">#{tag}</button>)}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => toggleLike(memory)}
                        disabled={!memberId}
                        aria-pressed={Boolean(memory.likedByMember)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${memory.likedByMember ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-600 hover:bg-pink-50 hover:text-pink-600"}`}
                      >
                        <Heart size={17} fill={memory.likedByMember ? "currentColor" : "none"} />
                        {memory.likeCount || 0} {memory.likeCount === 1 ? "like" : "likes"}
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><MessageCircle size={16} />{memory.comments?.length || 0} comments</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(memory.comments || []).map((comment) => (
                        <div key={comment._id} className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-bold text-slate-800">{comment.author?.name || "Member"}</span>
                            <time className="text-xs text-slate-400">{formatDate(comment.createdAt)}</time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.text}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(event) => submitComment(event, memory._id)} className="mt-4 flex gap-2">
                      <input
                        value={commentDrafts[memory._id] || ""}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [memory._id]: event.target.value }))}
                        maxLength={500}
                        placeholder={memberId ? "Leave a kind comment…" : "Choose your profile to comment"}
                        aria-label={`Comment on ${memory.title}`}
                        disabled={!memberId}
                        className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                      <button type="submit" disabled={!memberId || !(commentDrafts[memory._id] || "").trim()} aria-label="Send comment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /></button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-10 text-center">
              <Heart size={34} className="mx-auto text-pink-400" />
              <h3 className="mt-4 text-xl font-black text-slate-900">{activeTag ? "No moments with that tag yet" : "The first page is waiting"}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Share a favorite photo and story to start the timeline.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
