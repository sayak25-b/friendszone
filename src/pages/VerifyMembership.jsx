import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function VerifyMembership() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const membershipId = searchParams.get("membershipId") || "";
    if (!membershipId) {
      setStatus("error");
      setError("No membership ID was provided in the QR code.");
      return;
    }

    async function verify() {
      try {
        const members = await apiRequest("/members");
        const match = members.find(
          (item) => String(item.membershipId || "") === membershipId || String(item._id) === membershipId
        );

        if (!match) {
          setStatus("error");
          setError("This membership ID could not be verified.");
          return;
        }

        setMember(match);
        setStatus(match.isMembershipCardActive === false ? "inactive" : "valid");
      } catch (verifyError) {
        setStatus("error");
        setError(verifyError.message);
      }
    }

    verify();
  }, [searchParams]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#faf8ff] px-5 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-violet-100 bg-white p-7 shadow-xl sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600">FriendsZone verification</p>
        {status === "loading" && <p className="mt-5 text-lg font-semibold text-slate-600">Verifying membership…</p>}
        {status === "valid" && member && (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-900">Membership verified</h1>
            <p className="mt-3 text-slate-600">This FriendsZone membership is active and valid.</p>
            <div className="mt-6 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              <p><span className="font-bold">Name:</span> {member.name}</p>
              <p><span className="font-bold">Membership ID:</span> {member.membershipId || "Not assigned"}</p>
            </div>
          </>
        )}
        {status === "inactive" && member && (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-900">Membership inactive</h1>
            <p className="mt-3 text-slate-600">This card is currently not active for verification.</p>
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
              <p><span className="font-bold">Name:</span> {member.name}</p>
              <p><span className="font-bold">Membership ID:</span> {member.membershipId || "Not assigned"}</p>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-900">Verification failed</h1>
            <p className="mt-3 text-red-600">{error}</p>
          </>
        )}
      </div>
    </main>
  );
}
