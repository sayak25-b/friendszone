import { Link } from "react-router-dom";
import {
  CalendarDays, Images, Users, ArrowRight, Sparkles,
} from "lucide-react";

const activities = [
  {
    emoji: "🎂",
    title: "Birthday celebration",
    text: "Plan the next birthday meetup together.",
    date: "Coming soon",
  },
  {
    emoji: "📸",
    title: "Add photos to Memory Wall",
    text: "Save the moments you never want to forget.",
    date: "Anytime",
  },
  {
    emoji: "🗳️",
    title: "Choose our next outing",
    text: "Create a poll and let everyone decide.",
    date: "Group decision",
  },
];

const shortcuts = [
  { title: "Share a memory", icon: Images, to: "/memories" },
  { title: "Plan an outing", icon: CalendarDays, to: "/events" },
  { title: "Meet the circle", icon: Users, to: "/members" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-7 text-white md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <Sparkles size={16} /> YOUR FRIENDSHIP SPACE
            </p>
            <h1 className="heading-font mt-3 text-4xl font-bold">
              Hey, friend! 💜
            </h1>
            <p className="mt-3 max-w-lg leading-7 text-violet-100">
              This is your corner of the internet. Share a memory,
              plan an adda, and make your next story unforgettable.
            </p>
            <Link
              to="/memories"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-violet-700"
            >
              Explore memories <ArrowRight size={17} />
            </Link>
          </div>
          <div className="text-7xl" aria-hidden="true">🫶</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Quick actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ title, icon: Icon, to }) => (
            <Link
              to={to}
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="rounded-xl bg-violet-100 p-3 text-violet-700">
                <Icon size={23} />
              </span>
              <span className="font-bold">{title}</span>
              <ArrowRight size={17} className="ml-auto text-slate-400" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Your next chapter</h2>
          <Link to="/events" className="text-sm font-bold text-violet-600">
            View events
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {activities.map((activity) => (
            <article
              key={activity.title}
              className="rounded-2xl border border-slate-100 bg-white p-5"
            >
              <span className="text-3xl">{activity.emoji}</span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-violet-600">
                {activity.date}
              </p>
              <h3 className="mt-2 font-bold">{activity.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {activity.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-pink-100 bg-pink-50 p-5">
        <p className="font-bold text-pink-900">A little reminder 💌</p>
        <p className="mt-1 text-sm leading-6 text-pink-800">
          The best memories often start with one simple message:
          “Are you free this weekend?”
        </p>
      </div>
    </div>
  );
}