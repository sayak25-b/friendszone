
import { useEffect, useRef, useState } from "react";
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

function HomeFireworks() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["#ff3b9d", "#ffae32", "#fff4b0", "#49e6a3", "#a477ff"];
    let width = 0;
    let height = 0;
    let animationFrame;
    let lastLaunch = 0;
    let lastFrame = 0;
    const rockets = [];
    const particles = [];

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const launchRocket = () => {
      const x = width * (0.08 + Math.random() * 0.84);
      rockets.push({
        x,
        y: height + 5,
        targetY: height * (0.16 + Math.random() * 0.5),
        speed: 4 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        trail: [],
      });
    };

    const burst = (rocket) => {
      const count = 95 + Math.floor(Math.random() * 45);
      const angleOffset = Math.random() * Math.PI * 2;
      for (let index = 0; index < count; index += 1) {
        const angle = angleOffset + (index / count) * Math.PI * 2;
        const life = 70 + Math.random() * 45;
        const speed = 1.5 + Math.random() * 4.4;
        particles.push({
          x: rocket.x,
          y: rocket.y,
          previousX: rocket.x,
          previousY: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          color: Math.random() < 0.3 ? "#fff7d6" : rocket.color,
        });
      }
    };

    const seedFireworks = () => {
      burst({ x: width * 0.18, y: height * 0.2, color: colors[0] });
      burst({ x: width * 0.52, y: height * 0.28, color: colors[1] });
      burst({ x: width * 0.84, y: height * 0.18, color: colors[3] });
    };

    const drawStaticFireworks = () => {
      const positions = [
        [width * 0.18, height * 0.2, colors[0]],
        [width * 0.52, height * 0.28, colors[1]],
        [width * 0.84, height * 0.18, colors[3]],
      ];
      context.globalCompositeOperation = "lighter";
      positions.forEach(([x, y, color]) => {
        for (let index = 0; index < 56; index += 1) {
          const angle = (index / 56) * Math.PI * 2;
          const length = 35 + Math.random() * 85;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
          context.strokeStyle = index % 4 === 0 ? "#fff7d6" : color;
          context.lineWidth = 1.8;
          context.globalAlpha = 0.9;
          context.shadowBlur = 12;
          context.shadowColor = color;
          context.stroke();
        }
      });
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
    };

    const draw = (timestamp) => {
      const delta = Math.min((timestamp - (lastFrame || timestamp)) / 16.67, 2);
      lastFrame = timestamp;
      context.clearRect(0, 0, width, height);

      if (timestamp - lastLaunch > 420) {
        launchRocket();
        if (Math.random() > 0.55) launchRocket();
        lastLaunch = timestamp;
      }

      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";

      for (let index = rockets.length - 1; index >= 0; index -= 1) {
        const rocket = rockets[index];
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 10) rocket.trail.shift();
        rocket.y -= rocket.speed * delta;

        context.beginPath();
        context.moveTo(rocket.x, rocket.y);
        rocket.trail.forEach((point) => context.lineTo(point.x, point.y));
        context.strokeStyle = rocket.color;
        context.globalAlpha = 0.8;
        context.lineWidth = 2;
        context.shadowBlur = 12;
        context.shadowColor = rocket.color;
        context.stroke();

        if (rocket.y <= rocket.targetY) {
          burst(rocket);
          rockets.splice(index, 1);
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.035 * delta;
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        particle.life -= delta;

        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.beginPath();
        context.moveTo(particle.previousX, particle.previousY);
        context.lineTo(particle.x, particle.y);
        context.globalAlpha = 0.9 * Math.sqrt(particle.life / particle.maxLife);
        context.strokeStyle = particle.color;
        context.lineWidth = 1.8;
        context.shadowBlur = 12;
        context.shadowColor = particle.color;
        context.stroke();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    if (reducedMotion.matches) {
      drawStaticFireworks();
    } else {
      seedFireworks();
      animationFrame = window.requestAnimationFrame(draw);
    }

    const handleMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      context.clearRect(0, 0, width, height);
      if (reducedMotion.matches) {
        drawStaticFireworks();
      } else {
        seedFireworks();
        lastFrame = 0;
        animationFrame = window.requestAnimationFrame(draw);
      }
    };
    reducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="home-fireworks-canvas" />;
}

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
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
        <div className="home-fireworks pointer-events-none absolute inset-0" aria-hidden="true">
          <HomeFireworks />
        </div>

        <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 -z-10 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-amber-100 shadow-sm backdrop-blur">
              <Sparkles size={16} />
              A little home for our friendship
            </div>

            <h1 className="mt-7 text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Friendship is
              <span className="block bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-transparent">
                better together.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
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

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-200">
              <span className="flex items-center gap-2">
                <Heart size={17} className="text-pink-300" /> Real friendships
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={17} className="text-amber-300" /> Shared stories
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
