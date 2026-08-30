import type { EventStatus } from "./types";

export type EventInput = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  cafeId?: string;
  imageUrl?: string;
  mapUrl?: string;
  detailsUrl?: string;
  registrationUrl?: string;
  status?: EventStatus;
  tags?: string[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function asOptionalString(value: unknown) {
  const stringValue = asString(value);
  return stringValue ? stringValue : undefined;
}

function asTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseEventInput(body: unknown, requireBaseFields: boolean) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid event payload" };
  }

  const record = body as Record<string, unknown>;
  const input: EventInput = {
    id: asOptionalString(record.id),
    title: asString(record.title),
    description: asString(record.description),
    date: asString(record.date),
    time: asString(record.time),
    location: asString(record.location),
    cafeId: asOptionalString(record.cafeId),
    imageUrl: asOptionalString(record.imageUrl),
    mapUrl: asOptionalString(record.mapUrl),
    detailsUrl: asOptionalString(record.detailsUrl),
    registrationUrl: asOptionalString(record.registrationUrl),
    status: record.status === "draft" || record.status === "published" ? record.status : undefined,
    tags: asTags(record.tags),
  };

  if (record.status !== undefined && input.status === undefined) {
    return { error: "status must be draft or published" };
  }

  if (requireBaseFields && (!input.title || !input.description || !input.date || !input.time || !input.location)) {
    return { error: "title, description, date, time, and location are required" };
  }

  const invalidUrlField = (["imageUrl", "mapUrl", "detailsUrl", "registrationUrl"] as const)
    .find((field) => input[field] && !isHttpUrl(input[field]));
  if (invalidUrlField) {
    return { error: `${invalidUrlField} must be an http or https URL` };
  }

  return { input };
}
