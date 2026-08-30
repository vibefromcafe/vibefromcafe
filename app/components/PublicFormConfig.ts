import { useEffect, useState } from "react";

export type PublicFormConfig = {
  privacyRequestUrl: string;
  turnstileSiteKey: string | null;
};

function isPublicFormConfig(value: unknown): value is PublicFormConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<PublicFormConfig>;
  return (
    typeof config.privacyRequestUrl === "string" &&
    (typeof config.turnstileSiteKey === "string" || config.turnstileSiteKey === null)
  );
}

export function usePublicFormConfig() {
  const [config, setConfig] = useState<PublicFormConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/public-form-config", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json().catch(() => null) as unknown;
        if (!response.ok || !isPublicFormConfig(value)) throw new Error("Public form configuration unavailable");
        setConfig(value);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError("This form is temporarily unavailable. Please try again later.");
      });

    return () => controller.abort();
  }, []);

  return { config, error, loading: !config && !error };
}
