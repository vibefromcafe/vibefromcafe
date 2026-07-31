import { describe, expect, it } from "vitest";
import { onRequestGet } from "./security";

function createContext(env: Record<string, unknown>) {
  return {
    request: new Request("https://example.com/api/admin/security"),
    env,
    params: {},
    data: {},
    next: () => Promise.resolve(new Response()),
    waitUntil: () => undefined,
    functionPath: "/api/admin/security",
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe("admin security api", () => {
  it("returns configuration statuses without exposing configured values", async () => {
    const response = await onRequestGet(
      createContext({
        ADMIN_SECRET: "super-secret",
        TURNSTILE_SECRET_KEY: "turnstile-secret",
        VITE_TURNSTILE_SITE_KEY: "",
        WHATSAPP_GROUP_INVITE_URL: "https://chat.whatsapp.com/group",
      }),
    );

    const body = (await response.json()) as {
      checks: Array<{ name: string; configured: boolean }>;
      warnings: string[];
    };

    expect(response.status).toBe(200);
    expect(body.checks).toEqual(expect.arrayContaining([
      { name: "ADMIN_SECRET", configured: true, description: expect.any(String) },
      { name: "TURNSTILE_SECRET_KEY", configured: true, description: expect.any(String) },
      { name: "VITE_TURNSTILE_SITE_KEY", configured: false, description: expect.any(String) },
      { name: "WHATSAPP_GROUP_INVITE_URL", configured: true, description: expect.any(String) },
    ]));
    expect(JSON.stringify(body)).not.toContain("super-secret");
    expect(JSON.stringify(body)).not.toContain("turnstile-secret");
    expect(JSON.stringify(body)).not.toContain("chat.whatsapp.com/group");
    expect(body.warnings).toContain("Turnstile server verification is enabled, but the public site key is missing.");
  });
});
