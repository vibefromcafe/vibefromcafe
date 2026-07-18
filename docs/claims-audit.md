# Public claims audit (issue #7)

**As-of:** 2026-07-18  
**Owner (process):** VFC site content owner (currently repository maintainers)  
**Scope:** Quantitative, product, deployment, customer, production-capability, and chapter-status claims on the replacement site.  
**Brand note:** Approved public brand is **Vibe From Cafe / VFC**. “Vibe Coding From Cafe / VCFC” is owned by issue **#2** and is not re-decided here. Community purpose is broader than coding.

## Method

1. Inventory every public claim in this repository’s user-visible surfaces.
2. Seek an authoritative source, as-of date, definition, and owner.
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
| Active chapter / group | A place-based circle with a **meaningful public engagement path** (dedicated page and/or join flow that routes people there). Listing a city name alone is not “active”. |
| Deployed / live product | A named product with a real customer or public demo URL and an owner-attested production status. |
| Service example / concept | Illustrative offer pattern, not a shipped SKU or customer proof. |

## Claim inventory and disposition

| ID | Claim (pre-fix) | Surface | Classification | Evidence sought | Finding | Public disposition (this PR) |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | “400+ community members” | Home hero; `/join` aside | **unsupported** | Owned member roster with as-of date; definition of “member” | No roster, snapshot, or public count in this repo, legacy repo, or public `vibefromcafe.id` HTML. Private WhatsApp/group sizes were **not** inspected. | Removed. Replaced with non-quantified community copy. |
| C2 | “4,000+ cafes indexed” | Home hero | **unsupported** (as a VFC claim) | VFC-owned cafe index count | VFC seed/legacy `cafes.json` has **56** Jogja records, not 4,000+. cafein.id markets **45,000+** cafes in its own metadata (`cafein.id/index.html`, docs). That is a **cafein** product claim, not a verified VFC index figure, and 4,000+ does not match either source. | Removed. Replaced with qualitative cafe-discovery pointer to cafein.id (no count). |
| C3 | “5 active groups” | Home hero | **unsupported** / **ambiguous** | Definition of active + engagement path per group | Five city names are listed in replacement UI only. Legacy public site shows **Jogja active**, Jakarta/Bandung **coming soon**—no five-group active claim. No public join destinations per listed group in this repo. | Removed. Replaced with “Local circles across cities” (no active count). |
| C4 | Per-chapter member counts (258 / 40 / 88 / 18 / 9) | Home chapters; `/chapters` | **unsupported** | Group roster snapshots | Hard-coded in UI with no source file, date, or owner. Not present on legacy public chapter pages. Private group data not used. | Removed from public UI. |
| C5 | Every listed chapter is an “Active group” | Home chapter cards | **unsupported** (except possibly Jogja as place-based chapter) | Engagement path + activity evidence | Only `/chapters/jogja` exists. Other cards have no destination. Legacy does not mark five cities active. | Removed universal “Active group” label. Non-Jogja shown as regional circles without active status. Jogja status deferred to qualitative open-chapter wording + join path; full IA in **#8**. |
| C6 | “Live product / … Deployed” (KopiChat hero card) | Home hero | **unsupported** | Demo URL, customer reference, deploy evidence | No demo link, case study, customer name, or deploy proof in repo. Card is a static illustration. | Relabeled **Service example** / **Concept**. |
| C7 | Product showcase “ready to customize” + external-link icon | Home showcase | **unsupported** / **misleading** | Product URLs or customization offers tied to live SKUs | Cards are static mock previews with no href. External-link icon implies destinations. | Relabeled **Service example**. Removed external-link affordance. |
| C8 | Named products KopiChat / FlowPilot / Insight Desk as shipped products | Home showcase | **ambiguous** → treated as **concepts** | Case studies / demos | No public demos or customer evidence found. Copy described capabilities as if productized. | Kept as **named service examples / concepts**, not deployed products. |
| C9 | “Built for production” / “sampai production” service language | Home services; `/contact` | **ambiguous** | Portfolio of production deliveries | Aspirational studio language without cited customers. Not a numeric falsehood, but overclaims delivery proof if read as track record. | Softened to workflow/real-use language without asserting a production portfolio. |
| C10 | Jogja cafe count from `cafes.json` | `/chapters/jogja` | **verified** (dataset size only) | `app/data/cafes.json` | Count equals array length for `chapter === "jogja"` (**56** as of this audit). Dataset is archived for browsing; cafe browsing is cafein.id (**#3** / ADR 0002). Register row **JGJ-CAFES-001**. | Keep as “local cafe notes” wording; do not market as national index. |
| C11 | Top Wi‑Fi figure from archive | `/chapters/jogja` | **verified** as max of archived field | Same JSON | Derived from seed data only; not a live speed test. Register row **JGJ-WIFI-001**. | Keep with “from local notes” framing. |
| C12 | Jogja “Active” chapter | `/chapters/jogja` | **ambiguous** → **conditionally acceptable** | Meaningful engage path | Legacy + replacement treat Jogja as first chapter; `/join` is the public engagement path. No public member count. | Soften to open chapter / join CTA without member totals. Full chapter IA remains **#8**. |
| C13 | Testimonial attributed to “Nadia Putri” | Home | **unsupported** | Permissioned quote source | No source, date, or release on file. Reads as fabricated social proof. | Removed. |
| C14 | “Community-powered AI studio” positioning | Metadata / hero | **out of scope (#2)** | Brand decision | Approved direction in #2 is broader VFC community first. | Not rewritten for brand rename here; flagged for **#2**. Claims work avoids adding new VCFC product-deploy language. |

## Product card classification

| Name | Prior implied status | Classification after audit | Public label |
| --- | --- | --- | --- |
| KopiChat | Live / Deployed / ready to customize | **Service example / concept** | Service example |
| FlowPilot | ready to customize | **Service example / concept** | Service example |
| Insight Desk | ready to customize | **Service example / concept** | Service example |

No card is published as a deployed product or customer case study until an owner attaches a demo/case URL and as-of date in the source-of-truth process below.

## Chapter status (claims only; IA in #8)

| Place | Public page | Legacy public stance | Member count evidence | Claims stance after this PR |
| --- | --- | --- | --- | --- |
| Jogja | `/chapters/jogja` | Active first chapter | None publishable | Named chapter with join path; no member total |
| Surabaya-Malang | none | not listed as active | none | Regional circle label only; not “active” |
| Jabodetabek | none | Jakarta “coming soon” (legacy) | none | Regional circle label only |
| Kuala Lumpur | none | not on legacy chapters | none | Regional circle label only |
| Bandung | none | “coming soon” | none | Regional circle label only |

Linking, coming-soon states, and removal of migration jargon are **#8**. Non-interactive card affordances also overlap **#14**.

## Cafe count cross-check (no private data)

| Source | What it shows | Usable as VFC public number? |
| --- | --- | --- |
| `app/data/cafes.json` (this repo) | 56 records, all `jogja` | Only as “local archived notes count”, not “cafes indexed” nationally |
| Legacy `zainfathoni/vibefromcafe` `cafes.json` | 56 records | Same |
| Live `vibefromcafe.id` | “Vibe From Cafe”; Jogja chapter; no 400+/4,000+/5 groups | Does **not** support replacement quant claims |
| `cafein.id` public meta | “45,000+ cafes” (cafein product) | Not a VFC claim; do not copy without cafein owner + date if ever co-marketed |

## Overlap (do not absorb)

| Issue | Overlap with #7 |
| --- | --- |
| **#2** Brand rename & broader positioning | All remaining “Vibe Coding From Cafe” / “VCFC” strings; homepage hierarchy of community vs studio |
| **#8** Chapter IA & actions | Chapter destinations, Jogja link consistency, coming-soon states, public wording of deprecation |
| **#14** Accessibility & clickable affordances | Broader focus/keyboard work; #7 only removes claim-related misleading link icons/status |

## Residual risk

- Exact membership and group activity remain **unknown publicly** until an owner publishes a dated snapshot.
- Studio delivery track record remains **unproven publicly**; copy must stay example/service oriented.
- Brand strings still say VCFC in places until **#2** lands—this is an explicit dependency, not silent approval of VCFC.
