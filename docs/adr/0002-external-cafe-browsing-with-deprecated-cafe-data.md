# ADR 0002: External Cafe Browsing With Deprecated Cafe Data

## Status
Accepted

## Context
The current VCFC UI treats cafe browsing as an external destination at `cafein.id`. Upstream chapter pages depend on cafe records for local context and stats.

## Decision
Keep cafe browsing external to `https://cafein.id`, redirect app cafe routes there, and retain copied cafe JSON only as Deprecated Cafe Data for chapter detail support.

## Consequences
- `/cafes` and `/cafes/*` do not become first-class app pages.
- Chapter detail pages may still use cafe stats/cards.
- The app avoids duplicating cafein.id as a product surface.
