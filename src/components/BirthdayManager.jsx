
import { useEffect, useState } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

export default function BirthdayManager() {
  const [memberId, setMemberId] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdays, setBirthdays] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  async function loadBirthdays() {
    try {
      const response = await fetch(`${API}/birthdays`);
      if (!response.ok) throw new Error("Could not load birthdays");
      setBirthdays(await response.json());
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadBirthdays();
  }, []);

  async function saveBirthday(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API}/birthdays/${memberId.trim()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ birthday }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Save failed");

      setMessage("Birthday saved successfully!");
      setMemberId("");
      setBirthday("");
      await loadBirthdays();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeBirthday(id) {
    if (!window.confirm("Remove this birthday?")) return;

    try {
      const response = await fetch(`${API}/birthdays/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");

      setMessage("Birthday removed.");
      await loadBirthdays();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Birthday Manager
        </h1>
        <p className="mb-8 text-slate-500">
          Add and manage birthdays for FriendsZone members.
        </p>

        <form
          onSubmit={saveBirthday}
          className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Member ID
            </label>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Paste the member's MongoDB ID"
              required
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Birthday
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Birthday"}
          </button>

          {message && (
            <p role="status" className="text-sm text-indigo-700">
              {message}
            </p>
          )}
        </form>

        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Saved Birthdays
        </h2>

        <div className="space-y-3">
          {birthdays.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {member.name}
                </p>
                <p className="text-sm text-slate-500">
                  {new Date(member.birthday).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeBirthday(member._id)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}

          {birthdays.length === 0 && (
            <p className="rounded-xl bg-white p-5 text-slate-500">
              No birthdays have been added yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
