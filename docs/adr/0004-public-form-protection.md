# ADR 0004: Public Form Protection

## Status

Repository controls accepted; external atomic rate-limiter architecture and deployment evidence pending operator approval.

## Context

The public join and contact endpoints collect personal data and write to Cloudflare KV. PR #22 added useful validation and consent work, but its KV rate counter and duplicate checks were non-atomic, its dedupe keys exposed normalized personal data, its fallback size check buffered the full body, its duplicate response exposed prior state and invitation URLs, and its Turnstile health check read a different configuration source than the built browser bundle.

## Decision

Both endpoints apply the following order:

1. Require the exact `application/json` media type and stream at most 8 KiB before decoding or parsing.
2. Require a JSON object with an exact field allow-list, bounded strings, supported referral enum, contact format, and explicit consent.
3. Require valid runtime privacy-channel, keyed-dedupe, KV, and atomic-rate-limiter configuration.
4. Call an external Durable Object rate limiter using an HMAC-derived client key; any unavailable or malformed dependency fails closed.
5. Verify Turnstile when the runtime site/secret pair is present, including exact form action and request hostname.
6. Check versioned HMAC dedupe markers, then write the deletion reference, operational record, and marker.
7. Return the same `202 { "success": true }` response for a first accepted request or known duplicate. Never return IDs, statuses, submitted fields, or invitation configuration.

The site key is served from a runtime Function endpoint and is therefore read from the same environment as the secret and protected Health report. A one-sided Turnstile pair fails closed. Both keys absent is an explicit disabled state reported by Health.

The Workers Rate Limiting binding is rejected: it is not a supported Pages Functions binding and Cloudflare documents it as per-location, permissive, and eventually consistent. A KV counter is also rejected. The only repository integration path is a Pages binding to an external strongly consistent Durable Object, enforcing at most 5 allowed attempts per endpoint and HMAC-derived key in any rolling 60-second interval. The key is derived only from Cloudflare's trusted `CF-Connecting-IP` header. Pages cannot create or deploy that object, so script/class/resource choice and staging evidence remain an explicit issue #27 operator gate. Missing or unhealthy bindings fail closed.

Dedupe is deliberately best-effort because KV cannot atomically claim a marker with the operational record. This is a UX/storage-volume control, not an authorization boundary. Concurrent equivalent requests can create multiple records, but receive byte-equivalent generic responses. Every accepted record first receives a submitted-field-free pseudonymous reverse reference, also stored as KV metadata so reconciliation does not require one value read per listed key. Protected deletion scans matching references, removes all currently discoverable equivalent records and markers, and writes a resumable completion receipt. Marker-write failures retain the operational record and reverse reference and emit only a static identifier-free event.

Current and previous keyed-HMAC versions can overlap during rotation. Raw phone, contact, message, IP, token, or secret material is never placed in KV key names or application logs.

## Consequences and open gates

- A valid public write is unavailable until the privacy channel, keyed secret, KV, and external Durable Object binding are configured.
- The operator must approve/provision the Durable Object and demonstrate boundary concurrency and multi-PoP tolerance before enabling writes.
- KV dedupe remains race-prone by design; staging must record the concurrent result and an authorized owner must accept that residual behavior or move dedupe claims into the approved Durable Object.
- Operators must verify distinct Preview/Production Turnstile credentials, hostname allow-lists, KV, dedupe keys, and rate-limit resources, then smoke-test rendered widgets and valid/missing/invalid/reused/expired/wrong-host tokens on both forms.
- Deletion completion covers live KV records and repository markers. Backup expiry/reconciliation, channel ownership, identity verification, response targets, retention authority, and a non-author drill remain issue #30 operator gates.
