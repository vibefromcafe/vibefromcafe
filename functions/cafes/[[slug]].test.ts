import { describe, expect, it, vi } from "vitest";
import cafeUrlMapping from "../../app/data/cafe-url-mapping.json";
import { onRequest } from "./[[slug]]";

function createContext({
  path,
  slug,
}: {
  path: string;
  slug?: string | string[];
}) {
  return {
    request: new Request(`https://vibefromcafe.id${path}`),
    env: {},
    params: { slug },
    data: {},
    next: vi.fn(async () => new Response("spa", { status: 200 })),
    waitUntil: vi.fn(),
    functionPath: "/cafes",
  } as unknown as Parameters<typeof onRequest>[0];
}

describe("functions/cafes/[[slug]]", () => {
  it("redirects /cafes index to cafein.id with query preserved", async () => {
    const response = await onRequest(
      createContext({ path: "/cafes?ref=home", slug: undefined }),
    );
    expect(response.status).toBe(302);
    // Response.redirect normalizes origin URLs with a trailing slash before the query.
    expect(response.headers.get("location")).toBe("https://cafein.id/?ref=home");
  });

  it("redirects every verified archived slug", async () => {
    const verified = cafeUrlMapping.entries.filter((entry) => entry.redirect);
    expect(verified.length).toBeGreaterThan(0);

    for (const entry of verified) {
      const response = await onRequest(
        createContext({
          path: `${entry.legacyPath}?utm=test`,
          slug: entry.legacySlug,
        }),
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        `${entry.destinationUrl}?utm=test`,
      );
    }
  });

  it("falls through to the SPA for ambiguous and unmatched slugs", async () => {
    const fallback = cafeUrlMapping.entries.filter((entry) => !entry.redirect);
    expect(fallback.length).toBeGreaterThan(0);

    for (const entry of fallback) {
      const context = createContext({
        path: entry.legacyPath,
        slug: entry.legacySlug,
      });
      const response = await onRequest(context);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("spa");
      expect(context.next).toHaveBeenCalledOnce();
    }
  });

  it("returns a real 404 for unknown cafe slugs", async () => {
    const response = await onRequest(
      createContext({
        path: "/cafes/not-a-real-cafe-slug",
        slug: "not-a-real-cafe-slug",
      }),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Cafe not found");
  });
});
