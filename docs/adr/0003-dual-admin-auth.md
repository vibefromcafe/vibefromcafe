# ADR 0003: Dual Admin Auth

## Status
Accepted

## Context
Admin APIs need protection in production but also need to remain practical for local development and preview testing.

## Decision
Use the upstream dual admin access model: allow Cloudflare Access JWT, allow `X-Admin-Secret` when it matches `ADMIN_SECRET`, and allow localhost development.

## Consequences
- Production can rely on Cloudflare Access.
- Preview/local admin flows can use `ADMIN_SECRET`.
- Admin clients must send `X-Admin-Secret` when Cloudflare Access is not present.
