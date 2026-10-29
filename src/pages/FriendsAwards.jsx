import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, LogOut, Medal, Minus, Plus, Sparkles, Trophy, X } from "lucide-react";
import { apiAssetUrl, apiRequest } from "../lib/api";

const VOTER_TOKEN_KEY = "friendszone-voter-token";

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function FriendsAwards() {
  const [voter, setVoter] = useState(null);
  const [voterToken, setVoterToken] = useState(() => localStorage.getItem(VOTER_TOKEN_KEY) || "");
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem(VOTER_TOKEN_KEY)));
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [activeAwardId, setActiveAwardId] = useState("");
  const [awards, setAwards] = useState([]);
  const [selectedNominees, setSelectedNominees] = useState({});
  const [voteStatus, setVoteStatus] = useState({});
  const [voteStatusLoading, setVoteStatusLoading] = useState(() =>
    Boolean(localStorage.getItem(VOTER_TOKEN_KEY))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submittingId, setSubmittingId] = useState("");

  useEffect(() => {
    if (!voterToken) return undefined;

    const controller = new AbortController();
    apiRequest("/auth/voter/me", { token: voterToken, signal: controller.signal })
      .then(setVoter)
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        localStorage.removeItem(VOTER_TOKEN_KEY);
        setVoterToken("");
        setVoter(null);
        setVoteStatus({});
        setSelectedNominees({});
        setVoteStatusLoading(false);
        setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthLoading(false);
      });
    return () => controller.abort();
  }, [voterToken]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/awards", { signal: controller.signal })
      .then(setAwards)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!voter || !voterToken) return undefined;

    const controller = new AbortController();
    apiRequest("/awards/vote-status", {
      token: voterToken,
      signal: controller.signal,
    })
      .then((result) => {
        const votesByAward = result.votesByAward || {};
        setVoteStatus(votesByAward);
        setSelectedNominees(Object.fromEntries(
          Object.entries(votesByAward)
            .filter(([, status]) => !status.submitted && status.nomineeIds?.length)
            .map(([awardId, status]) => [awardId, status.nomineeIds])
        ));
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setVoteStatusLoading(false);
      });
    return () => controller.abort();
  }, [voter, voterToken]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthSubmitting(true);
    setVoteStatusLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/auth/voter/${authMode}`, {
        method: "POST",
        body: { email: authEmail, password: authPassword },
      });
      localStorage.setItem(VOTER_TOKEN_KEY, result.token);
      setVoterToken(result.token);
      setVoter(result.voter);
      setAuthPassword("");
      setAuthDialogOpen(false);
      setNotice(`Welcome, ${result.voter.name}. You’re ready to vote.`);
    } catch (authError) {
      setVoteStatusLoading(false);
      setError(authError.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  function signOut() {
    localStorage.removeItem(VOTER_TOKEN_KEY);
    setVoterToken("");
    setVoter(null);
    setActiveAwardId("");
    setVoteStatusLoading(false);
    setSelectedNominees({});
    setVoteStatus({});
    setNotice("");
  }

  function beginVoting(awardId) {
    setActiveAwardId(awardId);
    setError("");
    if (!voter) {
      setAuthMode("login");
      setAuthDialogOpen(true);
    }
  }

  async function castVote(event, awardId) {
    event.preventDefault();
    const nomineeIds = selectedNominees[awardId] || [];
    const counts = [...new Set(nomineeIds)].map(
      (nomineeId) => nomineeIds.filter((id) => id === nomineeId).length
    ).sort();
    if (
      !voter ||
      nomineeIds.length !== 4 ||
      new Set(nomineeIds).size < 2 ||
      new Set(nomineeIds).size > 3 ||
      counts.some((count) => count !== 1 && count !== 2) ||
      counts.reduce((total, count) => total + count, 0) !== 4
    ) return;
    setSubmittingId(awardId);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/awards/${awardId}/votes`, {
        method: "POST",
        token: voterToken,
        body: { nomineeIds },
      });
      setNotice("Your votes are in! Thanks for celebrating your friends.");
      setVoteStatus((current) => ({
        ...current,
        [awardId]: {
          votesUsed: nomineeIds.length,
          votesRemaining: 0,
          nomineeIds,
          submitted: true,
        },
      }));
      setActiveAwardId("");
    } catch (voteError) {
      setError(voteError.message);
    } finally {
      setSubmittingId("");
    }
  }

  const winsByMember = new Map();
  for (const award of awards) {
    if (!award.closed || !award.results?.length) continue;
    const winningScore = Math.max(...award.results.map((result) => result.votes));
    if (winningScore === 0) continue;

    const winnerIds = new Set(
      award.results
        .filter((result) => result.votes === winningScore)
        .map((result) => result.nomineeId)
    );
    for (const nominee of award.nominees) {
      if (!winnerIds.has(String(nominee._id))) continue;
      const memberWins = winsByMember.get(String(nominee._id)) || {
        member: nominee,
        awards: [],
      };
      memberWins.awards.push({ id: award._id, title: award.title });
      winsByMember.set(String(nominee._id), memberWins);
    }
  }
  const memberAwardWins = [...winsByMember.values()].sort(
    (first, second) =>
      second.awards.length - first.awards.length ||
      first.member.name.localeCompare(second.member.name)
  );
  const isVoteStatusLoading = Boolean(voter) && voteStatusLoading;

  return (
    <main className="min-h-screen bg-[#faf8ff]">
      <section className="relative overflow-hidden bg-[#171329] text-white">
        <div className="absolute -right-16 -top-32 h-96 w-96 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-pink-500/20 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-violet-200">
            <Sparkles size={16} /> FriendsZone community awards
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            Celebrate the friends who make us <span className="text-pink-300">us.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Vote for your friends in our fun award categories. The results are revealed when voting closes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-bold text-slate-900">Who’s voting?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Browse categories and nominees without signing in. When you’re ready, sign in with the email linked to your member profile. Cast four votes per category across up to three nominees, with no more than two votes for anyone. You can’t vote for yourself.
            </p>
          </div>
          {voter ? (
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span className="text-sm font-bold text-slate-700">Signed in as {voter.name}</span>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-100 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <p className="shrink-0 text-sm font-bold text-violet-700">No sign-in needed to browse</p>
          )}
        </div>

        {error && !authDialogOpen && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        {authDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="voter-auth-heading"
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="voter-auth-heading" className="text-2xl font-black text-slate-900">
                    {authMode === "login" ? "Sign in to vote" : "Create your voter account"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Use the email address linked to your FriendsZone member profile.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close sign-in dialog"
                  onClick={() => {
                    setAuthDialogOpen(false);
                    setError("");
                  }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-5 flex rounded-xl bg-violet-50 p-1">
                {["login", "register"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAuthMode(mode);
                      setError("");
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${authMode === mode ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
                  >
                    {mode === "login" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>
              <form onSubmit={submitAuth} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
                  <input
                    type="password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={authMode === "register" ? 8 : undefined}
                    maxLength={72}
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    className="w-full rounded-xl border border-violet-100 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  {authMode === "register" && <span className="mt-2 block text-xs text-slate-500">Use at least 8 characters.</span>}
                </label>
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {authSubmitting ? "Please wait…" : authMode === "login" ? "Sign in and continue" : "Create account and continue"}
                </button>
                {authMode === "register" && (
                  <p className="text-xs leading-5 text-slate-500">
                    Your account is linked to the active member profile that already uses this email.
                  </p>
                )}
              </form>
            </section>
          </div>
        )}

        {loading ? (
          <p className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-slate-500">Loading awards…</p>
        ) : awards.length ? (
          <>
            {memberAwardWins.length > 0 && (
              <section aria-labelledby="award-winners-heading" className="mb-8 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Trophy size={22} /></span>
                  <div>
                    <h2 id="award-winners-heading" className="text-xl font-black text-slate-900">Award winners</h2>
                    <p className="text-sm text-slate-500">Each member’s wins across categories that have closed.</p>
                  </div>
                </div>
                <ol className="grid gap-3 sm:grid-cols-2">
                  {memberAwardWins.map(({ member, awards: wonAwards }) => (
                    <li key={member._id} className="flex items-center gap-3 rounded-2xl bg-amber-50/70 p-4">
                      {member.imageUrl && <img src={apiAssetUrl(member.imageUrl)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">{member.name}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {wonAwards.map((award) => award.title).join(", ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-amber-700">
                        {wonAwards.length} {wonAwards.length === 1 ? "award" : "awards"}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              {awards.map((award) => {
              const selectedForAward = selectedNominees[award._id] || [];
              const selectedCounts = new Map();
              for (const nomineeId of selectedForAward) {
                selectedCounts.set(nomineeId, (selectedCounts.get(nomineeId) || 0) + 1);
              }
              const votesUsed = selectedForAward.length;
              const status = voteStatus[award._id];
              const hasSubmittedBallot = status?.submitted === true;
              const ballotCounts = [...selectedCounts.values()].sort();
              const isValidBallot =
                selectedForAward.length === 4 &&
                selectedCounts.size >= 2 &&
                selectedCounts.size <= 3 &&
                ballotCounts.every((count) => count === 1 || count === 2);
              const resultByNominee = new Map(
                (award.results || []).map((result) => [result.nomineeId, result.votes])
              );
              const winningScore = award.results
                ? Math.max(0, ...award.results.map((result) => result.votes))
                : 0;
              return (
                <article key={award._id} className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-violet-700 to-fuchsia-600 p-6 text-white sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                        {award.closed ? <Trophy size={25} /> : <Medal size={25} />}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${award.closed ? "bg-white/20 text-white" : "bg-emerald-300/20 text-emerald-100"}`}>
                        {award.closed ? "Results are in" : "Voting is open"}
                      </span>
                    </div>
                    <h2 className="mt-5 text-2xl font-black">{award.title}</h2>
                    {award.description && <p className="mt-2 text-sm leading-6 text-white/85">{award.description}</p>}
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-100">
                      <CalendarDays size={16} />
                      {award.closed ? "Closed" : "Closes"} {formatDate(award.closesAt)}
                    </p>
                  </div>

                  {award.closed ? (
                    <ol className="space-y-3 p-5 sm:p-6">
                      {[...award.nominees]
                        .sort((a, b) => (resultByNominee.get(String(b._id)) || 0) - (resultByNominee.get(String(a._id)) || 0))
                        .map((nominee, index) => {
                          const votes = resultByNominee.get(String(nominee._id)) || 0;
                          const winner = votes === winningScore && winningScore > 0;
                          return (
                            <li key={nominee._id} className={`flex items-center gap-3 rounded-2xl p-3 ${winner ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500">{winner ? "🏆" : index + 1}</span>
                              {nominee.imageUrl && <img src={apiAssetUrl(nominee.imageUrl)} alt="" className="h-10 w-10 rounded-full object-cover" />}
                              <span className="flex-1 font-bold text-slate-800">{nominee.name}</span>
                              <span className="text-sm font-extrabold text-violet-700">{votes} {votes === 1 ? "vote" : "votes"}</span>
                            </li>
                          );
                        })}
                    </ol>
                  ) : hasSubmittedBallot ? (
                    <div role="status" className="space-y-2 p-6 text-sm font-semibold text-emerald-700">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 size={17} /> Your votes are recorded privately.
                      </p>
                      <p>
                        4 votes used · 0 remaining
                      </p>
                    </div>
                  ) : voter && activeAwardId === award._id ? (
                    <form onSubmit={(event) => castVote(event, award._id)} className="space-y-3 p-5 sm:p-6">
                      <div className="text-sm font-semibold text-slate-500">
                        {isVoteStatusLoading
                          ? "Loading your vote status…"
                          : `${votesUsed} of 4 votes selected`}
                      </div>
                      {award.nominees.map((nominee) => {
                        const nomineeId = String(nominee._id);
                        const nomineeVoteCount = selectedCounts.get(nomineeId) || 0;
                        const selectedNomineeCount = selectedCounts.size;
                        const isSelf = String(voter.memberId) === nomineeId;
                        const canAddVote =
                          Boolean(voter) &&
                          !isSelf &&
                          selectedForAward.length < 4 &&
                          nomineeVoteCount < 2 &&
                          (nomineeVoteCount > 0 || selectedNomineeCount < 3);
                        return (
                          <div key={nominee._id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${isSelf ? "border-slate-100 bg-slate-50 opacity-60" : nomineeVoteCount ? "border-violet-400 bg-violet-50" : "border-slate-100"}`}>
                            {nominee.imageUrl && <img src={apiAssetUrl(nominee.imageUrl)} alt="" className="h-10 w-10 rounded-full object-cover" />}
                            <span className="flex-1 font-semibold text-slate-800">{nominee.name}{isSelf ? " (you)" : ""}</span>
                            {!isSelf && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={`Remove a vote for ${nominee.name}`}
                                  onClick={() => setSelectedNominees((current) => {
                                    const selected = current[award._id] || [];
                                    const selectedIndex = selected.lastIndexOf(nomineeId);
                                    if (selectedIndex === -1) return current;
                                    return {
                                      ...current,
                                      [award._id]: selected.filter((_, index) => index !== selectedIndex),
                                    };
                                  })}
                                  disabled={!nomineeVoteCount}
                                  className="rounded-lg border border-violet-200 p-2 text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="min-w-8 text-center text-sm font-bold text-slate-700" aria-label={`${nomineeVoteCount} votes for ${nominee.name}`}>
                                  {nomineeVoteCount}/2
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Add a vote for ${nominee.name}`}
                                  onClick={() => setSelectedNominees((current) => ({
                                    ...current,
                                    [award._id]: [...(current[award._id] || []), nomineeId],
                                  }))}
                                  disabled={!canAddVote || isVoteStatusLoading}
                                  className="rounded-lg border border-violet-200 p-2 text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            )}
                            {isSelf && <span className="text-xs font-semibold text-slate-500">Can’t vote for yourself</span>}
                          </div>
                        );
                      })}
                      <button
                        type="submit"
                        disabled={!voter || !isValidBallot || submittingId === award._id || isVoteStatusLoading}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trophy size={17} />
                        {submittingId === award._id ? "Submitting…" : "Cast my vote"}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3 p-5 sm:p-6">
                      <p className="text-sm leading-6 text-slate-500">
                        {status?.votesUsed
                          ? `${status.votesUsed} of 4 votes already selected. Continue your ballot to submit all four.`
                          : "Choose four votes across up to three nominees. You may give each nominee up to two votes."}
                      </p>
                      <button
                        type="button"
                        disabled={authLoading || award.closed}
                        onClick={() => beginVoting(award._id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Trophy size={17} />
                        {authLoading ? "Checking sign-in…" : "Vote Now"}
                      </button>
                    </div>
                  )}
                </article>
              );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center">
            <Trophy size={36} className="mx-auto text-violet-400" />
            <h2 className="mt-4 text-xl font-black text-slate-900">No awards just yet</h2>
            <p className="mt-2 text-sm text-slate-500">Check back soon — fun categories are on the way!</p>
          </div>
        )}
      </section>
    </main>
  );
}
