import { afterEach, describe, expect, it, vi } from "vitest";
import { logSafe, requestIdFor, withRequestId, writeAuditRecord } from "./observability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("request correlation", () => {
  it("propagates a safe caller request id", () => {
    const request = new Request("https://example.com/api/join", {
      headers: { "X-Request-Id": "123e4567-e89b-42d3-a456-426614174000" },
    });
    const requestId = requestIdFor(request);
    const response = withRequestId(new Response("ok"), requestId);

    expect(requestId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(response.headers.get("X-Request-Id")).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("replaces unsafe request ids", () => {
    const requestId = requestIdFor(new Request("https://example.com", {
      headers: { "X-Request-Id": "phone=08123456789;secret=value" },
    }));

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("PII-safe logging and audit history", () => {
  it("serializes only the structured allowlist", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logSafe({
      event: "submission_write_succeeded",
      level: "info",
      requestId: "request-1",
      route: "/api/join",
      status: 200,
      requestBody: { whatsapp: "08123456789" },
      token: "must-not-appear",
    } as Parameters<typeof logSafe>[0]);

    const output = String(info.mock.calls[0][0]);
    expect(JSON.parse(output)).toMatchObject({
      event: "submission_write_succeeded",
      requestId: "request-1",
      route: "/api/join",
      status: 200,
    });
    expect(output).not.toMatch(/whatsapp|message|groupInvite|token|claims/i);
    expect(output).not.toContain("08123456789");
  });

  it("stores an append-only audit record without mutation values", async () => {
    const put = vi.fn(async (_key: string, _value: string) => undefined);
    await writeAuditRecord({ put } as unknown as KVNamespace, {
      timestamp: "2026-07-18T12:00:00.000Z",
      actor: "operator@example.com",
      action: "event.update",
      recordType: "event",
      recordId: "community-night",
      requestId: "request-2",
      changes: { fields: ["description", "status"], oldStatus: "draft", newStatus: "published" },
      fullRecord: { description: "must-not-appear" },
    } as Parameters<typeof writeAuditRecord>[1]);

    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0][0]).toMatch(/^audit:2026-07-18T12:00:00.000Z:/);
    expect(JSON.parse(put.mock.calls[0][1])).toEqual({
      timestamp: "2026-07-18T12:00:00.000Z",
      actor: "operator@example.com",
      action: "event.update",
      recordType: "event",
      recordId: "community-night",
      requestId: "request-2",
      changes: { fields: ["description", "status"], oldStatus: "draft", newStatus: "published" },
    });
    expect(put.mock.calls[0][1]).not.toContain("must-not-appear");
  });

  it("logs and rejects audit write failures", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const namespace = {
      put: vi.fn(async () => { throw new Error("backend details must not be logged"); }),
    } as unknown as KVNamespace;

    await expect(writeAuditRecord(namespace, {
      timestamp: "2026-07-18T12:00:00.000Z",
      actor: "break-glass",
      action: "event.delete",
      recordType: "event",
      recordId: "event-1",
      requestId: "request-3",
      changes: { oldStatus: "present", newStatus: "deleted" },
    })).rejects.toThrow("Admin audit write failed");

    const output = String(error.mock.calls[0][0]);
    expect(output).toContain("admin_audit_write_failed");
    expect(output).not.toContain("backend details");
  });
});
