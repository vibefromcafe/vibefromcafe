import { describe, expect, it } from "vitest";
import robots from "../public/robots.txt?raw";
import sitemap from "../public/sitemap.xml?raw";
import {
  absoluteSiteUrl,
  CANONICAL_ORIGIN,
  isAdminPath,
  isApiPath,
  PUBLIC_ROUTE_PATHS,
  publicCanonicalUrl,
} from "./seo";

describe("canonical URLs", () => {
  it("builds absolute URLs on the documented production origin", () => {
    expect(CANONICAL_ORIGIN).toBe("https://vibefromcafe.id");
    expect(absoluteSiteUrl("/og-image.png")).toBe("https://vibefromcafe.id/og-image.png");
    expect(publicCanonicalUrl("/chapters/jogja/")).toBe(
      "https://vibefromcafe.id/chapters/jogja",
    );
  });

  it("does not canonicalize private, API, or unknown paths", () => {
    expect(publicCanonicalUrl("/admin/events")).toBeUndefined();
    expect(publicCanonicalUrl("/api/events")).toBeUndefined();
    expect(publicCanonicalUrl("/missing")).toBeUndefined();
    expect(isAdminPath("/admin/events/")).toBe(true);
    expect(isApiPath("/api/events/")).toBe(true);
  });

  it("rejects non-site paths rather than accepting another origin", () => {
    expect(() => absoluteSiteUrl("https://example.com/image.png")).toThrow(
      "Site paths must start with a slash",
    );
  });
});

describe("public crawler outputs", () => {
  it("lists every intended public route and no private route in the sitemap", () => {
    const sitemapLocations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      ([, location]) => location,
    );

    expect(sitemapLocations).toEqual(PUBLIC_ROUTE_PATHS.map(absoluteSiteUrl));
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/api");
  });

  it("blocks admin and API route trees and advertises the sitemap", () => {
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api");
    expect(robots).toContain(`Sitemap: ${absoluteSiteUrl("/sitemap.xml")}`);
  });
});
