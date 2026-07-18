# Cafe URL migration (issue #3)

## Goal

Preserve every legacy `https://vibefromcafe.id/cafes/:slug` destination while cafe discovery moves to [cafein.id](https://cafein.id).

No known archived slug may land on a cafein 404.

## Destination route

cafein.id cafe detail URLs use:

```text
https://cafein.id/cafe/:slug
```

Not `https://cafein.id/:slug`.

## Inventory

| Source | Count |
| --- | ---: |
| Archived legacy cafes (`app/data/cafes.json`) | 56 |
| Verified → redirect to cafein detail | 48 |
| Ambiguous → legacy fallback + owner review | 3 |
| Unmatched → legacy fallback | 5 |
| Intentionally retired | 0 |

Machine-readable public map:

- App source of truth: `app/data/cafe-url-mapping.json`
- Public copy: `/cafe-url-mapping.json`
- Shared resolver: `app/data/cafe-url-migration.ts`

## Behavior

| Request | Result |
| --- | --- |
| `/cafes` | Temporary `302` to `https://cafein.id` (query preserved) |
| `/cafes/:slug` verified | Temporary `302` to `https://cafein.id/cafe/<mapped-slug>` (query preserved) |
| `/cafes/:slug` ambiguous / unmatched | Read-only legacy archive page on VFC (no cafein redirect) |
| `/cafes/:unknown` | Real `404` (Pages Function) / not-found UI (client) |

Edge and client share the same resolver so soft navigation and direct hits stay aligned.

Implementation surfaces:

- Edge redirects for verified rows: `public/_redirects`
- Edge 404 + index redirect + fallthrough: `functions/cafes/[[slug]].ts`
- Client redirect / legacy page / not-found: `app/routes/cafes._index.tsx`, `app/routes/cafes.$.tsx`

## Matching rules used

Verified only when identity was defensible:

1. Exact public cafein slug match, or
2. Normalized name match **and** address/location/map phrase support, or
3. Unique nationwide cafein name when the legacy record had no competing branches.

Additional hard gate before redirect: the destination cafein slug must resolve to **exactly one** public catalog row. Cafein detail loading uses `maybeSingle()`, so duplicate slugs render a broken page even when HTTP status is 200.

Not used: weak single-token similarity, guessing, or redirecting to cafein root for known slugs.

Verification method: read-only query of the public cafein Supabase REST catalog (publishable frontend key) against DIY-region and nationwide name/slug searches, plus legacy `name` / `map_location` fields.

## Owner-review list

These slugs intentionally do **not** redirect until an owner decides:

### Ambiguous

| Legacy slug | Why blocked | Candidates |
| --- | --- | --- |
| `kobessah` | Multiple Kobessah branches; legacy row has no location | `kobessah-kopi`, `kobessah-kopi-2`, `kobessah-kopi-godean`, `kobessah-kopi-uad` |
| `asram-edupark` | Legacy name is Asram Edupark; cafein only has Asram Coffee and Eatery without shared address proof | `asram-coffee-and-eatery` |
| `eastern-kopi-tm-seturan` | Seturan venue matches one cafein row, but public slug `eastern-kopi-tm` is duplicated (DIY + Bekasi). Cafein `maybeSingle()` breaks the detail page for that slug | UUID deep-links listed in the JSON map until cafein deduplicates |

### Unmatched

| Legacy slug | Why blocked |
| --- | --- |
| `oddish-family-hub-all-rich-resto` | No cafein name/address hit |
| `kedai-berdikari` | No DIY Taman Denggung match |
| `salad-squad-mlati` | No cafein Salad Squad record |
| `the-harjos-java-resto` | No cafein record; legacy location only “Maps” |
| `kjs-koofi-java-space` | No cafein record |

Owner actions per row are also embedded in the JSON map (`ownerAction`).

## When temporary redirects can become 301/308

Keep **302** until all of the following are true:

1. Owner signs off on `app/data/cafe-url-mapping.json` verified rows (no outstanding high-traffic mismatches).
2. Production smoke check: every verified `destinationUrl` returns a successful cafe detail on cafein.id (not a client-side 404 shell).
3. Post-cutover monitoring for ~14 days shows no material mismatch reports for redirected slugs (404 spikes, Search Console, analytics referrers).
4. Ambiguous/unmatched rows are either resolved into verified mappings or explicitly marked `intentionally_retired` with a permanent legacy/fallback policy.

Then flip verified rows (and only verified rows) from `302` → `301` or `308` in `public/_redirects` and the shared temporary status constant.

## Monitoring after cutover

Track:

- Cloudflare / analytics 404s under `/cafes/*`
- Referrer traffic from search to legacy cafe URLs
- cafein destination failures for mapped slugs
- Manual hits to `/cafe-url-mapping.json` during reconciliation

## Regenerating redirects

`public/_redirects` cafe rows are generated from the JSON map. After editing verified destinations:

1. Update `app/data/cafe-url-mapping.json`
2. Copy to `public/cafe-url-mapping.json`
3. Rebuild the `/cafes/...` redirect lines (same generator used in issue #3 work)
4. Run `pnpm test`, `pnpm typecheck`, `pnpm build`
