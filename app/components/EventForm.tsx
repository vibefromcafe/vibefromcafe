import { useState, type FormEvent } from "react";
import type { Event } from "../data/types";

export type EventFormValue = {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  cafeId: string;
  imageUrl: string;
  mapUrl: string;
  status: Event["status"];
  tags: string;
};

export function toEventFormValue(event?: Event): EventFormValue {
  return {
    id: event?.id ?? "",
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ?? "",
    time: event?.time ?? "",
    location: event?.location ?? "",
    cafeId: event?.cafeId ?? "",
    imageUrl: event?.imageUrl ?? "",
    mapUrl: event?.mapUrl ?? "",
    status: event?.status ?? "published",
    tags: event?.tags.join(", ") ?? "",
  };
}

export function EventForm({ initialValue, submitLabel, onSubmit }: { initialValue?: Event; submitLabel: string; onSubmit: (value: EventFormValue) => Promise<void> }) {
  const [form, setForm] = useState<EventFormValue>(() => toEventFormValue(initialValue));
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof EventFormValue>(key: K, value: EventFormValue[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="dark-card space-y-5" onSubmit={submit}>
      {initialValue ? <label className="form-field">ID<input readOnly value={form.id} /></label> : null}
      <label className="form-field">Title<input required value={form.title} onChange={(event) => updateField("title", event.target.value)} /></label>
      <label className="form-field">Description<textarea required rows={5} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Date<input required type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} /></label>
        <label className="form-field">Time<input required type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} /></label>
      </div>
      <label className="form-field">Location<input required value={form.location} onChange={(event) => updateField("location", event.target.value)} /></label>
      <label className="form-field">Cafe ID<input value={form.cafeId} onChange={(event) => updateField("cafeId", event.target.value)} /></label>
      <label className="form-field">Image URL<input value={form.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} /></label>
      <label className="form-field">Map URL<input value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Status<select value={form.status} onChange={(event) => updateField("status", event.target.value as Event["status"])}><option value="published">published</option><option value="draft">draft</option></select></label>
        <label className="form-field">Tags<input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="tag, another tag" /></label>
      </div>
      <button className="button bg-yellow text-midnight" type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</button>
    </form>
  );
}
