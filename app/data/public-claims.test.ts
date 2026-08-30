import { describe, expect, it } from "vitest";
import homeSource from "../routes/_index.tsx?raw";
import chaptersSource from "../routes/chapters._index.tsx?raw";
import jogjaSource from "../routes/chapters.jogja.tsx?raw";
import {
  heroProofPoints,
  publicChapters,
  publicProductExamples,
} from "./public-claims";
import claimsSource from "./public-claims.ts?raw";

const forbiddenClaims = [
  "400+ community members",
  "4,000+ cafes indexed",
  "258 members",
  "88 members",
  "40 members",
  "18 members",
  "9 members",
  "5 active groups",
  "ready to customize",
  "Live product",
  "Deployed",
  "Deployment",
  "24/7 support",
  "Nadia Putri",
  "two-hour",
  "1–2 minggu",
  "Deprecated Cafe Data",
  "Deprecated cafe data",
  "archived dataset",
  "archived cafe dataset",
] as const;

const forbiddenClaimPatterns = [
  /\b\d[\d,]*\+?\s+(?:community\s+)?members?\b/i,
  /\b\d[\d,]*\+?\s+cafes?\s+indexed\b/i,
  /\b\d+\s+active\s+groups?\b/i,
] as const;

const claimOwnedSources = [
  ["app/data/public-claims.ts", claimsSource],
  ["app/routes/_index.tsx", homeSource],
  ["app/routes/chapters._index.tsx", chaptersSource],
  ["app/routes/chapters.jogja.tsx", jogjaSource],
] as const;

describe("canonical public claims", () => {
  it("contains exactly the five owner-confirmed active chapters", () => {
    expect(publicChapters.map(({ name }) => name)).toEqual([
      "Jogja",
      "Jabodetabek",
      "Surabaya–Malang",
      "Kuala Lumpur",
      "Bandung",
    ]);
    expect(publicChapters.every(({ status }) => status === "active")).toBe(true);
  });

  it("gives every active chapter a useful destination", () => {
    expect(publicChapters.find(({ id }) => id === "jogja")?.action.to).toBe("/chapters/jogja");
    expect(publicChapters.filter(({ id }) => id !== "jogja").every(({ action }) => action.to === "/join")).toBe(true);
  });

  it("does not attach member counts to chapters", () => {
    for (const chapter of publicChapters) {
      expect(chapter).not.toHaveProperty("memberCount");
      expect(JSON.stringify(chapter)).not.toMatch(/\bmembers?\b/i);
    }
  });

  it("keeps the homepage proof points to accepted qualitative or chapter facts", () => {
    expect(heroProofPoints).toEqual([
      "People learning AI across roles",
      "Cafe discovery through cafein.id",
      "Five active local chapters",
    ]);
  });

  it("labels every unverified product as an example", () => {
    for (const product of publicProductExamples) {
      expect(product.statusLabel).toBe("Service example");
      expect(product.code).toMatch(/^Example \/ /);
      expect(product.copy).toMatch(/^An example /);
    }
  });
});

describe("claim-owned public surfaces", () => {
  it("do not silently restore unsupported claims or internal data terms", () => {
    for (const [path, source] of claimOwnedSources) {
      for (const claim of forbiddenClaims) {
        expect(source, `${path} contains ${claim}`).not.toContain(claim);
      }
      for (const pattern of forbiddenClaimPatterns) {
        expect(source, `${path} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("renders every chapter from the canonical source", () => {
    expect(homeSource).toContain("publicChapters.map");
    expect(chaptersSource).toContain("publicChapters.map");
    expect(homeSource).toContain("to={chapter.action.to}");
    expect(chaptersSource).toContain("to={chapter.action.to}");
  });

  it("does not derive cafe counts or performance claims on the Jogja page", () => {
    expect(jogjaSource).not.toContain("cafes.json");
    expect(jogjaSource).not.toContain("wifi_speed");
    expect(jogjaSource).not.toMatch(/Mbps/);
  });

  it("does not imply that unlinked service examples have destinations", () => {
    expect(homeSource).not.toContain("ExternalLink");
    expect(homeSource).not.toMatch(/product-card group/);
  });
});
