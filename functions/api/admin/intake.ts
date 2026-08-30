import type { InquiryStatus, SubmissionStatus } from "../../../app/data/types";

export const SUBMISSION_STATUSES = [
  "signed_up",
  "invited",
  "requested_to_join",
  "approved",
  "rejected",
] as const satisfies readonly SubmissionStatus[];

export const INQUIRY_STATUSES = ["new", "contacted", "closed", "spam"] as const satisfies readonly InquiryStatus[];

export const SUBMISSION_STATUS_FLOW: Record<SubmissionStatus, readonly SubmissionStatus[]> = {
  signed_up: ["signed_up", "invited"],
  invited: ["signed_up", "invited", "requested_to_join"],
  requested_to_join: ["invited", "requested_to_join", "approved", "rejected"],
  approved: ["requested_to_join", "approved"],
  rejected: ["requested_to_join", "rejected"],
};

export const INQUIRY_STATUS_FLOW: Record<InquiryStatus, readonly InquiryStatus[]> = {
  new: ["new", "contacted", "closed", "spam"],
  contacted: ["new", "contacted", "closed", "spam"],
  closed: ["new", "closed"],
  spam: ["new", "spam"],
};

export function parseSubmissionStatus(value: unknown): SubmissionStatus | null {
  if (typeof value !== "string") return null;
  if ((SUBMISSION_STATUSES as readonly string[]).includes(value)) return value as SubmissionStatus;
  if (value === "pending") return "signed_up";
  if (value === "joined") return "requested_to_join";
  if (value === "declined") return "rejected";
  return null;
}

export function parseInquiryStatus(value: unknown): InquiryStatus | null {
  return typeof value === "string" && (INQUIRY_STATUSES as readonly string[]).includes(value)
    ? value as InquiryStatus
    : null;
}

export type IntakeListOptions<Status extends string> = {
  cursor?: string;
  limit: number;
  status?: Status;
};

export function parseIntakeListOptions<Status extends string>(
  request: Request,
  parseStatus: (value: unknown) => Status | null,
): IntakeListOptions<Status> | Response {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit") ?? "25";
  if (!/^\d+$/.test(rawLimit)) return Response.json({ error: "Invalid limit" }, { status: 400 });
  const limit = Number(rawLimit);
  if (limit < 1 || limit > 50) return Response.json({ error: "Limit must be between 1 and 50" }, { status: 400 });

  const cursor = url.searchParams.get("cursor")?.trim() || undefined;
  if (cursor && cursor.length > 2048) return Response.json({ error: "Invalid cursor" }, { status: 400 });

  const rawStatus = url.searchParams.get("status")?.trim();
  const status = rawStatus ? parseStatus(rawStatus) : undefined;
  if (rawStatus && !status) return Response.json({ error: "Invalid status filter" }, { status: 400 });

  return { cursor, limit, status: status ?? undefined };
}

export function optionalPatchText(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  multiline = false,
): string | undefined | Response {
  if (!Object.hasOwn(body, field)) return undefined;
  if (typeof body[field] !== "string") return Response.json({ error: `${field} must be text` }, { status: 400 });
  const value = body[field].trim();
  if (value.length > maxLength) return Response.json({ error: `${field} is too long` }, { status: 400 });
  const unsupported = multiline
    ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/
    : /\p{Cc}/u;
  return unsupported.test(value)
    ? Response.json({ error: `${field} contains unsupported characters` }, { status: 400 })
    : value;
}
