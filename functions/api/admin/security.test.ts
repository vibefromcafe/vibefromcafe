import { describe, expect, it } from "vitest";
import { onRequest as adminPageMiddleware } from "../../admin/_middleware";
import { MockKvNamespace, pagesContext, protectedFormEnv } from "../../test-support/public-forms";
import { onRequest as apiAdminMiddleware } from "./_middleware";
import { onRequestGet } from "./security";
import { onRequestGet as getPublicFormConfig } from "../public-form-config";

describe("protected public-form health", () => {
  it("reports statuses and blockers without configured values", async () => {
    const env = {
      ...protectedFormEnv(new MockKvNamespace(), {
        TURNSTILE_SITE_KEY: "public-test-key",
        TURNSTILE_SECRET_KEY: "private-test-key",
      }),
      CF_ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      CF_ACCESS_AUDIENCE: "test-audience",
      ADMIN_MUTATIONS_ENABLED: "true",
      WHATSAPP_GROUP_INVITE_URL: "https://invite.example.invalid/private",
    };
    const request = new Request("https://forms.example.invalid/api/admin/security");

    const response = await onRequestGet(pagesContext(onRequestGet, request, env));
    const body = await response.json() as {
      checks: Array<{ name: string; status: string }>;
      blockers: string[];
      protections: Record<string, string>;
    };
    const output = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Cloudflare Access validation", status: "ready" }),
      expect.objectContaining({ name: "Turnstile runtime pair", status: "ready" }),
      expect.objectContaining({ name: "Atomic rate limiter", status: "operator-gate" }),
    ]));
    expect(body.blockers).toContain("The bound rate limiter still requires operator-approved implementation and concurrent staging evidence.");
    expect(body.protections.turnstileConfiguration).toBe("runtime-source");
    for (const configuredValue of [
      "public-test-key",
      "private-test-key",
      "test-audience",
      "team.cloudflareaccess.com",
      "invite.example.invalid",
    ]) {
      expect(output).not.toContain(configuredValue);
    }
  });

  it.each([
    ["page", adminPageMiddleware, "https://forms.example.invalid/admin/health"],
    ["api", apiAdminMiddleware, "https://forms.example.invalid/api/admin/security"],
  ] as const)("keeps the Health %s behind verified Access", async (_kind, middleware, url) => {
    const request = new Request(url);
    const response = await middleware(pagesContext(middleware, request, {}));

    expect(response.status).toBe(401);
  });

  it("serves the public site key from runtime only when all write gates are present", async () => {
    const env = protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SITE_KEY: "public-test-key",
      TURNSTILE_SECRET_KEY: "private-test-key",
    });
    const request = new Request("https://forms.example.invalid/api/public-form-config");

    const response = await getPublicFormConfig(pagesContext(getPublicFormConfig, request, env));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      privacyRequestUrl: "https://privacy.example.invalid/request",
      turnstileSiteKey: "public-test-key",
    });
    expect(JSON.stringify(body)).not.toContain("private-test-key");
  });

  it("fails the public config closed for Turnstile mismatch or a missing atomic binding", async () => {
    const request = new Request("https://forms.example.invalid/api/public-form-config");
    const mismatch = protectedFormEnv(new MockKvNamespace(), {
      TURNSTILE_SECRET_KEY: "private-test-key",
    });
    const missingLimiter = protectedFormEnv(new MockKvNamespace(), {
      PUBLIC_FORM_RATE_LIMITER: undefined,
    });

    const mismatchResponse = await getPublicFormConfig(pagesContext(getPublicFormConfig, request, mismatch));
    const bindingResponse = await getPublicFormConfig(pagesContext(
      getPublicFormConfig,
      new Request(request.url),
      missingLimiter,
    ));

    expect(mismatchResponse.status).toBe(503);
    expect(bindingResponse.status).toBe(503);
    expect(await mismatchResponse.json()).toEqual(await bindingResponse.json());
  });
});
