export interface FormProtectionEnv {
  VFC_SUBMISSIONS: KVNamespace;
  TURNSTILE_SECRET_KEY?: string;
}

type JsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

type GuardResult =
  | { ok: true }
  | { ok: false; response: Response };

type DuplicateMarker = {
  id: string;
  status: string;
  createdAt: string;
};

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TOKEN_MAX_LENGTH = 2048;

export const PUBLIC_FORM_BODY_LIMIT_BYTES = 8 * 1024;
export const PUBLIC_FORM_RATE_LIMIT = 5;
export const PUBLIC_FORM_RATE_WINDOW_SECONDS = 60;
export const PUBLIC_FORM_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 30;

export function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function readLimitedJson(request: Request, maxBytes = PUBLIC_FORM_BODY_LIMIT_BYTES): Promise<JsonResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return { ok: false, response: jsonError("Content-Type must be application/json", 415) };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, response: jsonError("Request body is too large", 413) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: jsonError("Request body is too large", 413) };
  }

  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, response: jsonError("Request body must be a JSON object") };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON") };
  }
}

export function requiredString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  label = field,
): string | Response {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    return jsonError(`${label} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return jsonError(`${label} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  label = field,
): string | Response | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return jsonError(`${label} must be text`);
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxLength) {
    return jsonError(`${label} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

export function requiredConsent(body: Record<string, unknown>) {
  return body.privacyConsent === true ? undefined : jsonError("Privacy consent is required");
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeLooseText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[+\d][\d\s().-]+$/.test(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim() || forwardedFor || "unknown";
}

export async function enforceRateLimit(
  env: FormProtectionEnv,
  request: Request,
  keyPrefix: string,
  limit = PUBLIC_FORM_RATE_LIMIT,
): Promise<GuardResult> {
  const bucket = Math.floor(Date.now() / (PUBLIC_FORM_RATE_WINDOW_SECONDS * 1000));
  const clientIp = getClientIp(request);
  const key = `rate:${keyPrefix}:${clientIp}:${bucket}`;

  try {
    const current = Number(await env.VFC_SUBMISSIONS.get(key)) || 0;
    if (current >= limit) {
      return { ok: false, response: jsonError("Too many submissions. Please try again soon.", 429) };
    }

    await env.VFC_SUBMISSIONS.put(key, String(current + 1), {
      expirationTtl: PUBLIC_FORM_RATE_WINDOW_SECONDS * 2,
    });
  } catch {
    return { ok: false, response: jsonError("Submissions are temporarily unavailable. Please try again soon.", 503) };
  }

  return { ok: true };
}

export async function verifyTurnstileIfConfigured(
  env: FormProtectionEnv,
  request: Request,
  body: Record<string, unknown>,
): Promise<GuardResult> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }

  const rawToken = body.turnstileToken ?? body["cf-turnstile-response"];
  if (typeof rawToken !== "string" || !rawToken.trim()) {
    return { ok: false, response: jsonError("Verification failed. Please try again.") };
  }

  const token = rawToken.trim();
  if (token.length > TURNSTILE_TOKEN_MAX_LENGTH) {
    return { ok: false, response: jsonError("Verification failed. Please try again.") };
  }

  let response: Response;
  try {
    response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: getClientIp(request),
        idempotency_key: crypto.randomUUID(),
      }),
    });
  } catch {
    return { ok: false, response: jsonError("Submissions are temporarily unavailable. Please try again soon.", 503) };
  }

  const result = await response.json().catch(() => null) as { success?: boolean } | null;
  if (!response.ok || !result?.success) {
    return { ok: false, response: jsonError("Verification failed. Please try again.") };
  }

  return { ok: true };
}

export async function hashFormFingerprint(parts: string[]) {
  const normalized = parts.map(normalizeLooseText).join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readDuplicateMarker(env: FormProtectionEnv, key: string) {
  try {
    return await env.VFC_SUBMISSIONS.get<DuplicateMarker>(key, "json");
  } catch {
    return null;
  }
}

export async function writeDuplicateMarker(env: FormProtectionEnv, key: string, marker: DuplicateMarker) {
  try {
    await env.VFC_SUBMISSIONS.put(key, JSON.stringify(marker), {
      expirationTtl: PUBLIC_FORM_DEDUPE_TTL_SECONDS,
    });
  } catch {
    // Duplicate protection is best-effort after the operational record succeeds.
  }
}
