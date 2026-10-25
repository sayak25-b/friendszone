import { useEffect, useState } from "react";

const API = `${import.meta.env.VITE_API_URL || "https://friendszone-10.onrender.com"}/api`;

export default function BirthdayCalendar() {
  const [birthdays, setBirthdays] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const response = await fetch(`${API}/birthdays`);
        if (!response.ok) throw new Error("Unable to load birthdays");
        setBirthdays(await response.json());
      } catch {
        setError("Could not load birthdays. Please try again later.");
      }
    }

    fetchBirthdays();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          🎂 FriendsZone Birthday Calendar
        </h1>
        <p className="mb-8 text-slate-500">
          Celebrate the special days of our friends.
        </p>

        {error && <p className="text-red-600">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {birthdays.map((member) => (
            <article
              key={member._id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              {member.imageUrl && (
                <img
                  src={member.imageUrl}
                  alt={member.name}
                  className="mb-4 h-48 w-full rounded-xl object-cover"
                />
              )}

              <h2 className="text-lg font-bold text-slate-800">
                {member.name}
              </h2>

              <p className="mt-2 text-indigo-600">
                🎉{" "}
                {new Date(member.birthday).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
              </p>
            </article>
          ))}
        </div>

        {!error && birthdays.length === 0 && (
          <p className="mt-6 text-slate-500">
            No birthdays added yet.
          </p>
        )}
      </div>
    </main>
  );
}