# Recovery, observability, and admin mutation history

This runbook defines the repository-supported portion of issues #12 and #31. It does not authorize or perform a Cloudflare, KV, Access, secret, DNS, domain, backup-storage, or deployment change. Production inventory, alert configuration, and a staging restore remain operator-gated.

## Request correlation and runtime logs

Every `/api/*` response carries `X-Request-Id`. An incoming value is retained only when it is a canonical UUID; otherwise the application generates a UUID so caller-controlled personal text cannot become a log field. Admin middleware uses the same ID for authentication failures and downstream mutations.

Runtime logs are JSON serialized through an allowlist. They may contain timestamp, static event name, level, request ID, route, method, HTTP status, verified normalized Access actor or `break-glass`, mutation action, record type, and a coarse error category. They intentionally omit record IDs and all payload values.

Never log request/response bodies, submitted fields, raw IP addresses, KV keys, record IDs, HMAC inputs/outputs, event contents or URLs, invitation URLs, Turnstile data, Access assertions, tokens, secrets, raw exceptions, or JWT claims beyond the verified actor.

## KV audit records

After a successful submission, inquiry, event, or privacy mutation, the application writes an `audit:{timestamp}:{uuid}` record containing:

- timestamp and verified actor;
- allowlisted action and record type;
- record ID and request ID;
- changed field **names** and old/new workflow status when applicable.

Audit records never contain mutation values or full records. Application code does not update or delete them. This is useful attributable history, but KV does not make it immutable: a sufficiently privileged operator can alter KV directly, and repository code cannot enforce external retention or deletion protection.

The business write and audit write are separate KV operations. If the audit write fails, the handler reports failure even though the business mutation may already have committed. The safe operator response is to freeze admin mutations, correlate by request ID and verified actor, inspect the affected record without copying PII into logs/tickets, and reconcile history under an approved incident process. Do not blindly retry a non-idempotent create and do not add a one-off KV lock.

## Recovery capture and staging rehearsal

Use the reviewed format-version-1 tooling and exact safety gates in the [Cloudflare KV cutover runbook](cloudflare-kv-cutover.md); do not create another export schema. It preserves key/value bytes, expiration, and metadata while reports contain only aggregate categories and deterministic hashes.

An authorized owner must first approve and privately record:

- RPO and RTO targets;
- backup frequency, encrypted storage, encryption-key ownership, retention, deletion protection, and access-review cadence;
- primary/backup operators, incident escalation, alert destinations, and recovery-decision authority;
- the exact isolated, empty non-production restore target.

Those values are deliberately **TBD**. This repository does not claim a 6-hour RPO, 4-hour RTO, 35-day/12-month retention, quarterly rehearsal, or any other unapproved policy.

Once approved, rehearse only against the isolated target:

1. Freeze every source writer and follow the runbook's same-namespace stability check.
2. Capture source and the empty target; retain raw snapshots only in the approved encrypted private store.
3. Dry-run migration, then use the runbook's live identity/emptiness preflight, private authorization attestation, and typed non-production confirmation.
4. Capture and reconcile the restored target exactly, including values, expiration, metadata, and both known event tombstone prefixes.
5. Exercise synthetic join, inquiry, event, admin-history, request-correlation, and privacy deletion flows. Never use real submitted data for rehearsal evidence.
6. Record elapsed recovery time, achieved recovery point, operator, tool commit, redacted report hashes, alert results, and cleanup confirmation in the approved private system.

No rehearsal or backup was run by these repository changes.

## Alert gates

Before production enablement, operators must route allowlisted Pages logs to an approved restricted sink, choose thresholds from staging evidence, configure destinations and escalation, and prove delivery with synthetic failures. At minimum monitor:

- public submission/inquiry write and rate-limiter failures;
- any `admin_audit_write_failed` event;
- sustained admin request failures and authentication failures;
- backup capture failure or age beyond the approved RPO;
- restore reconciliation failure or rehearsal time beyond the approved RTO.

The repository intentionally does not invent page thresholds, an on-call rota, or a monitoring vendor. Retain only PII-free alert evidence and request IDs.

## Storage decision and remaining blocker

KV is not sufficient for these admin invariants:

- triage transitions are read/modify/write, so concurrent admins can validate stale state and the last write can silently win;
- a business mutation and audit entry cannot commit atomically;
- event save/delete spans multiple keys;
- application-convention audit history is not immutable.

Before claiming concurrent-write safety, transactional attribution, or immutable history, move mutable records and audit rows to D1 transactions, or serialize each record through an approved Durable Object design. D1 is the smaller default for queryable history plus atomic record/audit commits, but the architecture and migration require owner approval and staged recovery evidence. Until then, the KV limitation is an explicit cutover risk, admin writes must freeze on audit failure, and issue #12 cannot be closed as fully operational.
