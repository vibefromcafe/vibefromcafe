interface Env {
  ADMIN_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  VITE_TURNSTILE_SITE_KEY?: string;
  WHATSAPP_GROUP_INVITE_URL?: string;
}

type ConfigCheck = {
  name: keyof Env;
  configured: boolean;
  description: string;
};

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const turnstileSecretConfigured = isConfigured(env.TURNSTILE_SECRET_KEY);
  const turnstileSiteKeyConfigured = isConfigured(env.VITE_TURNSTILE_SITE_KEY);

  const checks: ConfigCheck[] = [
    {
      name: "TURNSTILE_SECRET_KEY",
      configured: turnstileSecretConfigured,
      description: "Server-side Turnstile verification for public forms.",
    },
    {
      name: "VITE_TURNSTILE_SITE_KEY",
      configured: turnstileSiteKeyConfigured,
      description: "Client-side Turnstile widget rendering for public forms.",
    },
    {
      name: "ADMIN_SECRET",
      configured: isConfigured(env.ADMIN_SECRET),
      description: "Fallback admin authentication when Cloudflare Access is not present.",
    },
    {
      name: "WHATSAPP_GROUP_INVITE_URL",
      configured: isConfigured(env.WHATSAPP_GROUP_INVITE_URL),
      description: "Immediate WhatsApp invite link for community join submissions.",
    },
  ];

  const warnings = [
    ...(turnstileSecretConfigured && !turnstileSiteKeyConfigured
      ? ["Turnstile server verification is enabled, but the public site key is missing."]
      : []),
    ...(turnstileSiteKeyConfigured && !turnstileSecretConfigured
      ? ["Turnstile widget is configured, but server verification is disabled."]
      : []),
  ];

  return Response.json({
    checks,
    protections: {
      consent: "required",
      rateLimiting: "enabled",
      duplicateDetection: "enabled",
      privacyOperations: "documented",
    },
    warnings,
  });
};
