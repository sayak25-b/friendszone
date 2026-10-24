
import { useMemo, useState } from "react";
import {
  Search,
  Heart,
  MapPin,
  Sparkles,
  Users,
  ArrowUpRight,
  X,
} from "lucide-react";
import useApiData from "../hooks/useApiData";
import { apiAssetUrl } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";

export default function Members() {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const { data: members, loading, error } = useApiData("/members");

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const query = search.toLowerCase();

      return (
        member.name.toLowerCase().includes(query) ||
        (member.city || "").toLowerCase().includes(query) ||
        (member.role || "").toLowerCase().includes(query) ||
        (member.bio || "").toLowerCase().includes(query)
      );
    });
  }, [members, search]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#faf8ff]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#171329] text-white">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-pink-500/20 blur-[100px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-violet-200 backdrop-blur">
              <Sparkles size={16} />
              The people behind our stories
            </div>

            <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Different souls.
              <span className="mt-2 block bg-gradient-to-r from-violet-300 via-pink-300 to-rose-300 bg-clip-text text-transparent">
                One beautiful circle.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Every friend adds a different colour to our story. Meet the
              people who make FriendsZone more than just a website.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#member-gallery"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-violet-800 transition hover:bg-pink-100"
              >
                Meet the members <ArrowUpRight size={18} />
              </a>

              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Heart size={18} className="text-pink-300" />
                A community built on memories
              </div>
            </div>
          </div>

          {/* Decorative collage */}
          <div className="relative mx-auto h-[340px] w-full max-w-lg sm:h-[430px]">
            <div className="absolute left-[8%] top-[12%] h-[65%] w-[48%] rotate-[-9deg] overflow-hidden rounded-[2rem] border-[6px] border-white/90 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=85"
                alt="Friends sharing a moment"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute right-[6%] top-[5%] h-[57%] w-[43%] rotate-[8deg] overflow-hidden rounded-[2rem] border-[6px] border-white/90 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=85"
                alt="Friends spending time together"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute bottom-[4%] left-[27%] h-[48%] w-[49%] rotate-[3deg] overflow-hidden rounded-[2rem] border-[6px] border-white/90 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=700&q=85"
                alt="A friendship gathering"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute bottom-[12%] left-[2%] flex h-14 w-14 rotate-[-12deg] items-center justify-center rounded-2xl bg-pink-400 text-white shadow-xl sm:h-16 sm:w-16">
              <Heart size={28} fill="currentColor" />
            </div>

            <div className="absolute right-[1%] top-[63%] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-xl">
              <p className="text-xs font-medium text-violet-200">
                Our favourite thing
              </p>
              <p className="mt-1 font-extrabold">Being together ♡</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery heading and search */}
      <section
        id="member-gallery"
        className="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8"
      >
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-violet-600">
              The friendship directory
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Our favourite <span className="text-violet-600">people.</span>
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-500">
              Not just names on a list — people who make ordinary days special.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a friend by name or city..."
              aria-label="Search members"
              className="w-full rounded-2xl border border-violet-100 bg-white py-4 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-b border-violet-100 pb-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Users size={18} className="text-violet-600" />
            Community members
          </div>
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-extrabold text-violet-700">
            {filteredMembers.length} {filteredMembers.length === 1 ? "friend" : "friends"}
          </span>
        </div>

        {/* Member cards */}
        {loading ? (
          <p className="mt-10 rounded-3xl border border-violet-100 bg-white p-8 text-center text-slate-500">
            Loading members…
          </p>
        ) : error ? (
          <p role="alert" className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            {error}
          </p>
        ) : filteredMembers.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMembers.map((member) => (
              <article
                key={member._id}
                className="group relative overflow-hidden rounded-[1.75rem] border border-violet-100/80 bg-white transition duration-300 hover:-translate-y-1.5 hover:border-violet-200 hover:shadow-[0_24px_60px_-25px_rgba(124,58,237,0.28)]"
              >
  <div className="relative m-3 mb-0 h-64 overflow-hidden rounded-[1.3rem] bg-gradient-to-br from-violet-100 to-pink-100">
  <img
    src={apiAssetUrl(member.imageUrl)}
    alt={member.name}
    loading="lazy"
    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
  />


                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />

                  <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-violet-800 backdrop-blur">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Community member
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    aria-label={`View details for ${member.name}`}
                    className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-violet-700 shadow-lg transition hover:bg-violet-600 hover:text-white"
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </div>

                <div className="p-5 pt-4">
                  <h3 className="truncate text-lg font-extrabold text-slate-900">
                    {member.name}
                  </h3>

                  <p className="mt-1 text-sm font-medium text-violet-600">
                    {member.role || "FriendsZone Member"}
                  </p>

                  {member.city && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={15} className="shrink-0 text-pink-500" />
                      {member.city}
                    </p>
                  )}

                  {member.bio && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                      {member.bio}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">
                      {member.joinedAt
                        ? `Joined ${formatMonthYear(member.joinedAt)}`
                        : "Part of our circle"}
                    </span>
                    <Heart
                      size={17}
                      className="text-pink-400 transition group-hover:scale-110"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-violet-200 bg-white px-6 py-16 text-center">
            <Users className="mx-auto text-violet-400" size={40} />
            <h3 className="mt-4 text-xl font-extrabold text-slate-900">
              No friends found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try another name or city.
            </p>
          </div>
        )}
      </section>

      {/* Member details modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMember(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close member details"
              onClick={() => setSelectedMember(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
            >
              <X size={20} />
            </button>

            <div className="h-64 overflow-hidden bg-violet-100">
              <img
                src={apiAssetUrl(selectedMember.imageUrl)}
                alt={selectedMember.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">
                Part of our circle
              </p>
              <h2
                id="member-modal-title"
                className="mt-2 text-2xl font-black text-slate-900"
              >
                {selectedMember.name}
              </h2>
              <p className="mt-2 font-semibold text-pink-600">
                {selectedMember.role || "FriendsZone Member"}
              </p>

              {selectedMember.city && (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={17} />
                  {selectedMember.city}
                </p>
              )}

              {selectedMember.bio && (
                <p className="mt-4 leading-7 text-slate-600">
                  {selectedMember.bio}
                </p>
              )}

              {(selectedMember.instagram || selectedMember.website) && (
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                  {selectedMember.instagram && (
                    <a
                      href={selectedMember.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-700 hover:text-pink-600"
                    >
                      Instagram
                    </a>
                  )}
                  {selectedMember.website && (
                    <a
                      href={selectedMember.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-700 hover:text-pink-600"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}

              {selectedMember.joinedAt && (
                <p className="mt-4 text-xs text-slate-400">
                  Joined {formatMonthYear(selectedMember.joinedAt)}
                </p>
              )}

              <div className="mt-6 flex items-center gap-2 rounded-2xl bg-pink-50 p-4 text-sm font-medium text-pink-700">
                <Heart size={18} fill="currentColor" />
                Every friend is part of our story.
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
