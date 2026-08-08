# ADR 0003: Verified Cloudflare Access Admin Auth

## Status
Accepted

## Context
Admin pages and APIs must remain protected even when a custom domain, Pages domain, or preview hostname is not covered by an Access application. Trusting the presence of `Cf-Access-Jwt-Assertion` allows callers to forge the header. A shared secret stored by the browser is also unsuitable for normal production administration.

## Decision
Validate the Cloudflare Access application token in Pages Functions for both `/admin*` and `/api/admin/*`. Validation requires:

- an RS256 signature from the configured Access team JWKS;
- the exact configured team-domain issuer and either one exact application audience or an explicit audience allow-list;
- an unexpired token which is not used before its `nbf` time; and
- an identity application token with a verified email claim.

Cloudflare Access policy remains the production authorization source: only identities allowed by the admin application's policy can obtain a token for its audience.

One application/audience should cover all environment hosts where practical. Environments that require multiple applications use the explicit `CF_ACCESS_AUDIENCES` allow-list. Setting it together with singular `CF_ACCESS_AUDIENCE`, or accepting arbitrary audiences from the configured team, fails closed. JWKS responses use a bounded five-minute in-memory cache and rate-limited refresh on an unknown key ID.

There is no hostname-based localhost bypass. `X-Admin-Secret` is accepted only when `ADMIN_BREAK_GLASS_ENABLED=true` and `ADMIN_SECRET` are both explicitly configured. The browser does not store or send this secret.

Admin writes additionally require `ADMIN_MUTATIONS_ENABLED=true`. It is enabled only in production (and an intentional local environment), never in Preview. Preview uses a separate non-production KV namespace.

## Consequences
- A missing assertion receives `401`; an invalid assertion receives `403`, independent of hostname.
- Production administrators use their Access identity without a browser-managed shared credential.
- Identity from the validated token is attached to event, tombstone, and submission mutations. Immutable old/new-state audit history, request correlation, and PII-safe mutation logging remain owned by issue #12.
- Local or emergency secret use requires deliberate runtime configuration and a non-browser client.
- Access, Pages variables, and Preview/Production KV bindings must still be configured correctly in Cloudflare; in-app validation is defense in depth, not a replacement for the edge policy.
