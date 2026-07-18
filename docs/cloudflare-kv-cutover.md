# Cloudflare KV cutover runbook

This is the repeatable, dry-run-first process for moving Vibe From Cafe (VFC)
runtime records. It preserves each KV key, value string, expiration, and metadata
without normalizing application fields. Exports contain WhatsApp and personal
form data: store them only in an encrypted, access-controlled location, never in
Git, tickets, chat, CI artifacts, or PR attachments.

The tool pins its remote operations to Wrangler 4.112.0 through `pnpm dlx` so a
rehearsal and cutover do not silently use different CLI behavior.

## Verified repository facts and facts still requiring the dashboard

- Runtime code reads tombstones with `event-deleted:{id}` (hyphen). The previous
  README spelling, `event_deleted:{id}`, was wrong. Inventory reports both
  separately so an actual legacy variant cannot be missed.
- Seed events are merged with `event:*` overrides and `event-deleted:*`
  tombstones at runtime. Copy all three semantics; do not export seed JSON alone.
- The replacement currently uses the same merge semantics, so materializing seed
  events would add risk and is not required. If storage semantics change before
  cutover, materialize `seed events - tombstoned IDs + event overrides` into a
  reviewed staging export, preserve each resulting event ID and source fields,
  record provenance (`seed`, `override`, or `tombstone`), and reconcile the
  materialized ID set against the current staging API before production approval.
- Submission reads accept current statuses plus legacy `pending`, `joined`, and
  `declined`, but this migration preserves the stored status exactly. If a later
  application change requires normalization, make a separately reviewed mapping
  file containing old status, new status, reason, migration timestamp, and source
  export hash. Never normalize silently during copy.
- The checked-in legacy and replacement Wrangler configs refer to different KV
  namespace identities. This is not proof of the deployed Pages bindings.
- Production inventory was not run while preparing this runbook because no
  authenticated Wrangler session was available.

In the Cloudflare dashboard, an authorized operator must record these facts using
aliases only (`source`, `staging`, `destination`) in the retained cutover log:

1. Pages project and environment currently serving production.
2. KV namespace bound as `VFC_SUBMISSIONS` in production and preview/staging.
3. Whether the destination deploy reuses `source` or binds a distinct namespace.
4. All Worker/Pages deployments, webhooks, cron jobs, and operator scripts that
   can write to either namespace.
5. Namespace retention policy and encrypted export storage location/owner.

Do not paste namespace IDs into the log. The tool compares IDs internally and
prints aliases only.

## 1. Prepare and capture a read-only inventory

Use config copies outside Git that resolve the binding aliases correctly. First
preview the operation (this performs no remote request):

```sh
pnpm kv:cutover capture \
  --alias source \
  --config /secure/config/source.toml \
  --output .kv-cutover/pre-cutover-1.json
```

After checking the alias/config in the dashboard, perform the read-only capture:

```sh
pnpm kv:cutover capture \
  --alias source \
  --config /secure/config/source.toml \
  --output .kv-cutover/pre-cutover-1.json \
  --execute-read
```

The snapshot is mode `0600`; its adjacent `.inventory.json` is redacted. It
contains aggregate counts and deterministic SHA-256 hashes for `submission:*`,
`event:*`, both tombstone spellings, `inquiry:*`, and unknown keys. It also gives
status counts and malformed JSON/key-ID counts without keys or values.

KV listing is not a transactional snapshot. For the final export, freeze all
writes first, wait for the documented KV propagation interval, capture twice,
and reconcile the two captures. Any mismatch means the freeze is incomplete or
data has not converged; stop rather than choosing one export.

```sh
pnpm kv:cutover reconcile \
  --source .kv-cutover/final-a.json \
  --destination .kv-cutover/final-b.json \
  --output .kv-cutover/final-stability-report.json \
  --same-namespace-stability-check
```

The explicit stability flag is only for two captures of the same frozen
namespace. Without it, reconciliation intentionally rejects source/destination
identity reuse. Retain both raw exports, redacted reports, command versions,
operator, and timestamps.

Malformed records are not dropped. UTF-8 values are preserved as strings;
non-UTF-8 values are preserved as base64 bulk records and counted explicitly.
Before cutover, an owner must decide whether malformed records are application
data to preserve, quarantined data, or safe to exclude; record that decision with
counts, never contents.

## 2. Rehearse against a separate staging namespace

Confirm in the dashboard that `staging` is non-production and distinct from
`source`. Disable staging writers, capture the empty destination, and retain that
snapshot. The tool refuses any non-empty destination to avoid destroying or
merging pre-existing data:

```sh
pnpm kv:cutover capture --alias staging \
  --config /secure/config/staging.toml \
  --output .kv-cutover/staging-before.json --execute-read
```

An authorized operator must then create a mode-`0600` JSON file outside Git after
verifying the namespace in the dashboard. The private file contains the actual
identity only so the tool can bind the authorization to the exact write target;
never print, paste, or attach it:

```json
{
  "namespaceId": "copy from the private staging snapshot",
  "alias": "staging",
  "scope": "non-production-rehearsal",
  "dashboardVerified": true,
  "verifiedBy": "operator identity",
  "verifiedAt": "ISO-8601 timestamp"
}
```

Unset `CLOUDFLARE_ENV`; the CLI rejects it and targets the exact validated
namespace identity rather than allowing Wrangler to re-resolve a binding. Preview
first:

```sh
pnpm kv:cutover migrate \
  --input .kv-cutover/pre-cutover-1.json \
  --destination-alias staging \
  --destination-config /secure/config/staging.toml \
  --destination-before .kv-cutover/staging-before.json \
  --authorization /secure/config/staging-authorization.json \
  --live-prewrite-output .kv-cutover/staging-live-prewrite.json
```

Then execute only against staging:

```sh
pnpm kv:cutover migrate \
  --input .kv-cutover/pre-cutover-1.json \
  --destination-alias staging \
  --destination-config /secure/config/staging.toml \
  --destination-before .kv-cutover/staging-before.json \
  --authorization /secure/config/staging-authorization.json \
  --live-prewrite-output .kv-cutover/staging-live-prewrite.json \
  --execute --writes-frozen \
  --confirm "WRITE VERIFIED NON-PRODUCTION staging"
```

Execution performs another remote key listing against the exact authorized
namespace immediately before bulk put. It compares that live state to the
authorized empty snapshot and aborts on any key, identity drift, malformed
response, or fetch failure. Only a matching zero-record state is retained at the
new, non-overwriting `--live-prewrite-output` path; failure to retain it also
aborts before mutation. KV has no list-and-put transaction, so keeping all staging
writers frozen remains mandatory until post-write reconciliation completes.

Capture staging and reconcile it with the source export:

```sh
pnpm kv:cutover capture --alias staging \
  --config /secure/config/staging.toml \
  --output .kv-cutover/staging-after.json --execute-read
pnpm kv:cutover reconcile \
  --source .kv-cutover/pre-cutover-1.json \
  --destination .kv-cutover/staging-after.json \
  --output .kv-cutover/staging-reconciliation.json
```

A successful report requires equal total/category counts and equal hashes. Also
test the staging application manually:

1. Select several submissions across every reported status using private admin
   access. Compare all fields, timestamps, referrals, WhatsApp fields, status,
   and approval metadata to the secure source export. Do not screenshot PII.
2. Confirm existing custom/override event IDs, timestamps, status, and optional
   fields are unchanged.
3. For every tombstoned seed ID (checked securely), confirm the public and admin
   event APIs do not return it. Confirm no seed deletion reappears.
4. Create, update, and delete one synthetic staging event; submit one synthetic
   staging join form. Confirm writes appear only in `staging`, then remove the
   synthetic records. Never use a real phone number or personal record.
5. Repeat capture/reconciliation after synthetic cleanup. Retain the report as
   rehearsal evidence together with `staging-before` and
   `staging-live-prewrite`. A write command alone is not evidence of success.

## 3. Production cutover (requires separate explicit approval)

No production write is authorized by this runbook or its PR. Obtain explicit
coordinator approval after staging reconciliation and owner decisions. The CLI
deliberately does not implement production writes; approval must be followed by a
separately reviewed execution plan rather than relabeling a target as staging.

For a separate destination namespace:

1. Freeze every production writer identified in the dashboard audit. Put the
   public forms and admin mutations into maintenance/read-only mode.
2. Wait for KV convergence; make and reconcile two final source exports.
3. Capture and retain the destination-before state. It must be empty; otherwise
   stop and design a separate merge/backup plan before any overwrite.
4. Only after explicit approval, use the separately reviewed production
   execution plan. Do not use this CLI's staging migration command.
5. Capture destination and require exact reconciliation before changing the
   Pages binding. Verify tombstoned seeds and private samples.
6. Change the production binding once, deploy, then verify reads and a single
   synthetic write. Confirm the synthetic write exists only in destination.
7. Re-enable writers only after every production deployment points to the same
   namespace. Capture and retain the post-cutover report.

If the dashboard proves the namespace is reused, do not run `migrate`; the
operation is a deployment cutover with pre/post exports and application checks.

## 4. Rollback without split-brain writes

Rollback is a binding/deployment decision, not an automatic reverse bulk copy.

1. Freeze all writers again before rollback. Never switch reads while writes can
   continue to destination.
2. Capture destination and reconcile it with the post-cutover baseline. If new
   legitimate writes or deletions exist, rollback is blocked: keep serving the
   destination or execute a separately reviewed forward synchronization covering
   creates, updates, expirations, metadata, tombstones, and deletions.
3. Capture source after synchronization and require exact source/destination
   reconciliation. A mismatch blocks rebinding.
4. Only after exact reconciliation, point every production deployment/writer
   back to `source` in one controlled change and verify all bindings.
5. Confirm a synthetic write lands only in `source`; remove it, then restore
   service. Keep destination read-only for the retention period.
6. Retain final source/destination exports and reconciliation reports. Never use
   bulk put as a delete/rollback mechanism: it does not remove destination-only
   keys and can create a misleading partial restore.

Abort and keep writes frozen on count/hash mismatch, malformed-record uncertainty,
an unknown writer, wrong namespace alias, a reappearing deleted seed event, or
any sample field/status difference.
