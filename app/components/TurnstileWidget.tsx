import { useCallback, useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => {
        existing.remove();
        reject(new Error("Turnstile script failed to load"));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.append(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

export function TurnstileWidget({
  siteKey,
  action,
  onToken,
  onError,
}: {
  siteKey: string;
  action: "join" | "contact";
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const clearToken = useCallback(() => {
    onToken("");
  }, [onToken]);

  const handleError = useCallback(() => {
    clearToken();
    onError();
  }, [clearToken, onError]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: onToken,
          "expired-callback": clearToken,
          "error-callback": handleError,
        });
      })
      .catch(() => {
        if (!cancelled) handleError();
      });

    return () => {
      cancelled = true;
      clearToken();
      if (widgetIdRef.current) window.turnstile?.remove?.(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action, clearToken, handleError, onToken, siteKey]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div ref={containerRef} />
    </div>
  );
}
