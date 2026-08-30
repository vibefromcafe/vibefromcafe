import type { FormProtectionEnv } from "../api/form-protection";

type KvPutOptions = {
  expiration?: number;
  expirationTtl?: number;
  metadata?: unknown;
};

export class MockKvNamespace {
  readonly store = new Map<string, string>();
  readonly putOptions = new Map<string, KvPutOptions | undefined>();
  failPut: ((key: string) => boolean) | null = null;
  failDelete: ((key: string) => boolean) | null = null;
  beforeGet: ((key: string) => Promise<void>) | null = null;

  async get<T>(key: string, type?: "json" | "text") {
    if (this.beforeGet) await this.beforeGet(key);
    const value = this.store.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) as T : value as T;
  }

  async put(key: string, value: string, options?: KvPutOptions) {
    if (this.failPut?.(key)) throw new Error("injected KV put failure");
    this.store.set(key, value);
    this.putOptions.set(key, options);
  }

  async delete(key: string) {
    if (this.failDelete?.(key)) throw new Error("injected KV delete failure");
    this.store.delete(key);
    this.putOptions.delete(key);
  }

  async list({ prefix = "", limit = 1000 }: { prefix?: string; limit?: number; cursor?: string } = {}) {
    const keys = [...this.store.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .slice(0, limit)
      .map((name) => ({ name, metadata: this.putOptions.get(name)?.metadata }));
    return { keys, list_complete: true };
  }

  keys(prefix = "") {
    return [...this.store.keys()].filter((key) => key.startsWith(prefix));
  }
}

export class MockAtomicRateLimiter {
  readonly counts = new Map<string, number>();
  readonly requestedKeys: string[] = [];
  fail = false;

  constructor(readonly limit = 5) {}

  async fetch(_input: RequestInfo | URL, init?: RequestInit) {
    if (this.fail) throw new Error("injected rate limiter failure");
    const body = JSON.parse(String(init?.body)) as { key: string; policy: string };
    this.requestedKeys.push(body.key);
    if (body.policy !== "public-form-v1") return Response.json({ error: "policy" }, { status: 400 });
    const current = this.counts.get(body.key) ?? 0;
    if (current >= this.limit) return Response.json({ allowed: false });
    this.counts.set(body.key, current + 1);
    return Response.json({ allowed: true });
  }
}

export function rateLimiterNamespace(limiter = new MockAtomicRateLimiter()) {
  return {
    idFromName: () => ({}),
    get: () => ({ fetch: limiter.fetch.bind(limiter) }),
  } as unknown as DurableObjectNamespace;
}

export function protectedFormEnv(
  kv = new MockKvNamespace(),
  overrides: Partial<FormProtectionEnv> = {},
) {
  return {
    VFC_SUBMISSIONS: kv as unknown as KVNamespace,
    PUBLIC_FORM_RATE_LIMITER: rateLimiterNamespace(new MockAtomicRateLimiter(100)),
    PUBLIC_FORM_DEDUPE_KEY: "k".repeat(32),
    PUBLIC_FORM_DEDUPE_KEY_VERSION: "v1",
    PRIVACY_REQUEST_URL: "https://privacy.example.invalid/request",
    ...overrides,
  } satisfies FormProtectionEnv;
}

export function jsonRequest(path: string, body: unknown, headers: HeadersInit = {}) {
  return new Request(`https://forms.example.invalid${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "192.0.2.10",
      ...Object.fromEntries(new Headers(headers)),
    },
    body: JSON.stringify(body),
  });
}

export function pagesContext<Handler extends (context: never) => unknown>(
  handler: Handler,
  request: Request,
  env: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  return {
    request,
    env,
    params: {},
    data: {},
    next: () => Promise.resolve(new Response()),
    waitUntil: () => undefined,
    functionPath: new URL(request.url).pathname,
    ...overrides,
  } as unknown as Parameters<Handler>[0];
}

export function joinPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Synthetic Person",
    city: "Test City",
    role: "Test Role",
    whatsapp: "+1 202 555 0100",
    referralSource: "github",
    privacyConsent: true,
    turnstileToken: "",
    ...overrides,
  };
}

export function contactPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Synthetic Person",
    contact: "synthetic@example.invalid",
    message: "Synthetic project inquiry.",
    privacyConsent: true,
    turnstileToken: "",
    ...overrides,
  };
}

export function dedupeReadBarrier(expectedReads: number) {
  let reads = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async (key: string) => {
    if (!key.startsWith("form-dedupe:")) return;
    reads += 1;
    if (reads === expectedReads) release();
    await released;
  };
}
