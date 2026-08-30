import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AdminFrame } from "../components/AdminChrome";
import { EventForm, type EventFormValue } from "../components/EventForm";
import type { Event } from "../data/types";

export default function AdminEditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!id) {
        setError("Event id is missing");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`);
        const data = (await response.json()) as { event?: Event; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load event");
        }
        if (!data.event) {
          throw new Error("Event not found");
        }
        setEvent(data.event);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    void loadEvent();
  }, [id]);

  async function updateEvent(value: EventFormValue) {
    if (!id) return;
    setError(null);
    const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to update event");
      return;
    }
    navigate("/admin/events");
  }

  return (
    <AdminFrame title="Edit event." intro="Update a community event in the KV-backed event store.">
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {event ? <EventForm initialValue={event} onSubmit={updateEvent} /> : null}
      {loading ? <div className="dark-card text-white/50" role="status">Loading event...</div> : null}
      {!loading && !event ? <button className="button button-ghost" type="button" onClick={() => window.location.reload()}>Retry</button> : null}
    </AdminFrame>
  );
}
