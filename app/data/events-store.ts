import seedEvents from "./events.json";
import type { Event } from "./types";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

const EVENT_PREFIX = "event:";
const EVENT_DELETED_PREFIX = "event-deleted:";

function normalizeEventStatus(event: Event): Event {
  return {
    ...event,
    status: event.status === "draft" ? "draft" : "published",
  };
}

function toDateValue(event: Event) {
  return Date.parse(`${event.date}T${event.time || "00:00"}:00`);
}

function sortEvents(events: Event[]) {
  return [...events].sort((first, second) => {
    const firstDate = toDateValue(first);
    const secondDate = toDateValue(second);

    if (!Number.isNaN(firstDate) && !Number.isNaN(secondDate)) {
      return firstDate - secondDate;
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

async function listKeysByPrefix(env: Env, prefix: string) {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const listing = await env.VFC_SUBMISSIONS.list({ prefix, cursor, limit: 1000 });
    keys.push(...listing.keys.map((key) => key.name));
    cursor = listing.list_complete ? undefined : listing.cursor;
  } while (cursor);

  return keys;
}

async function listStoredEvents(env: Env) {
  const keys = await listKeysByPrefix(env, EVENT_PREFIX);
  if (keys.length === 0) {
    return [] as Event[];
  }

  const records = await Promise.all(
    keys.map((key) => env.VFC_SUBMISSIONS.get<Event>(key, "json")),
  );

  return records
    .filter((record): record is Event => Boolean(record))
    .map(normalizeEventStatus);
}

async function getDeletedEventIds(env: Env) {
  const keys = await listKeysByPrefix(env, EVENT_DELETED_PREFIX);

  return new Set(
    keys
      .map((key) => key.slice(EVENT_DELETED_PREFIX.length))
      .filter((id) => id.length > 0),
  );
}

export async function getAllEvents(env: Env) {
  const deletedIds = await getDeletedEventIds(env);
  const seedRecords = (seedEvents as Event[])
    .filter((event) => !deletedIds.has(event.id))
    .map(normalizeEventStatus);
  const storedRecords = await listStoredEvents(env);

  const mergedById = new Map<string, Event>();
  for (const event of seedRecords) {
    mergedById.set(event.id, event);
  }
  for (const event of storedRecords) {
    if (!deletedIds.has(event.id)) {
      mergedById.set(event.id, event);
    }
  }

  return sortEvents(Array.from(mergedById.values()));
}

export async function getEventById(env: Env, id: string) {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return null;
  }

  const deletedMarker = await env.VFC_SUBMISSIONS.get(
    `${EVENT_DELETED_PREFIX}${normalizedId}`,
    "text",
  );
  if (deletedMarker) {
    return null;
  }

  const storedRecord = await env.VFC_SUBMISSIONS.get<Event>(
    `${EVENT_PREFIX}${normalizedId}`,
    "json",
  );
  if (storedRecord) {
    return normalizeEventStatus(storedRecord);
  }

  const seedRecord = (seedEvents as Event[]).find((event) => event.id === normalizedId);
  return seedRecord ? normalizeEventStatus(seedRecord) : null;
}

export async function saveEvent(env: Env, event: Event, actor: string) {
  const normalizedEvent = normalizeEventStatus(event);
  await env.VFC_SUBMISSIONS.put(
    `${EVENT_PREFIX}${normalizedEvent.id}`,
    JSON.stringify(normalizedEvent),
    { metadata: { updatedBy: actor, updatedAt: new Date().toISOString() } },
  );
  await env.VFC_SUBMISSIONS.delete(`${EVENT_DELETED_PREFIX}${normalizedEvent.id}`);
}

export async function removeEvent(env: Env, id: string, actor: string) {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return false;
  }

  const existing = await getEventById(env, normalizedId);
  if (!existing) {
    return false;
  }

  await env.VFC_SUBMISSIONS.put(
    `${EVENT_DELETED_PREFIX}${normalizedId}`,
    JSON.stringify({ deletedAt: new Date().toISOString(), deletedBy: actor }),
  );
  await env.VFC_SUBMISSIONS.delete(`${EVENT_PREFIX}${normalizedId}`);

  return true;
}
