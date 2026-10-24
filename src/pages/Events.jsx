
import { useState } from "react";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { events } from "../data/websiteData";

export default function Events() {
  const [filter, setFilter] = useState("All");

  const filteredEvents = events.filter((event) => {
    if (filter === "All") return true;
    return event.status === filter;
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <CalendarDays size={28} />
          </span>
          <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.2em] text-violet-600">
            Save the date
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900 sm:text-5xl">
            FriendsZone <span className="text-violet-600">Events</span>
          </h1>
          <p className="mt-5 leading-8 text-slate-600">
            From planned meetups to the outings we still talk about,
            this is where our shared adventures live.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["All", "Upcoming", "Past"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-6 py-3 text-sm font-bold transition ${
                filter === option
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                  : "border border-violet-100 bg-white text-slate-600 hover:bg-violet-50"
              }`}
            >
              {option} Events
            </button>
          ))}
        </div>

        {filteredEvents.length ? (
          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-60">
                  <img
                    src={event.image}
                    alt={event.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={`absolute left-4 top-4 rounded-full px-4 py-2 text-xs font-extrabold ${
                      event.status === "Upcoming"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-white/90 text-slate-600"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>

                <div className="p-6">
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {event.title}
                  </h2>
                  <p className="mt-3 leading-7 text-slate-500">
                    {event.description}
                  </p>
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                    <p className="flex items-center gap-3">
                      <CalendarDays size={17} className="text-violet-600" />
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </p>
                    <p className="flex items-center gap-3">
                      <MapPin size={17} className="text-pink-500" />
                      {event.location}
                    </p>
                    <p className="flex items-center gap-3">
                      <Clock size={17} className="text-violet-600" />
                      {event.status === "Upcoming"
                        ? "Coming up"
                        : "Memory made"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-slate-500">
            No events in this category yet.
          </p>
        )}
      </section>
    </main>
  );
}
