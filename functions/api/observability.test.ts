import { afterEach, describe, expect, it, vi } from "vitest";
import { pagesContext } from "../test-support/public-forms";
import { onRequest as apiMiddleware } from "./_middleware";
import { logSafe, requestIdFor, withRequestId, writeAuditRecord } from "./observability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("request correlation", () => {
  it("propagates only canonical caller request ids", () => {
    const safeRequest = new Request("https://example.invalid/api/join", {
      headers: { "X-Request-Id": "123e4567-e89b-42d3-a456-426614174000" },
    });
    const requestId = requestIdFor(safeRequest);
    const response = withRequestId(new Response("ok"), requestId);

    expect(requestId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(response.headers.get("X-Request-Id")).toBe(requestId);
    expect(requestIdFor(new Request("https://example.invalid", {
      headers: { "X-Request-Id": "phone=08123456789;secret=value" },
    }))).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("correlates failed API responses without logging response bodies", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new Request("https://example.invalid/api/join", {
      headers: { "X-Request-Id": "123e4567-e89b-42d3-a456-426614174000" },
    });
    const response = await apiMiddleware(pagesContext(
      apiMiddleware,
      request,
      {},
      {
        functionPath: "/api/join",
        next: () => Promise.resolve(Response.json({ submitted: "must-not-appear" }, { status: 503 })),
      },
    ));

    expect(response.status).toBe(503);
    expect(response.headers.get("X-Request-Id")).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(String(error.mock.calls[0][0])).not.toContain("must-not-appear");
  });
});

describe("PII-safe logging and audit history", () => {
  it("serializes only the structured log allowlist", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logSafe({
      event: "admin_mutation_succeeded",
      level: "info",
      requestId: "request-1",
      route: "/api/admin/inquiries",
      status: 200,
      requestBody: { contact: "private@example.invalid" },
      recordId: "must-not-appear",
      token: "must-not-appear",
    } as Parameters<typeof logSafe>[0]);

    const output = String(info.mock.calls[0][0]);
    expect(JSON.parse(output)).toMatchObject({
      event: "admin_mutation_succeeded",
      requestId: "request-1",
      route: "/api/admin/inquiries",
      status: 200,
    });
    expect(output).not.toMatch(/contact|requestBody|recordId|token|private@example/i);
  });

  it("stores allowlisted audit facts without mutation values", async () => {
    const put = vi.fn(async (_key: string, _value: string) => undefined);
    await writeAuditRecord({ put } as unknown as KVNamespace, {
      timestamp: "2026-08-30T12:00:00.000Z",
      actor: "operator@example.com",
      action: "inquiry.update",
      recordType: "inquiry",
      recordId: "synthetic-inquiry",
      requestId: "request-2",
      changes: { fields: ["message", "status"], oldStatus: "new", newStatus: "contacted" },
      fullRecord: { message: "must-not-appear" },
    } as Parameters<typeof writeAuditRecord>[1]);

    expect(put).toHaveBeenCalledOnce();
    const value = put.mock.calls[0][1];
    expect(JSON.parse(value)).toEqual({
      timestamp: "2026-08-30T12:00:00.000Z",
      actor: "operator@example.com",
      action: "inquiry.update",
      recordType: "inquiry",
      recordId: "synthetic-inquiry",
      requestId: "request-2",
      changes: { fields: ["message", "status"], oldStatus: "new", newStatus: "contacted" },
    });
    expect(value).not.toContain("must-not-appear");
  });

  it("fails closed and logs no backend details when audit persistence fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const namespace = {
      put: vi.fn(async () => { throw new Error("private backend detail"); }),
    } as unknown as KVNamespace;

    await expect(writeAuditRecord(namespace, {
      timestamp: "2026-08-30T12:00:00.000Z",
      actor: "break-glass",
      action: "event.delete",
      recordType: "event",
      recordId: "event-1",
      requestId: "request-3",
      changes: { oldStatus: "present", newStatus: "deleted" },
    })).rejects.toThrow("Admin audit write failed");

    expect(String(error.mock.calls[0][0])).toContain("admin_audit_write_failed");
    expect(String(error.mock.calls[0][0])).not.toContain("private backend detail");
  });
});
