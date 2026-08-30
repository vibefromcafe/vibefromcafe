import { describe, expect, it, vi } from "vitest";
import mapping from "../../app/data/cafe-url-mapping.json";
import { onRequest } from "./[[slug]]";

function context(path: string, slug?: string | string[]) {
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

describe("cafe Pages Function", () => {
  it("temporarily redirects the index and preserves its query", async () => {
    const response = await onRequest(context("/cafes?ref=home&a=1"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://cafein.id/?ref=home&a=1",
    );
  });

  it("temporarily redirects all 48 verified slugs with query preservation", async () => {
    const verified = mapping.entries.filter((entry) => entry.status === "verified");
    expect(verified).toHaveLength(48);

    for (const entry of verified) {
      const response = await onRequest(
        context(`/cafes/${entry.legacySlug}?utm_source=vfc&x=1`, entry.legacySlug),
      );
      expect(response.status, entry.legacySlug).toBe(302);
      expect(response.headers.get("location"), entry.legacySlug).toBe(
        `https://cafein.id/cafe/${entry.cafeinSlug}?utm_source=vfc&x=1`,
      );
    }
  });

  it("falls through for all eight useful legacy fallbacks", async () => {
    const fallbacks = mapping.entries.filter((entry) => entry.status !== "verified");
    expect(fallbacks).toHaveLength(8);

    for (const entry of fallbacks) {
      const requestContext = context(`/cafes/${entry.legacySlug}`, entry.legacySlug);
      const response = await onRequest(requestContext);
      expect(response.status, entry.legacySlug).toBe(200);
      expect(await response.text()).toBe("spa");
      expect(requestContext.next).toHaveBeenCalledOnce();
    }
  });

  it.each([
    ["unknown slug", "/cafes/not-a-real-cafe", "not-a-real-cafe"],
    ["nested path", "/cafes/known/extra", ["known", "extra"]],
  ])("returns a true 404 for an %s", async (_label, path, slug) => {
    const response = await onRequest(context(path, slug));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Cafe not found");
  });
});
