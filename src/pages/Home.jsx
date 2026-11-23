
import { useEffect, useState } from "react";
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
  Megaphone,
} from "lucide-react";
import useApiData from "../hooks/useApiData";
import { apiAssetUrl, apiRequest } from "../lib/api";
import { formatMonthYear } from "../utils/dateFormat";
import WishBanner from "../components/WishBanner";

function ActiveWishBanner() {
  const [wishes, setWishes] = useState([]);
  const [error, setError] = useState("");
  const [dismissedId, setDismissedId] = useState(
    () => window.sessionStorage.getItem("friendszone-dismissed-wish") || ""
  );
  const wish = wishes[0];

  useEffect(() => {
    const controller = new AbortController();
    async function refreshWish() {
      try {
        setWishes(await apiRequest("/wishes/active", { signal: controller.signal }));
        setError("");
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message);
      }
    }

    refreshWish();
    const timer = window.setInterval(refreshWish, 60000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);

  function dismiss() {
    window.sessionStorage.setItem("friendszone-dismissed-wish", wish._id);
    setDismissedId(wish._id);
  }

  if (!wish || dismissedId === wish._id) {
    return error ? (
      <p role="status" className="bg-violet-50 px-5 py-2 text-center text-xs text-slate-600">
        The occasion greeting could not be loaded: {error}
      </p>
    ) : null;
  }

  return <WishBanner wish={wish} onClose={dismiss} />;
}

function LatestAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissedId, setDismissedId] = useState(
    () => window.sessionStorage.getItem("friendszone-dismissed-announcement") || ""
  );

  useEffect(() => {
    const controller = new AbortController();
    async function refreshAnnouncement() {
      try {
        const result = await apiRequest("/announcements/latest", { signal: controller.signal });
        setAnnouncement(result);
      } catch {
        if (!controller.signal.aborted) setAnnouncement(null);
      }
    }
    refreshAnnouncement();
    const timer = window.setInterval(refreshAnnouncement, 60000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);

  if (!announcement || dismissedId === announcement._id) return null;

  function dismiss() {
    window.sessionStorage.setItem("friendszone-dismissed-announcement", announcement._id);
    setDismissedId(announcement._id);
  }

  const hasLink = Boolean(announcement.linkUrl);
  const linkIsExternal = hasLink && /^https?:\/\//i.test(announcement.linkUrl);

  return (
    <section className="border-b border-violet-100 bg-violet-50/80" aria-label="Latest announcement">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-4 sm:items-center sm:px-6 lg:px-8">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white sm:mt-0">
          <Megaphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600">Latest announcement</p>
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="font-black text-slate-900">{announcement.title}</h2>
            <p className="text-sm leading-6 text-slate-600">{announcement.message}</p>
          </div>
        </div>
        {hasLink && (
          linkIsExternal ? (
            <a
              href={announcement.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:border-violet-300 sm:inline-flex"
            >
              {announcement.linkLabel || "View"} <ArrowRight size={16} />
            </a>
          ) : (
            <Link
              to={announcement.linkUrl}
              className="hidden shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:border-violet-300 sm:inline-flex"
            >
              {announcement.linkLabel || "View"} <ArrowRight size={16} />
            </Link>
          )
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
        >
          ×
        </button>
      </div>
    </section>
  );
}

function MemoryCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: memories, loading, error } = useApiData("/memories");

  const latestMemories = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const activeIndex = currentIndex % latestMemories.length;
  const activeMemory = latestMemories[activeIndex];

  useEffect(() => {
    if (latestMemories.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % latestMemories.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [currentIndex, latestMemories.length]);

  const next = () => {
    setCurrentIndex((current) => (current + 1) % latestMemories.length);
  };

  const previous = () => {
    setCurrentIndex(
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
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-violet-600">
            Our little time machine
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Latest <span className="text-violet-600">Memories</span>
          </h2>
          <p className="mt-3 max-w-xl text-slate-500">
            Revisit the laughter, friendship and moments we share.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl sm:rounded-[2rem]"
          role="region"
          aria-roledescription="carousel"
          aria-label="Latest memories"
        >
          <div className="relative flex h-[clamp(240px,58svh,520px)] items-center justify-center overflow-hidden bg-slate-900 sm:h-[clamp(320px,65svh,560px)]">
            <img
              key={`${activeMemory._id}-backdrop`}
              src={apiAssetUrl(activeMemory.imageUrl)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            />
            <img
              key={activeMemory._id}
              src={apiAssetUrl(activeMemory.imageUrl)}
              alt={activeMemory.title}
              className="relative z-10 h-full w-full object-contain"
            />

            <button
              type="button"
              onClick={previous}
              aria-label="Previous memory"
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/50 text-white backdrop-blur transition hover:bg-white hover:text-violet-700 sm:left-5 sm:h-12 sm:w-12"
            >
              <ChevronLeft size={23} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next memory"
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/50 text-white backdrop-blur transition hover:bg-white hover:text-violet-700 sm:right-5 sm:h-12 sm:w-12"
            >
              <ChevronRight size={23} />
            </button>
          </div>

          <div
            key={`${activeMemory._id}-caption`}
            className="bg-gradient-to-r from-slate-950 via-violet-950 to-slate-950 px-6 py-6 text-white sm:px-10 sm:py-8 lg:px-12"
            aria-live="polite"
            aria-atomic="true"
          >
            <article className="mx-auto w-full max-w-5xl">
              <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider sm:text-sm">
                {formatMonthYear(activeMemory.date)}
              </span>
              <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                {activeMemory.title}
              </h3>
              {activeMemory.description && (
                <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
                  {activeMemory.description}
                </p>
              )}
              <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                {latestMemories.map((memory, index) => (
                  <span
                    key={memory._id}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-8 bg-white"
                        : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs font-semibold text-white/75">
                  {activeIndex + 1} / {latestMemories.length}
                </span>
              </div>
            </article>
          </div>
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
      <ActiveWishBanner />
      <LatestAnnouncement />
      <section className="home-hero relative isolate overflow-hidden">
        <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-pink-200/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:py-18 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="home-reveal">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700 shadow-sm backdrop-blur">
              <Sparkles size={16} />
              A circle worth keeping
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[5.5rem]">
              Good times deserve
              <span className="mt-2 block text-violet-600">
                good company.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              FriendsZone is our shared place for celebrations, inside jokes,
              group photos and the stories that make every meetup memorable.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-violet-700 px-7 py-4 font-bold text-white shadow-[0_14px_32px_rgba(109,40,217,0.24)] transition hover:-translate-y-1 hover:bg-slate-950"
              >
                Join Our Circle <ArrowRight className="transition group-hover:translate-x-1" size={19} />
              </a>
              <Link
                to="/memories"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:text-violet-700"
              >
                <Images size={19} /> Explore Memories
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <Heart size={17} className="text-pink-500" /> Real friendships
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={17} className="text-violet-500" /> Shared stories
              </span>
              <span className="flex items-center gap-2">
                <Users size={17} className="text-violet-500" /> One community
              </span>
            </div>
          </div>

          <div className="home-collage relative mx-auto w-full max-w-[540px] px-2 pb-5 sm:px-8 lg:px-0">
            <div className="absolute -right-3 top-8 h-24 w-24 rotate-12 rounded-full border border-pink-200/70 bg-pink-100/60 sm:-right-5" />
            <div className="absolute -left-4 bottom-16 h-20 w-20 -rotate-12 rounded-[1.75rem] border border-violet-200/70 bg-violet-100/60 sm:-left-8" />
            <div className="home-collage-main relative overflow-hidden rounded-[2rem] border-[8px] border-white shadow-[0_28px_70px_rgba(76,29,149,0.22)]">
              <img
                src="/images/friendszone-hero.jpg"
                alt="Friends spending time together"
                className="h-[350px] w-full object-cover sm:h-[470px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent px-6 pb-7 pt-24 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-200">
                  Together, always
                </p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  More laughs. More stories. More us.
                </h2>
              </div>
            </div>

            <div className="home-polaroid home-polaroid-top absolute -right-1 top-10 hidden w-32 rotate-6 rounded-xl border-[5px] border-white bg-white shadow-xl sm:block">
              <img
                src="/images/friendszone-gathering.jpg"
                alt=""
                className="h-[100px] w-full object-cover"
              />
            </div>
            <div className="home-polaroid home-polaroid-bottom absolute -bottom-1 -left-1 hidden w-36 -rotate-6 rounded-xl border-[5px] border-white bg-white shadow-xl sm:block">
              <img
                src="/images/friendszone-gathering2.jpg"
                alt=""
                className="h-28 w-full object-cover"
              />
            </div>

            <div className="absolute bottom-0 right-2 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-xl backdrop-blur sm:right-4 lg:-right-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                <Heart fill="currentColor" size={22} />
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Made with love</p>
                <p className="mt-0.5 text-xs text-slate-500">For friends, by friends</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MemoryCarousel />
      <section className="px-5 py-14 sm:py-16">
        <div className="relative mx-auto overflow-hidden rounded-[2.25rem] bg-slate-950 px-6 py-12 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:px-12 sm:py-14 lg:max-w-7xl">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-pink-300">
              <Heart fill="currentColor" size={27} />
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Our story has room for you, too.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
              Submit your details to join the circle. Approved members are
              added to our community and invited into the next shared moment.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdwhTzwyq6_5R1Cd5PeSGq0JOvvScwUCDVuCOAUpCTxBbJPUQ/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-extrabold text-violet-700 transition hover:-translate-y-1 hover:bg-pink-50"
            >
              Register to Join <ArrowRight size={19} />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-2 lg:px-8">
        <div className="mb-7 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">
              Pick a place
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              Explore FriendsZone
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500 sm:text-right">
            Everything we share, gathered in one friendly corner.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: <Gamepad2 size={24} />,
            title: "Play Zone",
            description: "Solve today's picture puzzle, play trivia, and climb the leaderboard.",
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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              {item.icon}
            </span>
            <h3 className="mt-6 text-xl font-extrabold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-2 leading-7 text-slate-500">{item.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700">
              Explore <ArrowRight size={17} />
            </span>
          </Link>
        ))}
        </div>
      </section>
    </main>
  );
}
