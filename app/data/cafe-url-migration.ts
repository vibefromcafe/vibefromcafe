import cafeUrlMapping from "./cafe-url-mapping.json";
import cafes from "./cafes.json";
import type { Cafe } from "./types";

export const CAFEIN_ORIGIN = "https://cafein.id" as const;
export const TEMPORARY_REDIRECT_STATUS = 302 as const;

export type CafeMappingStatus =
  | "verified"
  | "ambiguous"
  | "unmatched"
  | "intentionally_retired";

export interface CafeMappingCandidate {
  cafeinSlug: string;
  label: string;
}

export interface CafeMappingEntry {
  legacySlug: string;
  status: CafeMappingStatus;
  matchMethod: string | null;
  cafeinSlug: string | null;
  evidence?: string;
  candidates?: CafeMappingCandidate[];
  ownerAction?: string;
}

export interface CafeUrlMappingDocument {
  version: number;
  generatedForIssue: number;
  legacyOrigin: string;
  destinationOrigin: string;
  destinationDetailRoute: string;
  redirectStatusTemporary: number;
  counts: {
    totalLegacySlugs: number;
    verified: number;
    ambiguous: number;
    unmatched: number;
    intentionallyRetired: number;
    redirecting: number;
    legacyFallback: number;
  };
  entries: CafeMappingEntry[];
}

export type CafeSlugResolution =
  | {
      kind: "redirect";
      destinationUrl: string;
      status: typeof TEMPORARY_REDIRECT_STATUS;
      entry: CafeMappingEntry;
    }
  | { kind: "legacy"; entry: CafeMappingEntry; cafe: Cafe }
  | { kind: "not_found"; legacySlug: string };

const mapping = cafeUrlMapping as CafeUrlMappingDocument;
const archivedCafes = cafes as Cafe[];
const cafeBySlug = new Map(archivedCafes.map((cafe) => [cafe.slug, cafe]));
const entryBySlug = new Map(
  mapping.entries.map((entry) => [entry.legacySlug, entry]),
);

export function getCafeUrlMapping(): CafeUrlMappingDocument {
  return mapping;
}

export function listArchivedCafeSlugs(): string[] {
  return archivedCafes.map((cafe) => cafe.slug).sort();
}

export function cafeinDetailUrl(slug: string): string {
  return `${CAFEIN_ORIGIN}/cafe/${slug}`;
}

export function withPreservedQuery(destination: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return destination;

  const url = new URL(destination);
  const incoming = new URLSearchParams(query);
  incoming.forEach((value, key) => url.searchParams.append(key, value));
  return url.toString();
}

export function resolveCafeSlug(
  slug: string,
  search = "",
): CafeSlugResolution {
  const entry = entryBySlug.get(slug);
  if (!entry) return { kind: "not_found", legacySlug: slug };

  if (entry.status === "verified" && entry.cafeinSlug) {
    return {
      kind: "redirect",
      destinationUrl: withPreservedQuery(
        cafeinDetailUrl(entry.cafeinSlug),
        search,
      ),
      status: TEMPORARY_REDIRECT_STATUS,
      entry,
    };
  }

  const cafe = cafeBySlug.get(slug);
  return cafe
    ? { kind: "legacy", entry, cafe }
    : { kind: "not_found", legacySlug: slug };
}

export function resolveCafesIndexDestination(search = ""): string {
  return withPreservedQuery(CAFEIN_ORIGIN, search);
}
