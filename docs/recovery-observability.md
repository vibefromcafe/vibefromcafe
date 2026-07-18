# Recovery, observability, and admin history operations

This runbook defines repository-owned controls for issue #12. It does not
authorize or perform a Cloudflare, KV, Access, secret, DNS, domain, or deployment
change. Production inventory and a staging restore remain operator-gated.

## Backup contract, schedule, and ownership

Use the reviewed issue #4 / PR #18 `scripts/kv-cutover.mjs` **formatVersion 1**
capture and reconciliation commands after that prerequisite lands. Do not create
another export schema. The snapshot preserves key/value bytes (base64 where
needed), expiration, and metadata without normalization. Its redacted inventory
contains only aggregate category counts and deterministic SHA-256 hashes. It
inventories `event-deleted:` (runtime) and `event_deleted:` (legacy variant).

- **Frequency / RPO:** encrypted production capture every 6 hours. Alert if a
  successful capture is more than 7 hours old. The target RPO is 6 hours after
  allowing for KV convergence; an unfrozen KV listing is not transactional, so
  the recovery point is not proven until two captures of a frozen namespace
  reconcile exactly.
- **RTO:** 4 hours from incident declaration to a reconciled staging restore and
  recovery decision. Production restoration remains a separately approved
  change. Time the staging rehearsal quarterly and revise this target if it is
  missed.
- **Encryption and retention:** write raw snapshots only to an encrypted object
  store with provider-managed encryption plus a customer-managed key. Deny
  public access, require MFA/SSO, versioning, and deletion protection. Retain the
  rolling 6-hour exports for 35 days and one month-end export for 12 months.
  Keep redacted reports with the same retention; never put raw exports in Git,
  CI artifacts, tickets, chat, or PRs.
- **Ownership:** the designated Operations owner runs and restores backups; the
  Security owner controls the encryption key and quarterly access review; the
  Product/Data owner approves recovery-point selection and malformed-record
  decisions. A named primary and backup for each role, storage location, key,
  alert destination, and 24/7 escalation route must be recorded in the private
  operator register before production readiness. Those assignments are an owner
  decision and are not safely inferable from this repository.
- **Access evidence:** log actor, time, reason, snapshot alias, command version,
  and redacted report hash in the private operator register. Review grants
  quarterly and after role changes. Raw snapshot access is break-glass only.

## Exact restore-to-staging rehearsal

Only synthetic validation writes are permitted. Use an already-authorized,
empty, non-production namespace; otherwise stop. Follow PR #18's
`docs/cloudflare-kv-cutover.md` and use its commands verbatim:

1. Authenticate Wrangler in a private operator terminal. Verify production and
   staging bindings in the dashboard using aliases in retained reports.
2. Freeze every source writer, wait the documented KV propagation interval,
   capture production twice with `capture --execute-read`, and reconcile with
   `--same-namespace-stability-check`. Mismatch blocks the rehearsal.
3. Freeze staging writers. Capture the empty staging target and create the
   mode-`0600` private authorization attestation with exact namespace identity,
   `scope: "non-production-rehearsal"`, verifier, and timestamp.
4. Run `migrate` without `--execute` first. Execute only with the authorized
   empty target, frozen writers, the exact typed confirmation
   `WRITE VERIFIED NON-PRODUCTION staging`, and a new
   `--live-prewrite-output`. The tool rechecks target identity and emptiness
   immediately before writing.
5. Capture staging and reconcile source/destination counts and hashes exactly.
   Securely verify representative records, both tombstone variants, expiration,
   and metadata. Do not screenshot personal data.
6. Exercise one fully synthetic join, inquiry, and event create/update/delete in
   staging. Verify request IDs, safe logs, alert delivery, and attributed audit
   entries. Remove synthetic records, capture again, and retain only redacted
   reports plus private evidence paths/hashes.
7. Record elapsed restore time, achieved recovery point, operator, tool commit,
   exact checks, and cleanup confirmation. A write command alone is not evidence.

No rehearsal was run for this change: Wrangler is unauthenticated and no
dashboard-authorized empty staging target is available in the repository.

## PII-safe logs and alert checklist

Runtime logs are JSON and use an allowlisted shape. `X-Request-Id` is propagated
only when it is a canonical UUID (preventing arbitrary personal text from
becoming a log field); otherwise a UUID is generated. The response carries the ID. Logs may include timestamp,
event, level, request ID, route, method, response status, verified normalized
Access actor or `break-glass`, action, record type/ID, and a coarse error type.

Never log or add to audit history WhatsApp numbers, names/contact details,
inquiry text, event contents, group URLs, request/response bodies, full records,
Access assertions, tokens, secrets, or JWT claims beyond the verified actor.
Audit entries contain actor, timestamp, action, record ID, request ID, and only
old/new status or changed field names. `audit:{timestamp}:{uuid}` keys are
append-only by application convention; restrict direct KV deletion separately.

Configure these Cloudflare alerts manually after deployment. Keep issue #6's
rate-limit implementation out of this change; it only needs to emit the noted
safe event/interface.

| Signal | Initial threshold | Action |
| --- | --- | --- |
| `submission_write_failed` or `inquiry_write_failed` | any in 5 min | page Operations; correlate by request ID; inspect KV health without form contents |
| `admin_audit_write_failed` | any | page Operations and Security; freeze admin mutations until history retention is healthy |
| `admin_request_failed` | 3 in 5 min | page Operations; group by route/error type, never payload |
| `admin_auth_failed` | 10 in 5 min per edge source or 30 global | notify Security; inspect Access policy/edge telemetry, not JWT contents |
| future `rate_limit_exceeded` from #6 | 25 in 5 min per route or 100 global | notify Operations/Security; tune only after baseline evidence |
| backup age / capture job failure | no success for 7 hours or any failed job | page Operations; preserve last known-good encrypted snapshot |
| quarterly restore | missing, reconciliation mismatch, or RTO > 4h | block readiness and escalate to Operations/Product |

Required manual setup: route Worker/Pages JSON logs to the approved restricted
log sink; apply sink-side field allowlisting and retention; create the monitors,
notification destinations, and on-call routing; test each alert with synthetic
staging requests; record links and timestamps in the private operator register.

## KV consistency decision

KV is suitable for public content and independently keyed form creates where
eventual consistency is acceptable. It is **not sufficient** for the demonstrated
admin invariants here:

- submission transitions are read/modify/write and concurrent admins can both
  validate stale state, with the last KV write silently winning;
- a business mutation and its append-only audit record are two KV operations, so
  they cannot commit atomically; a failed audit write can occur after the data
  changed;
- event save/delete spans multiple keys and cannot be an atomic transaction.

Therefore use D1 transactions for mutable records plus audit rows, or a Durable
Object per record if serialized command processing is preferred, before claiming
that concurrent transitions cannot overwrite or that history is immutable. D1
is the smaller default recommendation because queryable admin history and atomic
data+audit commits share one transaction. Until migrated and tested, freeze admin
mutations on an audit failure and treat concurrency/atomic attribution as an
explicit production-readiness blocker. Do not add a one-off KV lock.
