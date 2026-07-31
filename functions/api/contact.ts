import type { ProjectInquiry } from "../../app/data/types";
import {
  enforceRateLimit,
  hashFormFingerprint,
  isResponse,
  isValidEmail,
  isValidPhoneNumber,
  readDuplicateMarker,
  readLimitedJson,
  requiredConsent,
  requiredString,
  verifyTurnstileIfConfigured,
  writeDuplicateMarker,
  jsonError,
  type FormProtectionEnv,
} from "./form-protection";

type Env = FormProtectionEnv;

type InquiryBody = {
  name: string;
  contact: string;
  message: string;
};

const CONSENT_VERSION = "2026-07";

function validateInquiryBody(body: Record<string, unknown>): InquiryBody | Response {
  const name = requiredString(body, "name", 100, "name");
  if (isResponse(name)) return name;

  const contact = requiredString(body, "contact", 160, "contact");
  if (isResponse(contact)) return contact;
  if (!isValidEmail(contact) && !isValidPhoneNumber(contact)) {
    return jsonError("contact must be a valid email or WhatsApp number");
  }

  const message = requiredString(body, "message", 2000, "message");
  if (isResponse(message)) return message;

  const consentError = requiredConsent(body);
  if (consentError) return consentError;

  return { name, contact, message };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateInquiryBody(parsed.value);
  if (isResponse(validated)) return validated;

  const rateLimit = await enforceRateLimit(env, request, "contact");
  if (!rateLimit.ok) return rateLimit.response;

  const turnstile = await verifyTurnstileIfConfigured(env, request, parsed.value);
  if (!turnstile.ok) return turnstile.response;

  const fingerprint = await hashFormFingerprint([validated.contact, validated.message]);
  const dedupeKey = `inquiry_dedupe:${fingerprint}`;
  const existing = await readDuplicateMarker(env, dedupeKey);

  if (existing) {
    return Response.json({ success: true, duplicate: true, inquiry: { id: existing.id, status: existing.status } });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inquiry: ProjectInquiry = {
    id,
    name: validated.name,
    contact: validated.contact,
    message: validated.message,
    status: "new",
    privacyConsentAt: now,
    privacyConsentVersion: CONSENT_VERSION,
    createdAt: now,
  };

  try {
    await env.VFC_SUBMISSIONS.put(`inquiry:${id}`, JSON.stringify(inquiry));
  } catch {
    return jsonError("Submissions are temporarily unavailable. Please try again soon.", 503);
  }
  await writeDuplicateMarker(env, dedupeKey, { id, status: inquiry.status, createdAt: now });

  return Response.json({ success: true, inquiry: { id, status: inquiry.status } });
};
