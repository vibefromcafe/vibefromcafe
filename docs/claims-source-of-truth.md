# Public claims source-of-truth process

**Purpose:** Keep every public number, deployment badge, customer proof, and chapter-status label honest and maintainable after cutover.  
**Related:** [claims-audit.md](./claims-audit.md), GitHub issue #7.  
**Brand:** Publish as **Vibe From Cafe / VFC** once issue #2 lands. Do not introduce new **VCFC** claims.

## Rules

1. **No public number without a row** in the claims register below (or a successor file owned by content). This includes performance/availability figures (“in seconds”, “24/7”), duration promises, and dataset-derived counts shown as stats.
2. **No “Deployed”, “Live product”, “customers”, or exact member/cafe totals** on the marketing site unless the register row is `status: verified` with source, as-of date, definition, and owner.
3. **Concepts and studio patterns** must be labeled **Service example** or **Concept**—never Deployed/Live.
4. **Chapter “open” / “active”** requires a **meaningful engagement path**: a public join, contact, or event action that routes people into that chapter’s circle. A static page alone is not enough unless that page contains such an action. City names alone are not open chapters.
5. **Do not scrape or publish private group membership.** Counts come only from an owner-exported snapshot stored out of band (or a future approved metrics pipeline), never from ad-hoc agent inference.
6. **cafein.id metrics** stay on cafein unless VFC explicitly co-markets a dated cafein figure with cafein owner sign-off.
7. Prefer **non-quantified** proof (“local chapters”, “cafe notes”, “community join”) over stale numbers.
8. Fictional UI chrome inside an explicitly labeled mock (example order text, SOP page numbers) is allowed only when it cannot be read as a VFC metric and does not use link affordances (no underline+arrow “go” cues without href).

## Claims register (publishable metrics only)

Add a row **before** putting a number or deployment badge in UI.

| claim_id | public_text | definition | source | as_of | owner | review_by | status | surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JGJ-CAFES-001 | “{n} local cafe notes” (Jogja chapter stat) | Count of records in `app/data/cafes.json` with `chapter === "jogja"` | Repository file `app/data/cafes.json` | 2026-07-18 | VFC site content owner (maintainers) | 2026-10-18 | verified | `/chapters/jogja` |
| JGJ-WIFI-001 | Top Wi‑Fi figure from local notes | Max `wifi_speed` field among Jogja records in the same archive (not a live speed test) | Derived from `app/data/cafes.json` | 2026-07-18 | VFC site content owner (maintainers) | 2026-10-18 | verified | `/chapters/jogja` |

**status values:** `verified` | `draft` | `retired`

Until a verified row exists for a **new** number, UI must use qualitative copy only.

### Example row (do not publish until filled with real evidence)

| claim_id | public_text | definition | source | as_of | owner | review_by | status | surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MBR-001 | “N+ community members” | People in onboarded VFC WhatsApp/community roster, unduplicated | Owner CSV export hash + internal note link | YYYY-MM-DD | Community lead | YYYY-MM-DD | draft | `/`, `/join` |

## Product / proof register

| product_id | public_name | class | demo_or_case_url | customer_public? | as_of | owner | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-001 | KopiChat | service_example | — | no | 2026-07-18 | Studio lead | concept |
| EX-002 | FlowPilot | service_example | — | no | 2026-07-18 | Studio lead | concept |
| EX-003 | Insight Desk | service_example | — | no | 2026-07-18 | Studio lead | concept |

**class values:** `deployed_product` | `prototype` | `service_example` | `concept`  
**status values (products):** `concept` | `draft` | `verified` | `retired`

Promotion to `deployed_product` requires **all** of: public demo or case URL, `as_of` date, named owner, and product register `status: verified`. Owner attestation alone is not enough.

## Chapter status register

| chapter_id | public_name | status | engagement_path | member_count_claim | as_of | owner |
| --- | --- | --- | --- | --- | --- | --- |
| jogja | Jogja | open_chapter | `/chapters/jogja`, `/join` | none | 2026-07-18 | Community lead |
| surabaya-malang | Surabaya-Malang | listed_circle | `/join` only | none | 2026-07-18 | Community lead |
| jabodetabek | Jabodetabek | listed_circle | `/join` only | none | 2026-07-18 | Community lead |
| kuala-lumpur | Kuala Lumpur | listed_circle | `/join` only | none | 2026-07-18 | Community lead |
| bandung | Bandung | listed_circle | `/join` only | none | 2026-07-18 | Community lead |

**status values:** `open_chapter` | `listed_circle` | `coming_soon` | `hidden`

IA for destinations/CTAs is issue **#8**. This register only constrains **claims**.

## Update cadence

| Trigger | Action | Owner |
| --- | --- | --- |
| Before any marketing number ships | Add/verify register row; PR references claim_id | Content owner |
| Quarterly or pre-campaign | Re-validate as_of dates; retire stale rows | Content owner |
| Product launch / first customer | Move product class; add URL; update UI label | Studio lead |
| New chapter page goes live with join/contact/event action | Move chapter to `open_chapter` only if engagement path is actionable; still no counts without snapshot | Community lead |
| cafein co-marketing | Written approval + dated cafein figure; never invent VFC index totals | VFC + cafein owners |

## Implementation map (this repo)

| Concern | Where it lives |
| --- | --- |
| Safe public chapter list (no member totals) | `app/data/public-claims.ts` |
| Safe product example list | `app/data/public-claims.ts` |
| Home / join / chapters copy | `app/routes/_index.tsx`, `join.tsx`, `chapters._index.tsx`, `chapters.jogja.tsx`, `contact.tsx` |
| Audit trail | `docs/claims-audit.md` |
| This process | `docs/claims-source-of-truth.md` |

## PR checklist for claim-touching changes

- [ ] No new public integers without a `verified` register row
- [ ] No Deployed/Live/customer proof without product register evidence
- [ ] Concepts labeled Service example / Concept
- [ ] Chapter active/open language matches engagement path
- [ ] No private group URLs, member names, or roster exports committed
- [ ] Tests covering forbidden claim strings still pass
