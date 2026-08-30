export interface RequestData {
  requestId?: string;
}

export type AuditAction =
  | "submission.update"
  | "inquiry.update"
  | "event.create"
  | "event.update"
  | "event.delete"
  | "privacy.delete";
export type AuditRecordType = "submission" | "inquiry" | "event";
export type AuditStatus =
  | "signed_up" | "invited" | "requested_to_join" | "approved" | "rejected"
  | "new" | "contacted" | "closed" | "spam"
  | "published" | "draft" | "present" | "deleted";
export type AuditedField =
  | "name" | "city" | "role" | "whatsapp" | "referralSource" | "referralName"
  | "contact" | "message" | "assigned_to" | "admin_notes" | "invitationStatus"
  | "title" | "description" | "date" | "time" | "location" | "cafeId" | "imageUrl"
  | "mapUrl" | "detailsUrl" | "registrationUrl" | "status" | "tags";

export interface AuditRecord {
  timestamp: string;
  actor: string;
  action: AuditAction;
  recordType: AuditRecordType;
  recordId: string;
  requestId: string;
  changes: {
    fields?: AuditedField[];
    oldStatus?: AuditStatus;
    newStatus?: AuditStatus;
  };
}

type SafeLogEvent =
  | "api_request_failed"
  | "admin_auth_failed"
  | "admin_request_failed"
  | "admin_mutation_succeeded"
  | "admin_audit_write_failed";

type SafeLog = {
  event: SafeLogEvent;
  level: "info" | "warn" | "error";
  requestId: string;
  method?: string;
  route?: string;
  status?: number;
  actor?: string;
  action?: AuditAction;
  recordType?: AuditRecordType;
  errorType?: "audit_write" | "unhandled" | "upstream_failure";
};

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ACTIONS = new Set<AuditAction>([
  "submission.update", "inquiry.update", "event.create", "event.update", "event.delete", "privacy.delete",
]);
const AUDIT_RECORD_TYPES = new Set<AuditRecordType>(["submission", "inquiry", "event"]);
const AUDIT_STATUSES = new Set<AuditStatus>([
  "signed_up", "invited", "requested_to_join", "approved", "rejected",
  "new", "contacted", "closed", "spam", "published", "draft", "present", "deleted",
]);
const AUDIT_FIELDS = new Set<AuditedField>([
  "name", "city", "role", "whatsapp", "referralSource", "referralName", "contact", "message",
  "assigned_to", "admin_notes", "invitationStatus", "title", "description", "date", "time",
  "location", "cafeId", "imageUrl", "mapUrl", "detailsUrl", "registrationUrl", "status", "tags",
]);

export function requestIdFor(request: Request) {
  const supplied = request.headers.get("X-Request-Id")?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

export function withRequestId(response: Response, requestId: string) {
  const correlated = new Response(response.body, response);
  correlated.headers.set("X-Request-Id", requestId);
  return correlated;
}

export function logSafe(entry: SafeLog) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: entry.event,
    level: entry.level,
    requestId: entry.requestId,
    ...(entry.method !== undefined ? { method: entry.method } : {}),
    ...(entry.route !== undefined ? { route: entry.route } : {}),
    ...(entry.status !== undefined ? { status: entry.status } : {}),
    ...(entry.actor !== undefined ? { actor: entry.actor } : {}),
    ...(entry.action !== undefined ? { action: entry.action } : {}),
    ...(entry.recordType !== undefined ? { recordType: entry.recordType } : {}),
    ...(entry.errorType !== undefined ? { errorType: entry.errorType } : {}),
  });
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.info(line);
}

export async function writeAuditRecord(namespace: KVNamespace, record: AuditRecord) {
  if (
    !AUDIT_ACTIONS.has(record.action) ||
    !AUDIT_RECORD_TYPES.has(record.recordType) ||
    !record.timestamp || !record.actor || !record.recordId || !record.requestId ||
    record.changes.fields?.some((field) => !AUDIT_FIELDS.has(field)) ||
    (record.changes.oldStatus !== undefined && !AUDIT_STATUSES.has(record.changes.oldStatus)) ||
    (record.changes.newStatus !== undefined && !AUDIT_STATUSES.has(record.changes.newStatus))
  ) {
    throw new Error("Invalid admin audit record");
  }

  const safeRecord: AuditRecord = {
    timestamp: record.timestamp,
    actor: record.actor,
    action: record.action,
    recordType: record.recordType,
    recordId: record.recordId,
    requestId: record.requestId,
    changes: {
      ...(record.changes.fields ? { fields: [...record.changes.fields] } : {}),
      ...(record.changes.oldStatus ? { oldStatus: record.changes.oldStatus } : {}),
      ...(record.changes.newStatus ? { newStatus: record.changes.newStatus } : {}),
    },
  };
  try {
    await namespace.put(`audit:${record.timestamp}:${crypto.randomUUID()}`, JSON.stringify(safeRecord));
  } catch {
    logSafe({
      event: "admin_audit_write_failed",
      level: "error",
      requestId: record.requestId,
      actor: record.actor,
      action: record.action,
      recordType: record.recordType,
      errorType: "audit_write",
    });
    throw new Error("Admin audit write failed");
  }
}

export async function auditMutation(namespace: KVNamespace, record: AuditRecord, status = 200) {
  await writeAuditRecord(namespace, record);
  logSafe({
    event: "admin_mutation_succeeded",
    level: "info",
    requestId: record.requestId,
    actor: record.actor,
    action: record.action,
    recordType: record.recordType,
    status,
  });
}
