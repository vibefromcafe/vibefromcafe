export type PublicFormName = "join" | "contact";

export interface FormProtectionEnv {
  VFC_SUBMISSIONS: KVNamespace;
  PUBLIC_FORM_RATE_LIMITER?: DurableObjectNamespace;
  PUBLIC_FORM_DEDUPE_KEY?: string;
  PUBLIC_FORM_DEDUPE_KEY_VERSION?: string;
  PUBLIC_FORM_DEDUPE_PREVIOUS_KEY?: string;
  PUBLIC_FORM_DEDUPE_PREVIOUS_KEY_VERSION?: string;
  PRIVACY_REQUEST_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
}

type JsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

type GuardResult =
  | { ok: true }
  | { ok: false; response: Response };

type ValueResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

type DedupeKeyMaterial = {
  version: string;
  secret: string;
};

export type DedupePlan = {
  lookupKeys: string[];
  writeKey: string;
};

type DedupeMarker = {
  recordKey: string;
  createdAt: string;
};

type DedupeReference = {
  recordKey: string;
  dedupeKeys: string[];
  createdAt: string;
};

export type PublicFormRuntimeConfig = {
  privacyRequestUrl: string;
  turnstileSiteKey: string | null;
};

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
const DEDUPE_KEY_VERSION_PATTERN = /^[a-z0-9_-]{1,24}$/i;
const encoder = new TextEncoder();

export const PUBLIC_FORM_BODY_LIMIT_BYTES = 8 * 1024;
export const PUBLIC_FORM_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 30;
export const PUBLIC_FORM_DELETION_RECEIPT_TTL_SECONDS = 60 * 60 * 24 * 30;

export function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export function temporaryUnavailable() {
  return jsonError("Submissions are temporarily unavailable. Please try again soon.", 503);
}

export function acceptedPublicFormResponse() {
  return Response.json(
    { success: true },
    { status: 202, headers: { "cache-control": "no-store" } },
  );
}

export function logPublicFormEvent(
  level: "warn" | "error",
  event: string,
  form: PublicFormName | "privacy",
) {
  console[level](JSON.stringify({ event, form }));
}

export async function readLimitedJson(
  request: Request,
  maxBytes = PUBLIC_FORM_BODY_LIMIT_BYTES,
): Promise<JsonResult> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, response: jsonError("Content-Type must be application/json", 415) };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength.trim())) {
      return { ok: false, response: jsonError("Content-Length must be a valid byte count") };
    }
    if (Number(contentLength) > maxBytes) {
      return { ok: false, response: jsonError("Request body is too large", 413) };
    }
  }

  if (!request.body) {
    return { ok: false, response: jsonError("Invalid JSON") };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("request body limit exceeded").catch(() => undefined);
        return { ok: false, response: jsonError("Request body is too large", 413) };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel("request body read failed").catch(() => undefined);
    return { ok: false, response: jsonError("Invalid request body") };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, response: jsonError("Invalid JSON") };
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

export function rejectUnknownFields(body: Record<string, unknown>, allowedFields: readonly string[]) {
  const allowed = new Set(allowedFields);
  return Object.keys(body).some((field) => !allowed.has(field))
    ? jsonError("Request body contains unsupported fields")
    : undefined;
}

export function requiredString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  label = field,
  multiline = false,
): string | Response {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    return jsonError(`${label} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return jsonError(`${label} must be ${maxLength} characters or fewer`);
  }
  const unsupportedControlCharacters = multiline
    ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/
    : /\p{Cc}/u;
  if (unsupportedControlCharacters.test(normalized)) {
    return jsonError(`${label} contains unsupported characters`);
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
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return jsonError(`${label} must be text`);
  }

  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    return jsonError(`${label} must be ${maxLength} characters or fewer`);
  }
  if (/\p{Cc}/u.test(normalized)) {
    return jsonError(`${label} contains unsupported characters`);
  }

  return normalized;
}

export function requiredConsent(body: Record<string, unknown>) {
  return body.privacyConsent === true ? undefined : jsonError("Privacy consent is required");
}

export function validateTurnstileTokenField(body: Record<string, unknown>) {
  const token = body.turnstileToken;
  if (token === undefined || token === "") return undefined;
  return (
    typeof token === "string" &&
    token === token.trim() &&
    token.length > 0 &&
    token.length <= TURNSTILE_TOKEN_MAX_LENGTH
  )
    ? undefined
    : jsonError("Verification token is invalid");
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
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDedupeKeyMaterials(env: FormProtectionEnv): ValueResult<DedupeKeyMaterial[]> {
  const currentSecret = env.PUBLIC_FORM_DEDUPE_KEY?.trim() ?? "";
  const currentVersion = env.PUBLIC_FORM_DEDUPE_KEY_VERSION?.trim() ?? "";
  const previousSecret = env.PUBLIC_FORM_DEDUPE_PREVIOUS_KEY?.trim() ?? "";
  const previousVersion = env.PUBLIC_FORM_DEDUPE_PREVIOUS_KEY_VERSION?.trim() ?? "";

  if (
    !currentSecret ||
    encoder.encode(currentSecret).byteLength < 32 ||
    !DEDUPE_KEY_VERSION_PATTERN.test(currentVersion)
  ) {
    return { ok: false, response: temporaryUnavailable() };
  }

  if (Boolean(previousSecret) !== Boolean(previousVersion)) {
    return { ok: false, response: temporaryUnavailable() };
  }
  if (previousSecret && (
    encoder.encode(previousSecret).byteLength < 32 ||
    !DEDUPE_KEY_VERSION_PATTERN.test(previousVersion) ||
    previousVersion === currentVersion
  )) {
    return { ok: false, response: temporaryUnavailable() };
  }

  return {
    ok: true,
    value: [
      { version: currentVersion, secret: currentSecret },
      ...(previousSecret ? [{ version: previousVersion, secret: previousSecret }] : []),
    ],
  };
}

export function getDedupeConfigurationStatus(env: FormProtectionEnv) {
  const hasAny = Boolean(
    env.PUBLIC_FORM_DEDUPE_KEY ||
    env.PUBLIC_FORM_DEDUPE_KEY_VERSION ||
    env.PUBLIC_FORM_DEDUPE_PREVIOUS_KEY ||
    env.PUBLIC_FORM_DEDUPE_PREVIOUS_KEY_VERSION,
  );
  if (!hasAny) return "missing" as const;
  return getDedupeKeyMaterials(env).ok ? "ready" as const : "invalid" as const;
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createDedupePlan(
  env: FormProtectionEnv,
  form: PublicFormName,
  fingerprintParts: string[],
): Promise<ValueResult<DedupePlan>> {
  const materials = getDedupeKeyMaterials(env);
  if (!materials.ok) return materials;

  const fingerprint = JSON.stringify(fingerprintParts.map(normalizeLooseText));
  const keys = await Promise.all(materials.value.map(async ({ version, secret }) => (
    `form-dedupe:${form}:${version}:${await hmacHex(secret, fingerprint)}`
  )));
  return { ok: true, value: { lookupKeys: keys, writeKey: keys[0] } };
}

export function hasAtomicRateLimiterBinding(env: FormProtectionEnv) {
  return Boolean(
    env.PUBLIC_FORM_RATE_LIMITER &&
    typeof env.PUBLIC_FORM_RATE_LIMITER.idFromName === "function" &&
    typeof env.PUBLIC_FORM_RATE_LIMITER.get === "function",
  );
}

export async function enforceAtomicRateLimit(
  env: FormProtectionEnv,
  request: Request,
  form: PublicFormName,
): Promise<GuardResult> {
  if (!hasAtomicRateLimiterBinding(env)) {
    logPublicFormEvent("error", "atomic_rate_limiter_missing", form);
    return { ok: false, response: temporaryUnavailable() };
  }

  const clientIp = request.headers.get("cf-connecting-ip")?.trim();
  const materials = getDedupeKeyMaterials(env);
  if (!clientIp || !materials.ok) {
    logPublicFormEvent("error", "rate_limit_key_unavailable", form);
    return { ok: false, response: temporaryUnavailable() };
  }

  try {
    const clientKey = await hmacHex(materials.value[0].secret, clientIp);
    const namespace = env.PUBLIC_FORM_RATE_LIMITER!;
    const objectId = namespace.idFromName("public-form-rate-limit-v1");
    const response = await namespace.get(objectId).fetch("https://rate-limiter.internal/limit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: `${form}:${clientKey}`,
        policy: "public-form-v1",
      }),
    });
    const result = await response.json().catch(() => null) as { allowed?: unknown } | null;
    if (!response.ok || typeof result?.allowed !== "boolean") {
      throw new Error("invalid rate limiter response");
    }
    if (!result.allowed) {
      return {
        ok: false,
        response: jsonError("Too many submissions. Please try again soon.", 429),
      };
    }
  } catch {
    logPublicFormEvent("error", "atomic_rate_limiter_failed", form);
    return { ok: false, response: temporaryUnavailable() };
  }

  return { ok: true };
}

function parsePrivacyRequestUrl(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol === "https:") {
      return !url.username && !url.password ? url.toString() : null;
    }
    if (url.protocol === "mailto:" && isValidEmail(url.pathname)) {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function getPrivacyRequestConfigurationStatus(env: FormProtectionEnv) {
  if (!env.PRIVACY_REQUEST_URL?.trim()) return "missing" as const;
  return parsePrivacyRequestUrl(env.PRIVACY_REQUEST_URL) ? "ready" as const : "invalid" as const;
}

export function getPublicFormRuntimeConfig(env: FormProtectionEnv): ValueResult<PublicFormRuntimeConfig> {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() ?? "";
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const privacyRequestUrl = parsePrivacyRequestUrl(env.PRIVACY_REQUEST_URL);

  if (!privacyRequestUrl || Boolean(siteKey) !== Boolean(secretKey)) {
    return { ok: false, response: temporaryUnavailable() };
  }

  return {
    ok: true,
    value: {
      privacyRequestUrl,
      turnstileSiteKey: siteKey || null,
    },
  };
}

export function getTurnstileConfigurationStatus(env: FormProtectionEnv) {
  const siteKey = Boolean(env.TURNSTILE_SITE_KEY?.trim());
  const secretKey = Boolean(env.TURNSTILE_SECRET_KEY?.trim());
  if (!siteKey && !secretKey) return "disabled" as const;
  return siteKey && secretKey ? "ready" as const : "invalid" as const;
}

export async function verifyTurnstile(
  env: FormProtectionEnv,
  request: Request,
  body: Record<string, unknown>,
  form: PublicFormName,
): Promise<GuardResult> {
  const config = getPublicFormRuntimeConfig(env);
  if (!config.ok) {
    logPublicFormEvent("error", "public_form_runtime_config_invalid", form);
    return config;
  }
  if (!config.value.turnstileSiteKey) return { ok: true };

  const rawToken = body.turnstileToken;
  if (typeof rawToken !== "string" || !rawToken.trim() || rawToken.trim().length > TURNSTILE_TOKEN_MAX_LENGTH) {
    return { ok: false, response: jsonError("Verification failed. Please try again.") };
  }

  const verificationBody = new FormData();
  verificationBody.set("secret", env.TURNSTILE_SECRET_KEY!.trim());
  verificationBody.set("response", rawToken.trim());
  verificationBody.set("idempotency_key", crypto.randomUUID());
  const clientIp = request.headers.get("cf-connecting-ip")?.trim();
  if (clientIp) verificationBody.set("remoteip", clientIp);

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      body: verificationBody,
    });
    const result = await response.json().catch(() => null) as {
      success?: unknown;
      action?: unknown;
      hostname?: unknown;
    } | null;
    const requestHostname = new URL(request.url).hostname.toLowerCase();
    if (
      !response.ok ||
      result?.success !== true ||
      result.action !== form ||
      typeof result.hostname !== "string" ||
      result.hostname.toLowerCase() !== requestHostname
    ) {
      return { ok: false, response: jsonError("Verification failed. Please try again.") };
    }
  } catch {
    logPublicFormEvent("error", "turnstile_verification_unavailable", form);
    return { ok: false, response: temporaryUnavailable() };
  }

  return { ok: true };
}

export async function findDuplicate(
  env: FormProtectionEnv,
  plan: DedupePlan,
  form: PublicFormName,
): Promise<ValueResult<boolean>> {
  try {
    for (const key of plan.lookupKeys) {
      const marker = await env.VFC_SUBMISSIONS.get<DedupeMarker>(key, "json");
      if (marker) {
        if (typeof marker.recordKey !== "string" || typeof marker.createdAt !== "string") {
          throw new Error("invalid dedupe marker");
        }
        return { ok: true, value: true };
      }
    }
    return { ok: true, value: false };
  } catch {
    logPublicFormEvent("error", "dedupe_lookup_failed", form);
    return { ok: false, response: temporaryUnavailable() };
  }
}

export async function writeProtectedRecord(
  env: FormProtectionEnv,
  form: PublicFormName,
  recordKey: string,
  record: unknown,
  plan: DedupePlan,
  createdAt: string,
): Promise<Response> {
  const referenceKey = `privacy-dedupe-ref:${form}:${recordKey.split(":", 2)[1]}`;
  const reference: DedupeReference = {
    recordKey,
    // Keep every active rotation key so deletion can connect records written
    // on either side of a current/previous key transition.
    dedupeKeys: plan.lookupKeys,
    createdAt,
  };

  try {
    await env.VFC_SUBMISSIONS.put(referenceKey, JSON.stringify(reference), {
      metadata: reference,
    });
  } catch {
    logPublicFormEvent("error", "dedupe_reference_write_failed", form);
    return temporaryUnavailable();
  }

  try {
    await env.VFC_SUBMISSIONS.put(recordKey, JSON.stringify(record));
  } catch {
    logPublicFormEvent("error", "operational_record_write_failed", form);
    await env.VFC_SUBMISSIONS.delete(referenceKey).catch(() => {
      logPublicFormEvent("error", "dedupe_reference_rollback_failed", form);
    });
    return temporaryUnavailable();
  }

  try {
    const marker: DedupeMarker = { recordKey, createdAt };
    await env.VFC_SUBMISSIONS.put(plan.writeKey, JSON.stringify(marker), {
      expirationTtl: PUBLIC_FORM_DEDUPE_TTL_SECONDS,
    });
  } catch {
    // KV cannot provide an atomic record+marker write. Preserve the accepted
    // operational record and its deletion reference, and emit no identifiers.
    logPublicFormEvent("warn", "dedupe_marker_write_failed", form);
  }

  return acceptedPublicFormResponse();
}
