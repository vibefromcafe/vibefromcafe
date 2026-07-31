import { describe, expect, it } from "vitest";
import homeSource from "../routes/_index.tsx?raw";
import chaptersSource from "../routes/chapters._index.tsx?raw";
import jogjaSource from "../routes/chapters.jogja.tsx?raw";
import joinSource from "../routes/join.tsx?raw";
import contactSource from "../routes/contact.tsx?raw";
import eventsSource from "../routes/events._index.tsx?raw";
import {
  heroProofPoints,
  joinAsideHighlight,
  publicChapters,
  publicProductExamples,
} from "./public-claims";
import publicClaimsSource from "./public-claims.ts?raw";

/** Exact legacy claim strings that must not return on claim-owned surfaces. */
const forbiddenExact = [
  "400+ community members",
  "400+ members",
  "4,000+ cafes indexed",
  "4000+ cafes",
  "5 active groups",
  "258 members",
  "40 members",
  "88 members",
  "18 members",
  "9 members",
  "ready to customize",
  "Live product / VCFC-001",
  "Live product",
  "Nadia Putri",
  "Active group",
  "Open chapter",
  "open_chapter",
  "Lacak paket →",
  "answered in seconds",
  "24/7 support",
  "1–2 minggu",
  "1-2 minggu",
  "three new friends",
  "two-hour, hands-on",
  "Two focused hours",
  "Built for production",
  "sampai production",
  "marked open",
] as const;

/**
 * Word-boundary checks for deployment / active badges. Avoid matching
 * explanatory negatives by requiring standalone badge forms.
 */
const forbiddenBadgePatterns: RegExp[] = [
  /\bDeployed\b/,
  /\bVCFC\s*\/\s*00\d\b/i,
  />\s*Open\s*</,
  /"Open chapter"/,
  /'Open chapter'/,
];

const claimOwnedSources: Array<{ path: string; source: string }> = [
  { path: "app/data/public-claims.ts", source: publicClaimsSource },
  { path: "app/routes/_index.tsx", source: homeSource },
  { path: "app/routes/chapters._index.tsx", source: chaptersSource },
  { path: "app/routes/chapters.jogja.tsx", source: jogjaSource },
  { path: "app/routes/join.tsx", source: joinSource },
  { path: "app/routes/contact.tsx", source: contactSource },
  { path: "app/routes/events._index.tsx", source: eventsSource },
];

function collectModuleText(): string {
  const parts: string[] = [
    ...heroProofPoints.map((point) => point.label),
    joinAsideHighlight.title,
    joinAsideHighlight.body,
  ];

  for (const chapter of publicChapters) {
    parts.push(chapter.name, chapter.scope, chapter.focus, chapter.detail, chapter.to ?? "", chapter.status);
  }

  for (const product of publicProductExamples) {
    parts.push(
      product.code,
      product.name,
      product.category,
      product.copy,
      product.statusLabel,
      ...product.tags,
    );
  }

  return parts.join("\n");
}

describe("public claims data", () => {
  it("exposes only qualitative hero proof points", () => {
    expect(heroProofPoints).toHaveLength(3);
    for (const point of heroProofPoints) {
      expect(point.label).not.toMatch(/\d/);
    }
  });

  it("omits member counts and open/active chapter status", () => {
    expect(publicChapters.some((chapter) => chapter.to === "/chapters/jogja")).toBe(true);
    for (const chapter of publicChapters) {
      expect(chapter).not.toHaveProperty("memberCount");
      expect(chapter.detail.toLowerCase()).not.toContain("member");
      expect(chapter.detail.toLowerCase()).not.toMatch(/\b(active|open)\b/);
      expect(chapter.status).not.toBe("open_chapter");
      expect(["has_page", "listed_circle"]).toContain(chapter.status);
    }
  });

  it("labels products as service examples, not deployments", () => {
    for (const product of publicProductExamples) {
      expect(["Service example", "Concept"]).toContain(product.statusLabel);
      expect(product.code.toLowerCase()).not.toContain("vcfc");
      expect(product.copy.toLowerCase()).toMatch(/example/);
    }
  });

  it("keeps join aside non-quantified", () => {
    expect(joinAsideHighlight.title).not.toMatch(/\d/);
    expect(joinAsideHighlight.body).not.toMatch(/\d/);
  });

  it("does not encode unsupported claims in the shared module exports", () => {
    const text = collectModuleText();
    for (const fragment of forbiddenExact) {
      expect(text, `module export contains: ${fragment}`).not.toContain(fragment);
    }
  });
});

describe("claim-owned route surfaces", () => {
  it("do not reintroduce unsupported quantified, deployment, open, or faux-link claims", () => {
    for (const { path, source } of claimOwnedSources) {
      for (const fragment of forbiddenExact) {
        expect(source, `${path} contains forbidden fragment: ${fragment}`).not.toContain(fragment);
      }
      for (const pattern of forbiddenBadgePatterns) {
        expect(source, `${path} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("does not publish per-cafe Wi-Fi Mbps figures on the Jogja chapter page", () => {
    expect(jogjaSource).not.toMatch(/wifi_speed\} Mbps/);
    expect(jogjaSource).not.toMatch(/\{cafe\.wifi_speed\}/);
    expect(jogjaSource).not.toMatch(/topCafes\[0\]\?\.wifi_speed/);
  });

  it("does not put external-link icons on non-linked product showcase cards", () => {
    expect(homeSource).not.toMatch(/ExternalLink/);
    expect(homeSource).not.toMatch(/ready to customize/i);
  });

  it("uses white-on-dark primary for the chapters Express interest CTA", () => {
    expect(chaptersSource).toContain("button-primary");
    expect(chaptersSource).not.toMatch(/Express interest[\s\S]{0,80}bg-yellow/);
    expect(chaptersSource).not.toMatch(/bg-yellow text-midnight[\s\S]{0,40}Express interest/);
  });

  it("links only chapters that declare a destination", () => {
    const linked = publicChapters.filter((chapter) => chapter.to);
    expect(linked).toHaveLength(1);
    expect(linked[0]?.name).toBe("Jogja");
    expect(linked[0]?.status).toBe("has_page");
    expect(homeSource).toContain("to={chapter.to}");
    expect(chaptersSource).toContain("chapter.to");
  });
});
