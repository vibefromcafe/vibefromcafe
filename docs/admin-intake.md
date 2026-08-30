# Admin intake workflow

This is the repository contract for issue #13. It intentionally provides a minimum safe workflow without claiming that Cloudflare KV is transactional, that retention policy has been approved, or that production operations have been validated.

## Bounded reads

`GET /api/admin/submissions` and `GET /api/admin/inquiries` accept `limit` (default 25, maximum 50), an opaque `cursor`, and `status`. Each request performs exactly one bounded KV list and at most `limit` record reads. Responses return `nextCursor` and `scannedCount`. Search is applied in the browser only to the current protected page so submitted names, contacts, and messages are never copied into request URLs or edge logs.

KV keys are UUID-based, not chronological indexes. Results are sorted newest-first only within the scanned page. Search and status filters are also applied only within that bounded page, so an empty page can still have a continuation cursor. Operators must continue until `nextCursor` is null before concluding that no later page matches. A future globally ordered/searchable index requires a separately reviewed storage design; the admin must not restore an unbounded full-namespace scan.

## Triage and correction

Every PATCH requires the existing verified Cloudflare Access actor and `ADMIN_MUTATIONS_ENABLED=true`. Requests are strict JSON objects, limited to 8 KiB, reject unsupported fields, validate corrected public fields, and write `updated_by` plus `updated_at` on every successful change.

Inquiry states:

```text
new ──▶ contacted ──▶ closed
 │         │
 └─────────┴───────▶ spam

contacted, closed, or spam ──▶ new (reopen/correct)
```

Closed and spam records cannot transition directly to each other. Reopen them to `new` first. `assigned_to` and `admin_notes` are optional operator-only triage fields. Assignment names a person or team but this repository does not invent an assignment rota or SLA.

Submission states retain legacy normalization (`pending` → `signed_up`, `joined` → `requested_to_join`, `declined` → `rejected`). Normal forward transitions remain. Accidental intermediate decisions can move back one step, and terminal `approved`/`rejected` decisions can reopen to `requested_to_join` before a corrected decision. This is the escalation/correction path; arbitrary state skipping remains rejected.

Operators may correct displayed submission or inquiry fields. Existing privacy references continue pointing to the corrected operational record, and existing dedupe markers remain connected to that reference. A correction does not atomically re-key dedupe markers; a later public form using only the corrected identifier can therefore create a separately discoverable record. This residual KV race must be included in issue #28/#30 reconciliation and must not be described as atomic deduplication.

## Deletion and export

The admin exposes **Complete verified deletion** for submissions and inquiries. It requires named confirmation and calls the resumable privacy deletion route documented in [Privacy operations](privacy-operations.md). Use it only after the operator-approved identity-verification process exists. A failed or incomplete deletion is retryable; do not report completion until the route succeeds and the issue #30 reconciliation drill covers markers and backups.

No bulk export is exposed. Export remains blocked until an owner approves purpose, access, retention, delivery, and audit policy. The cutover does not require inventing that policy in code.

## Remaining gates

- Issue #12: immutable/transactional mutation history, request correlation, concurrent-write protection, backup/restore, alerting, and approved RPO/RTO.
- Issue #30: monitored privacy channel, owners, identity verification, retention schedule, escalation, and a non-author synthetic lifecycle drill.
- Staging: validate pagination, each allowed/rejected transition, correction, assignment/notes, retryable deletion, and denied mutations with synthetic records behind every authorized host. Production data must not be used for this validation.
