import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./contact";

class MockKvNamespace {
  private readonly store = new Map<string, string>();
  failGet = false;
  failPutPrefixes = new Set<string>();

  async get<T>(key: string, type?: "json") {
    if (this.failGet) throw new Error("KV unavailable");
    const value = this.store.get(key);
    if (!value) return null;
    return type === "json" ? JSON.parse(value) as T : value as T;
  }

  async put(key: string, value: string) {
    if ([...this.failPutPrefixes].some((prefix) => key.startsWith(prefix))) {
      throw new Error("KV unavailable");
    }
    this.store.set(key, value);
  }

  entries() {
    return [...this.store.entries()];
  }
}

const validInquiry = {
  name: "Project Lead",
  contact: "lead@example.com",
  message: "We need an AI support workflow.",
  privacyConsent: true,
};

function createContext({ request, env }: { request: Request; env: Record<string, unknown> }) {
  return {
    request,
    env,
    params: {},
    data: {},
    next: vi.fn(),
    waitUntil: vi.fn(),
    functionPath: "/api/contact",
  } as unknown as Parameters<typeof onRequestPost>[0];
}

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.100",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function inquiryEntries(kv: MockKvNamespace) {
  return kv.entries().filter(([key]) => key.startsWith("inquiry:"));
}

describe("contact api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores project inquiries under the inquiry prefix", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    const body = (await response.json()) as { success: boolean; inquiry: { id: string; status: string } };
    const [[key, storedValue]] = inquiryEntries(kv);
    const stored = JSON.parse(storedValue) as {
      id: string;
      status: string;
      message: string;
      privacyConsentAt?: string;
      privacyConsentVersion?: string;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.inquiry.status).toBe("new");
    expect(key).toBe(`inquiry:${stored.id}`);
    expect(stored.message).toBe("We need an AI support workflow.");
    expect(stored.privacyConsentVersion).toBe("2026-07");
    expect(typeof stored.privacyConsentAt).toBe("string");
  });

  it("rejects missing required fields", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: createRequest({ name: "Project Lead", privacyConsent: true }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(400);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("rejects invalid JSON without writing an inquiry", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: createRequest("{bad json"),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(400);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("rejects non-json content without writing an inquiry", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/contact", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: JSON.stringify(validInquiry),
        }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(415);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("rejects oversized bodies without writing an inquiry", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, message: "x".repeat(9000) }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(413);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("rejects invalid schema values without writing an inquiry", async () => {
    const cases = [
      { ...validInquiry, name: "" },
      { ...validInquiry, name: "x".repeat(101) },
      { ...validInquiry, contact: "not-contactable" },
      { ...validInquiry, message: "x".repeat(2001) },
      { ...validInquiry, privacyConsent: false },
    ];

    for (const [index, body] of cases.entries()) {
      const kv = new MockKvNamespace();
      const response = await onRequestPost(
        createContext({
          request: createRequest(body, { "cf-connecting-ip": `203.0.113.${index + 120}` }),
          env: { VFC_SUBMISSIONS: kv },
        }),
      );

      expect(response.status).toBe(400);
      expect(inquiryEntries(kv)).toHaveLength(0);
    }
  });

  it("rate limits bursts before writing an inquiry", async () => {
    const kv = new MockKvNamespace();

    for (let index = 0; index < 5; index += 1) {
      const response = await onRequestPost(
        createContext({
          request: createRequest({ ...validInquiry, message: `Inquiry ${index}` }),
          env: { VFC_SUBMISSIONS: kv },
        }),
      );
      expect(response.status).toBe(200);
    }

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, message: "Inquiry 6" }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(429);
    expect(inquiryEntries(kv)).toHaveLength(5);
  });

  it("fails closed when rate limit storage is unavailable", async () => {
    const kv = new MockKvNamespace();
    kv.failGet = true;

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(503);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("returns a generic temporary error when the inquiry write fails", async () => {
    const kv = new MockKvNamespace();
    kv.failPutPrefixes.add("inquiry:");

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Submissions are temporarily unavailable. Please try again soon.");
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("dedupes repeated contact and message while allowing a different message", async () => {
    const kv = new MockKvNamespace();

    const first = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const duplicate = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, name: "Different Name" }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const differentMessage = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, message: "We need a different AI workflow." }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const duplicateBody = (await duplicate.json()) as { duplicate?: boolean };

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(duplicateBody.duplicate).toBe(true);
    expect(differentMessage.status).toBe(200);
    expect(inquiryEntries(kv)).toHaveLength(2);
  });

  it("still succeeds when duplicate marker storage fails after the inquiry write", async () => {
    const kv = new MockKvNamespace();
    kv.failPutPrefixes.add("inquiry_dedupe:");

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(200);
    expect(inquiryEntries(kv)).toHaveLength(1);
  });

  it("allows no-token inquiries when Turnstile secret is missing", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(200);
    expect(inquiryEntries(kv)).toHaveLength(1);
  });

  it("requires a Turnstile token when the secret is configured", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validInquiry),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(400);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("rejects failed Turnstile verification before writing an inquiry", async () => {
    const kv = new MockKvNamespace();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, turnstileToken: "bad-token" }),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(400);
    expect(inquiryEntries(kv)).toHaveLength(0);
  });

  it("allows inquiries after successful Turnstile verification", async () => {
    const kv = new MockKvNamespace();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validInquiry, turnstileToken: "good-token" }),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(inquiryEntries(kv)).toHaveLength(1);
  });
});
