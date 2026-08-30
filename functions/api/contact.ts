import { PUBLIC_FORM_CONSENT_VERSION } from "../../app/data/public-forms";
import type { ProjectInquiry } from "../../app/data/types";
import {
  acceptedPublicFormResponse,
  createDedupePlan,
  enforceAtomicRateLimit,
  findDuplicate,
  getPublicFormRuntimeConfig,
  isResponse,
  isValidEmail,
  isValidPhoneNumber,
  jsonError,
  normalizePhoneNumber,
  readLimitedJson,
  rejectUnknownFields,
  requiredConsent,
  requiredString,
  validateTurnstileTokenField,
  verifyTurnstile,
  writeProtectedRecord,
  type FormProtectionEnv,
} from "./form-protection";

type InquiryBody = {
  name: string;
  contact: string;
  message: string;
};

const CONTACT_FIELDS = [
  "name",
  "contact",
  "message",
  "privacyConsent",
  "turnstileToken",
] as const;

function validateInquiryBody(body: Record<string, unknown>): InquiryBody | Response {
  const fieldsError = rejectUnknownFields(body, CONTACT_FIELDS);
  if (fieldsError) return fieldsError;

  const name = requiredString(body, "name", 100, "name");
  if (isResponse(name)) return name;

  const contact = requiredString(body, "contact", 254, "contact");
  if (isResponse(contact)) return contact;
  if (!isValidEmail(contact) && !isValidPhoneNumber(contact)) {
    return jsonError("contact must be a valid email or WhatsApp number");
  }

  const message = requiredString(body, "message", 2000, "message", true);
  if (isResponse(message)) return message;

  const consentError = requiredConsent(body);
  if (consentError) return consentError;
  const tokenError = validateTurnstileTokenField(body);
  if (tokenError) return tokenError;

  return { name, contact, message };
}

export const onRequestPost: PagesFunction<FormProtectionEnv> = async ({ request, env }) => {
  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateInquiryBody(parsed.value);
  if (isResponse(validated)) return validated;

  const runtimeConfig = getPublicFormRuntimeConfig(env);
  if (!runtimeConfig.ok) return runtimeConfig.response;

  const normalizedContact = isValidEmail(validated.contact)
    ? validated.contact.toLowerCase()
    : normalizePhoneNumber(validated.contact);
  const dedupe = await createDedupePlan(env, "contact", [normalizedContact, validated.message]);
  if (!dedupe.ok) return dedupe.response;

  const rateLimit = await enforceAtomicRateLimit(env, request, "contact");
  if (!rateLimit.ok) return rateLimit.response;

  const turnstile = await verifyTurnstile(env, request, parsed.value, "contact");
  if (!turnstile.ok) return turnstile.response;

  const duplicate = await findDuplicate(env, dedupe.value, "contact");
  if (!duplicate.ok) return duplicate.response;
  if (duplicate.value) return acceptedPublicFormResponse();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inquiry: ProjectInquiry = {
    id,
    name: validated.name,
    contact: validated.contact,
    message: validated.message,
    status: "new",
    privacyConsentAt: now,
    privacyConsentVersion: PUBLIC_FORM_CONSENT_VERSION,
    createdAt: now,
  };

  return writeProtectedRecord(
    env,
    "contact",
    `inquiry:${id}`,
    inquiry,
    dedupe.value,
    now,
  );
};
