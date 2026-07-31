import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./join";

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

const validSubmission = {
  name: "Immediate Invite",
  city: "Jogja",
  role: "Developer",
  whatsapp: "0812-3456-789",
  referralSource: "instagram",
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
    functionPath: "/api/join",
  } as unknown as Parameters<typeof onRequestPost>[0];
}

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/join", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function submissionEntries(kv: MockKvNamespace) {
  return kv.entries().filter(([key]) => key.startsWith("submission:"));
}

describe("join api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores successful submissions as invited when WhatsApp invite URL exists", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: {
          VFC_SUBMISSIONS: kv,
          WHATSAPP_GROUP_INVITE_URL: "https://chat.whatsapp.com/vcfc-group",
          WHATSAPP_INVITE_MESSAGE_TEMPLATE: "Hi {{name}}, join {{group_link}}",
        },
      }),
    );

    const body = (await response.json()) as {
      success: boolean;
      submission: { id: string; invitationStatus: string };
      whatsappInvite: { groupInviteUrl: string };
    };
    const [[key, storedValue]] = submissionEntries(kv);
    const stored = JSON.parse(storedValue) as {
      id: string;
      invitationStatus: string;
      invited_at?: string;
      privacyConsentAt?: string;
      privacyConsentVersion?: string;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.submission).toEqual({ id: stored.id, invitationStatus: "invited" });
    expect(body.whatsappInvite.groupInviteUrl).toBe("https://chat.whatsapp.com/vcfc-group");
    expect(key).toBe(`submission:${stored.id}`);
    expect(stored.invitationStatus).toBe("invited");
    expect(stored.invited_at).toBeTruthy();
    expect(stored).toMatchObject({
      name: "Immediate Invite",
      privacyConsentVersion: "2026-07",
    });
    expect(typeof stored.privacyConsentAt).toBe("string");
  });

  it("keeps submissions signed_up when WhatsApp invite URL is missing", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, name: "Missing Invite URL" }),
        env: {
          VFC_SUBMISSIONS: kv,
          WHATSAPP_GROUP_INVITE_URL: "",
        },
      }),
    );

    const body = (await response.json()) as { submission: { invitationStatus: string } };
    const [[, storedValue]] = submissionEntries(kv);
    const stored = JSON.parse(storedValue) as { invitationStatus: string; invited_at?: string };

    expect(response.status).toBe(200);
    expect(body.submission.invitationStatus).toBe("signed_up");
    expect(stored.invitationStatus).toBe("signed_up");
    expect(stored.invited_at).toBeUndefined();
  });

  it("rejects invalid JSON without writing a submission", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: createRequest("{bad json"),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(400);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("rejects non-json content without writing a submission", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/join", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: JSON.stringify(validSubmission),
        }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(415);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("rejects oversized bodies without writing a submission", async () => {
    const kv = new MockKvNamespace();
    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, role: "x".repeat(9000) }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(413);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("rejects invalid schema values without writing a submission", async () => {
    const cases = [
      { ...validSubmission, name: "" },
      { ...validSubmission, name: "x".repeat(101) },
      { ...validSubmission, referralSource: "linkedin" },
      { ...validSubmission, whatsapp: "abc" },
      { ...validSubmission, privacyConsent: false },
    ];

    for (const [index, body] of cases.entries()) {
      const kv = new MockKvNamespace();
      const response = await onRequestPost(
        createContext({
          request: createRequest(body, { "cf-connecting-ip": `203.0.113.${index + 20}` }),
          env: { VFC_SUBMISSIONS: kv },
        }),
      );

      expect(response.status).toBe(400);
      expect(submissionEntries(kv)).toHaveLength(0);
    }
  });

  it("rate limits bursts before writing a submission", async () => {
    const kv = new MockKvNamespace();

    for (let index = 0; index < 5; index += 1) {
      const response = await onRequestPost(
        createContext({
          request: createRequest({ ...validSubmission, whatsapp: `0812-3456-78${index}` }),
          env: { VFC_SUBMISSIONS: kv },
        }),
      );
      expect(response.status).toBe(200);
    }

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, whatsapp: "0812-3456-799" }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(429);
    expect(submissionEntries(kv)).toHaveLength(5);
  });

  it("fails closed when rate limit storage is unavailable", async () => {
    const kv = new MockKvNamespace();
    kv.failGet = true;

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(503);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("returns a generic temporary error when the submission write fails", async () => {
    const kv = new MockKvNamespace();
    kv.failPutPrefixes.add("submission:");

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Submissions are temporarily unavailable. Please try again soon.");
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("returns duplicate success without creating another submission for the same WhatsApp number", async () => {
    const kv = new MockKvNamespace();

    const first = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const second = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, name: "Same Phone", whatsapp: "08123456789" }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );
    const body = (await second.json()) as { duplicate?: boolean };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(submissionEntries(kv)).toHaveLength(1);
  });

  it("still succeeds when duplicate marker storage fails after the submission write", async () => {
    const kv = new MockKvNamespace();
    kv.failPutPrefixes.add("submission_dedupe:");

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(200);
    expect(submissionEntries(kv)).toHaveLength(1);
  });

  it("allows no-token submissions when Turnstile secret is missing", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    expect(response.status).toBe(200);
    expect(submissionEntries(kv)).toHaveLength(1);
  });

  it("requires a Turnstile token when the secret is configured", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: createRequest(validSubmission),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(400);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("rejects failed Turnstile verification before writing a submission", async () => {
    const kv = new MockKvNamespace();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, turnstileToken: "bad-token" }),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(400);
    expect(submissionEntries(kv)).toHaveLength(0);
  });

  it("allows submissions after successful Turnstile verification", async () => {
    const kv = new MockKvNamespace();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));

    const response = await onRequestPost(
      createContext({
        request: createRequest({ ...validSubmission, turnstileToken: "good-token" }),
        env: { VFC_SUBMISSIONS: kv, TURNSTILE_SECRET_KEY: "secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(submissionEntries(kv)).toHaveLength(1);
  });
});
