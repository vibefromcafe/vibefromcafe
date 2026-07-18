import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPatch as patchSubmission } from "./submissions/[id]";
import { onRequestPost as createEvent } from "./events/index";
import { onRequestDelete as deleteEvent, onRequestPatch as patchEvent } from "./events/[id]";

class MockKvNamespace {
  readonly store = new Map<string, string>();
  failAudit = false;

  async get<T>(key: string, type?: "json" | "text") {
    const value = this.store.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) as T : value as T;
  }

  async put(key: string, value: string) {
    if (this.failAudit && key.startsWith("audit:")) throw new Error("audit unavailable");
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("admin mutation history", () => {
  it("rejects non-object submission patches", async () => {
    const response = await patchSubmission({
      request: new Request("https://example.com/api/admin/submissions/submission-1", {
        method: "PATCH",
        body: "null",
      }),
      env: { VFC_SUBMISSIONS: new MockKvNamespace() },
      params: { id: "submission-1" },
      data: { adminActor: "operator@example.com", requestId: "request-invalid" },
    } as unknown as Parameters<typeof patchSubmission>[0]);

    expect(response.status).toBe(400);
  });

  it("attributes a submission transition to the verified actor and request", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    kv.store.set("submission:submission-1", JSON.stringify({
      id: "submission-1",
      name: "Synthetic Person",
      city: "Test City",
      role: "Tester",
      whatsapp: "0000000000",
      referralSource: "test",
      invitationStatus: "signed_up",
      createdAt: "2026-07-18T00:00:00.000Z",
    }));

    const response = await patchSubmission({
      request: new Request("https://example.com/api/admin/submissions/submission-1", {
        method: "PATCH",
        body: JSON.stringify({ invitationStatus: "invited" }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "submission-1" },
      data: { adminActor: "operator@example.com", requestId: "request-submission" },
    } as unknown as Parameters<typeof patchSubmission>[0]);

    const auditEntry = [...kv.store.entries()].find(([key]) => key.startsWith("audit:"));
    expect(response.status).toBe(200);
    expect(auditEntry).toBeTruthy();
    expect(JSON.parse(auditEntry![1])).toMatchObject({
      actor: "operator@example.com",
      action: "submission.status_update",
      recordId: "submission-1",
      requestId: "request-submission",
      changes: { oldStatus: "signed_up", newStatus: "invited" },
    });
    expect(auditEntry![1]).not.toContain("0000000000");
    expect(auditEntry![1]).not.toContain("Synthetic Person");
  });

  it("records event creation with status only", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    const response = await createEvent({
      request: new Request("https://example.com/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Synthetic Event",
          description: "Sensitive-like event detail",
          date: "2026-08-01",
          time: "10:00",
          location: "Synthetic Location",
          status: "draft",
          tags: ["test"],
        }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: {},
      data: { adminActor: "break-glass", requestId: "request-event" },
    } as unknown as Parameters<typeof createEvent>[0]);

    const auditEntry = [...kv.store.entries()].find(([key]) => key.startsWith("audit:"));
    const eventKey = [...kv.store.keys()].find((key) => key.startsWith("event:"));
    expect(response.status).toBe(201);
    expect(eventKey).toMatch(/^event:[0-9a-f-]{36}$/);
    expect(JSON.parse(auditEntry![1])).toMatchObject({
      actor: "break-glass",
      action: "event.create",
      recordId: eventKey!.slice("event:".length),
      requestId: "request-event",
      changes: { newStatus: "draft" },
    });
    expect(auditEntry![1]).not.toContain("Sensitive-like event detail");
    expect(auditEntry![1]).not.toContain("Synthetic Location");
  });

  it("rejects caller-supplied event ids before they can enter logs or history", async () => {
    const kv = new MockKvNamespace();
    const response = await createEvent({
      request: new Request("https://example.com/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          id: "08123456789",
          title: "https://chat.whatsapp.com/private",
          description: "Synthetic",
          date: "2026-08-01",
          time: "10:00",
          location: "Synthetic",
          status: "draft",
          tags: [],
        }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: {},
      data: { adminActor: "break-glass", requestId: "request-event" },
    } as unknown as Parameters<typeof createEvent>[0]);

    expect(response.status).toBe(400);
    expect([...kv.store.keys()]).toHaveLength(0);
  });

  it("audits event field changes and deletion without values", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    kv.store.set("event:event-1", JSON.stringify({
      id: "event-1",
      title: "Old title",
      description: "Old sensitive description",
      date: "2026-08-01",
      time: "10:00",
      location: "Old location",
      status: "draft",
      tags: [],
      createdAt: "2026-07-18T00:00:00.000Z",
    }));

    const patchResponse = await patchEvent({
      request: new Request("https://example.com/api/admin/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({
          title: "New title",
          description: "New sensitive description",
          date: "2026-08-01",
          time: "10:00",
          location: "Old location",
          status: "published",
          tags: [],
        }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "event-1" },
      data: { adminActor: "operator@example.com", requestId: "request-event-update" },
    } as unknown as Parameters<typeof patchEvent>[0]);
    const updateAudit = [...kv.store.entries()].find(([, value]) => value.includes("event.update"));

    expect(patchResponse.status).toBe(200);
    expect(JSON.parse(updateAudit![1])).toMatchObject({
      actor: "operator@example.com",
      recordId: "event-1",
      changes: { fields: ["title", "description", "status"], oldStatus: "draft", newStatus: "published" },
    });
    expect(updateAudit![1]).not.toMatch(/Old sensitive|New sensitive|Old title|New title/);

    const deleteResponse = await deleteEvent({
      request: new Request("https://example.com/api/admin/events/event-1", { method: "DELETE" }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "event-1" },
      data: { adminActor: "operator@example.com", requestId: "request-event-delete" },
    } as unknown as Parameters<typeof deleteEvent>[0]);
    const deleteAudit = [...kv.store.entries()].find(([, value]) => value.includes("event.delete"));

    expect(deleteResponse.status).toBe(200);
    expect(JSON.parse(deleteAudit![1])).toMatchObject({
      actor: "operator@example.com",
      recordId: "event-1",
      changes: { oldStatus: "present", newStatus: "deleted" },
    });
  });

  it("fails the request when append-only history cannot be retained", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    kv.failAudit = true;
    kv.store.set("submission:submission-2", JSON.stringify({
      id: "submission-2",
      name: "Synthetic",
      city: "Test",
      role: "Test",
      whatsapp: "0000",
      referralSource: "test",
      invitationStatus: "signed_up",
      createdAt: "2026-07-18T00:00:00.000Z",
    }));

    await expect(patchSubmission({
      request: new Request("https://example.com/api/admin/submissions/submission-2", {
        method: "PATCH",
        body: JSON.stringify({ invitationStatus: "invited" }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "submission-2" },
      data: { adminActor: "operator@example.com", requestId: "request-failure" },
    } as unknown as Parameters<typeof patchSubmission>[0])).rejects.toThrow("Admin audit write failed");

    expect([...kv.store.keys()].filter((key) => key.startsWith("audit:"))).toHaveLength(0);
    expect(JSON.parse(kv.store.get("submission:submission-2")!)).toMatchObject({
      invitationStatus: "invited",
      updated_by: "operator@example.com",
    });
  });
});
