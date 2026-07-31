# ADR 0002: External Cafe Browsing With Deprecated Cafe Data

## Status
Accepted (amended for issue #3 slug mapping)

## Context
The Vibe From Cafe UI treats cafe browsing as an external destination at `cafein.id`. Upstream chapter pages depend on cafe records for local context and stats. A blanket `/cafes/* → https://cafein.id/:splat` redirect is unsafe because cafein detail routes are `/cafe/:slug` and not every legacy slug exists there.

## Decision
Keep cafe browsing external to `https://cafein.id`, retain copied cafe JSON as Deprecated Cafe Data for chapter detail support, and resolve legacy `/cafes/:slug` URLs through an explicit verified mapping:

- Verified slugs temporary-redirect to `https://cafein.id/cafe/<mapped-slug>`.
- Ambiguous / unmatched / intentionally retired slugs keep a read-only legacy archive page.
- Unknown slugs return a real 404.
- Promote verified redirects to 301/308 only after owner verification (see `docs/cafe-url-migration.md`).

## Consequences
- `/cafes` discovery traffic goes to cafein.id.
- `/cafes/:slug` is mapping-driven, not a splat rewrite.
- Chapter detail pages may still use cafe stats/cards.
- The app avoids duplicating cafein.id as a full product surface while preserving legacy URL usefulness.
