export interface AdminAuthEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUDIENCE?: string;
  CF_ACCESS_AUDIENCES?: string;
  ADMIN_SECRET?: string;
  ADMIN_BREAK_GLASS_ENABLED?: string;
  ADMIN_MUTATIONS_ENABLED?: string;
}

export interface AdminAuthData {
  adminActor?: string;
}

type JwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type JwtPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  iss?: unknown;
  nbf?: unknown;
  sub?: unknown;
  type?: unknown;
};

type JsonWebKeyWithKid = JsonWebKey & {
  kid?: string;
};

type Jwks = {
  keys?: JsonWebKeyWithKid[];
};

type CachedJwks = {
  jwks: Jwks;
  expiresAt: number;
  lastUnknownKidRefreshAt: number;
};

export type AdminAuthentication =
  | { ok: true; actor: string; method: "access" | "break-glass" }
  | { ok: false; status: 401 | 403 };

const encoder = new TextEncoder();
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const JWKS_UNKNOWN_KID_REFRESH_INTERVAL_MS = 10 * 1000;
const JWKS_CACHE_MAX_ISSUERS = 4;
const jwksCache = new Map<string, CachedJwks>();

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseJwtPart(value: string): Record<string, unknown> | null {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

function configuredIssuer(env: AdminAuthEnv) {
  const value = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/$/, "");
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "") ||
    !url.hostname.endsWith(".cloudflareaccess.com")
  ) {
    return null;
  }

  return url.origin;
}

function configuredAudiences(env: AdminAuthEnv) {
  const hasSingleAudience = env.CF_ACCESS_AUDIENCE !== undefined;
  const hasAudienceList = env.CF_ACCESS_AUDIENCES !== undefined;
  if (hasSingleAudience === hasAudienceList) return null;

  const singleAudience = env.CF_ACCESS_AUDIENCE?.trim();
  const audienceList = env.CF_ACCESS_AUDIENCES?.trim();

  const audiences = singleAudience
    ? [singleAudience]
    : (audienceList ?? "").split(",").map((audience) => audience.trim());
  if (
    audiences.length === 0 ||
    audiences.length > 20 ||
    audiences.some((audience) => !audience || audience.length > 256)
  ) {
    return null;
  }

  return new Set(audiences);
}

function hasAudience(claim: unknown, expected: Set<string>) {
  if (typeof claim === "string") return expected.has(claim);
  return Array.isArray(claim) && claim.some((value) => typeof value === "string" && expected.has(value));
}

function timingSafeEqual(first: string, second: string) {
  const firstBytes = encoder.encode(first);
  const secondBytes = encoder.encode(second);
  const length = Math.max(firstBytes.length, secondBytes.length);
  let difference = firstBytes.length ^ secondBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (firstBytes[index] ?? 0) ^ (secondBytes[index] ?? 0);
  }

  return difference === 0;
}

async function fetchJwks(issuer: string, lastUnknownKidRefreshAt = 0) {
  try {
    const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
    if (!response.ok) return null;
    const jwks = await response.json() as Jwks;
    if (!Array.isArray(jwks.keys)) return null;

    if (!jwksCache.has(issuer) && jwksCache.size >= JWKS_CACHE_MAX_ISSUERS) {
      const oldestIssuer = jwksCache.keys().next().value;
      if (oldestIssuer) jwksCache.delete(oldestIssuer);
    }
    jwksCache.set(issuer, {
      jwks,
      expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
      lastUnknownKidRefreshAt,
    });
    return jwks;
  } catch {
    return null;
  }
}

async function getJwks(issuer: string, kid: string) {
  const now = Date.now();
  const cached = jwksCache.get(issuer);
  if (!cached || cached.expiresAt <= now) {
    return fetchJwks(issuer);
  }

  if (cached.jwks.keys?.some((key) => key.kid === kid)) {
    return cached.jwks;
  }

  // Refresh once for a new signing key, but rate-limit unknown-kid refreshes so
  // arbitrary tokens cannot turn every request into a JWKS fetch.
  if (now - cached.lastUnknownKidRefreshAt < JWKS_UNKNOWN_KID_REFRESH_INTERVAL_MS) {
    return cached.jwks;
  }
  cached.lastUnknownKidRefreshAt = now;
  return fetchJwks(issuer, now);
}

async function verifyAccessToken(token: string, env: AdminAuthEnv) {
  const issuer = configuredIssuer(env);
  const audiences = configuredAudiences(env);
  if (!issuer || !audiences) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return null;

  let header: JwtHeader | null;
  let payload: JwtPayload | null;
  let signature: Uint8Array;
  try {
    header = parseJwtPart(parts[0]);
    payload = parseJwtPart(parts[1]);
    signature = decodeBase64Url(parts[2]);
  } catch {
    return null;
  }

  if (!header || !payload) return null;
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  if (payload.iss !== issuer || !hasAudience(payload.aud, audiences)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  if (payload.nbf !== undefined && (typeof payload.nbf !== "number" || payload.nbf > now)) return null;

  // Admin access is identity-only. Service tokens do not carry a verified email.
  if (payload.type !== "app" || typeof payload.email !== "string" || !payload.email.trim()) return null;

  const jwks = await getJwks(issuer, header.kid);
  if (!jwks) return null;

  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature as BufferSource,
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    return valid ? payload.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(
  request: Request,
  env: AdminAuthEnv,
): Promise<AdminAuthentication> {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion !== null) {
    const token = assertion.trim();
    if (!token) return { ok: false, status: 403 };
    const actor = await verifyAccessToken(token, env);
    return actor
      ? { ok: true, actor, method: "access" }
      : { ok: false, status: 403 };
  }

  const configuredSecret = env.ADMIN_SECRET?.trim();
  const providedSecret = request.headers.get("X-Admin-Secret")?.trim();
  if (
    env.ADMIN_BREAK_GLASS_ENABLED === "true" &&
    configuredSecret &&
    providedSecret &&
    timingSafeEqual(configuredSecret, providedSecret)
  ) {
    return { ok: true, actor: "break-glass", method: "break-glass" };
  }

  return { ok: false, status: 401 };
}

export function adminUnauthorized(status: 401 | 403) {
  return Response.json(
    { error: status === 401 ? "Admin authentication required" : "Invalid admin authentication" },
    { status },
  );
}
