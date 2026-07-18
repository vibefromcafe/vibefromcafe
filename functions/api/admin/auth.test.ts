import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { authenticateAdmin, type AdminAuthEnv } from "./auth";
import { onRequest as apiAdminMiddleware } from "./_middleware";
import { onRequest as adminPageMiddleware } from "../../admin/_middleware";

const ISSUER = "https://team.cloudflareaccess.com";
const AUDIENCE = "admin-application-audience";
const KEY_ID = "test-access-key";
const encoder = new TextEncoder();

let privateKey: CryptoKey;
let attackerPrivateKey: CryptoKey;
let publicJwk: JsonWebKey;

function encodeBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createToken(
  claims: Record<string, unknown> = {},
  signingKey = privateKey,
) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: "RS256", kid: KEY_ID, typ: "JWT" }));
  const encodedPayload = encodeBase64Url(JSON.stringify({
    aud: [AUDIENCE],
    email: "operator@example.com",
    exp: now + 300,
    iat: now,
    iss: ISSUER,
    sub: "test-operator",
    type: "app",
    ...claims,
  }));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function request(token?: string, method = "GET") {
  const headers = token ? { "Cf-Access-Jwt-Assertion": token } : undefined;
  return new Request("https://example.com/api/admin/events", { method, headers });
}

function environment(overrides: AdminAuthEnv = {}): AdminAuthEnv {
  return {
    CF_ACCESS_TEAM_DOMAIN: ISSUER,
    CF_ACCESS_AUDIENCE: AUDIENCE,
    ...overrides,
  };
}

beforeAll(async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const attackerKeyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  privateKey = keyPair.privateKey;
  attackerPrivateKey = attackerKeyPair.privateKey;
  publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function serveJwks() {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    keys: [{ ...publicJwk, alg: "RS256", kid: KEY_ID, use: "sig" }],
  })));
}

describe("Cloudflare Access admin authentication", () => {
  it("rejects a missing token", async () => {
    await expect(authenticateAdmin(request(), environment())).resolves.toEqual({ ok: false, status: 401 });
  });

  it("rejects an arbitrary forged signature", async () => {
    serveJwks();
    await expect(authenticateAdmin(request(await createToken({}, attackerPrivateKey)), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("rejects a malformed token", async () => {
    await expect(authenticateAdmin(request("not-a-jwt"), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it.each([
    ["header", `${encodeBase64Url("null")}.${encodeBase64Url("{}")}.__signature__`],
    ["payload", encodeBase64Url("{}") + "." + encodeBase64Url("null") + ".__signature__"],
  ])("rejects a JSON null %s without throwing", async (_part, token) => {
    await expect(authenticateAdmin(request(token), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("rejects an expired token", async () => {
    serveJwks();
    const token = await createToken({ exp: Math.floor(Date.now() / 1000) - 1 });
    await expect(authenticateAdmin(request(token), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("rejects a token from the wrong issuer", async () => {
    serveJwks();
    const token = await createToken({ iss: "https://other.cloudflareaccess.com" });
    await expect(authenticateAdmin(request(token), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("rejects a token for the wrong audience", async () => {
    serveJwks();
    const token = await createToken({ aud: ["different-application"] });
    await expect(authenticateAdmin(request(token), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("accepts a valid identity token and returns its normalized actor", async () => {
    serveJwks();
    const token = await createToken({ email: "Operator@Example.com" });
    await expect(authenticateAdmin(request(token), environment())).resolves.toEqual({
      ok: true,
      actor: "operator@example.com",
      method: "access",
    });
  });

  it("rejects a valid service token without an identity", async () => {
    serveJwks();
    const token = await createToken({ email: undefined, sub: "", common_name: "service.access" });
    await expect(authenticateAdmin(request(token), environment()))
      .resolves.toEqual({ ok: false, status: 403 });
  });

  it("only permits the shared secret when break-glass mode is explicit", async () => {
    const secretRequest = new Request("http://localhost/api/admin/events", {
      headers: { "X-Admin-Secret": "local-secret" },
    });
    await expect(authenticateAdmin(secretRequest, environment({ ADMIN_SECRET: "local-secret" })))
      .resolves.toEqual({ ok: false, status: 401 });
    await expect(authenticateAdmin(secretRequest, environment({
      ADMIN_SECRET: "local-secret",
      ADMIN_BREAK_GLASS_ENABLED: "true",
    }))).resolves.toEqual({ ok: true, actor: "break-glass", method: "break-glass" });
  });

  it("does not downgrade an empty assertion to enabled break-glass authentication", async () => {
    const emptyAssertionRequest = new Request("http://localhost/api/admin/events", {
      headers: {
        "Cf-Access-Jwt-Assertion": "   ",
        "X-Admin-Secret": "local-secret",
      },
    });
    await expect(authenticateAdmin(emptyAssertionRequest, environment({
      ADMIN_SECRET: "local-secret",
      ADMIN_BREAK_GLASS_ENABLED: "true",
    }))).resolves.toEqual({ ok: false, status: 403 });
  });
});

describe("admin route middleware", () => {
  it.each([
    ["page", adminPageMiddleware, "https://example.com/admin/events"],
    ["api", apiAdminMiddleware, "https://example.com/api/admin/events"],
  ])("protects the %s route tree and passes the verified actor", async (_name, middleware, url) => {
    serveJwks();
    const data: { adminActor?: string } = {};
    const next = vi.fn(async () => new Response("ok"));
    const response = await middleware({
      request: new Request(url, { headers: { "Cf-Access-Jwt-Assertion": await createToken() } }),
      env: environment(),
      params: {},
      data,
      next,
      waitUntil: vi.fn(),
      functionPath: "",
    });

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
    expect(data.adminActor).toBe("operator@example.com");
  });

  it("fails closed for mutations unless they are enabled in the environment", async () => {
    serveJwks();
    const response = await apiAdminMiddleware({
      request: request(await createToken(), "POST"),
      env: environment(),
      params: {},
      data: {},
      next: vi.fn(async () => new Response("unexpected")),
      waitUntil: vi.fn(),
      functionPath: "",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Admin mutations are disabled in this environment",
    });
  });
});
