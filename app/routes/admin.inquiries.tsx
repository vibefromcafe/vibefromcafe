import { useCallback, useEffect, useState } from "react";
import { AdminFrame } from "../components/AdminChrome";
import type { ProjectInquiry } from "../data/types";

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<ProjectInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/inquiries");
      const data = (await response.json()) as { inquiries?: ProjectInquiry[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load inquiries");
      }
      setInquiries(data.inquiries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInquiries();
  }, [loadInquiries]);

  return (
    <AdminFrame title="Project inquiries." intro="AI studio leads from the lightweight contact form.">
      <div className="mb-4 flex justify-end"><button className="button button-ghost" type="button" onClick={() => void loadInquiries()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button></div>
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <div className="space-y-4">
        {inquiries.length === 0 && !loading ? <div className="dark-card text-white/50">No project inquiries yet.</div> : null}
        {inquiries.map((inquiry) => (
          <article key={inquiry.id} className="dark-card">
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">{inquiry.status}</p>
            <h2 className="mt-2 text-2xl font-bold">{inquiry.name}</h2>
            <p className="mt-1 text-white/45">{inquiry.contact}</p>
            <p className="mt-5 leading-7 text-white/60">{inquiry.message}</p>
            <p className="mt-5 text-xs text-white/30">{new Date(inquiry.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </AdminFrame>
  );
}
