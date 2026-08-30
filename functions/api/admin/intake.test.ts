import { describe, expect, it } from "vitest";
import type { ProjectInquiry, Submission } from "../../../app/data/types";
import { pagesContext } from "../../test-support/public-forms";
import { onRequestGet as listInquiries } from "./inquiries";
import { onRequestPatch as updateInquiry } from "./inquiries/[id]";
import { onRequestGet as listSubmissions } from "./submissions";
import { onRequestPatch as updateSubmission } from "./submissions/[id]";

class PagedKv {
  readonly store = new Map<string, string>();
  readonly listCalls: Array<{ prefix?: string; cursor?: string; limit?: number }> = [];

  async get<T>(key: string, type?: "json" | "text") {
    const value = this.store.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) as T : value as T;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }

  async list(options: { prefix?: string; cursor?: string; limit?: number } = {}) {
    this.listCalls.push(options);
    const offset = options.cursor ? Number(options.cursor) : 0;
    const keys = [...this.store.keys()].filter((key) => key.startsWith(options.prefix ?? "")).sort();
    const page = keys.slice(offset, offset + (options.limit ?? 1000));
    const nextOffset = offset + page.length;
    return {
      keys: page.map((name) => ({ name })),
      list_complete: nextOffset >= keys.length,
      cursor: String(nextOffset),
    };
  }
}

function submission(id: string, status: Submission["invitationStatus"] = "signed_up"): Submission {
  return {
    id,
    name: `Person ${id}`,
    city: "Jogja",
    role: "Builder",
    whatsapp: "+62 812 3456 7890",
    referralSource: "github",
    invitationStatus: status,
    createdAt: `2026-08-0${id}T00:00:00.000Z`,
  };
}

function inquiry(id: string, status: ProjectInquiry["status"] = "new"): ProjectInquiry {
  return {
    id,
    name: `Lead ${id}`,
    contact: `lead-${id}@example.invalid`,
    message: "Synthetic inquiry",
    status,
    createdAt: `2026-08-0${id}T00:00:00.000Z`,
  };
}

function env(kv: PagedKv) {
  return { VFC_SUBMISSIONS: kv as unknown as KVNamespace };
}

describe("bounded admin intake", () => {
  it("reads at most one bounded submission page and returns an opaque continuation cursor", async () => {
    const kv = new PagedKv();
    for (const id of ["1", "2", "3"]) kv.store.set(`submission:${id}`, JSON.stringify(submission(id)));

    const response = await listSubmissions(pagesContext(
      listSubmissions,
      new Request("https://example.invalid/api/admin/submissions?limit=2"),
      env(kv),
    ));
    const body = await response.json() as { submissions: Submission[]; nextCursor: string | null; scannedCount: number };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.submissions).toHaveLength(2);
    expect(body.nextCursor).toBe("2");
    expect(body.scannedCount).toBe(2);
    expect(kv.listCalls).toEqual([{ prefix: "submission:", cursor: undefined, limit: 2 }]);
  });

  it("normalizes legacy states and applies filters only to the bounded page", async () => {
    const kv = new PagedKv();
    kv.store.set("submission:1", JSON.stringify({ ...submission("1"), invitationStatus: "pending" }));
    kv.store.set("submission:2", JSON.stringify(submission("2", "approved")));

    const response = await listSubmissions(pagesContext(
      listSubmissions,
      new Request("https://example.invalid/api/admin/submissions?limit=1&status=signed_up"),
      env(kv),
    ));
    const body = await response.json() as { submissions: Submission[]; nextCursor: string | null };

    expect(body.submissions[0]).toMatchObject({ invitationStatus: "signed_up" });
    expect(body.submissions[0].allowedNextStatuses).toEqual(["signed_up", "invited"]);
    expect(body.nextCursor).toBe("1");
  });

  it("bounds inquiry reads and rejects oversized page requests", async () => {
    const kv = new PagedKv();
    kv.store.set("inquiry:1", JSON.stringify(inquiry("1")));

    const invalid = await listInquiries(pagesContext(
      listInquiries,
      new Request("https://example.invalid/api/admin/inquiries?limit=51"),
      env(kv),
    ));

    expect(invalid.status).toBe(400);
    expect(kv.listCalls).toHaveLength(0);
  });

  it("triages, assigns, corrects, and attributes an inquiry", async () => {
    const kv = new PagedKv();
    kv.store.set("inquiry:lead", JSON.stringify(inquiry("lead")));
    const request = new Request("https://example.invalid/api/admin/inquiries/lead", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "contacted",
        contact: "corrected@example.invalid",
        assigned_to: "Studio team",
        admin_notes: "Follow up\nnext week.",
      }),
    });

    const response = await updateInquiry(pagesContext(
      updateInquiry,
      request,
      env(kv),
      { params: { id: "lead" }, data: { adminActor: "operator@example.com" } },
    ));
    const stored = JSON.parse(kv.store.get("inquiry:lead")!) as ProjectInquiry;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(stored).toMatchObject({
      status: "contacted",
      contact: "corrected@example.invalid",
      assigned_to: "Studio team",
      admin_notes: "Follow up\nnext week.",
      updated_by: "operator@example.com",
    });
    expect(stored.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("supports explicit terminal-decision correction without skipping the submission workflow", async () => {
    const kv = new PagedKv();
    kv.store.set("submission:member", JSON.stringify(submission("member", "rejected")));
    const request = new Request("https://example.invalid/api/admin/submissions/member", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationStatus: "requested_to_join", admin_notes: "Decision reopened." }),
    });

    const response = await updateSubmission(pagesContext(
      updateSubmission,
      request,
      env(kv),
      { params: { id: "member" }, data: { adminActor: "operator@example.com" } },
    ));
    const stored = JSON.parse(kv.store.get("submission:member")!) as Submission;

    expect(response.status).toBe(200);
    expect(stored).toMatchObject({
      invitationStatus: "requested_to_join",
      admin_notes: "Decision reopened.",
      updated_by: "operator@example.com",
    });
  });

  it("rejects unsupported transitions and fields without writing", async () => {
    const kv = new PagedKv();
    kv.store.set("inquiry:closed", JSON.stringify(inquiry("closed", "closed")));
    const request = new Request("https://example.invalid/api/admin/inquiries/closed", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "spam", secret: "unsupported" }),
    });

    const response = await updateInquiry(pagesContext(
      updateInquiry,
      request,
      env(kv),
      { params: { id: "closed" }, data: { adminActor: "operator@example.com" } },
    ));

    expect(response.status).toBe(400);
    expect(JSON.parse(kv.store.get("inquiry:closed")!)).toMatchObject({ status: "closed" });
  });
});
