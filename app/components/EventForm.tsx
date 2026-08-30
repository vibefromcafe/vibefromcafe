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
  detailsUrl: string;
  registrationUrl: string;
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
    detailsUrl: event?.detailsUrl ?? "",
    registrationUrl: event?.registrationUrl ?? "",
    status: event?.status ?? "draft",
    tags: event?.tags.join(", ") ?? "",
  };
}

export function EventForm({ initialValue, onSubmit }: { initialValue?: Event; onSubmit: (value: EventFormValue) => Promise<void> }) {
  const [form, setForm] = useState<EventFormValue>(() => toEventFormValue(initialValue));
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof EventFormValue>(key: K, value: EventFormValue[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value;
    if (status !== "draft" && status !== "published") return;

    setLoading(true);
    try {
      await onSubmit({ ...form, status });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="dark-card space-y-5" onSubmit={submit}>
      <label className="form-field">ID<input value={form.id} onChange={(event) => updateField("id", event.target.value)} placeholder="Optional on create" /></label>
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
      <label className="form-field">Details URL<input value={form.detailsUrl} onChange={(event) => updateField("detailsUrl", event.target.value)} /></label>
      <label className="form-field">Registration URL<input value={form.registrationUrl} onChange={(event) => updateField("registrationUrl", event.target.value)} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-field">Tags<input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="tag, another tag" /></label>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        Current status: <strong className="text-white">{form.status}</strong>. Saving as a draft keeps the event off the public page. Publishing makes it public immediately.
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="button button-ghost" type="submit" name="status" value="draft" disabled={loading}>{loading ? "Saving..." : "Save as draft"}</button>
        <button className="button bg-yellow text-midnight" type="submit" name="status" value="published" disabled={loading}>{loading ? "Saving..." : "Publish event"}</button>
      </div>
    </form>
  );
}
