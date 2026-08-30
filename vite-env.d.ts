/// <reference types="vite/client" />

interface Window {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        action: "join" | "contact";
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      },
    ) => string;
    remove?: (widgetId: string) => void;
  };
}
