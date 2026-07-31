/**
 * Public-safe marketing claims for the VFC site.
 *
 * Rules (see docs/claims-source-of-truth.md):
 * - No member totals, cafe index totals, or “N active groups” without a verified register row
 *   and a confirmed human owner (not a role placeholder).
 * - Products here are service examples / concepts unless promoted in the product register.
 * - Do not publish chapter “open” / “active” until a chapter-specific engagement path is
 *   owner-confirmed. A generic /join is not enough.
 *
 * Brand rename (Vibe From Cafe / VFC) is owned by issue #2. This module avoids
 * deployment badges and quantified social proof only.
 */

export type ChapterPublicStatus = "has_page" | "listed_circle";

export type PublicChapterClaim = {
  name: string;
  scope: string;
  focus: string;
  status: ChapterPublicStatus;
  /** Human-readable status for cards — never a member count or active/open claim. */
  detail: string;
  tone: string;
  accent: string;
  /** Only set when a real in-app destination exists. */
  to?: string;
};

export type PublicProductExample = {
  code: string;
  name: string;
  category: string;
  copy: string;
  tags: string[];
  accent: string;
  preview: "chat" | "flow" | "search";
  /** Always a non-deployment label until product register says otherwise. */
  statusLabel: "Service example" | "Concept";
};

/** Hero proof line — qualitative only. */
export const heroProofPoints = [
  { icon: "users" as const, label: "Community of AI practitioners" },
  { icon: "coffee" as const, label: "Cafe workspaces via cafein.id" },
  { icon: "map" as const, label: "Local circles across cities" },
] as const;

/**
 * Chapters listed for orientation. Member counts and active/open status intentionally omitted.
 * Destinations beyond Jogja are issue #8. Jogja has a page but chapter-specific engagement
 * is owner-unconfirmed (generic /join only) — do not label open/active.
 */
export const publicChapters: PublicChapterClaim[] = [
  {
    name: "Jogja",
    scope: "Yogyakarta",
    focus: "Local chapter page for Yogyakarta cafe-context notes",
    status: "has_page",
    detail: "Chapter page",
    tone: "bg-[#f5c400]",
    accent: "#f5c400",
    to: "/chapters/jogja",
  },
  {
    name: "Surabaya-Malang",
    scope: "East Java",
    focus: "East Java builders and cafe sessions",
    status: "listed_circle",
    detail: "Local circle",
    tone: "bg-[#79628c]",
    accent: "#79628c",
  },
  {
    name: "Jabodetabek",
    scope: "Greater Jakarta",
    focus: "Jakarta, Bogor, Depok, Tangerang, Bekasi",
    status: "listed_circle",
    detail: "Local circle",
    tone: "bg-[#7bb6ff]",
    accent: "#7bb6ff",
  },
  {
    name: "Kuala Lumpur",
    scope: "Kuala Lumpur",
    focus: "Malaysia-based community circle",
    status: "listed_circle",
    detail: "Local circle",
    tone: "bg-[#f4a261]",
    accent: "#f4a261",
  },
  {
    name: "Bandung",
    scope: "Bandung",
    focus: "Bandung builders and cafe sessions",
    status: "listed_circle",
    detail: "Local circle",
    tone: "bg-[#ff8ca1]",
    accent: "#ff8ca1",
  },
];

/** Named patterns for the studio offer — not deployed product proofs. */
export const publicProductExamples: PublicProductExample[] = [
  {
    code: "Example / 01",
    name: "KopiChat",
    category: "AI CUSTOMER SERVICE",
    copy: "Example support-agent pattern for WhatsApp and web: answer from a knowledge base, then hand complex threads to humans.",
    tags: ["First-line support", "Omnichannel", "Human handoff"],
    accent: "bg-yellow",
    preview: "chat",
    statusLabel: "Service example",
  },
  {
    code: "Example / 02",
    name: "FlowPilot",
    category: "WORKFLOW AUTOMATION",
    copy: "Example automation pattern for leads, documents, approvals, and cross-tool updates without repetitive copy-paste.",
    tags: ["Lead routing", "Document AI", "Integrations"],
    accent: "bg-[#fa7faa]",
    preview: "flow",
    statusLabel: "Service example",
  },
  {
    code: "Example / 03",
    name: "Insight Desk",
    category: "KNOWLEDGE COPILOT",
    copy: "Example internal-search pattern that answers from SOPs and documents with cited sources.",
    tags: ["RAG", "Citations", "Private data"],
    accent: "bg-[#79628c]",
    preview: "search",
    statusLabel: "Service example",
  },
];

export const joinAsideHighlight = {
  title: "People across roles",
  body: "Designers, engineers, founders, marketers, researchers, and the curious—learning in public together.",
} as const;
