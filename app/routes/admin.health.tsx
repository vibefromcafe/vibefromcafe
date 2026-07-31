import { useCallback, useEffect, useState } from "react";
import { AdminFrame, adminHeaders } from "../components/AdminChrome";

type SecurityCheck = {
  name: string;
  configured: boolean;
  description: string;
};

type SecurityResponse = {
  checks?: SecurityCheck[];
  protections?: Record<string, string>;
  warnings?: string[];
  error?: string;
};

export default function AdminHealthPage() {
  const [security, setSecurity] = useState<SecurityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/security", { headers: adminHeaders() });
      const data = (await response.json()) as SecurityResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load security status");
      }
      setSecurity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  const checks = security?.checks ?? [];
  const warnings = security?.warnings ?? [];
  const protections = security?.protections ?? {};

  return (
    <AdminFrame title="Health." intro="Security configuration status for public form intake.">
      <div className="mb-4 flex justify-end">
        <button className="button button-ghost" type="button" onClick={() => void loadSecurity()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      {warnings.length > 0 ? (
        <div className="mb-5 rounded-lg border border-yellow/40 bg-yellow/10 px-4 py-3 text-sm text-yellow">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="dark-card">
          <h2 className="text-2xl font-bold text-yellow">Configuration</h2>
          <div className="mt-6 space-y-4">
            {checks.map((check) => (
              <article key={check.name} className="rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/70">{check.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${check.configured ? "bg-green-400/15 text-green-200" : "bg-red-400/15 text-red-200"}`}>
                    {check.configured ? "Configured" : "Missing"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/45">{check.description}</p>
              </article>
            ))}
            {checks.length === 0 && !loading ? <p className="text-white/45">No security checks returned.</p> : null}
          </div>
        </section>

        <section className="dark-card">
          <h2 className="text-2xl font-bold text-yellow">Protections</h2>
          <div className="mt-6 space-y-4">
            {Object.entries(protections).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                <span className="capitalize text-white/70">{name.replace(/([A-Z])/g, " $1").trim()}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/60">{status}</span>
              </div>
            ))}
            {Object.keys(protections).length === 0 && !loading ? <p className="text-white/45">No protection status returned.</p> : null}
          </div>
        </section>
      </div>
    </AdminFrame>
  );
}
