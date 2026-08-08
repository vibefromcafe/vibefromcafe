import { useState } from "react";
import { useNavigate } from "react-router";
import { AdminFrame } from "../components/AdminChrome";
import { EventForm, type EventFormValue } from "../components/EventForm";

export default function AdminNewEventPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function createEvent(value: EventFormValue) {
    setError(null);
    const response = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to create event");
      return;
    }
    navigate("/admin/events");
  }

  return (
    <AdminFrame title="New event." intro="Create a community event record in the KV-backed event store.">
      {error ? <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <EventForm submitLabel="Create event" onSubmit={createEvent} />
    </AdminFrame>
  );
}
