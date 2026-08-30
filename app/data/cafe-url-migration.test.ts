import { describe, expect, it } from "vitest";
import mappingJson from "./cafe-url-mapping.json";
import publicMappingJson from "../../public/cafe-url-mapping.json";
import cafes from "./cafes.json";
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

const mapping = getCafeUrlMapping();
const archived = cafes as Cafe[];
const redirectLines = redirectsText
  .split("\n")
  .map((line: string) => line.trim())
  .filter((line: string) => line.startsWith("/cafes/"));

describe("56-slug cafe migration inventory", () => {
  it("covers each archived slug exactly once", () => {
    expect(archived).toHaveLength(56);
    expect(mapping.entries).toHaveLength(56);
    expect(mapping.counts.totalLegacySlugs).toBe(56);

    const archivedSlugs = archived.map((cafe) => cafe.slug).sort();
    const mappedSlugs = mapping.entries.map((entry) => entry.legacySlug).sort();
    expect(new Set(mappedSlugs).size).toBe(56);
    expect(mappedSlugs).toEqual(archivedSlugs);
    expect(listArchivedCafeSlugs()).toEqual(archivedSlugs);
  });

  it("derives the declared status counts from all entries", () => {
    const counts = mapping.entries.reduce<Record<string, number>>((result, entry) => {
      result[entry.status] = (result[entry.status] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ verified: 48, ambiguous: 3, unmatched: 5 });
    expect(mapping.counts).toEqual({
      totalLegacySlugs: 56,
      verified: 48,
      ambiguous: 3,
      unmatched: 5,
      intentionallyRetired: 0,
      redirecting: 48,
      legacyFallback: 8,
    });
  });

  it("publishes an exact copy of the app mapping", () => {
    expect(publicMappingJson).toEqual(mappingJson);
  });

  it("gives every verified row a supported method and unique detail slug", () => {
    const verified = mapping.entries.filter((entry) => entry.status === "verified");
    const destinationSlugs = verified.map((entry) => entry.cafeinSlug);
    expect(verified).toHaveLength(48);
    expect(new Set(destinationSlugs).size).toBe(48);

    for (const entry of verified) {
      expect(entry.cafeinSlug, entry.legacySlug).toBeTruthy();
      expect(
        ["exact_slug", "normalized_name_location", "unique_nationwide_name"],
        entry.legacySlug,
      ).toContain(entry.matchMethod);
    }
    expect(destinationSlugs).not.toContain("eastern-kopi-tm");
  });

  it("keeps every unresolved row useful and non-redirecting", () => {
    for (const entry of mapping.entries.filter((item) => item.status !== "verified")) {
      expect(entry.cafeinSlug, entry.legacySlug).toBeNull();
      expect(entry.evidence, entry.legacySlug).toBeTruthy();
      expect(entry.ownerAction, entry.legacySlug).toBeTruthy();
      const resolution = resolveCafeSlug(entry.legacySlug);
      expect(resolution.kind, entry.legacySlug).toBe("legacy");
    }
  });
});

describe("shared cafe resolver", () => {
  it("resolves every verified row to a temporary cafein detail redirect", () => {
    for (const entry of mapping.entries.filter((item) => item.status === "verified")) {
      const resolution = resolveCafeSlug(entry.legacySlug, "?ref=archive");
      expect(resolution.kind, entry.legacySlug).toBe("redirect");
      if (resolution.kind !== "redirect") continue;
      expect(resolution.status).toBe(302);
      expect(resolution.destinationUrl).toBe(
        `${CAFEIN_ORIGIN}/cafe/${entry.cafeinSlug}?ref=archive`,
      );
    }
  });

  it.each(["not-a-real-cafe", "cafein-only-slug", "known/extra"])(
    "returns not_found for unknown slug %s",
    (slug) => {
      expect(resolveCafeSlug(slug)).toEqual({ kind: "not_found", legacySlug: slug });
    },
  );

  it("preserves and merges query strings without losing repeated values", () => {
    expect(withPreservedQuery("https://cafein.id/cafe/x", "?a=1&a=2"))
      .toBe("https://cafein.id/cafe/x?a=1&a=2");
    expect(withPreservedQuery("https://cafein.id/cafe/x?b=2", "?a=1"))
      .toBe("https://cafein.id/cafe/x?b=2&a=1");
    expect(resolveCafesIndexDestination("?ref=nav"))
      .toBe("https://cafein.id/?ref=nav");
  });
});

describe("explicit edge redirects", () => {
  it("has exactly one temporary redirect per verified slug", () => {
    expect(redirectLines).toHaveLength(48);
    for (const entry of mapping.entries.filter((item) => item.status === "verified")) {
      expect(redirectLines).toContain(
        `/cafes/${entry.legacySlug} ${CAFEIN_ORIGIN}/cafe/${entry.cafeinSlug} 302`,
      );
    }
  });

  it("does not redirect unresolved or unknown slugs with a catch-all", () => {
    for (const entry of mapping.entries.filter((item) => item.status !== "verified")) {
      expect(redirectLines.some((line: string) => line.startsWith(`/cafes/${entry.legacySlug} `)))
        .toBe(false);
    }
    expect(redirectsText).not.toMatch(/\/cafes\/\*/);
    expect(redirectsText).not.toMatch(/\/cafes[^\n]+\s(?:301|308)$/m);
  });
});
