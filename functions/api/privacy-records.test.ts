import { describe, expect, it, vi } from "vitest";
import { MockKvNamespace, pagesContext, protectedFormEnv } from "../test-support/public-forms";
import { onRequest as apiAdminMiddleware } from "./admin/_middleware";
import { onRequestDelete } from "./admin/privacy/[kind]/[id]";
import { deletePublicFormRecords } from "./privacy-records";

function seedEquivalentJoinRecords(kv: MockKvNamespace) {
  const dedupeKey = `form-dedupe:join:v1:${"a".repeat(64)}`;
  for (const id of ["synthetic-a", "synthetic-b"]) {
    const recordKey = `submission:${id}`;
    const referenceKey = `privacy-dedupe-ref:join:${id}`;
    const reference = {
      recordKey,
      dedupeKeys: [dedupeKey],
      createdAt: "2026-08-30T00:00:00.000Z",
    };
    kv.store.set(recordKey, JSON.stringify({ id, name: "Synthetic", whatsapp: "redacted" }));
    kv.store.set(referenceKey, JSON.stringify(reference));
    kv.putOptions.set(referenceKey, { metadata: reference });
  }
  kv.store.set(dedupeKey, JSON.stringify({
    recordKey: "submission:synthetic-b",
    createdAt: "2026-08-30T00:00:00.000Z",
  }));
  return dedupeKey;
}

describe("public-form privacy deletion", () => {
  it("deletes all discoverable raced records, references, and the owned marker", async () => {
    const kv = new MockKvNamespace();
    const dedupeKey = seedEquivalentJoinRecords(kv);

    const result = await deletePublicFormRecords(protectedFormEnv(kv), "submission", "synthetic-a");
    const receipt = JSON.parse(kv.store.get("privacy-deletion:submission:synthetic-a")!);

    expect(result).toEqual({ ok: true });
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(0);
    expect(kv.store.has(dedupeKey)).toBe(false);
    expect(receipt).toMatchObject({ state: "complete", kind: "submission" });
    expect(JSON.stringify(receipt)).not.toContain("form-dedupe");
    expect(kv.putOptions.get("privacy-deletion:submission:synthetic-a")?.expirationTtl).toBe(2_592_000);
  });

  it("retains a pending receipt across a partial failure and completes on retry", async () => {
    const kv = new MockKvNamespace();
    const dedupeKey = seedEquivalentJoinRecords(kv);
    let failed = false;
    kv.failDelete = (key) => {
      if (!failed && key === dedupeKey) {
        failed = true;
        return true;
      }
      return false;
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const first = await deletePublicFormRecords(protectedFormEnv(kv), "submission", "synthetic-a");
    const pending = JSON.parse(kv.store.get("privacy-deletion:submission:synthetic-a")!);
    kv.store.set("submission:synthetic-c", JSON.stringify({ id: "synthetic-c", whatsapp: "redacted" }));
    const racedReference = {
      recordKey: "submission:synthetic-c",
      dedupeKeys: [dedupeKey],
      createdAt: "2026-08-30T00:01:00.000Z",
    };
    kv.store.set("privacy-dedupe-ref:join:synthetic-c", JSON.stringify(racedReference));
    kv.putOptions.set("privacy-dedupe-ref:join:synthetic-c", { metadata: racedReference });
    kv.store.set(dedupeKey, JSON.stringify({
      recordKey: "submission:synthetic-c",
      createdAt: "2026-08-30T00:01:00.000Z",
    }));
    kv.failDelete = null;
    const retry = await deletePublicFormRecords(protectedFormEnv(kv), "submission", "synthetic-a");
    const complete = JSON.parse(kv.store.get("privacy-deletion:submission:synthetic-a")!);

    expect(first).toEqual({ ok: false, status: 503 });
    expect(pending.state).toBe("pending");
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(retry).toEqual({ ok: true });
    expect(complete).toMatchObject({ state: "complete", kind: "submission" });
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(kv.store.has(dedupeKey)).toBe(false);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(0);
    expect(JSON.stringify(log.mock.calls)).toContain("privacy_deletion_incomplete");
    log.mockRestore();
  });

  it("is idempotent after a completion marker and does not enumerate public data", async () => {
    const kv = new MockKvNamespace();
    seedEquivalentJoinRecords(kv);
    const env = protectedFormEnv(kv);

    await deletePublicFormRecords(env, "submission", "synthetic-a");
    const result = await deletePublicFormRecords(env, "submission", "synthetic-a");

    expect(result).toEqual({ ok: true });
    expect(kv.keys("privacy-deletion:")).toHaveLength(1);
  });

  it("reconciles a target restored after a completion receipt was written", async () => {
    const kv = new MockKvNamespace();
    seedEquivalentJoinRecords(kv);
    const env = protectedFormEnv(kv);

    await deletePublicFormRecords(env, "submission", "synthetic-a");
    seedEquivalentJoinRecords(kv);
    const result = await deletePublicFormRecords(env, "submission", "synthetic-a");

    expect(result).toEqual({ ok: true });
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(0);
    expect(kv.keys("form-dedupe:join:")).toHaveLength(0);
  });

  it("follows the full connected key chain across successive rotations", async () => {
    const kv = new MockKvNamespace();
    const keyV0 = `form-dedupe:join:v0:${"a".repeat(64)}`;
    const keyV1 = `form-dedupe:join:v1:${"b".repeat(64)}`;
    const keyV2 = `form-dedupe:join:v2:${"c".repeat(64)}`;
    const records = [
      { id: "synthetic-v0", dedupeKeys: [keyV0] },
      { id: "synthetic-v1", dedupeKeys: [keyV1, keyV0] },
      { id: "synthetic-v2", dedupeKeys: [keyV2, keyV1] },
    ];
    for (const { id, dedupeKeys } of records) {
      const recordKey = `submission:${id}`;
      const referenceKey = `privacy-dedupe-ref:join:${id}`;
      const reference = {
        recordKey,
        dedupeKeys,
        createdAt: "2026-08-30T00:00:00.000Z",
      };
      kv.store.set(recordKey, JSON.stringify({ id }));
      kv.store.set(referenceKey, JSON.stringify(reference));
      kv.putOptions.set(referenceKey, { metadata: reference });
    }
    for (const [key, id] of [[keyV0, "synthetic-v0"], [keyV1, "synthetic-v1"], [keyV2, "synthetic-v2"]]) {
      kv.store.set(key, JSON.stringify({
        recordKey: `submission:${id}`,
        createdAt: "2026-08-30T00:00:00.000Z",
      }));
    }

    const result = await deletePublicFormRecords(protectedFormEnv(kv), "submission", "synthetic-v2");

    expect(result).toEqual({ ok: true });
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(0);
    expect(kv.keys("form-dedupe:join:")).toHaveLength(0);
  });

  it("keeps the deletion route behind authentication and the admin mutation gate", async () => {
    const kv = new MockKvNamespace();
    seedEquivalentJoinRecords(kv);
    const request = new Request(
      "https://forms.example.invalid/api/admin/privacy/submission/synthetic-a",
      {
        method: "DELETE",
        headers: { "x-admin-secret": "synthetic-test-secret" },
      },
    );
    const data: { adminActor?: string } = {};
    const baseEnv = {
      ...protectedFormEnv(kv),
      ADMIN_BREAK_GLASS_ENABLED: "true",
      ADMIN_SECRET: "synthetic-test-secret",
    };
    const next = vi.fn(() => onRequestDelete(pagesContext(
      onRequestDelete,
      request,
      { ...baseEnv, ADMIN_MUTATIONS_ENABLED: "true" },
      { params: { kind: "submission", id: "synthetic-a" }, data },
    )));

    const unauthenticated = await apiAdminMiddleware(pagesContext(
      apiAdminMiddleware,
      new Request(request.url, { method: "DELETE" }),
      baseEnv,
      { data, next },
    ));
    expect(unauthenticated.status).toBe(401);
    expect(next).not.toHaveBeenCalled();

    const disabled = await apiAdminMiddleware(pagesContext(
      apiAdminMiddleware,
      request,
      baseEnv,
      { data, next },
    ));
    expect(disabled.status).toBe(403);
    expect(next).not.toHaveBeenCalled();

    const enabled = await apiAdminMiddleware(pagesContext(
      apiAdminMiddleware,
      request,
      { ...baseEnv, ADMIN_MUTATIONS_ENABLED: "true" },
      { data, next },
    ));
    expect(enabled.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
    expect(kv.keys("submission:")).toHaveLength(0);
  });
});
