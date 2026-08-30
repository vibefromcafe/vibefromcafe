import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLIC_FORM_BODY_LIMIT_BYTES,
  createDedupePlan,
  enforceAtomicRateLimit,
  getPublicFormRuntimeConfig,
  readLimitedJson,
  verifyTurnstile,
  writeProtectedRecord,
} from "./form-protection";
import {
  MockAtomicRateLimiter,
  MockKvNamespace,
  protectedFormEnv,
  rateLimiterNamespace,
} from "../test-support/public-forms";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bounded public-form ingestion", () => {
  it("stops consuming a chunked body as soon as the byte bound is crossed", async () => {
    let pulls = 0;
    let cancelled = false;
    const chunks = [
      new Uint8Array(PUBLIC_FORM_BODY_LIMIT_BYTES / 2),
      new Uint8Array(PUBLIC_FORM_BODY_LIMIT_BYTES / 2 + 1),
      new Uint8Array(PUBLIC_FORM_BODY_LIMIT_BYTES),
    ];
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[pulls];
        pulls += 1;
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("https://forms.example.invalid/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const result = await readLimitedJson(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(chunks.length + 1);
  });

  it("rejects a declared oversized body before reading its stream", async () => {
    let readerRequested = false;
    const request = {
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
        "content-length": String(PUBLIC_FORM_BODY_LIMIT_BYTES + 1),
      }),
      body: {
        getReader() {
          readerRequested = true;
          throw new Error("body reader should not be requested");
        },
      },
    } as unknown as Request;

    const result = await readLimitedJson(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
    expect(readerRequested).toBe(false);
  });
});

describe("privacy-safe keyed protection", () => {
  it("derives versioned current/previous HMAC keys without source material", async () => {
    const kv = new MockKvNamespace();
    const env = protectedFormEnv(kv, {
      PUBLIC_FORM_DEDUPE_PREVIOUS_KEY: "p".repeat(32),
      PUBLIC_FORM_DEDUPE_PREVIOUS_KEY_VERSION: "v0",
    });

    const result = await createDedupePlan(env, "contact", ["synthetic@example.invalid", "synthetic body"]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lookupKeys).toHaveLength(2);
    expect(result.value.writeKey).toMatch(/^form-dedupe:contact:v1:[a-f0-9]{64}$/);
    expect(result.value.lookupKeys[1]).toMatch(/^form-dedupe:contact:v0:[a-f0-9]{64}$/);
    expect(result.value.lookupKeys.join("\n")).not.toContain("synthetic");
    expect(result.value.lookupKeys.join("\n")).not.toContain("example.invalid");

    const response = await writeProtectedRecord(
      env,
      "contact",
      "inquiry:synthetic-rotation",
      { id: "synthetic-rotation" },
      result.value,
      "2026-08-30T00:00:00.000Z",
    );
    const referenceKey = "privacy-dedupe-ref:contact:synthetic-rotation";
    const reference = JSON.parse(kv.store.get(referenceKey)!) as { dedupeKeys: string[] };

    expect(response.status).toBe(202);
    expect(reference.dedupeKeys).toEqual(result.value.lookupKeys);
    expect(kv.putOptions.get(referenceKey)?.metadata).toEqual(reference);
  });

  it.each(["join", "contact"] as const)("throttles a 100-request %s burst at the atomic dependency limit", async (form) => {
    const limiter = new MockAtomicRateLimiter(5);
    const env = protectedFormEnv(new MockKvNamespace(), {
      PUBLIC_FORM_RATE_LIMITER: rateLimiterNamespace(limiter),
    });

    const results = await Promise.all(Array.from({ length: 100 }, () => {
      const request = new Request("https://forms.example.invalid/api/test", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      });
      return enforceAtomicRateLimit(env, request, form);
    }));
    const statuses = await Promise.all(results.map(async (result) => (
      result.ok ? 200 : result.response.status
    )));

    expect(statuses.filter((status) => status === 200)).toHaveLength(5);
    expect(statuses.filter((status) => status === 429)).toHaveLength(95);
    expect(limiter.requestedKeys).toHaveLength(100);
    expect(limiter.requestedKeys.join("\n")).not.toContain("203.0.113.10");
  });
});

describe("runtime Turnstile parity", () => {
  it("uses one runtime source and rejects one-sided configuration", () => {
    const ready = getPublicFormRuntimeConfig(protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SITE_KEY: "public-test-key",
      TURNSTILE_SECRET_KEY: "private-test-key",
    }));
    const invalid = getPublicFormRuntimeConfig(protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SECRET_KEY: "private-test-key",
    }));

    expect(ready.ok).toBe(true);
    if (ready.ok) expect(ready.value.turnstileSiteKey).toBe("public-test-key");
    expect(invalid.ok).toBe(false);
  });

  it("requires the expected action and request hostname", async () => {
    const env = protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SITE_KEY: "public-test-key",
      TURNSTILE_SECRET_KEY: "private-test-key",
    });
    const request = new Request("https://forms.example.invalid/api/join", {
      headers: { "cf-connecting-ip": "192.0.2.10" },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, action: "contact", hostname: "forms.example.invalid" }))
      .mockResolvedValueOnce(Response.json({ success: true, action: "join", hostname: "wrong.example.invalid" }))
      .mockResolvedValueOnce(Response.json({ success: true, action: "join", hostname: "forms.example.invalid" }));
    vi.stubGlobal("fetch", fetchMock);

    const wrongAction = await verifyTurnstile(env, request, { turnstileToken: "synthetic-token" }, "join");
    const wrongHost = await verifyTurnstile(env, request, { turnstileToken: "synthetic-token" }, "join");
    const valid = await verifyTurnstile(env, request, { turnstileToken: "synthetic-token" }, "join");

    expect(wrongAction.ok).toBe(false);
    expect(wrongHost.ok).toBe(false);
    expect(valid.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const requestBody = fetchMock.mock.calls[0][1]?.body;
    expect(requestBody).toBeInstanceOf(FormData);
  });

  it("fails generically when a configured token is missing", async () => {
    const env = protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SITE_KEY: "public-test-key",
      TURNSTILE_SECRET_KEY: "private-test-key",
    });
    const request = new Request("https://forms.example.invalid/api/contact");

    const result = await verifyTurnstile(env, request, {}, "contact");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect(await result.response.json()).toEqual({ error: "Verification failed. Please try again." });
    }
  });
});
