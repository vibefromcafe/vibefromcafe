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

Verified only when identity was defensible. `matchMethod` values:

| `matchMethod` | Meaning |
| --- | --- |
| `exact_slug` | Legacy slug equals a unique public cafein slug |
| `normalized_name_location` | Normalized name match **and** address/location/map phrase support |
| `unique_nationwide_name` | Unique nationwide cafein name with no competing branches; location may be absent |

Additional hard gate before redirect: the destination cafein slug must resolve to **exactly one** public catalog row. Cafein detail loading uses `maybeSingle()`, so duplicate slugs render a broken page even when HTTP status is 200.

Not used: weak single-token similarity, guessing, or redirecting to cafein root for known slugs.

Verification method: read-only query of the public cafein Supabase REST catalog (publishable frontend key) against DIY-region and nationwide name/slug searches, plus legacy `name` / `map_location` fields.

## Traffic / indexing relevance (unavailable)

**Per-URL traffic and indexing relevance for the 56 legacy `/cafes/:slug` paths is not available to this worker.** No Cloudflare Analytics export, Web Analytics dataset, or Google Search Console property access was provided in-repo or via API credentials for `vibefromcafe.id`. Do **not** fabricate per-slug ranks or impression counts.

### Exact owner verification steps

1. **Cloudflare Analytics / Web Analytics**  
   Cloudflare Dashboard → select the `vibefromcafe.id` Pages project / zone → **Analytics & Logs** (or **Web Analytics**).  
   Filter path prefix `/cafes` for the longest retained window (prefer 90 days). Export or note request counts, top legacy slugs, and 404 rates. Use this to prioritize smoke checks (high-traffic verified redirects) and owner review (high-traffic fallbacks).

2. **Google Search Console**  
   Search Console property for `https://vibefromcafe.id/` → **Performance** and **Page indexing**.  
   Query pages matching `/cafes/` for clicks, impressions, and indexed status. Rank SEO-sensitive slugs before promoting 302→301/308 and watch post-cutover coverage drops.

These steps are also embedded in `cafe-url-mapping.json` under `trafficAndIndexing`.

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

1. Owner signs off on `app/data/cafe-url-mapping.json` verified rows **and** the 8 legacy-fallback rows.
2. **Preview/production smoke** (still a blocker): every verified `destinationUrl` loads a real cafein detail (not a client 404 shell); sample ambiguous/unmatched legacy pages render; unknown `/cafes/:slug` returns HTTP 404; query strings survive redirects.
3. Owner completes the **Cloudflare Analytics + Search Console** verification steps above (per-URL relevance is currently **unavailable**).
4. **Post-cutover monitoring** for ~14 days shows no material mismatch reports for redirected slugs (404 spikes, Search Console coverage, analytics referrers) — still a blocker for permanent promotion.
5. Ambiguous/unmatched rows are either resolved into verified mappings or explicitly marked `intentionally_retired` with a permanent legacy/fallback policy.

Then flip verified rows (and only verified rows) from `302` → `301` or `308` in `public/_redirects` and the shared temporary status constant.

## Monitoring after cutover

**Blocker until operational:** tracking must be enabled and reviewed after deploy. At minimum:

- Cloudflare Analytics / Web Analytics 404s and request volume under `/cafes/*`
- Google Search Console performance + indexing for `/cafes/` URLs
- cafein destination failures / support reports for mapped slugs
- Manual hits to `/cafe-url-mapping.json` during reconciliation

## Regenerating redirects

`public/_redirects` cafe rows are generated from the JSON map. After editing verified destinations:

1. Update `app/data/cafe-url-mapping.json`
2. Copy to `public/cafe-url-mapping.json`
3. Rebuild the `/cafes/...` redirect lines (same generator used in issue #3 work)
4. Run `pnpm test`, `pnpm typecheck`, `pnpm build`
