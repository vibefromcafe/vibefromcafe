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
  destinationUrl: string;
}

export interface CafeMappingEntry {
  legacySlug: string;
  legacyName: string;
  legacyMapLocation: string | null;
  legacyPath: string;
  status: CafeMappingStatus;
  matchMethod: string | null;
  cafeinSlug: string | null;
  cafeinPath: string | null;
  destinationUrl: string | null;
  redirect: boolean;
  evidence: string;
  candidates?: CafeMappingCandidate[];
  ownerAction?: string;
}

export interface CafeUrlMappingDocument {
  version: number;
  generatedForIssue: number;
  brand: string;
  legacyOrigin: string;
  destinationOrigin: string;
  destinationDetailRoute: string;
  redirectStatusTemporary: number;
  redirectStatusPermanentCandidates: number[];
  permanentRedirectRecommendation: string;
  queryStringPolicy: string;
  counts: {
    totalLegacySlugs: number;
    verified: number;
    ambiguous: number;
    unmatched: number;
    intentionallyRetired: number;
    redirecting: number;
    legacyFallback: number;
  };
  verification: {
    method: string;
    supabaseHost: string;
    matchedBy: string[];
    notUsed: string[];
  };
  entries: CafeMappingEntry[];
}

export type CafeSlugResolution =
  | {
      kind: "redirect";
      legacySlug: string;
      destinationUrl: string;
      status: typeof TEMPORARY_REDIRECT_STATUS;
      entry: CafeMappingEntry;
    }
  | {
      kind: "legacy";
      legacySlug: string;
      entry: CafeMappingEntry;
      cafe: Cafe;
    }
  | {
      kind: "not_found";
      legacySlug: string;
    };

const mapping = cafeUrlMapping as CafeUrlMappingDocument;
const cafeBySlug = new Map((cafes as Cafe[]).map((cafe) => [cafe.slug, cafe]));
const entryBySlug = new Map(
  mapping.entries.map((entry) => [entry.legacySlug, entry]),
);

export function getCafeUrlMapping(): CafeUrlMappingDocument {
  return mapping;
}

export function listArchivedCafeSlugs(): string[] {
  return (cafes as Cafe[]).map((cafe) => cafe.slug).sort();
}

export function getCafeMappingEntry(
  slug: string,
): CafeMappingEntry | undefined {
  return entryBySlug.get(slug);
}

export function getArchivedCafe(slug: string): Cafe | undefined {
  return cafeBySlug.get(slug);
}

/** Append original search (including `?`) onto a destination URL. */
export function withPreservedQuery(
  destinationUrl: string,
  search: string,
): string {
  if (!search) return destinationUrl;
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return destinationUrl;
  const hashIndex = destinationUrl.indexOf("#");
  const beforeHash =
    hashIndex === -1 ? destinationUrl : destinationUrl.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : destinationUrl.slice(hashIndex);
  const separator = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${separator}${query}${hash}`;
}

export function cafeinDetailUrl(cafeinSlug: string): string {
  return `${CAFEIN_ORIGIN}/cafe/${cafeinSlug}`;
}

export function resolveCafeSlug(
  slug: string,
  search = "",
): CafeSlugResolution {
  const entry = entryBySlug.get(slug);

  if (entry?.redirect && entry.destinationUrl) {
    return {
      kind: "redirect",
      legacySlug: slug,
      destinationUrl: withPreservedQuery(entry.destinationUrl, search),
      status: TEMPORARY_REDIRECT_STATUS,
      entry,
    };
  }

  if (entry && !entry.redirect) {
    const cafe = cafeBySlug.get(slug);
    if (!cafe) {
      return { kind: "not_found", legacySlug: slug };
    }
    return {
      kind: "legacy",
      legacySlug: slug,
      entry,
      cafe,
    };
  }

  // Known archived cafe without mapping row should still never 404 if present in data.
  const cafe = cafeBySlug.get(slug);
  if (cafe) {
    return {
      kind: "legacy",
      legacySlug: slug,
      entry: {
        legacySlug: slug,
        legacyName: cafe.name,
        legacyMapLocation: cafe.map_location,
        legacyPath: `/cafes/${slug}`,
        status: "unmatched",
        matchMethod: null,
        cafeinSlug: null,
        cafeinPath: null,
        destinationUrl: null,
        redirect: false,
        evidence:
          "Archived cafe present in deprecated dataset without a verified cafein destination.",
      },
      cafe,
    };
  }

  return { kind: "not_found", legacySlug: slug };
}

export function resolveCafesIndexDestination(search = ""): string {
  return withPreservedQuery(CAFEIN_ORIGIN, search);
}
