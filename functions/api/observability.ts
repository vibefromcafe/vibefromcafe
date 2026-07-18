export interface RequestData {
  requestId?: string;
}

type AuditStatus = "signed_up" | "invited" | "requested_to_join" | "approved" | "rejected" | "published" | "draft" | "present" | "deleted";
export type AuditedEventField = "title" | "description" | "date" | "time" | "location" | "cafeId" | "imageUrl" | "mapUrl" | "status" | "tags";

export interface AuditRecord {
  timestamp: string;
  actor: string;
  action: "submission.status_update" | "event.create" | "event.update" | "event.delete";
  recordType: "submission" | "event";
  recordId: string;
  requestId: string;
  changes: {
    fields?: AuditedEventField[];
    oldStatus?: AuditStatus;
    newStatus?: AuditStatus;
  };
}

type SafeLog = {
  event: string;
  level: "info" | "warn" | "error";
  requestId: string;
  method?: string;
  route?: string;
  status?: number;
  actor?: string;
  action?: AuditRecord["action"];
  recordType?: AuditRecord["recordType"];
  recordId?: string;
  errorType?: "kv_write" | "audit_write" | "unhandled";
};

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ACTIONS = new Set(["submission.status_update", "event.create", "event.update", "event.delete"]);
const AUDIT_RECORD_TYPES = new Set(["submission", "event"]);
const AUDIT_STATUSES = new Set(["signed_up", "invited", "requested_to_join", "approved", "rejected", "published", "draft", "present", "deleted"]);
const AUDIT_FIELDS = new Set(["title", "description", "date", "time", "location", "cafeId", "imageUrl", "mapUrl", "status", "tags"]);

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
  const safeEntry = {
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
    ...(entry.recordId !== undefined ? { recordId: entry.recordId } : {}),
    ...(entry.errorType !== undefined ? { errorType: entry.errorType } : {}),
  };
  const line = JSON.stringify(safeEntry);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.info(line);
}

export async function writeAuditRecord(
  namespace: KVNamespace,
  record: AuditRecord,
) {
  if (
    !AUDIT_ACTIONS.has(record.action) ||
    !AUDIT_RECORD_TYPES.has(record.recordType) ||
    !record.timestamp ||
    !record.actor ||
    !record.recordId ||
    !record.requestId ||
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
      ...(record.changes.fields !== undefined ? { fields: [...record.changes.fields] } : {}),
      ...(record.changes.oldStatus !== undefined ? { oldStatus: record.changes.oldStatus } : {}),
      ...(record.changes.newStatus !== undefined ? { newStatus: record.changes.newStatus } : {}),
    },
  };
  try {
    await namespace.put(
      `audit:${record.timestamp}:${crypto.randomUUID()}`,
      JSON.stringify(safeRecord),
    );
  } catch {
    logSafe({
      event: "admin_audit_write_failed",
      level: "error",
      requestId: record.requestId,
      actor: record.actor,
      action: record.action,
      recordType: record.recordType,
      recordId: record.recordId,
      errorType: "audit_write",
    });
    throw new Error("Admin audit write failed");
  }
}
