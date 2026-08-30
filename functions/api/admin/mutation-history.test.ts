import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectInquiry, Submission } from "../../../app/data/types";
import { onRequestDelete as deleteEvent, onRequestPatch as patchEvent } from "./events/[id]";
import { onRequestPost as createEvent } from "./events/index";
import { onRequestPatch as patchInquiry } from "./inquiries/[id]";
import { onRequestPatch as patchSubmission } from "./submissions/[id]";

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

function auditValues(kv: MockKvNamespace) {
  return [...kv.store.entries()].filter(([key]) => key.startsWith("audit:")).map(([, value]) => JSON.parse(value));
}

describe("admin mutation history", () => {
  it("audits submission and inquiry corrections by field name without values", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    const submission: Submission = {
      id: "submission-1",
      name: "Synthetic Person",
      city: "Jogja",
      role: "Builder",
      whatsapp: "+62 812 3456 7890",
      referralSource: "github",
      invitationStatus: "signed_up",
      createdAt: "2026-08-30T00:00:00.000Z",
    };
    const inquiry: ProjectInquiry = {
      id: "inquiry-1",
      name: "Synthetic Lead",
      contact: "lead@example.invalid",
      message: "Private project detail",
      status: "new",
      createdAt: "2026-08-30T00:00:00.000Z",
    };
    kv.store.set("submission:submission-1", JSON.stringify(submission));
    kv.store.set("inquiry:inquiry-1", JSON.stringify(inquiry));

    const submissionResponse = await patchSubmission({
      request: new Request("https://example.invalid/api/admin/submissions/submission-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationStatus: "invited", admin_notes: "Private note" }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "submission-1" },
      data: { adminActor: "operator@example.com", requestId: "request-submission" },
    } as unknown as Parameters<typeof patchSubmission>[0]);
    const inquiryResponse = await patchInquiry({
      request: new Request("https://example.invalid/api/admin/inquiries/inquiry-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "contacted", assigned_to: "Studio team" }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "inquiry-1" },
      data: { adminActor: "operator@example.com", requestId: "request-inquiry" },
    } as unknown as Parameters<typeof patchInquiry>[0]);

    expect(submissionResponse.status).toBe(200);
    expect(inquiryResponse.status).toBe(200);
    expect(auditValues(kv)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "submission.update",
        requestId: "request-submission",
        changes: { fields: ["invitationStatus", "admin_notes"], oldStatus: "signed_up", newStatus: "invited" },
      }),
      expect.objectContaining({
        action: "inquiry.update",
        requestId: "request-inquiry",
        changes: { fields: ["status", "assigned_to"], oldStatus: "new", newStatus: "contacted" },
      }),
    ]));
    const serialized = JSON.stringify(auditValues(kv));
    expect(serialized).not.toMatch(/Private note|Private project detail|lead@example|812 3456/);
  });

  it("audits event create, update, and deletion including current URL fields", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    const createResponse = await createEvent({
      request: new Request("https://example.invalid/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          id: "synthetic-event",
          title: "Synthetic event",
          description: "Private event details",
          date: "2026-09-01",
          time: "10:00",
          location: "Synthetic location",
          status: "draft",
          tags: [],
        }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: {},
      data: { adminActor: "operator@example.com", requestId: "request-create" },
    } as unknown as Parameters<typeof createEvent>[0]);

    const updateResponse = await patchEvent({
      request: new Request("https://example.invalid/api/admin/events/synthetic-event", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Synthetic event",
          description: "Changed private details",
          date: "2026-09-01",
          time: "10:00",
          location: "Synthetic location",
          detailsUrl: "https://example.invalid/details",
          registrationUrl: "https://example.invalid/register",
          status: "published",
          tags: [],
        }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "synthetic-event" },
      data: { adminActor: "operator@example.com", requestId: "request-update" },
    } as unknown as Parameters<typeof patchEvent>[0]);
    const deleteResponse = await deleteEvent({
      request: new Request("https://example.invalid/api/admin/events/synthetic-event", { method: "DELETE" }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "synthetic-event" },
      data: { adminActor: "operator@example.com", requestId: "request-delete" },
    } as unknown as Parameters<typeof deleteEvent>[0]);

    expect([createResponse.status, updateResponse.status, deleteResponse.status]).toEqual([201, 200, 200]);
    expect(auditValues(kv)).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "event.create", changes: { newStatus: "draft" } }),
      expect.objectContaining({
        action: "event.update",
        changes: {
          fields: ["description", "detailsUrl", "registrationUrl", "status"],
          oldStatus: "draft",
          newStatus: "published",
        },
      }),
      expect.objectContaining({ action: "event.delete", changes: { oldStatus: "present", newStatus: "deleted" } }),
    ]));
    expect(JSON.stringify(auditValues(kv))).not.toMatch(/Private event|Changed private|example.invalid\/details/);
  });

  it("exposes the documented non-atomic failure when audit persistence fails after mutation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const kv = new MockKvNamespace();
    kv.failAudit = true;
    kv.store.set("submission:submission-2", JSON.stringify({
      id: "submission-2",
      name: "Synthetic",
      city: "Jogja",
      role: "Builder",
      whatsapp: "+62 812 3456 7890",
      referralSource: "github",
      invitationStatus: "signed_up",
      createdAt: "2026-08-30T00:00:00.000Z",
    }));

    await expect(patchSubmission({
      request: new Request("https://example.invalid/api/admin/submissions/submission-2", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationStatus: "invited" }),
      }),
      env: { VFC_SUBMISSIONS: kv },
      params: { id: "submission-2" },
      data: { adminActor: "operator@example.com", requestId: "request-failure" },
    } as unknown as Parameters<typeof patchSubmission>[0])).rejects.toThrow("Admin audit write failed");

    expect(auditValues(kv)).toHaveLength(0);
    expect(JSON.parse(kv.store.get("submission:submission-2")!)).toMatchObject({ invitationStatus: "invited" });
  });
});
