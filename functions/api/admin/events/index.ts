import { parseEventInput } from "../../../../app/data/event-validation";
import { getAllEvents, getEventById, saveEvent } from "../../../../app/data/events-store";
import type { Event } from "../../../../app/data/types";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const events = await getAllEvents(env);
  return Response.json({ events });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseEventInput(body, true);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error ?? "Invalid event payload" }, { status: 400 });
  }

  const eventId = parsed.input.id ?? `${(parsed.input.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-")}-${parsed.input.date ?? ""}`;
  if (!eventId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await getEventById(env, eventId);
  if (existing) {
    return Response.json({ error: "An event with this id already exists" }, { status: 409 });
  }

  const event: Event = {
    id: eventId,
    title: parsed.input.title ?? "",
    description: parsed.input.description ?? "",
    date: parsed.input.date ?? "",
    time: parsed.input.time ?? "",
    location: parsed.input.location ?? "",
    cafeId: parsed.input.cafeId,
    imageUrl: parsed.input.imageUrl,
    mapUrl: parsed.input.mapUrl,
    status: parsed.input.status ?? "published",
    tags: parsed.input.tags ?? [],
    createdAt: new Date().toISOString(),
  };

  await saveEvent(env, event);

  return Response.json({ event }, { status: 201 });
};
