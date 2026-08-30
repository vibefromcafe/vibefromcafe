import { parseEventInput } from "../../../../app/data/event-validation";
import { getEventById, removeEvent, saveEvent } from "../../../../app/data/events-store";
import type { Event } from "../../../../app/data/types";
import type { AdminAuthData } from "../auth";
import { auditMutation, type AuditedField } from "../../observability";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

function getId(params: Record<string, string | string[] | undefined>) {
  const paramId = params.id;
  return typeof paramId === "string" ? paramId.trim() : "";
}

const AUDITABLE_EVENT_FIELDS: AuditedField[] = [
  "title", "description", "date", "time", "location", "cafeId", "imageUrl", "mapUrl",
  "detailsUrl", "registrationUrl", "status", "tags",
];

export const onRequestGet: PagesFunction<Env, "id"> = async ({ env, params }) => {
  const id = getId(params);
  if (!id) {
    return Response.json({ error: "Event id is required" }, { status: 400 });
  }

  const event = await getEventById(env, id);
  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return Response.json({ event });
};

export const onRequestPatch: PagesFunction<Env, "id", AdminAuthData> = async ({ request, env, params, data }) => {
  const actor = data.adminActor;
  const requestId = data.requestId ?? crypto.randomUUID();
  if (!actor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

  const id = getId(params);
  if (!id) {
    return Response.json({ error: "Event id is required" }, { status: 400 });
  }

  const existing = await getEventById(env, id);
  if (!existing) {
    return Response.json({ error: "Event not found" }, { status: 404 });
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

  const updated: Event = {
    ...existing,
    title: parsed.input.title ?? existing.title,
    description: parsed.input.description ?? existing.description,
    date: parsed.input.date ?? existing.date,
    time: parsed.input.time ?? existing.time,
    location: parsed.input.location ?? existing.location,
    cafeId: parsed.input.cafeId,
    imageUrl: parsed.input.imageUrl,
    mapUrl: parsed.input.mapUrl,
    detailsUrl: parsed.input.detailsUrl,
    registrationUrl: parsed.input.registrationUrl,
    status: parsed.input.status ?? existing.status,
    tags: parsed.input.tags ?? existing.tags,
  };

  await saveEvent(env, updated, actor);

  const fields = AUDITABLE_EVENT_FIELDS.filter(
    (field) => JSON.stringify(existing[field as keyof Event]) !== JSON.stringify(updated[field as keyof Event]),
  );
  await auditMutation(env.VFC_SUBMISSIONS, {
    timestamp: new Date().toISOString(),
    actor,
    action: "event.update",
    recordType: "event",
    recordId: id,
    requestId,
    changes: {
      fields,
      ...(existing.status !== updated.status ? { oldStatus: existing.status, newStatus: updated.status } : {}),
    },
  });

  return Response.json({ event: updated });
};

export const onRequestDelete: PagesFunction<Env, "id", AdminAuthData> = async ({ env, params, data }) => {
  const actor = data.adminActor;
  const requestId = data.requestId ?? crypto.randomUUID();
  if (!actor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

  const id = getId(params);
  if (!id) {
    return Response.json({ error: "Event id is required" }, { status: 400 });
  }

  const removed = await removeEvent(env, id, actor);
  if (!removed) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  await auditMutation(env.VFC_SUBMISSIONS, {
    timestamp: new Date().toISOString(),
    actor,
    action: "event.delete",
    recordType: "event",
    recordId: id,
    requestId,
    changes: { oldStatus: "present", newStatus: "deleted" },
  });

  return Response.json({ success: true });
};
