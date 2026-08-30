# Cafe URL migration (issue #3)

## Decision boundary

Cafe discovery remains external at [cafein.id](https://cafein.id), as decided in ADR 0002. This migration does not create a new browsable cafe product in VFC. It only preserves archived VFC URLs through verified temporary redirects and read-only records where identity is unresolved.

## Inventory and behavior

The archived source dataset contains exactly 56 cafe slugs.

| Classification | Count | Behavior |
| --- | ---: | --- |
| Verified destination | 48 | Explicit temporary `302` to `https://cafein.id/cafe/:slug` |
| Ambiguous destination | 3 | Read-only archived VFC record; no redirect |
| Unmatched destination | 5 | Read-only archived VFC record; no redirect |
| Intentionally retired | 0 | None |

Requests behave as follows:

| Request | Result |
| --- | --- |
| `/cafes` | Temporary `302` to `https://cafein.id` |
| `/cafes/:verified-slug` | Temporary `302` to its mapped cafein detail route |
| `/cafes/:ambiguous-or-unmatched-slug` | Read-only archived cafe details and reconciliation evidence |
| `/cafes/:unknown-slug` | HTTP `404` at the Pages edge; matching not-found UI after client navigation |
| `/cafes/:slug/extra` | HTTP `404` |

The original query string is retained by both the shared resolver and the Pages Function. Cloudflare's static redirect rules also preserve incoming query strings by default. There is no `/cafes/*` redirect because it would incorrectly send unresolved and unknown URLs to cafein.

## Files and parity

- `app/data/cafe-url-mapping.json` is the checked-in mapping source.
- `public/cafe-url-mapping.json` is an identical machine-readable public copy.
- `app/data/cafe-url-migration.ts` is shared by the client routes and Pages Function.
- `public/_redirects` has one explicit `302` rule per verified cafe.
- `functions/cafes/[[slug]].ts` handles query-preserving edge redirects, legacy fallthrough, and real HTTP 404s.
- `app/routes/cafes._index.tsx` and `app/routes/cafes.$.tsx` provide matching client behavior.

The tests exhaust all 56 records, all 48 redirect destinations, all 8 fallbacks, the public copy, redirect rules, query handling, and edge outcomes.

## Destination verification

PR #16 supplied the candidate migration and identity evidence. On 2026-08-30, the 48 selected destination slugs were rechecked through the public, read-only cafein Supabase catalog used by cafein's frontend:

- all 48 selected slugs existed;
- each selected slug returned exactly one catalog row;
- no selected destination slug was duplicated within the migration;
- cafe detail paths use `/cafe/:slug`, not `/:slug`;
- `eastern-kopi-tm` still returned two catalog rows and therefore remains blocked.

The accepted match methods are:

| Method | Standard |
| --- | --- |
| `exact_slug` | Archived slug equals a unique public cafein slug |
| `normalized_name_location` | Name normalization plus archived location/address evidence supports identity |
| `unique_nationwide_name` | A unique nationwide cafein name exists with no competing branch; location may be unavailable |

Weak single-token similarity and guessed branch selection are not accepted.

## Owner decisions still required

### Ambiguous (3)

| Archived slug | Blocker | Owner decision |
| --- | --- | --- |
| `asram-edupark` | The possible Asram Coffee and Eatery record has a different name and no shared address proof | Confirm the venue or keep the archive-only record |
| `eastern-kopi-tm-seturan` | Cafein has two rows using `eastern-kopi-tm`; the detail lookup is not unique | Wait for a unique stable Seturan URL, then map it |
| `kobessah` | Four plausible branches exist and the archive has no location | Select the correct branch or keep the archive-only record |

### Unmatched (5)

| Archived slug | Current result |
| --- | --- |
| `oddish-family-hub-all-rich-resto` | No name/address match |
| `kedai-berdikari` | No matching DIY / Taman Denggung record |
| `salad-squad-mlati` | No matching record |
| `the-harjos-java-resto` | No matching record and weak archived location data |
| `kjs-koofi-java-space` | No matching record |

For each unmatched row, the owner must supply a cafein identity, confirm retirement, or explicitly retain the legacy fallback.

## Redirect permanence

All redirects intentionally remain `302`. Do not promote them to `301` or `308` until owners approve the mapping and fallback decisions and deployment smoke checks confirm real destination detail pages, query preservation, legacy rendering, and HTTP 404 behavior. Permanent redirect promotion is outside this implementation.
