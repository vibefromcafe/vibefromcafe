# Public claims audit (issue #7)

**As-of:** 2026-07-18

**Process steward:** owner-unconfirmed / TBD (not a verified human owner)

**Scope:** Quantitative, product, deployment, customer, production-capability, and chapter-status claims on the replacement site.

**Brand note:** Approved public brand is **Vibe From Cafe / VFC**. “Vibe Coding From Cafe / VCFC” is owned by issue **#2** and is not re-decided here. Community purpose is broader than coding. **#2 remains an explicit blocker** for full issue closure.

## Method

1. Inventory every public claim in this repository’s user-visible surfaces.
2. Seek an authoritative source, as-of date, definition, and **confirmed human owner** (role placeholders are not owners).
3. Compare with legacy public site (`zainfathoni/vibefromcafe` / live `vibefromcafe.id`) and cafe directory product (`cafein.id`) **without** reading private group membership or member PII.
4. Mark each claim: **verified** | **stale** | **ambiguous** | **unsupported**.
5. Replace unsupported public numbers and deployment/customer assertions with non-quantified, non-deployment copy in this branch.
6. Report IA / affordance overlap with **#8** (chapters) and **#14** (a11y / clickable cards) rather than absorbing those issues.

## Definitions used in this audit

| Term | Working definition |
| --- | --- |
| Community member | A person who has completed community onboarding into a VFC group channel. Exact count requires an owned roster snapshot; not published from this repo. |
| Cafe indexed (VFC) | Cafe records owned/published by VFC itself. Local seed is `app/data/cafes.json` (Jogja-only archive). |
| Cafe catalog (cafein.id) | Separate product; counts belong to cafein.id and must not be restated as VFC stats without a dated owner snapshot. |
| Open / active chapter | A place-based circle with a **chapter-specific** public engagement path (join/contact/event that routes into that chapter). A static page plus generic site-wide `/join` is **not** sufficient. Listing a city name alone is not open/active. |
| Deployed / live product | A named product with a real customer or public demo URL and an owner-attested production status. |
| Service example / concept | Illustrative offer pattern, not a shipped SKU or customer proof. |
| Owner | A named accountable human (or named role with a named incumbent). Strings like “maintainers”, “Studio lead”, or “Community lead” alone are **owner-unconfirmed / TBD**. |

## Claim inventory and disposition

| ID | Claim (pre-fix) | Surface | Classification | Evidence sought | Finding | Public disposition (this PR) |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | “400+ community members” | Home hero; `/join` aside | **unsupported** | Owned member roster with as-of date; definition of “member” | No roster, snapshot, or public count in this repo, legacy repo, or public `vibefromcafe.id` HTML. Private WhatsApp/group sizes were **not** inspected. | Removed. Replaced with non-quantified community copy. |
| C2 | “4,000+ cafes indexed” | Home hero | **unsupported** (as a VFC claim) | VFC-owned cafe index count | VFC seed/legacy `cafes.json` has **56** Jogja records, not 4,000+. cafein.id markets **45,000+** cafes in its own metadata (`cafein.id/index.html`, docs). That is a **cafein** product claim, not a verified VFC index figure, and 4,000+ does not match either source. | Removed. Replaced with qualitative cafe-discovery pointer to cafein.id (no count). |
| C3 | “5 active groups” | Home hero | **unsupported** / **ambiguous** | Definition of active + engagement path per group | Five city names are listed in replacement UI only. Legacy public site shows **Jogja active**, Jakarta/Bandung **coming soon**—no five-group active claim. No public join destinations per listed group in this repo. | Removed. Replaced with “Local circles across cities” (no active count). |
| C4 | Per-chapter member counts (258 / 40 / 88 / 18 / 9) | Home chapters; `/chapters` | **unsupported** | Group roster snapshots | Hard-coded in UI with no source file, date, or owner. Not present on legacy public chapter pages. Private group data not used. | Removed from public UI. |
| C5 | Every listed chapter is an “Active group” | Home chapter cards | **unsupported** | Engagement path + activity evidence | Only `/chapters/jogja` exists. Other cards have no destination. Legacy does not mark five cities active. | Removed. Non-Jogja = local circles; Jogja = “Chapter page” only (not open/active). |
| C6 | “Live product / … Deployed” (KopiChat hero card) | Home hero | **unsupported** | Demo URL, customer reference, deploy evidence | No demo link, case study, customer name, or deploy proof in repo. Card is a static illustration. | Relabeled **Service example** / **Concept**. |
| C7 | Product showcase “ready to customize” + external-link icon | Home showcase | **unsupported** / **misleading** | Product URLs or customization offers tied to live SKUs | Cards are static mock previews with no href. External-link icon implies destinations. | Relabeled **Service example**. Removed external-link affordance. |
| C8 | Named products KopiChat / FlowPilot / Insight Desk as shipped products | Home showcase | **ambiguous** → treated as **concepts** | Case studies / demos | No public demos or customer evidence found. Copy described capabilities as if productized. | Kept as **named service examples / concepts**, not deployed products. |
| C9 | “Built for production” / “sampai production” service language | Home services; `/contact` | **ambiguous** | Portfolio of production deliveries | Aspirational studio language without cited customers. Not a numeric falsehood, but overclaims delivery proof if read as track record. | Softened to workflow/real-use language without asserting a production portfolio. |
| C10 | Jogja cafe count from `cafes.json` | `/chapters/jogja` | **verified** (dataset size only; owner TBD) | `app/data/cafes.json` | Count equals array length for `chapter === "jogja"` (**56** as of this audit). Dataset is archived for browsing; cafe browsing is cafein.id (**#3** / ADR 0002). Register row **JGJ-CAFES-001** (owner-unconfirmed). | Keep as “local cafe notes” wording; do not market as national index. |
| C11 | Top Wi‑Fi figure (aggregate hero) from archive | `/chapters/jogja` | **ambiguous** as public performance claim | Same JSON + measurement protocol | Derived max of seed field only; not a live speed test; no measurement date/method/owner. | **Removed** from public hero stats (no longer shown). |
| C12 | Jogja “Active” / “Open” chapter | Home; `/chapters`; `/chapters/jogja` | **unsupported** under chapter-specific engagement rule | Chapter-specific join/contact/event path | Legacy treats Jogja as first chapter. Replacement `/join` is **site-wide generic**, not chapter-routed. Page alone is insufficient per process rule. | **Not** labeled open/active. Public detail = “Chapter page”. Owner decision required before open/active. Full IA in **#8**. |
| C13 | Testimonial attributed to “Nadia Putri” | Home | **unsupported** | Permissioned quote source | No source, date, or release on file. Reads as fabricated social proof. | Removed. |
| C14 | “Community-powered AI studio” positioning | Metadata / hero | **out of scope (#2)** | Brand decision | Approved direction in #2 is broader VFC community first. | Not rewritten for brand rename here; flagged for **#2**. Claims work avoids adding new VCFC product-deploy language. |
| C15 | “Two focused hours” (build session duration) | `/events` format cards | **unsupported** | Scheduled session length policy + owner | Hard-coded marketing duration with no event policy source, as-of date, or confirmed owner. | Softened to “Hands-on time” (non-quantified). |
| C16 | Per-cafe Wi‑Fi Mbps pills (top 6 Jogja cards) | `/chapters/jogja` cafe cards | **unsupported** as public performance claims | Per-cafe measurement source, date, method, owner | Values come from archived `wifi_speed` fields in `cafes.json` without measurement protocol, freshness, or confirmed owner. Publishing six numeric speeds implies live/attested performance. | **Removed** from public pills. Cards keep name/location/amenities only; live cafe data pointed to cafein.id. |

## Product card classification

| Name | Prior implied status | Classification after audit | Public label |
| --- | --- | --- | --- |
| KopiChat | Live / Deployed / ready to customize | **Service example / concept** | Service example |
| FlowPilot | ready to customize | **Service example / concept** | Service example |
| Insight Desk | ready to customize | **Service example / concept** | Service example |

No card is published as a deployed product or customer case study until a **confirmed owner** attaches a demo/case URL and as-of date in the source-of-truth process.

## Chapter status (claims only; IA in #8)

| Place | Public page | Legacy public stance | Member count evidence | Claims stance after this PR |
| --- | --- | --- | --- | --- |
| Jogja | `/chapters/jogja` | Active first chapter | None publishable | **Chapter page** only; **not** open/active until chapter-specific engagement is owner-confirmed |
| Surabaya-Malang | none | not listed as active | none | Regional circle label only; not “active” |
| Jabodetabek | none | Jakarta “coming soon” (legacy) | none | Regional circle label only |
| Kuala Lumpur | none | not on legacy chapters | none | Regional circle label only |
| Bandung | none | “coming soon” | none | Regional circle label only |

Linking, coming-soon states, and removal of migration jargon are **#8**. Non-interactive card affordances also overlap **#14**.

## Cafe count cross-check (no private data)

| Source | What it shows | Usable as VFC public number? |
| --- | --- | --- |
| `app/data/cafes.json` (this repo) | 56 records, all `jogja` | Only as “local archived notes count”, not “cafes indexed” nationally; owner still TBD |
| Legacy `zainfathoni/vibefromcafe` `cafes.json` | 56 records | Same |
| Live `vibefromcafe.id` | “Vibe From Cafe”; Jogja chapter; no 400+/4,000+/5 groups | Does **not** support replacement quant claims |
| `cafein.id` public meta | “45,000+ cafes” (cafein product) | Not a VFC claim; do not copy without cafein owner + date if ever co-marketed |

## Overlap (do not absorb)

| Issue | Overlap with #7 |
| --- | --- |
| **#2** Brand rename & broader positioning | All remaining “Vibe Coding From Cafe” / “VCFC” strings; homepage hierarchy of community vs studio. **Explicit blocker for Closes #7.** |
| **#8** Chapter IA & actions | Chapter destinations, chapter-specific join routing, coming-soon states, public wording of deprecation |
| **#14** Accessibility & clickable affordances | Broader focus/keyboard work; #7 only removes claim-related misleading link icons/status |

## Owner decisions (exact list — all TBD until a named human confirms)

1. **Who is the claims process owner?** Name a human (not “maintainers”).
2. **Publish member totals?** If yes: definition, unduplicated roster export, as-of date, named owner, review cadence → register row before UI.
3. **Co-market cafein counts on VFC?** Default no. If yes: named cafein + VFC owners and dated figure.
4. **Product proof bar:** demo/case URL + as_of + named owner + `verified` before any Deployed/Live label. Confirm who is studio product owner.
5. **May Jogja be labeled open/active?** Only after a **chapter-specific** engagement path exists (not generic `/join`) and a named community owner confirms.
6. **May per-cafe Wi‑Fi numbers return?** Only with measurement method, as-of date, and named owner; otherwise keep removed.
7. **May session durations (“N hours”) be published?** Only with event format policy + named owner; otherwise keep qualitative (“hands-on time”).
8. **#2 sequencing:** brand rename before treating public brand strings as done.

## Residual risk

- Exact membership and group activity remain **unknown publicly** until a named owner publishes a dated snapshot.
- Studio delivery track record remains **unproven publicly**; copy must stay example/service oriented.
- Brand strings still say VCFC in places until **#2** lands—this is an explicit dependency, not silent approval of VCFC.
- Register owners are **owner-unconfirmed / TBD** until humans are named; do not treat role placeholders as verification.
