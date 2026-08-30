import { getAdminAccessConfigurationStatus, type AdminAuthEnv } from "./auth";
import {
  getDedupeConfigurationStatus,
  getPrivacyRequestConfigurationStatus,
  getTurnstileConfigurationStatus,
  hasAtomicRateLimiterBinding,
  type FormProtectionEnv,
} from "../form-protection";

interface Env extends AdminAuthEnv, FormProtectionEnv {
  WHATSAPP_GROUP_INVITE_URL?: string;
}

type CheckStatus = "ready" | "missing" | "invalid" | "disabled" | "operator-gate";

type ConfigCheck = {
  name: string;
  status: CheckStatus;
  description: string;
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function breakGlassStatus(env: Env): CheckStatus {
  const enabled = env.ADMIN_BREAK_GLASS_ENABLED === "true";
  const secret = hasValue(env.ADMIN_SECRET);
  if (!enabled && !secret) return "disabled";
  return enabled && secret ? "ready" : "invalid";
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const turnstile = getTurnstileConfigurationStatus(env);
  const dedupe = getDedupeConfigurationStatus(env);
  const privacyRequest = getPrivacyRequestConfigurationStatus(env);
  const rateLimiterBound = hasAtomicRateLimiterBinding(env);
  const breakGlass = breakGlassStatus(env);

  const checks: ConfigCheck[] = [
    {
      name: "Cloudflare Access validation",
      status: getAdminAccessConfigurationStatus(env),
      description: "Exact team issuer and one explicit audience topology for every admin route.",
    },
    {
      name: "Admin mutations",
      status: env.ADMIN_MUTATIONS_ENABLED === "true" ? "ready" : "disabled",
      description: "Fail-closed mutation gate for protected admin APIs.",
    },
    {
      name: "Break-glass authentication",
      status: breakGlass,
      description: "Disabled is the normal state; enabled requires both the explicit flag and secret.",
    },
    {
      name: "Public-form KV",
      status: env.VFC_SUBMISSIONS ? "ready" : "missing",
      description: "Environment-isolated operational record and privacy-marker binding.",
    },
    {
      name: "Atomic rate limiter",
      status: rateLimiterBound ? "operator-gate" : "missing",
      description: "External Durable Object binding; staging concurrency and implementation proof remain required.",
    },
    {
      name: "Turnstile runtime pair",
      status: turnstile,
      description: "Runtime site and secret keys are either both configured or both absent; no build-time key is used.",
    },
    {
      name: "Keyed dedupe",
      status: dedupe,
      description: "Versioned HMAC key material with optional previous-key rotation window.",
    },
    {
      name: "Privacy request channel",
      status: privacyRequest,
      description: "Operator-supplied public HTTPS or mailto channel used by both form notices.",
    },
    {
      name: "WhatsApp invitation",
      status: hasValue(env.WHATSAPP_GROUP_INVITE_URL) ? "ready" : "missing",
      description: "Protected admin onboarding configuration; never returned by public form APIs.",
    },
  ];

  const warnings = [
    ...(breakGlass === "ready" ? ["Break-glass authentication is enabled."] : []),
    ...(turnstile === "disabled" ? ["Turnstile is disabled in this environment."] : []),
    ...(turnstile === "invalid" ? ["Turnstile site/secret runtime configuration is mismatched."] : []),
  ];
  const blockers = [
    ...(!rateLimiterBound ? ["The required external atomic rate-limiter binding is missing."] : []),
    ...(rateLimiterBound ? ["The bound rate limiter still requires operator-approved implementation and concurrent staging evidence."] : []),
    ...(dedupe !== "ready" ? ["Versioned keyed dedupe configuration is not ready."] : []),
    ...(privacyRequest !== "ready" ? ["A monitored public privacy request channel has not been configured."] : []),
    ...(turnstile === "invalid" ? ["Turnstile runtime configuration is not safe to serve."] : []),
  ];

  return Response.json({
    checks,
    protections: {
      boundedIngestion: "enabled",
      consent: "required",
      duplicateDetection: "best-effort KV; generic response",
      deletionMarkers: "resumable",
      publicLogging: "identifier-free",
      rateLimiting: rateLimiterBound ? "operator proof required" : "fail-closed",
      turnstileConfiguration: "runtime-source",
    },
    warnings,
    blockers,
  }, { headers: { "cache-control": "no-store" } });
};
