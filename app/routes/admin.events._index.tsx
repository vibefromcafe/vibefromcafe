import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { AdminFrame } from "../components/AdminChrome";
import type { Event } from "../data/types";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/events");
      const data = (await response.json()) as { events?: Event[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load events");
      }
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  async function deleteEvent(id: string) {
    const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to delete event");
      return;
    }
    await loadEvents();
  }

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return (
    <AdminFrame title="Events." intro="Create, edit, publish, draft, and remove community events backed by Cloudflare KV.">
      <div className="mb-4 flex flex-wrap justify-end gap-3">
        <button className="button button-ghost" type="button" onClick={() => void loadEvents()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        <Link className="button bg-yellow text-midnight" to="/admin/events/new">New event <ArrowRight size={16} /></Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <div className="space-y-4">
        {events.length === 0 && !loading ? <div className="dark-card text-white/50">No events yet.</div> : null}
        {events.map((event) => (
          <article key={event.id} className="dark-card">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">{event.status} / {event.date} {event.time}</p>
                <h2 className="mt-2 text-2xl font-bold">{event.title}</h2>
                <p className="mt-2 text-white/45">{event.location}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="button button-ghost" to={`/admin/events/${event.id}/edit`}>Edit</Link>
                <button className="button border border-red-400/40 text-red-200" type="button" onClick={() => void deleteEvent(event.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminFrame>
  );
}
