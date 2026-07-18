# Public claims source-of-truth process

**Purpose:** Keep every public number, deployment badge, customer proof, and chapter-status label honest and maintainable after cutover.

**Related:** [claims-audit.md](./claims-audit.md), GitHub issue #7.

**Brand:** Publish as **Vibe From Cafe / VFC** once issue #2 lands. Do not introduce new **VCFC** claims. **#2 is an explicit blocker** for full claims cutover closure.

**Owner note:** Until a named human is confirmed, every `owner` cell below is **owner-unconfirmed / TBD**. Role labels (“maintainers”, “Studio lead”, “Community lead”, “Content owner”) are **not** verified owners.

## Rules

1. **No public number without a row** in the claims register below (or a successor file). This includes performance/availability figures (“in seconds”, “24/7”), duration promises (“two hours”), dataset-derived counts, and per-item metric pills (e.g. per-cafe Mbps).
2. **No “Deployed”, “Live product”, “customers”, or exact member/cafe totals** on the marketing site unless the register row is `status: verified` with source, as-of date, definition, and a **named human owner**.
3. **Concepts and studio patterns** must be labeled **Service example** or **Concept**—never Deployed/Live.
4. **Chapter “open” / “active”** requires a **chapter-specific** meaningful engagement path: join, contact, or event action that routes people **into that chapter’s circle**. A static page alone is not enough. A **generic site-wide `/join`** is **not** chapter-specific engagement. City names alone are not open chapters.
5. **Do not scrape or publish private group membership.** Counts come only from an owner-exported snapshot stored out of band (or a future approved metrics pipeline), never from ad-hoc agent inference.
6. **cafein.id metrics** stay on cafein unless VFC explicitly co-markets a dated cafein figure with cafein owner sign-off.
7. Prefer **non-quantified** proof (“local chapters”, “cafe notes”, “community join”) over stale numbers.
8. Fictional UI chrome inside an explicitly labeled mock (example order text, SOP page numbers) is allowed only when it cannot be read as a VFC metric and does not use link affordances (no underline+arrow “go” cues without href).
9. **Owners must be named humans** (or a named role with a named incumbent). Placeholder roles stay `owner-unconfirmed / TBD` and cannot alone support `verified` status for new claims that need accountability.

## Claims register (publishable metrics only)

Add a row **before** putting a number or deployment badge in UI.

| claim_id | public_text | definition | source | as_of | owner | review_by | status | surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JGJ-CAFES-001 | “{n} local cafe notes” (Jogja chapter stat) | Count of records in `app/data/cafes.json` with `chapter === "jogja"` | Repository file `app/data/cafes.json` | 2026-07-18 | owner-unconfirmed / TBD | 2026-10-18 | draft (dataset-derived; human owner TBD) | `/chapters/jogja` |

**status values:** `verified` | `draft` | `retired`

Notes:

- JGJ-CAFES-001 may remain on the page as an archive array length only while owner is TBD; it must not be marketed as a national index or live directory size.
- Aggregate top Wi‑Fi and per-cafe Mbps figures are **not** registered for public display (see audit C11, C16) until measurement method + named owner exist.
- Until a **verified** row with a **named owner** exists for a **new** number, UI must use qualitative copy only.

### Example row (do not publish until filled with real evidence)

| claim_id | public_text | definition | source | as_of | owner | review_by | status | surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MBR-001 | “N+ community members” | People in onboarded VFC WhatsApp/community roster, unduplicated | Owner CSV export hash + internal note link | YYYY-MM-DD | owner-unconfirmed / TBD | YYYY-MM-DD | draft | `/`, `/join` |

## Product / proof register

| product_id | public_name | class | demo_or_case_url | customer_public? | as_of | owner | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-001 | KopiChat | service_example | — | no | 2026-07-18 | owner-unconfirmed / TBD | concept |
| EX-002 | FlowPilot | service_example | — | no | 2026-07-18 | owner-unconfirmed / TBD | concept |
| EX-003 | Insight Desk | service_example | — | no | 2026-07-18 | owner-unconfirmed / TBD | concept |

**class values:** `deployed_product` | `prototype` | `service_example` | `concept`

**status values (products):** `concept` | `draft` | `verified` | `retired`

Promotion to `deployed_product` requires **all** of: public demo or case URL, `as_of` date, **named human owner**, and product register `status: verified`. Role placeholders and owner attestation alone are not enough.

## Chapter status register

| chapter_id | public_name | status | engagement_path | member_count_claim | as_of | owner |
| --- | --- | --- | --- | --- | --- | --- |
| jogja | Jogja | has_page | `/chapters/jogja` (page only); site-wide `/join` is **not** chapter-specific | none | 2026-07-18 | owner-unconfirmed / TBD |
| surabaya-malang | Surabaya-Malang | listed_circle | none chapter-specific | none | 2026-07-18 | owner-unconfirmed / TBD |
| jabodetabek | Jabodetabek | listed_circle | none chapter-specific | none | 2026-07-18 | owner-unconfirmed / TBD |
| kuala-lumpur | Kuala Lumpur | listed_circle | none chapter-specific | none | 2026-07-18 | owner-unconfirmed / TBD |
| bandung | Bandung | listed_circle | none chapter-specific | none | 2026-07-18 | owner-unconfirmed / TBD |

**status values:** `has_page` | `listed_circle` | `open_chapter` | `coming_soon` | `hidden`

Move to `open_chapter` only when **all** are true: chapter-specific engagement path, named owner confirmation, and still no member counts without snapshot.

IA for destinations/CTAs is issue **#8**. This register only constrains **claims**.

## Update cadence

| Trigger | Action | Owner |
| --- | --- | --- |
| Before any marketing number ships | Add/verify register row; PR references claim_id | owner-unconfirmed / TBD |
| Quarterly or pre-campaign | Re-validate as_of dates; retire stale rows | owner-unconfirmed / TBD |
| Product launch / first customer | Move product class; add URL; update UI label | owner-unconfirmed / TBD |
| New chapter page goes live with **chapter-specific** join/contact/event action | May move chapter to `open_chapter` only if engagement path is chapter-specific and named owner confirms; still no counts without snapshot | owner-unconfirmed / TBD |
| cafein co-marketing | Written approval + dated cafein figure; never invent VFC index totals | owner-unconfirmed / TBD (VFC + cafein) |

## Implementation map (this repo)

| Concern | Where it lives |
| --- | --- |
| Safe public chapter list (no member totals; no open/active without proof) | `app/data/public-claims.ts` |
| Safe product example list | `app/data/public-claims.ts` |
| Home / join / chapters / events copy | `app/routes/_index.tsx`, `join.tsx`, `chapters._index.tsx`, `chapters.jogja.tsx`, `contact.tsx`, `events._index.tsx` |
| Audit trail | `docs/claims-audit.md` |
| This process | `docs/claims-source-of-truth.md` |

## PR checklist for claim-touching changes

- [ ] No new public integers without a register row (and named owner before calling it verified)
- [ ] No Deployed/Live/customer proof without product register evidence
- [ ] Concepts labeled Service example / Concept
- [ ] No chapter open/active language without chapter-specific engagement
- [ ] No private group URLs, member names, or roster exports committed
- [ ] Owner fields are named humans or explicitly `owner-unconfirmed / TBD`
- [ ] Tests covering forbidden claim strings still pass
- [ ] `git diff --check` clean (no trailing whitespace)
