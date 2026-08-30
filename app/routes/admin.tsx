import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminFrame } from "../components/AdminChrome";
import { adminMutation, changedFields, matchesAdminSearch } from "../data/admin-intake";
import type { Submission, SubmissionStatus } from "../data/types";

type SubmissionsResponse = { submissions?: Submission[]; nextCursor?: string | null; error?: string };
const submissionStatuses: Array<SubmissionStatus | ""> = ["", "signed_up", "invited", "requested_to_join", "approved", "rejected"];

function SubmissionCard({ submission, reload }: { submission: Submission; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState(submission);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await adminMutation(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changedFields({
        invitationStatus: submission.invitationStatus,
        name: submission.name,
        city: submission.city,
        role: submission.role,
        whatsapp: submission.whatsapp,
        referralSource: submission.referralSource,
        referralName: submission.referralName ?? "",
        assigned_to: submission.assigned_to ?? "",
        admin_notes: submission.admin_notes ?? "",
      }, {
        invitationStatus: draft.invitationStatus,
        name: draft.name,
        city: draft.city,
        role: draft.role,
        whatsapp: draft.whatsapp,
        referralSource: draft.referralSource,
        referralName: draft.referralName ?? "",
        assigned_to: draft.assigned_to ?? "",
        admin_notes: draft.admin_notes ?? "",
      })),
    }, "Failed to save submission");
    if (!result.ok) setError(result.error);
    else await reload();
    setSaving(false);
  }

  async function erase() {
    if (!window.confirm(`Permanently erase all discoverable records connected to submission “${submission.name}”? Only continue for a verified privacy request.`)) return;
    setSaving(true);
    setError(null);
    const result = await adminMutation(
      `/api/admin/privacy/submission/${encodeURIComponent(submission.id)}`,
      { method: "DELETE" },
      "Deletion is incomplete; retry is required",
    );
    if (!result.ok) setError(result.error);
    else await reload();
    setSaving(false);
  }

  return (
    <form className="dark-card space-y-4" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Name<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="form-field">WhatsApp<input required maxLength={32} value={draft.whatsapp} onChange={(event) => setDraft({ ...draft, whatsapp: event.target.value })} /></label>
        <label className="form-field">City<input required maxLength={80} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label>
        <label className="form-field">Role<input required maxLength={280} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
        <label className="form-field">Referral source<input required maxLength={40} value={draft.referralSource} onChange={(event) => setDraft({ ...draft, referralSource: event.target.value })} /></label>
        <label className="form-field">Referral detail<input maxLength={120} value={draft.referralName ?? ""} onChange={(event) => setDraft({ ...draft, referralName: event.target.value })} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Onboarding status<select value={draft.invitationStatus} onChange={(event) => setDraft({ ...draft, invitationStatus: event.target.value as SubmissionStatus })}>{(submission.allowedNextStatuses ?? [submission.invitationStatus]).map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="form-field">Assigned to<input maxLength={120} value={draft.assigned_to ?? ""} onChange={(event) => setDraft({ ...draft, assigned_to: event.target.value })} placeholder="Operator name or team" /></label>
      </div>
      <label className="form-field">Internal notes<textarea maxLength={2000} rows={3} value={draft.admin_notes ?? ""} onChange={(event) => setDraft({ ...draft, admin_notes: event.target.value })} /></label>
      <p className="text-xs text-white/35">Created {new Date(submission.createdAt).toLocaleString()}{submission.updated_at ? ` · Last changed ${new Date(submission.updated_at).toLocaleString()} by ${submission.updated_by ?? "unknown"}` : ""}</p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="button bg-yellow text-midnight" type="submit" disabled={saving}>{saving ? "Saving..." : "Save triage and corrections"}</button>
        <button className="button button-ghost" type="button" disabled={saving} onClick={() => void erase()}>Complete verified deletion</button>
      </div>
    </form>
  );
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "25" });
      const cursor = cursors.at(-1);
      if (cursor) params.set("cursor", cursor);
      if (filters.status) params.set("status", filters.status);
      const response = await fetch(`/api/admin/submissions?${params}`);
      const data = (await response.json()) as SubmissionsResponse;
      if (!response.ok) throw new Error(data.error ?? "Failed to load submissions");
      setSubmissions(data.submissions ?? []);
      setNextCursor(data.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [cursors, filters]);

  useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setCursors([undefined]);
    setFilters({ query: query.trim(), status });
  }

  const visibleSubmissions = submissions.filter((submission) => matchesAdminSearch([
    submission.name,
    submission.city,
    submission.role,
    submission.whatsapp,
    submission.referralSource,
    submission.referralName,
    submission.assigned_to,
  ], filters.query));

  return (
    <AdminFrame title="Community submissions." intro="Triage bounded pages of onboarding records. Terminal decisions can be reopened for correction; every save records the verified operator and time.">
      <form className="dark-card mb-5 grid gap-4 md:grid-cols-[1fr_14rem_auto]" onSubmit={applyFilters}>
        <label className="form-field">Search this and subsequent pages<input maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="form-field">Filter status<select value={status} onChange={(event) => setStatus(event.target.value as SubmissionStatus | "")}>{submissionStatuses.map((value) => <option key={value || "all"} value={value}>{value || "All statuses"}</option>)}</select></label>
        <button className="button button-ghost self-end" type="submit">Apply</button>
      </form>
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="dark-card text-white/50">Loading one bounded page...</div> : null}
      <div className="space-y-4">
        {visibleSubmissions.length === 0 && !loading ? <div className="dark-card text-white/50">No matching submissions on this page.{nextCursor ? " Continue to the next page to keep scanning." : ""}</div> : null}
        {visibleSubmissions.map((submission) => <SubmissionCard key={`${submission.id}:${submission.updated_at ?? "initial"}`} submission={submission} reload={loadSubmissions} />)}
      </div>
      <div className="mt-5 flex justify-between">
        <button className="button button-ghost" type="button" disabled={loading || cursors.length === 1} onClick={() => setCursors((value) => value.slice(0, -1))}>Previous page</button>
        <button className="button button-ghost" type="button" disabled={loading || !nextCursor} onClick={() => nextCursor && setCursors((value) => [...value, nextCursor])}>Next page</button>
      </div>
    </AdminFrame>
  );
}
