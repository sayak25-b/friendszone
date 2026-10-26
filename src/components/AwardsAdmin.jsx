import { useEffect, useState } from "react";
import { Award, CalendarDays, Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

function dateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialForm() {
  const closesAt = new Date();
  closesAt.setDate(closesAt.getDate() + 7);
  return {
    title: "",
    description: "",
    closesAt: localDateString(closesAt),
    nominees: [],
  };
}

export default function AwardsAdmin({ token }) {
  const [awards, setAwards] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiRequest("/admin/awards", { token, signal: controller.signal }),
      apiRequest("/members", { signal: controller.signal }),
    ])
      .then(([awardRecords, memberRecords]) => {
        setAwards(awardRecords);
        setMembers(memberRecords);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  function resetForm() {
    setForm(initialForm());
    setEditingId("");
    setError("");
    setNotice("");
  }

  function toggleNominee(memberId) {
    setForm((current) => ({
      ...current,
      nominees: current.nominees.includes(memberId)
        ? current.nominees.filter((id) => id !== memberId)
        : [...current.nominees, memberId],
    }));
  }

  function editAward(award) {
    setEditingId(award._id);
    setForm({
      title: award.title,
      description: award.description || "",
      closesAt: dateInput(award.closesAt),
      nominees: award.nominees.map((member) => String(member._id)),
    });
    setError("");
    setNotice("");
  }

  async function saveAward(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        closesAt: new Date(`${form.closesAt}T23:59:59.999`).toISOString(),
      };
      const record = await apiRequest(
        editingId ? `/admin/awards/${editingId}` : "/admin/awards",
        { method: editingId ? "PUT" : "POST", body: payload, token }
      );
      const nominees = members.filter((member) => form.nominees.includes(member._id));
      if (editingId) {
        setAwards((current) => current.map((award) => (
          award._id === record._id
            ? { ...record, nominees, voteCount: award.voteCount }
            : award
        )));
      } else {
        setAwards((current) => [{ ...record, nominees, voteCount: 0 }, ...current]);
      }
      setNotice(editingId ? "Award updated." : "Award created.");
      setForm(initialForm());
      setEditingId("");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAward(award) {
    if (!window.confirm(`Delete "${award.title}" and all its votes? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/awards/${award._id}`, { method: "DELETE", token });
      setAwards((current) => current.filter((item) => item._id !== award._id));
      if (editingId === award._id) resetForm();
      setNotice("Award deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <div className="mt-8 grid gap-7 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
      <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Award size={22} /></span>
          <div>
            <h2 className="text-xl font-black text-slate-900">Friends Awards</h2>
            <p className="text-sm text-slate-500">Create categories, choose nominees, and track voting.</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <div className="mt-6 divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading awards…</p>
          ) : awards.length ? awards.map((item) => (
            <article key={item._id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Award size={22} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Closes {new Date(item.closesAt).toLocaleDateString("en-IN")} · {item.nominees.length} nominees · {item.voteCount} votes
                </p>
              </div>
              <button type="button" onClick={() => editAward(item)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"><Pencil size={15} /> Edit</button>
              <button type="button" onClick={() => deleteAward(item)} aria-label={`Delete ${item.title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
            </article>
          )) : (
            <p className="py-8 text-center text-sm text-slate-500">No awards created yet.</p>
          )}
        </div>
      </section>

      <section className="h-fit rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-slate-900">{editingId ? "Edit award" : "Create an award"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Choose a fun category, closing date, and at least two active member nominees.</p>
        <form onSubmit={saveAward} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Award category</span>
            <input required maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Biggest Laugh" className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Description (optional)</span>
            <textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="A little context for the award…" className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Voting closes</span>
            <span className="relative block">
              <CalendarDays size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" />
              <input required type="date" value={form.closesAt} onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))} className="w-full rounded-xl border border-violet-100 py-3 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </span>
          </label>
          <fieldset className="rounded-2xl border border-violet-100 p-4">
            <legend className="px-2 text-sm font-bold text-slate-700">Nominees ({form.nominees.length})</legend>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {members.map((member) => (
                <label key={member._id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-violet-50">
                  <input type="checkbox" checked={form.nominees.includes(member._id)} onChange={() => toggleNominee(member._id)} className="h-4 w-4 accent-violet-600" />
                  {member.imageUrl && <img src={apiAssetUrl(member.imageUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />}
                  <span className="flex-1">{member.name}</span>
                  <Users size={15} className="text-slate-400" />
                </label>
              ))}
              {!members.length && <p className="text-sm text-slate-500">Add active members before creating awards.</p>}
            </div>
          </fieldset>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || members.length < 2} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              {editingId ? <Save size={17} /> : <Plus size={17} />}
              {saving ? "Saving…" : editingId ? "Save changes" : "Create award"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancel</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
