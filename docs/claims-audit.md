# Public claims audit

**As of:** 2026-08-30
**Scope:** Homepage and chapter surfaces for canonical issues #7 and #8.

## Retained claims

The repository has owner confirmation that these are the complete active chapters:

- Jogja
- Jabodetabek
- Surabaya–Malang
- Kuala Lumpur
- Bandung

That confirmation was supplied for this implementation on 2026-08-30. Operational evidence and private community data are intentionally not stored in the repository. No public member totals were confirmed.

Jogja has an existing public page at `/chapters/jogja`. No better public chapter-specific destination was evidenced for the other four chapters, so their cards use the generic `/join` action.

The existing site and ADR 0002 evidence cafein.id as the public cafe-discovery destination. VFC does not publish cafe totals, rankings, venue amenities, or Wi-Fi measurements from the repository dataset.

## Removed or reclassified claims

| Prior claim | Disposition |
| --- | --- |
| `400+` community members | Removed; no dated, owned roster snapshot. |
| Individual chapter member totals | Removed; no dated, owned roster snapshots. |
| `4,000+` cafes indexed | Removed; not supported as a VFC figure. |
| Product deployment, availability, or customer implications | Removed. Named cards are explicitly service examples. |
| Fixed discovery and event durations | Removed; no current service or event policy was evidenced. |
| Attributed testimonial | Removed; no permissioned source was evidenced. |
| Jogja cafe count, rankings, amenities, and Wi-Fi figures | Removed from the chapter page; freshness and measurement context were not evidenced. |

## Intentionally out of scope

The `/join`, `/contact`, and `/events` routes and their forms/APIs were explicitly excluded from this repository-only slice. Claims on those surfaces need a separately authorized content pass rather than incidental edits here.

## Human content decisions still needed

1. Name the human owner and review cadence for the claims register.
2. Decide whether member totals should ever be public; if yes, provide definitions and dated, privacy-safe snapshots.
3. Provide public chapter-specific destinations for Jabodetabek, Surabaya–Malang, Kuala Lumpur, and Bandung if they should replace `/join`.
4. Provide public demos or permissioned case studies before promoting any service example to a product or customer claim.
5. Confirm whether any cafein.id metrics may be co-marketed by VFC.
