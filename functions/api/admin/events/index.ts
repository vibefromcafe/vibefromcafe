import { parseEventInput } from "../../../../app/data/event-validation";
import { getAllEvents, getEventById, saveEvent } from "../../../../app/data/events-store";
import type { Event } from "../../../../app/data/types";
import type { AdminAuthData } from "../auth";
import { auditMutation } from "../../observability";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const events = await getAllEvents(env);
  return Response.json({ events });
};

export const onRequestPost: PagesFunction<Env, string, AdminAuthData> = async ({ request, env, data }) => {
  const actor = data.adminActor;
  const requestId = data.requestId ?? crypto.randomUUID();
  if (!actor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

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
    detailsUrl: parsed.input.detailsUrl,
    registrationUrl: parsed.input.registrationUrl,
    status: parsed.input.status ?? "draft",
    tags: parsed.input.tags ?? [],
    createdAt: new Date().toISOString(),
  };

  await saveEvent(env, event, actor);

  await auditMutation(env.VFC_SUBMISSIONS, {
    timestamp: new Date().toISOString(),
    actor,
    action: "event.create",
    recordType: "event",
    recordId: event.id,
    requestId,
    changes: { newStatus: event.status },
  }, 201);

  return Response.json({ event }, { status: 201 });
};
