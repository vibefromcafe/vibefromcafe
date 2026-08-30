import { describe, expect, it, vi } from "vitest";
import { onRequest } from "./[[path]]";

const INDEX_HTML = `<!doctype html><html><head>
  <link rel="canonical" href="https://vibefromcafe.id/"/>
  <meta property="og:url" content="https://vibefromcafe.id/"/>
</head><body><div id="app"></div></body></html>`;

function context(pathname: string, init?: RequestInit) {
  const fetch = vi.fn(async () =>
    new Response(INDEX_HTML, {
      headers: { "content-type": "text/html", "content-length": "200" },
    }),
  );

  return {
    fetch,
    value: {
      request: new Request(`https://preview.example${pathname}`, init),
      env: { ASSETS: { fetch } },
      params: {},
      data: undefined,
      next: vi.fn(),
      waitUntil: vi.fn(),
      functionPath: "[[path]]",
    },
  };
}

describe("SPA document routing", () => {
  it("serves known public routes with route-correct canonical and Open Graph URLs", async () => {
    const { fetch, value } = context("/chapters/jogja");
    const response = await onRequest(value);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(
      '<link rel="canonical" href="https://vibefromcafe.id/chapters/jogja"/>',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://vibefromcafe.id/chapters/jogja"/>',
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://preview.example/index.html" }),
    );
  });

  it("serves unknown browser routes as the SPA document with a true 404 and noindex", async () => {
    const { value } = context("/does-not-exist");
    const response = await onRequest(value);
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html).not.toContain('rel="canonical"');
  });

  it("does not expose a homepage canonical on admin documents", async () => {
    const { value } = context("/admin/events");
    const response = await onRequest(value);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html).not.toContain('rel="canonical"');
  });

  it("returns JSON 404s for unmatched APIs without serving the SPA", async () => {
    const { fetch, value } = context("/api/missing");
    const response = await onRequest(value);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes static crawler outputs through unchanged", async () => {
    const { fetch, value } = context("/sitemap.xml");
    await onRequest(value);

    expect(fetch).toHaveBeenCalledWith(value.request);
  });
});
