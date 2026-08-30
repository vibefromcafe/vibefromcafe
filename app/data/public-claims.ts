export type PublicChapter = {
  id: "jogja" | "jabodetabek" | "surabaya-malang" | "kuala-lumpur" | "bandung";
  name: string;
  scope: string;
  accent: string;
  tone: string;
  status: "active";
  action: {
    label: string;
    to: "/chapters/jogja" | "/join";
  };
};

/**
 * The complete, owner-confirmed active chapter list.
 * See docs/claims-source-of-truth.md before changing this list or adding numbers.
 */
export const publicChapters = [
  {
    id: "jogja",
    name: "Jogja",
    scope: "Yogyakarta",
    accent: "#f5c400",
    tone: "bg-[#f5c400]",
    status: "active",
    action: { label: "Explore chapter", to: "/chapters/jogja" },
  },
  {
    id: "jabodetabek",
    name: "Jabodetabek",
    scope: "Greater Jakarta",
    accent: "#7bb6ff",
    tone: "bg-[#7bb6ff]",
    status: "active",
    action: { label: "Join community", to: "/join" },
  },
  {
    id: "surabaya-malang",
    name: "Surabaya–Malang",
    scope: "East Java",
    accent: "#79628c",
    tone: "bg-[#79628c]",
    status: "active",
    action: { label: "Join community", to: "/join" },
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    scope: "Kuala Lumpur",
    accent: "#f4a261",
    tone: "bg-[#f4a261]",
    status: "active",
    action: { label: "Join community", to: "/join" },
  },
  {
    id: "bandung",
    name: "Bandung",
    scope: "Bandung",
    accent: "#ff8ca1",
    tone: "bg-[#ff8ca1]",
    status: "active",
    action: { label: "Join community", to: "/join" },
  },
] as const satisfies readonly PublicChapter[];

export const heroProofPoints = [
  "People learning AI across roles",
  "Cafe discovery through cafein.id",
  "Five active local chapters",
] as const;

export type PublicProductExample = {
  code: string;
  name: string;
  category: string;
  copy: string;
  tags: string[];
  accent: string;
  preview: "chat" | "flow" | "search";
  statusLabel: "Service example";
};

/** Illustrative service patterns, not product releases or customer proof. */
export const publicProductExamples: readonly PublicProductExample[] = [
  {
    code: "Example / 01",
    name: "KopiChat",
    category: "AI CUSTOMER SERVICE",
    copy: "An example support-agent pattern for answering from a knowledge base and handing complex conversations to people.",
    tags: ["First-line support", "Multiple channels", "Human handoff"],
    accent: "bg-yellow",
    preview: "chat",
    statusLabel: "Service example",
  },
  {
    code: "Example / 02",
    name: "FlowPilot",
    category: "WORKFLOW AUTOMATION",
    copy: "An example automation pattern for leads, documents, approvals, and updates across tools.",
    tags: ["Lead routing", "Document processing", "Integrations"],
    accent: "bg-[#fa7faa]",
    preview: "flow",
    statusLabel: "Service example",
  },
  {
    code: "Example / 03",
    name: "Insight Desk",
    category: "KNOWLEDGE COPILOT",
    copy: "An example internal-search pattern for answering from team documents with cited sources.",
    tags: ["Retrieval", "Citations", "Access control"],
    accent: "bg-[#79628c]",
    preview: "search",
    statusLabel: "Service example",
  },
];
