
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  CalendarDays,
  Users,
  Sparkles,
  Gamepad2,
} from "lucide-react";
import useApiData from "../hooks/useApiData";
import { apiAssetUrl } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";

function MemoryCarousel() {
  const [start, setStart] = useState(0);
  const { data: memories, loading, error } = useApiData("/memories");

  const latestMemories = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const visibleMemories = Array.from(
    { length: Math.min(5, latestMemories.length) },
    (_, index) => latestMemories[(start + index) % latestMemories.length]
  );

  const next = () => {
    setStart((current) => (current + 1) % latestMemories.length);
  };

  const previous = () => {
    setStart(
      (current) =>
        (current - 1 + latestMemories.length) % latestMemories.length
    );
  };

  if (loading || error || !latestMemories.length) {
    if (!loading && !error) return null;
    return (
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-5 text-center text-sm text-slate-500 lg:px-8">
          {loading ? "Loading memories…" : error}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-violet-600">
              Our little time machine
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Latest <span className="text-violet-600">Memories</span>
            </h2>
            <p className="mt-3 max-w-xl text-slate-500">
              Five glimpses of the laughter, friendship and moments we share.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={previous}
              aria-label="Previous memories"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 text-violet-700 transition hover:bg-violet-600 hover:text-white"
            >
              <ChevronLeft size={23} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next memories"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-pink-500"
            >
              <ChevronRight size={23} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visibleMemories.map((memory, index) => (
            <article
              key={`${memory._id}-${start}-${index}`}
              className="group overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={apiAssetUrl(memory.imageUrl)}
                  alt={memory.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-violet-700">
                  {formatMonthYear(memory.date)}
                </span>
              </div>
              <div className="p-5">
                <h3 className="line-clamp-2 font-extrabold text-slate-900">
                  {memory.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {memory.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/memories"
            className="inline-flex items-center gap-2 font-bold text-violet-700 hover:text-pink-600"
          >
            Explore all memories <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50">
        <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 -z-10 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
              <Sparkles size={16} />
              A little home for our friendship
            </div>

            <h1 className="mt-7 text-5xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Friendship is
              <span className="block bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                better together.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Welcome to FriendsZone — where familiar faces, unforgettable
              outings and little everyday moments become memories we can
              revisit forever.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-7 py-4 font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-1"
              >
                Join Our Circle <ArrowRight size={19} />
              </a>
              <Link
                to="/memories"
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-7 py-4 font-bold text-violet-700 transition hover:bg-violet-50"
              >
                <Images size={19} /> Explore Memories
              </Link>
              <Link
                to="/play-zone"
                className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-7 py-4 font-bold text-pink-700 transition hover:bg-pink-50"
              >
                <Gamepad2 size={19} /> Play Zone
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-2">
                <Heart size={17} className="text-pink-500" /> Real friendships
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={17} className="text-violet-500" /> Shared stories
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rotate-3 rounded-[2rem] bg-gradient-to-br from-violet-200 to-pink-200" />
            <div className="relative overflow-hidden rounded-[2rem] border-8 border-white shadow-2xl">
              <img
                src="/images/friendszone-hero.jpg"
                alt="Friends spending time together"
                className="h-[340px] w-full object-cover sm:h-[450px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-6 pt-20 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-200">
                  Together, always
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Collect moments, not things.
                </h2>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-2 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl sm:-left-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                <Heart fill="currentColor" size={22} />
              </span>
              <div>
                <p className="font-extrabold text-slate-900">Made with love</p>
                <p className="text-xs text-slate-500">For friends, by friends</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MemoryCarousel />
      <section className="bg-gradient-to-r from-violet-600 to-pink-500 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <Heart className="mx-auto" size={36} />
          <h2 className="mt-5 text-3xl font-black sm:text-4xl">
            Our story has room for you, too.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/85">
            Want to become a part of FriendsZone? Fill in the registration
            form. Once your details are reviewed, we'll add approved members
            to our community page.
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-extrabold text-violet-700 transition hover:bg-pink-50"
          >
            Register to Join <ArrowRight size={19} />
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {[
          {
            icon: <Gamepad2 size={24} />,
            title: "Play Zone",
            description: "Guess the lies, play daily trivia, and climb the leaderboard.",
            link: "/play-zone",
          },
          {
            icon: <Images size={24} />,
            title: "Memories",
            description: "Revisit the photos and stories that mean the most.",
            link: "/memories",
          },
          {
            icon: <CalendarDays size={24} />,
            title: "Events",
            description: "See our upcoming meetups and past adventures.",
            link: "/events",
          },
          {
            icon: <Users size={24} />,
            title: "Our Members",
            description: "Meet the approved members of our community.",
            link: "/members",
          },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.link}
            className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              {item.icon}
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-2 leading-7 text-slate-500">{item.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 font-bold text-violet-700">
              Explore <ArrowRight size={17} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
