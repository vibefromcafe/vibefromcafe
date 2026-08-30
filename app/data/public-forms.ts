export const PUBLIC_FORM_CONSENT_VERSION = "2026-08-30";

export const REFERRAL_SOURCES = [
  { value: "friend", label: "A friend" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "github", label: "GitHub" },
  { value: "other", label: "Other" },
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["value"];
