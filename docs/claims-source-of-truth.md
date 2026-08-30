# Public claims source of truth

Public claims used by the homepage and chapter routes are defined in `app/data/public-claims.ts` and guarded by `app/data/public-claims.test.ts`.

## Rules

1. Do not add a public member, cafe, duration, performance, availability, or aggregate figure without a register row containing its definition, source, as-of date, owner, and review date.
2. Do not label a product live, deployed, available, or customer-proven without a public demo or permissioned case study and an owner-confirmed register row.
3. Label illustrative offers as **Service example** until that product proof exists.
4. Do not infer member counts from private groups or commit roster evidence.
5. Keep cafe discovery on cafein.id. Do not restate cafein.id metrics as VFC claims without approval from both owners.
6. Chapter cards must have a useful destination. A chapter page is preferred when one exists; otherwise `/join` is the accepted generic action until a better public destination is confirmed.
7. Update the canonical data module first. Route-local chapter arrays and product-claim arrays are not allowed.

## Verified chapter register

| Claim ID | Public claim | Source | As of | Owner | Review by | Status | Destination |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CHP-JOGJA | Jogja is active | Owner confirmation supplied for issues #7/#8 | 2026-08-30 | owner name pending | 2026-11-30 | accepted | `/chapters/jogja` |
| CHP-JABODETABEK | Jabodetabek is active | Owner confirmation supplied for issues #7/#8 | 2026-08-30 | owner name pending | 2026-11-30 | accepted | `/join` |
| CHP-SUBMAL | Surabaya–Malang is active | Owner confirmation supplied for issues #7/#8 | 2026-08-30 | owner name pending | 2026-11-30 | accepted | `/join` |
| CHP-KL | Kuala Lumpur is active | Owner confirmation supplied for issues #7/#8 | 2026-08-30 | owner name pending | 2026-11-30 | accepted | `/join` |
| CHP-BANDUNG | Bandung is active | Owner confirmation supplied for issues #7/#8 | 2026-08-30 | owner name pending | 2026-11-30 | accepted | `/join` |

The five rows above are one accepted aggregate fact: **five active local chapters**. They do not authorize member counts or imply chapter-specific public invite links.

## Product register

| ID | Public name | Classification | Evidence | Status |
| --- | --- | --- | --- | --- |
| EX-001 | KopiChat | service example | No public demo or case study supplied | concept |
| EX-002 | FlowPilot | service example | No public demo or case study supplied | concept |
| EX-003 | Insight Desk | service example | No public demo or case study supplied | concept |

## Adding a quantified claim

Add a row with all fields below before changing public copy:

| Claim ID | Public text | Definition | Source | As of | Named owner | Review by | Status | Surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | YYYY-MM-DD | TBD | YYYY-MM-DD | draft | TBD |

Only `accepted` rows may be rendered. Tests must cover the canonical value and the stale claim it replaces.
