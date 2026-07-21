import type { Submission, SubmissionStatus } from "../../app/data/types";
import {
  enforceRateLimit,
  isResponse,
  isValidPhoneNumber,
  normalizePhoneNumber,
  optionalString,
  readDuplicateMarker,
  readLimitedJson,
  requiredConsent,
  requiredString,
  verifyTurnstileIfConfigured,
  writeDuplicateMarker,
  jsonError,
  type FormProtectionEnv,
} from "./form-protection";

interface Env extends FormProtectionEnv {
  WHATSAPP_GROUP_INVITE_URL?: string;
  WHATSAPP_INVITE_MESSAGE_TEMPLATE?: string;
}

interface SubmissionBody {
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: string;
  referralName?: string;
}

const CONSENT_VERSION = "2026-07";
const REFERRAL_SOURCES = new Set(["friend", "instagram", "threads", "twitter", "github", "other"]);
const DEFAULT_WHATSAPP_INVITE_MESSAGE =
  "Hi {{name}}, welcome to Vibe Coding From Cafe. Join our WhatsApp community here: {{group_link}}";

function resolveInviteConfig(env: Env) {
  return {
    groupInviteUrl: env.WHATSAPP_GROUP_INVITE_URL?.trim() ?? "",
    messageTemplate:
      env.WHATSAPP_INVITE_MESSAGE_TEMPLATE?.trim() || DEFAULT_WHATSAPP_INVITE_MESSAGE,
  };
}

function validateSubmissionBody(body: Record<string, unknown>): SubmissionBody | Response {
  const name = requiredString(body, "name", 100, "name");
  if (isResponse(name)) return name;

  const city = requiredString(body, "city", 80, "city");
  if (isResponse(city)) return city;

  const role = requiredString(body, "role", 280, "role");
  if (isResponse(role)) return role;

  const whatsapp = requiredString(body, "whatsapp", 32, "WhatsApp number");
  if (isResponse(whatsapp)) return whatsapp;
  if (!isValidPhoneNumber(whatsapp)) {
    return jsonError("WhatsApp number format is invalid");
  }

  const referralSource = requiredString(body, "referralSource", 40, "referral source");
  if (isResponse(referralSource)) return referralSource;
  if (!REFERRAL_SOURCES.has(referralSource)) {
    return jsonError("referral source is not supported");
  }

  const referralName = optionalString(body, "referralName", 120, "referral detail");
  if (isResponse(referralName)) return referralName;

  const consentError = requiredConsent(body);
  if (consentError) return consentError;

  return {
    name,
    city,
    role,
    whatsapp,
    referralSource,
    ...(referralName && (referralSource === "friend" || referralSource === "other") ? { referralName } : {}),
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateSubmissionBody(parsed.value);
  if (isResponse(validated)) return validated;

  const rateLimit = await enforceRateLimit(env, request, "join");
  if (!rateLimit.ok) return rateLimit.response;

  const turnstile = await verifyTurnstileIfConfigured(env, request, parsed.value);
  if (!turnstile.ok) return turnstile.response;

  const whatsappInvite = resolveInviteConfig(env);
  const normalizedWhatsapp = normalizePhoneNumber(validated.whatsapp);
  const dedupeKey = `submission_dedupe:${normalizedWhatsapp}`;
  const existing = await readDuplicateMarker(env, dedupeKey);

  if (existing) {
    return Response.json({
      success: true,
      duplicate: true,
      submission: { id: existing.id, invitationStatus: existing.status },
      whatsappInvite,
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const invitationStatus: SubmissionStatus = whatsappInvite.groupInviteUrl ? "invited" : "signed_up";
  const submission: Submission = {
    id,
    name: validated.name,
    city: validated.city,
    role: validated.role,
    whatsapp: validated.whatsapp,
    referralSource: validated.referralSource,
    ...((validated.referralSource === "friend" || validated.referralSource === "other") && validated.referralName
      ? { referralName: validated.referralName }
      : {}),
    invitationStatus,
    ...(invitationStatus === "invited" ? { invited_at: now } : {}),
    privacyConsentAt: now,
    privacyConsentVersion: CONSENT_VERSION,
    createdAt: now,
  };

  try {
    await env.VFC_SUBMISSIONS.put(`submission:${id}`, JSON.stringify(submission));
  } catch {
    return jsonError("Submissions are temporarily unavailable. Please try again soon.", 503);
  }
  await writeDuplicateMarker(env, dedupeKey, { id, status: invitationStatus, createdAt: now });

  return Response.json({
    success: true,
    submission: { id, invitationStatus: submission.invitationStatus },
    whatsappInvite,
  });
};
