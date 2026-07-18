# Context Glossary

## Brand
Vibe Coding From Cafe is the public brand for the community-powered AI studio.

## Domain
`vibefromcafe.id` is the public web domain for the Brand.

## Community Join Submission
A request from a person who wants to join the VCFC community. It records identity, city, role, WhatsApp number, referral source, onboarding status, and timestamps.

## Project Inquiry
A lightweight business lead from someone who wants VCFC to discuss or build an AI project. It is distinct from a Community Join Submission.

## Event
A public or draft community gathering. Events can be seeded from repository data and overridden or added at runtime through admin operations.

## Chapter
A local VCFC community group organised around a place, such as Jogja.

## Deprecated Cafe Data
Archived cafe records copied from the upstream Vibe From Cafe repository. The data may support chapter context and stats, but cafe browsing belongs to `cafein.id`.

## Legacy Cafe URL Mapping
Explicit old `/cafes/:slug` → cafein.id `/cafe/:slug` destinations for the 56 archived cafes. Verified rows redirect; ambiguous/unmatched rows keep a read-only legacy fallback. Source: `app/data/cafe-url-mapping.json`.
