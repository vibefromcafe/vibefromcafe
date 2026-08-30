import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminFrame } from "../components/AdminChrome";
import { adminMutation, changedFields, matchesAdminSearch } from "../data/admin-intake";
import type { InquiryStatus, ProjectInquiry } from "../data/types";

type InquiriesResponse = {
  inquiries?: ProjectInquiry[];
  nextCursor?: string | null;
  error?: string;
};

const inquiryStatuses: Array<InquiryStatus | ""> = ["", "new", "contacted", "closed", "spam"];

function InquiryCard({ inquiry, reload }: { inquiry: ProjectInquiry; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState(inquiry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await adminMutation(`/api/admin/inquiries/${encodeURIComponent(inquiry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changedFields({
        status: inquiry.status,
        name: inquiry.name,
        contact: inquiry.contact,
        message: inquiry.message,
        assigned_to: inquiry.assigned_to ?? "",
        admin_notes: inquiry.admin_notes ?? "",
      }, {
        status: draft.status,
        name: draft.name,
        contact: draft.contact,
        message: draft.message,
        assigned_to: draft.assigned_to ?? "",
        admin_notes: draft.admin_notes ?? "",
      })),
    }, "Failed to save inquiry");
    if (!result.ok) setError(result.error);
    else await reload();
    setSaving(false);
  }

  async function erase() {
    if (!window.confirm(`Permanently erase all discoverable records connected to inquiry “${inquiry.name}”? Only continue for a verified privacy request.`)) return;
    setSaving(true);
    setError(null);
    const result = await adminMutation(
      `/api/admin/privacy/inquiry/${encodeURIComponent(inquiry.id)}`,
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
        <label className="form-field">Contact<input required maxLength={254} value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} /></label>
      </div>
      <label className="form-field">Message<textarea required maxLength={2000} rows={5} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Triage status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as InquiryStatus })}>{(inquiry.allowedNextStatuses ?? [inquiry.status]).map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="form-field">Assigned to<input maxLength={120} value={draft.assigned_to ?? ""} onChange={(event) => setDraft({ ...draft, assigned_to: event.target.value })} placeholder="Operator name or team" /></label>
      </div>
      <label className="form-field">Internal notes<textarea maxLength={2000} rows={3} value={draft.admin_notes ?? ""} onChange={(event) => setDraft({ ...draft, admin_notes: event.target.value })} /></label>
      <p className="text-xs text-white/35">Created {new Date(inquiry.createdAt).toLocaleString()}{inquiry.updated_at ? ` · Last changed ${new Date(inquiry.updated_at).toLocaleString()} by ${inquiry.updated_by ?? "unknown"}` : ""}</p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="button bg-yellow text-midnight" type="submit" disabled={saving}>{saving ? "Saving..." : "Save triage and corrections"}</button>
        <button className="button button-ghost" type="button" disabled={saving} onClick={() => void erase()}>Complete verified deletion</button>
      </div>
    </form>
  );
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<ProjectInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "25" });
      const cursor = cursors.at(-1);
      if (cursor) params.set("cursor", cursor);
      if (filters.status) params.set("status", filters.status);
      const response = await fetch(`/api/admin/inquiries?${params}`);
      const data = (await response.json()) as InquiriesResponse;
      if (!response.ok) throw new Error(data.error ?? "Failed to load inquiries");
      setInquiries(data.inquiries ?? []);
      setNextCursor(data.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [cursors, filters]);

  useEffect(() => { void loadInquiries(); }, [loadInquiries]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setCursors([undefined]);
    setFilters({ query: query.trim(), status });
  }

  const visibleInquiries = inquiries.filter((inquiry) => matchesAdminSearch([
    inquiry.name,
    inquiry.contact,
    inquiry.message,
    inquiry.assigned_to,
  ], filters.query));

  return (
    <AdminFrame title="Project inquiries." intro="Triage bounded pages of studio leads. Every save records the verified operator and time; export remains disabled pending an approved privacy policy.">
      <form className="dark-card mb-5 grid gap-4 md:grid-cols-[1fr_14rem_auto]" onSubmit={applyFilters}>
        <label className="form-field">Search this and subsequent pages<input maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="form-field">Filter status<select value={status} onChange={(event) => setStatus(event.target.value as InquiryStatus | "")}>{inquiryStatuses.map((value) => <option key={value || "all"} value={value}>{value || "All statuses"}</option>)}</select></label>
        <button className="button button-ghost self-end" type="submit">Apply</button>
      </form>
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="dark-card text-white/50">Loading one bounded page...</div> : null}
      <div className="space-y-4">
        {visibleInquiries.length === 0 && !loading ? <div className="dark-card text-white/50">No matching inquiries on this page.{nextCursor ? " Continue to the next page to keep scanning." : ""}</div> : null}
        {visibleInquiries.map((inquiry) => <InquiryCard key={`${inquiry.id}:${inquiry.updated_at ?? "initial"}`} inquiry={inquiry} reload={loadInquiries} />)}
      </div>
      <div className="mt-5 flex justify-between">
        <button className="button button-ghost" type="button" disabled={loading || cursors.length === 1} onClick={() => setCursors((value) => value.slice(0, -1))}>Previous page</button>
        <button className="button button-ghost" type="button" disabled={loading || !nextCursor} onClick={() => nextCursor && setCursors((value) => [...value, nextCursor])}>Next page</button>
      </div>
    </AdminFrame>
  );
}
