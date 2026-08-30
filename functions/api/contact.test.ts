import { describe, expect, it, vi } from "vitest";
import { PUBLIC_FORM_CONSENT_VERSION } from "../../app/data/public-forms";
import {
  MockAtomicRateLimiter,
  MockKvNamespace,
  contactPayload,
  dedupeReadBarrier,
  jsonRequest,
  pagesContext,
  protectedFormEnv,
  rateLimiterNamespace,
} from "../test-support/public-forms";
import { onRequestPost } from "./contact";

function submit(env: Record<string, unknown>, body: unknown = contactPayload()) {
  const request = jsonRequest("/api/contact", body);
  return onRequestPost(pagesContext(onRequestPost, request, env));
}

describe("contact api", () => {
  it("stores a validated inquiry with consent and returns no record state", async () => {
    const kv = new MockKvNamespace();

    const response = await submit(protectedFormEnv(kv));
    const body = await response.json();
    const [recordKey] = kv.keys("inquiry:");
    const stored = JSON.parse(kv.store.get(recordKey)!) as {
      status: string;
      privacyConsentAt?: string;
      privacyConsentVersion?: string;
    };

    expect(response.status).toBe(202);
    expect(body).toEqual({ success: true });
    expect(stored).toMatchObject({ status: "new", privacyConsentVersion: PUBLIC_FORM_CONSENT_VERSION });
    expect(stored.privacyConsentAt).toBeTruthy();
    expect(kv.keys("privacy-dedupe-ref:contact:")).toHaveLength(1);
    expect(kv.keys("form-dedupe:contact:v1:")).toHaveLength(1);
    expect([...kv.store.keys()].join("\n")).not.toContain("synthetic@example.invalid");
  });

  it("returns an indistinguishable response for a duplicate", async () => {
    const kv = new MockKvNamespace();
    const env = protectedFormEnv(kv);

    const first = await submit(env);
    const firstText = await first.text();
    const duplicate = await submit(env, contactPayload({ name: "Different Synthetic Name" }));

    expect(duplicate.status).toBe(first.status);
    expect(await duplicate.text()).toBe(firstText);
    expect(kv.keys("inquiry:")).toHaveLength(1);
  });

  it("accepts bounded multiline inquiry text", async () => {
    const response = await submit(
      protectedFormEnv(new MockKvNamespace()),
      contactPayload({ message: "Synthetic first line.\nSynthetic second line." }),
    );

    expect(response.status).toBe(202);
  });

  it.each([
    ["missing field", { name: "Synthetic" }],
    ["invalid contact", contactPayload({ contact: "not-a-contact" })],
    ["missing consent", contactPayload({ privacyConsent: "true" })],
    ["unknown field", contactPayload({ extra: "unsupported" })],
    ["oversized message", contactPayload({ message: "x".repeat(2001) })],
    ["oversized verification token", contactPayload({ turnstileToken: "x".repeat(2049) })],
  ])("rejects %s before any KV write", async (_name, body) => {
    const kv = new MockKvNamespace();
    const response = await submit(protectedFormEnv(kv), body);

    expect(response.status).toBe(400);
    expect(kv.store.size).toBe(0);
  });

  it("fails closed when the atomic limiter dependency fails", async () => {
    const kv = new MockKvNamespace();
    const limiter = new MockAtomicRateLimiter();
    limiter.fail = true;
    const env = protectedFormEnv(kv, { PUBLIC_FORM_RATE_LIMITER: rateLimiterNamespace(limiter) });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await submit(env);

    expect(response.status).toBe(503);
    expect(kv.store.size).toBe(0);
    log.mockRestore();
  });

  it("makes twenty concurrent best-effort dedupe outcomes non-enumerating", async () => {
    const requestCount = 20;
    const kv = new MockKvNamespace();
    kv.beforeGet = dedupeReadBarrier(requestCount);
    const limiter = new MockAtomicRateLimiter(100);
    const env = protectedFormEnv(kv, { PUBLIC_FORM_RATE_LIMITER: rateLimiterNamespace(limiter) });

    const responses = await Promise.all(Array.from({ length: requestCount }, (_, index) => {
      const request = jsonRequest("/api/contact", contactPayload(), {
        "cf-connecting-ip": `198.51.100.${index + 20}`,
      });
      return onRequestPost(pagesContext(onRequestPost, request, env));
    }));
    const bodies = await Promise.all(responses.map((response) => response.text()));

    expect(new Set(responses.map((response) => response.status))).toEqual(new Set([202]));
    expect(new Set(bodies).size).toBe(1);
    expect(kv.keys("inquiry:")).toHaveLength(requestCount);
    expect(kv.keys("privacy-dedupe-ref:contact:")).toHaveLength(requestCount);
    expect(kv.keys("form-dedupe:contact:")).toHaveLength(1);
    expect([...kv.store.keys()].join("\n")).not.toContain("synthetic@example.invalid");
  });
});
