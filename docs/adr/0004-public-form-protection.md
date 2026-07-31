# ADR 0004: Public Form Protection

## Status
Accepted

## Context
The public join and contact forms collect personal contact details and write them to Cloudflare KV. Before production cutover, those endpoints need to resist malformed input, repeated submissions, automated abuse, and unclear privacy handling without breaking local development when optional security keys are absent.

## Decision
Protect public form intake with server-side schemas, content-type and size limits, required privacy consent, optional Turnstile that fails closed only when configured, app-level KV rate limiting by endpoint and client IP, and duplicate markers that avoid creating repeated operational records. If rate-limit storage cannot be checked or updated, reject the public write with a generic temporary-unavailable response. Show security configuration status only in protected admin health surfaces, never in public form UI.

Public form requests are processed in this order: content-type and body size, schema and consent validation, rate-limit check, Turnstile verification when configured, duplicate check, then the operational KV write.

Duplicate marker writes are best-effort after the operational record succeeds. A valid submission should not be lost solely because duplicate protection metadata could not be stored.

Phone and contact validation should be light and global: reject obvious junk and excessive length, but do not require Indonesian-only formats or force E.164 normalization before the community needs that operational precision.

Admin health may show required security configuration names with configured or missing status, but must never expose configured values.

Public privacy handling for this cutover uses concise form-level notices plus required consent checkboxes, not a full public privacy-policy page. Operator-facing handling lives in project documentation until reviewed public policy copy exists.

Turnstile uses a public site key for rendering the client widget and a secret key for server verification. The widget is rendered only when the public site key is configured, while the server requires a valid token only when the secret key is configured; admin health should flag mismatched configuration.

Public error messages should be specific for user-fixable input problems and generic for security, configuration, storage, and verification failures. Public responses must not expose secret/config details, raw exceptions, or submitted personal fields.

## Consequences
- Local and preview environments can submit without Turnstile when `TURNSTILE_SECRET_KEY` is missing.
- Production operators must treat missing Turnstile configuration as a health concern.
- Public form writes fail closed when app-level rate limiting is unavailable.
- Duplicate community joins are identified by normalized WhatsApp number for 30 days.
- Duplicate project inquiries are identified by a fingerprint of normalized contact and message for 30 days.
- Rate-limit counters remain short-lived operational records.
- Operators need documented retention, deletion, export, access, and incident handling for submitted personal data.
