import { describe, expect, it, vi } from "vitest";
import { PUBLIC_FORM_CONSENT_VERSION } from "../../app/data/public-forms";
import {
  MockAtomicRateLimiter,
  MockKvNamespace,
  dedupeReadBarrier,
  joinPayload,
  jsonRequest,
  pagesContext,
  protectedFormEnv,
  rateLimiterNamespace,
} from "../test-support/public-forms";
import { onRequestPost } from "./join";

function submit(env: Record<string, unknown>, body = joinPayload(), headers: HeadersInit = {}) {
  const request = jsonRequest("/api/join", body, headers);
  return onRequestPost(pagesContext(onRequestPost, request, env));
}

describe("join api", () => {
  it("stores bounded consent data and returns only a generic accepted response", async () => {
    const kv = new MockKvNamespace();
    const env = {
      ...protectedFormEnv(kv),
      WHATSAPP_GROUP_INVITE_URL: "https://invite.example.invalid/private",
    };

    const response = await submit(env);
    const body = await response.json();
    const [recordKey] = kv.keys("submission:");
    const stored = JSON.parse(kv.store.get(recordKey)!) as {
      invitationStatus: string;
      privacyConsentAt?: string;
      privacyConsentVersion?: string;
    };

    expect(response.status).toBe(202);
    expect(body).toEqual({ success: true });
    expect(JSON.stringify(body)).not.toContain("invite");
    expect(stored).toMatchObject({
      invitationStatus: "signed_up",
      privacyConsentVersion: PUBLIC_FORM_CONSENT_VERSION,
    });
    expect(stored.privacyConsentAt).toBeTruthy();
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(1);
    expect(kv.keys("form-dedupe:join:v1:")).toHaveLength(1);
    expect([...kv.store.keys()].join("\n")).not.toContain("2025550100");
  });

  it("returns byte-equivalent responses for a first and duplicate submission", async () => {
    const kv = new MockKvNamespace();
    const env = protectedFormEnv(kv);

    const first = await submit(env);
    const firstText = await first.text();
    const duplicate = await submit(env, joinPayload({ name: "Another Synthetic Name" }));

    expect(duplicate.status).toBe(first.status);
    expect(await duplicate.text()).toBe(firstText);
    expect(kv.keys("submission:")).toHaveLength(1);
  });

  it.each([
    ["unsupported enum", joinPayload({ referralSource: "unsupported" }), 400],
    ["unknown field", joinPayload({ unexpected: true }), 400],
    ["missing consent", joinPayload({ privacyConsent: false }), 400],
    ["invalid phone", joinPayload({ whatsapp: "123" }), 400],
    ["oversized field", joinPayload({ role: "x".repeat(281) }), 400],
    ["irrelevant referral detail", joinPayload({ referralName: "not accepted" }), 400],
    ["non-text verification token", joinPayload({ turnstileToken: 123 }), 400],
    ["whitespace verification token", joinPayload({ turnstileToken: " " }), 400],
    ["null optional detail", joinPayload({ referralName: null }), 400],
  ])("rejects %s before KV writes", async (_name, body, status) => {
    const kv = new MockKvNamespace();
    const response = await submit(protectedFormEnv(kv), body);

    expect(response.status).toBe(status);
    expect(kv.store.size).toBe(0);
  });

  it("requires the exact JSON media type", async () => {
    const kv = new MockKvNamespace();
    const request = new Request("https://forms.example.invalid/api/join", {
      method: "POST",
      headers: { "content-type": "application/jsonp", "cf-connecting-ip": "192.0.2.10" },
      body: JSON.stringify(joinPayload()),
    });
    const response = await onRequestPost(pagesContext(onRequestPost, request, protectedFormEnv(kv)));

    expect(response.status).toBe(415);
    expect(kv.store.size).toBe(0);
  });

  it("fails closed without the external atomic limiter and logs no submitted values", async () => {
    const kv = new MockKvNamespace();
    const payload = joinPayload();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env = protectedFormEnv(kv, { PUBLIC_FORM_RATE_LIMITER: undefined });

    const response = await submit(env, payload);
    const output = JSON.stringify(log.mock.calls);

    expect(response.status).toBe(503);
    expect(kv.store.size).toBe(0);
    expect(output).toContain("atomic_rate_limiter_missing");
    for (const value of Object.values(payload)) {
      if (typeof value === "string" && value) expect(output).not.toContain(value);
    }
    expect(output).not.toContain("192.0.2.10");
    log.mockRestore();
  });

  it("keeps the accepted record deletion-complete when the best-effort marker write fails", async () => {
    const kv = new MockKvNamespace();
    kv.failPut = (key) => key.startsWith("form-dedupe:");
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await submit(protectedFormEnv(kv));

    expect(response.status).toBe(202);
    expect(kv.keys("submission:")).toHaveLength(1);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(1);
    expect(kv.keys("form-dedupe:")).toHaveLength(0);
    expect(JSON.stringify(log.mock.calls)).toBe('[["{\\"event\\":\\"dedupe_marker_write_failed\\",\\"form\\":\\"join\\"}"]]');
    log.mockRestore();
  });

  it("rolls back the reverse reference when the operational record write fails", async () => {
    const kv = new MockKvNamespace();
    kv.failPut = (key) => key.startsWith("submission:");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await submit(protectedFormEnv(kv));
    const output = JSON.stringify(log.mock.calls);

    expect(response.status).toBe(503);
    expect(kv.keys("submission:")).toHaveLength(0);
    expect(kv.keys("privacy-dedupe-ref:")).toHaveLength(0);
    expect(kv.keys("form-dedupe:")).toHaveLength(0);
    expect(output).toContain("operational_record_write_failed");
    expect(output).not.toContain("2025550100");
    log.mockRestore();
  });

  it("documents the KV race with twenty equivalent concurrent generic responses", async () => {
    const requestCount = 20;
    const kv = new MockKvNamespace();
    kv.beforeGet = dedupeReadBarrier(requestCount);
    const limiter = new MockAtomicRateLimiter(100);
    const env = protectedFormEnv(kv, { PUBLIC_FORM_RATE_LIMITER: rateLimiterNamespace(limiter) });

    const responses = await Promise.all(Array.from({ length: requestCount }, (_, index) => {
      const request = jsonRequest("/api/join", joinPayload(), {
        "cf-connecting-ip": `192.0.2.${index + 20}`,
      });
      return onRequestPost(pagesContext(onRequestPost, request, env));
    }));
    const bodies = await Promise.all(responses.map((response) => response.text()));

    expect(new Set(responses.map((response) => response.status))).toEqual(new Set([202]));
    expect(new Set(bodies).size).toBe(1);
    expect(kv.keys("submission:")).toHaveLength(requestCount);
    expect(kv.keys("privacy-dedupe-ref:join:")).toHaveLength(requestCount);
    expect(kv.keys("form-dedupe:join:")).toHaveLength(1);
    expect([...kv.store.keys()].join("\n")).not.toContain("2025550100");
  });
});
