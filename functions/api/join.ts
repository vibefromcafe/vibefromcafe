import { PUBLIC_FORM_CONSENT_VERSION, REFERRAL_SOURCES, type ReferralSource } from "../../app/data/public-forms";
import type { Submission } from "../../app/data/types";
import {
  acceptedPublicFormResponse,
  createDedupePlan,
  enforceAtomicRateLimit,
  findDuplicate,
  getPublicFormRuntimeConfig,
  isResponse,
  isValidPhoneNumber,
  jsonError,
  normalizePhoneNumber,
  optionalString,
  readLimitedJson,
  rejectUnknownFields,
  requiredConsent,
  requiredString,
  validateTurnstileTokenField,
  verifyTurnstile,
  writeProtectedRecord,
  type FormProtectionEnv,
} from "./form-protection";

type SubmissionBody = {
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: ReferralSource;
  referralName?: string;
};

const REFERRAL_SOURCE_VALUES = new Set<string>(REFERRAL_SOURCES.map(({ value }) => value));
const JOIN_FIELDS = [
  "name",
  "city",
  "role",
  "whatsapp",
  "referralSource",
  "referralName",
  "privacyConsent",
  "turnstileToken",
] as const;

function validateSubmissionBody(body: Record<string, unknown>): SubmissionBody | Response {
  const fieldsError = rejectUnknownFields(body, JOIN_FIELDS);
  if (fieldsError) return fieldsError;

  const name = requiredString(body, "name", 100, "name");
  if (isResponse(name)) return name;

  const city = requiredString(body, "city", 80, "city");
  if (isResponse(city)) return city;

  const role = requiredString(body, "role", 280, "role", true);
  if (isResponse(role)) return role;

  const whatsapp = requiredString(body, "whatsapp", 32, "WhatsApp number");
  if (isResponse(whatsapp)) return whatsapp;
  if (!isValidPhoneNumber(whatsapp)) {
    return jsonError("WhatsApp number format is invalid");
  }

  const referralSource = requiredString(body, "referralSource", 40, "referral source");
  if (isResponse(referralSource)) return referralSource;
  if (!REFERRAL_SOURCE_VALUES.has(referralSource)) {
    return jsonError("referral source is not supported");
  }

  const referralName = optionalString(body, "referralName", 120, "referral detail");
  if (isResponse(referralName)) return referralName;
  if (referralName && referralSource !== "friend" && referralSource !== "other") {
    return jsonError("referral detail is not supported for this referral source");
  }

  const consentError = requiredConsent(body);
  if (consentError) return consentError;
  const tokenError = validateTurnstileTokenField(body);
  if (tokenError) return tokenError;

  return {
    name,
    city,
    role,
    whatsapp,
    referralSource: referralSource as ReferralSource,
    ...(referralName ? { referralName } : {}),
  };
}

export const onRequestPost: PagesFunction<FormProtectionEnv> = async ({ request, env }) => {
  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateSubmissionBody(parsed.value);
  if (isResponse(validated)) return validated;

  const runtimeConfig = getPublicFormRuntimeConfig(env);
  if (!runtimeConfig.ok) return runtimeConfig.response;

  const dedupe = await createDedupePlan(env, "join", [normalizePhoneNumber(validated.whatsapp)]);
  if (!dedupe.ok) return dedupe.response;

  const rateLimit = await enforceAtomicRateLimit(env, request, "join");
  if (!rateLimit.ok) return rateLimit.response;

  const turnstile = await verifyTurnstile(env, request, parsed.value, "join");
  if (!turnstile.ok) return turnstile.response;

  const duplicate = await findDuplicate(env, dedupe.value, "join");
  if (!duplicate.ok) return duplicate.response;
  if (duplicate.value) return acceptedPublicFormResponse();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const submission: Submission = {
    id,
    name: validated.name,
    city: validated.city,
    role: validated.role,
    whatsapp: validated.whatsapp,
    referralSource: validated.referralSource,
    ...(validated.referralName ? { referralName: validated.referralName } : {}),
    invitationStatus: "signed_up",
    privacyConsentAt: now,
    privacyConsentVersion: PUBLIC_FORM_CONSENT_VERSION,
    createdAt: now,
  };

  return writeProtectedRecord(
    env,
    "join",
    `submission:${id}`,
    submission,
    dedupe.value,
    now,
  );
};
