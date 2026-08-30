# ADR 0002: External Cafe Browsing

## Status
Accepted

## Context
The VFC UI treats cafe browsing as an external destination at `cafein.id`. Repository cafe records do not have the ownership, freshness, or measurement context needed for public chapter claims.

## Decision
Keep cafe browsing external to `https://cafein.id` and redirect app cafe routes there. Chapter pages do not derive public counts, rankings, amenities, or performance figures from repository cafe records.

## Consequences
- `/cafes` and `/cafes/*` do not become first-class app pages.
- Chapter detail pages link to cafein.id for current cafe discovery.
- The app avoids duplicating cafein.id as a product surface.
