import {
  getDedupeConfigurationStatus,
  getPublicFormRuntimeConfig,
  hasAtomicRateLimiterBinding,
  temporaryUnavailable,
  type FormProtectionEnv,
} from "./form-protection";

export const onRequestGet: PagesFunction<FormProtectionEnv> = async ({ env }) => {
  const config = getPublicFormRuntimeConfig(env);
  if (
    !config.ok ||
    getDedupeConfigurationStatus(env) !== "ready" ||
    !hasAtomicRateLimiterBinding(env) ||
    !env.VFC_SUBMISSIONS
  ) {
    return temporaryUnavailable();
  }

  return Response.json(config.value, {
    headers: { "cache-control": "no-store" },
  });
};
