import { useCallback, useEffect, useState } from "react";
import { AdminFrame } from "../components/AdminChrome";
import type { Submission } from "../data/types";

type SubmissionsResponse = {
  submissions?: Submission[];
  error?: string;
  whatsappInvite?: { groupInviteUrl: string; messageTemplate: string };
};

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/submissions");
      const data = (await response.json()) as SubmissionsResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load submissions");
      }
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  async function updateStatus(id: string, invitationStatus: Submission["invitationStatus"]) {
    const response = await fetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationStatus }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to update submission");
      return;
    }
    await loadSubmissions();
  }

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  return (
    <AdminFrame title="Community submissions." intro="Review and move member onboarding through the same status flow as the upstream VFC admin.">
      <div className="mb-4 flex justify-end"><button className="button button-ghost" type="button" onClick={() => void loadSubmissions()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button></div>
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <div className="space-y-4">
        {submissions.length === 0 && !loading ? <div className="dark-card text-white/50">No submissions yet.</div> : null}
        {submissions.map((submission) => (
          <article key={submission.id} className="dark-card">
            <div className="flex flex-col justify-between gap-5 md:flex-row">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">{submission.invitationStatus}</p>
                <h2 className="mt-2 text-2xl font-bold">{submission.name}</h2>
                <p className="mt-2 text-white/50">{submission.role} - {submission.city}</p>
                <p className="mt-1 text-white/40">{submission.whatsapp}</p>
                <p className="mt-3 text-sm text-white/35">Source: {submission.referralSource}{submission.referralName ? ` / ${submission.referralName}` : ""}</p>
              </div>
              <label className="form-field min-w-56">
                Status
                <select value={submission.invitationStatus} onChange={(event) => void updateStatus(submission.id, event.target.value as Submission["invitationStatus"])}>
                  {(submission.allowedNextStatuses ?? [submission.invitationStatus]).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </AdminFrame>
  );
}
