import { describe, expect, it } from "vitest";
import cafes from "./cafes.json";
import cafeUrlMapping from "./cafe-url-mapping.json";
import publicCafeUrlMapping from "../../public/cafe-url-mapping.json";
import redirectsText from "../../public/_redirects?raw";
import type { Cafe } from "./types";
import {
  CAFEIN_ORIGIN,
  getCafeUrlMapping,
  listArchivedCafeSlugs,
  resolveCafeSlug,
  resolveCafesIndexDestination,
  withPreservedQuery,
} from "./cafe-url-migration";

const archived = cafes as Cafe[];
const mapping = cafeUrlMapping as ReturnType<typeof getCafeUrlMapping>;

describe("cafe URL migration inventory", () => {
  it("archives exactly 56 legacy cafe slugs", () => {
    expect(archived).toHaveLength(56);
    expect(listArchivedCafeSlugs()).toHaveLength(56);
    expect(mapping.counts.totalLegacySlugs).toBe(56);
    expect(mapping.entries).toHaveLength(56);
  });

  it("covers every archived slug exactly once in the public mapping", () => {
    const archivedSlugs = new Set(archived.map((cafe) => cafe.slug));
    const mappedSlugs = mapping.entries.map((entry) => entry.legacySlug);

    expect(new Set(mappedSlugs).size).toBe(mappedSlugs.length);
    expect(new Set(mappedSlugs)).toEqual(archivedSlugs);
  });

  it("keeps public and app mapping documents identical", () => {
    expect(publicCafeUrlMapping).toEqual(cafeUrlMapping);
  });

  it("only redirects verified destinations under /cafe/:slug", () => {
    for (const entry of mapping.entries) {
      if (!entry.redirect) {
        expect(entry.destinationUrl).toBeNull();
        expect(entry.cafeinSlug).toBeNull();
        continue;
      }

      expect(entry.status).toBe("verified");
      expect(entry.cafeinSlug).toBeTruthy();
      expect(entry.destinationUrl).toBe(
        `${CAFEIN_ORIGIN}/cafe/${entry.cafeinSlug}`,
      );
      expect(entry.destinationUrl).not.toMatch(
        new RegExp(`${CAFEIN_ORIGIN}/[^/]+$`),
      );
    }
  });

  it("never redirects two legacy slugs to the same cafein slug collision risk without review", () => {
    const destinations = mapping.entries
      .filter((entry) => entry.redirect && entry.cafeinSlug)
      .map((entry) => entry.cafeinSlug as string);
    // Intra-map uniqueness: duplicate destinations are allowed only if intentional.
    // eastern-kopi-tm was removed from redirects because cafein's public catalog
    // has two rows for that slug and maybeSingle() breaks the detail page.
    expect(destinations).not.toContain("eastern-kopi-tm");
    const eastern = mapping.entries.find(
      (entry) => entry.legacySlug === "eastern-kopi-tm-seturan",
    );
    expect(eastern?.redirect).toBe(false);
    expect(eastern?.status).toBe("ambiguous");
  });
});

describe("resolveCafeSlug", () => {
  it("redirects every verified archived slug to its mapped cafein detail URL", () => {
    const verified = mapping.entries.filter((entry) => entry.redirect);
    expect(verified.length).toBe(mapping.counts.redirecting);

    for (const entry of verified) {
      const resolution = resolveCafeSlug(entry.legacySlug);
      expect(resolution.kind).toBe("redirect");
      if (resolution.kind !== "redirect") continue;
      expect(resolution.destinationUrl).toBe(entry.destinationUrl);
      expect(resolution.status).toBe(302);
    }
  });

  it("preserves query strings on verified redirects", () => {
    const sample = mapping.entries.find((entry) => entry.redirect);
    expect(sample).toBeTruthy();
    if (!sample?.destinationUrl) return;

    const resolution = resolveCafeSlug(sample.legacySlug, "?utm_source=vfc&x=1");
    expect(resolution.kind).toBe("redirect");
    if (resolution.kind !== "redirect") return;
    expect(resolution.destinationUrl).toBe(
      `${sample.destinationUrl}?utm_source=vfc&x=1`,
    );
  });

  it("serves legacy fallback for every non-redirect archived slug", () => {
    const fallback = mapping.entries.filter((entry) => !entry.redirect);
    expect(fallback.length).toBe(mapping.counts.legacyFallback);
    expect(fallback.length).toBeGreaterThan(0);

    for (const entry of fallback) {
      const resolution = resolveCafeSlug(entry.legacySlug);
      expect(resolution.kind).toBe("legacy");
      if (resolution.kind !== "legacy") continue;
      expect(resolution.cafe.slug).toBe(entry.legacySlug);
      expect(resolution.entry.status).toMatch(/ambiguous|unmatched|intentionally_retired/);
    }
  });

  it("returns not_found for unknown cafe slugs", () => {
    for (const slug of [
      "not-a-real-cafe",
      "myosotis-coffee-and-eatery-extra",
      "cafein-only-slug",
    ]) {
      expect(resolveCafeSlug(slug)).toEqual({
        kind: "not_found",
        legacySlug: slug,
      });
    }
  });

  it("never sends a known archived slug to a bare cafein root path", () => {
    for (const slug of listArchivedCafeSlugs()) {
      const resolution = resolveCafeSlug(slug);
      if (resolution.kind === "redirect") {
        expect(resolution.destinationUrl.startsWith(`${CAFEIN_ORIGIN}/cafe/`)).toBe(
          true,
        );
        expect(resolution.destinationUrl).not.toBe(`${CAFEIN_ORIGIN}/`);
        expect(resolution.destinationUrl).not.toBe(CAFEIN_ORIGIN);
      } else {
        expect(resolution.kind).toBe("legacy");
      }
    }
  });
});

describe("query preservation helpers", () => {
  it("appends and merges query strings", () => {
    expect(withPreservedQuery("https://cafein.id/cafe/x", "")).toBe(
      "https://cafein.id/cafe/x",
    );
    expect(withPreservedQuery("https://cafein.id/cafe/x", "?a=1")).toBe(
      "https://cafein.id/cafe/x?a=1",
    );
    expect(withPreservedQuery("https://cafein.id/cafe/x?b=2", "?a=1")).toBe(
      "https://cafein.id/cafe/x?b=2&a=1",
    );
    expect(withPreservedQuery("https://cafein.id/cafe/x#h", "?a=1")).toBe(
      "https://cafein.id/cafe/x?a=1#h",
    );
  });

  it("sends /cafes index traffic to cafein with query preserved", () => {
    expect(resolveCafesIndexDestination()).toBe(CAFEIN_ORIGIN);
    expect(resolveCafesIndexDestination("?ref=nav")).toBe(
      `${CAFEIN_ORIGIN}?ref=nav`,
    );
  });
});

describe("edge _redirects alignment", () => {
  const redirects = redirectsText;
  const redirectLines = redirects
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line && !line.startsWith("#"));

  it("includes an explicit redirect for every verified mapping", () => {
    for (const entry of mapping.entries.filter((item) => item.redirect)) {
      expect(redirects).toContain(
        `${entry.legacyPath} ${entry.destinationUrl} 302`,
      );
    }
  });

  it("does not edge-redirect ambiguous or unmatched slugs", () => {
    for (const entry of mapping.entries.filter((item) => !item.redirect)) {
      const cafeLine = redirectLines.find((line: string) =>
        line.startsWith(`${entry.legacyPath} `),
      );
      expect(cafeLine).toBeUndefined();
    }
  });

  it("does not use a catch-all /cafes/* splat to cafein", () => {
    expect(redirects).not.toMatch(/\/cafes\/\*\s+https:\/\/cafein\.id/);
  });

  it("keeps non-cafe legacy path redirects", () => {
    expect(redirects).toContain("/cafes https://cafein.id 302");
    expect(redirects).toContain("/chapter /chapters 302");
    expect(redirects).toContain("/event /events 302");
    expect(redirects).toContain("/join-community /join 302");
    expect(redirects).toContain("/join-comunity /join 302");
  });
});
