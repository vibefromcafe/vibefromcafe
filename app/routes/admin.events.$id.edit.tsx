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

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`);
      const data = (await response.json()) as { event?: Event; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to load event");
        return;
      }
      setEvent(data.event ?? null);
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
      {event ? <EventForm initialValue={event} submitLabel="Save event" onSubmit={updateEvent} /> : <div className="dark-card text-white/50">Loading event...</div>}
    </AdminFrame>
  );
}
