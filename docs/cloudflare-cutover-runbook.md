# Cloudflare staging, cutover, abort, and rollback runbook

**Authority:** Part of issue
[#11](https://github.com/vibefromcafe/vibefromcafe/issues/11). This document is
executable operator guidance, not approval. **Do not perform production actions
until every go/no-go item is signed.** It deliberately contains no production KV
mutation command. Public brand is **Vibe From Cafe / VFC**; VCFC is unapproved
and [#2](https://github.com/vibefromcafe/vibefromcafe/issues/2) blocks cutover.

## Command discipline and evidence

Run from the integrated, reviewed commit in a clean checkout. Commands containing
`wrangler pages deploy` mutate only the explicitly approved staging project.
Cloudflare production changes are dashboard steps requiring a second operator.
Run each command block with Bash in the same private operator session. Every
block starts in strict mode; any nonzero command or pipeline result is an abort.

```bash
set -Eeuo pipefail
export RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-<change-ticket>"
export EVIDENCE_ROOT="/secure/vfc-cutover/$RUN_ID"
export STAGING_BASE_URL="https://<staging-host>"
export APEX_BASE_URL="https://vibefromcafe.id"
export STAGING_PAGES_PROJECT="<staging-project-alias-resolved-privately>"
export STAGING_WRANGLER_CONFIG="/secure/config/staging-pages.toml"
export WRANGLER_VERSION="<approved-version>"
export PRODUCTION_HOSTS="vibefromcafe.id <other-supported-hosts>"
export WWW_POLICY="<supported-or-intentional-nxdomain>"
mkdir -p "$EVIDENCE_ROOT" && chmod 700 "$EVIDENCE_ROOT"
git status --short --branch | tee "$EVIDENCE_ROOT/git-status.txt"
git rev-parse HEAD | tee "$EVIDENCE_ROOT/commit.txt"
node --version | tee "$EVIDENCE_ROOT/node-version.txt"
pnpm --version | tee "$EVIDENCE_ROOT/pnpm-version.txt"
```

Never use `set -x`. Never redirect authenticated HTTP bodies, headers, raw KV
exports, tokens, namespace identities, Access login URLs, form records, or group
links into public evidence. Raw exports belong in the separately approved
encrypted store; retain only report hashes/aliases here. Use synthetic names,
contacts, and event text reserved for this run—never a real person or reachable
phone number.

Each gate row records UTC start/end, `<PRIMARY_OPERATOR>`, `<SECOND_OPERATOR>`,
expected outcome, actual pass/fail, evidence path/hash, and abort decision. The
`<CUTOVER_COMMANDER>` alone calls go/no-go; `<INCIDENT_COMMANDER>` owns abort and
rollback; `<DATA_OWNER>`, `<SECURITY_OWNER>`, `<DNS_OPERATOR>`,
`<DEPLOY_OPERATOR>`, `<MONITORING_OWNER>`, and `<COMMS_OWNER>` must be named with
backups in the private operator register.

## Phase 0 — preconditions, approvals, and freeze plan

**Operator:** `<CUTOVER_COMMANDER>` with every named owner.
**Expected:** every item below is signed and linked to retained evidence.
**Abort gate:** any unchecked, unknown, stale, or contradictory item is **NO-GO**.

1. All native blockers in the [inventory](cloudflare-cutover-inventory.md) are
   resolved and integrated. PR #19 must be retargeted/landed with PR #15, and PR
   #18 commands must exist on the integrated commit.
2. Vibe From Cafe / VFC brand and positioning are approved; no public/metadata/
   message VCFC copy remains (#2).
3. Full Cloudflare inventory is signed; no unknown writer, hostname, binding,
   Access policy, redirect/rule, secret owner, deployment path, or rollback
   deployment remains.
4. Production/Preview bindings are proven distinct. Access covers every custom,
   canonical Pages, branch, immutable preview, and staging host for `/admin*` and
   `/api/admin/*`.
5. Form abuse/privacy/retention/deletion (#6), chapter actions (#8), event state
   (#9), SEO/redirect/canonical policy (#10), admin workflow (#13), and
   accessibility/UI state (#14) have accepted evidence.
6. PR #19 backup/alert/restore evidence exists and transactional D1 or Durable
   Object invariants are demonstrated. KV-only concurrent mutation/audit is a
   readiness blocker, not a risk acceptance hidden in this runbook.
7. `<DATA_OWNER>` chooses and records one write-routing design: reuse `source`, or
   migrate once to `destination`. Every writer is covered by one freeze switch.
8. `<DNS_OPERATOR>` captures apex/`www` record type, target, proxy, current TTL,
   normal TTL, custom-domain assignment, and certificate state privately. For a
   proxied record, the observed 300-second TTL is not evidence of an editable
   origin TTL. Record Cloudflare's actual dashboard field.
9. Approve a maintenance/freeze window at least `2 × captured DNS TTL + measured
   KV convergence allowance + smoke allowance`; notify operators; freeze merges,
   Pages settings, Access/rules, schema, secrets, deploy hooks, and DNS except the
   runbook change.
10. Establish a 30-day (or longest available) baseline for route volume, 404,
    5xx, write failures, and latency; approve the abort thresholds below. Confirm
    restricted logs, alerts, on-call delivery, support intake, and status comms.

Preflight repository checks:

```bash
set -Eeuo pipefail
pnpm install --frozen-lockfile
pnpm test | tee "$EVIDENCE_ROOT/test.txt"
pnpm typecheck | tee "$EVIDENCE_ROOT/typecheck.txt"
pnpm build | tee "$EVIDENCE_ROOT/build.txt"
git diff --check | tee "$EVIDENCE_ROOT/diff-check.txt"
test -z "$(git status --porcelain)" || {
  echo 'ABORT: checkout changed during preflight' >&2; exit 1;
}
```

## Phase 1 — isolated staging deploy

**Operator:** `<DEPLOY_OPERATOR>`; binding verification witnessed by
`<DATA_OWNER>` and Access by `<SECURITY_OWNER>`.
**Expected:** staging commit equals the candidate; it has a distinct non-production
KV binding and matching staging Access configuration; production is unchanged.
**Abort gate:** binding identity is shared/unknown, a hostname is missing from
Access, Preview mutations are enabled, or deploy commit/build differs.

Before deploying, verify in **Workers & Pages > staging project > Settings**:

- Git/branch/build output are the approved candidate and `build/client`;
- Preview/staging `VFC_SUBMISSIONS` is alias `staging`, distinct from `source`;
- `CF_ACCESS_TEAM_DOMAIN` and audience alias match staging Access;
- `ADMIN_MUTATIONS_ENABLED` is false/unset until the controlled data rehearsal;
- break-glass is false/unset and the shared admin secret is unset;
- no custom production domain is attached.

Create a restricted private `STAGING_WRANGLER_CONFIG` that names only the
approved staging project and its staging-only binding. Do not edit or reuse the
checked-in replacement config: it contains a different repository binding
contract and is not deployed-state evidence. Record the pinned Wrangler version
and private config SHA-256 (never its contents or namespace identity), then deploy
the built candidate only to the named staging project:

```bash
set -Eeuo pipefail
test -r "$STAGING_WRANGLER_CONFIG"
shasum -a 256 "$STAGING_WRANGLER_CONFIG" \
  | sed "s#${STAGING_WRANGLER_CONFIG}#<private-staging-config>#" \
  | tee "$EVIDENCE_ROOT/staging-config-sha256.txt"
pnpm dlx "wrangler@$WRANGLER_VERSION" pages deploy build/client \
  --config "$STAGING_WRANGLER_CONFIG" \
  --project-name "$STAGING_PAGES_PROJECT" --branch staging
```

Record only deployment alias, commit, UTC time, status, and the redacted dashboard
binding/Access attestation. Re-attest the effective deployed binding before
enabling controlled staging mutations. Do not paste the deployment URL if it
contains a private immutable alias.

## Phase 2 — #4 data rehearsal in staging

**Operator:** `<DATA_OPERATOR>` with `<DATA_OWNER>`.
**Expected:** PR #18 formatVersion 1 source/staging counts and hashes reconcile;
sample fields/statuses/IDs are unchanged; tombstoned seeds stay absent; synthetic
writes land only in staging and are removed.
**Abort gate:** any unknown/malformed record without a decision, count/hash/sample
mismatch, reappearing tombstone, non-empty target, target drift, unknown writer,
production binding, or inability to clean up synthetic data.

Follow integrated `docs/cloudflare-kv-cutover.md` exactly. It performs read-only
captures and permits writes only to an attested empty non-production namespace:

```bash
set -Eeuo pipefail
pnpm kv:cutover capture --alias source \
  --config /secure/config/source.toml \
  --output .kv-cutover/rehearsal-source.json --execute-read
pnpm kv:cutover capture --alias staging \
  --config /secure/config/staging.toml \
  --output .kv-cutover/staging-before.json --execute-read
# First run migrate without --execute; then use the exact staging-only command
# and typed confirmation documented by PR #18 after dual authorization.
pnpm kv:cutover capture --alias staging \
  --config /secure/config/staging.toml \
  --output .kv-cutover/staging-after.json --execute-read
pnpm kv:cutover reconcile \
  --source .kv-cutover/rehearsal-source.json \
  --destination .kv-cutover/staging-after.json \
  --output .kv-cutover/staging-reconciliation.json
```

Privately sample every reported status, event override, both tombstone spellings,
expiration, and metadata. Exercise one synthetic join, inquiry, and event
create/update/delete; verify request IDs, safe logs, alerts, and actor audit; then
remove synthetic data and reconcile again. Never screenshot records.

## Phase 3 — route, security, form, accessibility, and SEO staging matrix

**Operators:** `<QA_OPERATOR>`, `<SECURITY_OWNER>`, `<CONTENT_OWNER>`.
**Expected:** every row passes on the direct staging host and every inventoried
alias; edge/direct navigation agree.
**Abort gate:** any auth bypass, production write/read, secret in browser storage
or logs, failed public flow, wrong brand, soft 404, redirect mismatch, inaccessible
key flow, missing canonical/noindex control, or unresolved owner row.

Safe unauthenticated status capture (no response bodies):

```bash
set -Eeuo pipefail
for path in / /chapters /chapters/jogja /events /about /join /contact; do
  code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "$STAGING_BASE_URL$path")"
  printf '%s\t%s\n' "$path" "$code"
  test "$code" = 200 || exit 1
done | tee "$EVIDENCE_ROOT/public-status.tsv"

for path in /admin /admin/inquiries /admin/events /admin/events/new \
  /api/admin/submissions /api/admin/inquiries /api/admin/events; do
  code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "$STAGING_BASE_URL$path")"
  printf '%s\t%s\n' "$path" "$code"
  case "$code" in 302|401|403) ;; *) exit 1 ;; esac
done | tee "$EVIDENCE_ROOT/admin-anonymous-status.tsv"
```

Do not retain Access redirect `Location` headers. For **every** inventoried host
and concrete route, perform PR #15's full anonymous, forged assertion, expired,
wrong issuer/audience, authorized read, authorized synthetic mutation, actor
attribution, and Preview-write-disabled matrix. A single forged/anonymous `2xx`
is a security abort. Use an authorized browser for identity Access; do not treat
a service token as an admin identity.

Additional required matrix:

1. **PR #16 cafe redirects:** all 56 archived slugs: 48 temporary `302` to real
   cafein `/cafe/:slug`, 3 ambiguous + 5 unmatched legacy pages, query retention,
   and unknown HTTP `404`. Owner list, traffic/indexing evidence, deployed smoke,
   and monitoring must be signed before any permanent redirect.
2. **Aliases/host normalization (#10):** `/chapter`, `/event`, both legacy join
   spellings, trailing slash, query, apex/`www`, known legacy public URLs, and a
   random unknown path. Compare edge and client navigation.
3. **Public forms (#6/#13):** submit one reserved synthetic join and contact
   record; prove explicit consent/privacy copy, validation, content/field limits,
   Turnstile/rate limiting, duplicate behavior, safe response, staging-only key,
   admin workflow, and approved deletion/cleanup.
4. **Events (#9):** verify upcoming/past/empty/error/retry states, legacy
   fragment/permalink decision, registration/details/map action, deliberate
   draft/publish, invalid-status rejection, and confirmed/audited delete.
5. **Accessibility (#14):** keyboard-only navigation and forms, mobile-menu
   Escape/focus/return, visible focus, live error/success announcement, language,
   non-interactive card affordance, and automated key-route audit. Any serious or
   critical finding is no-go; accepted moderate/minor exceptions need owner/date.
6. **SEO (#10):** unique title/description/canonical, route OG URL/image,
   language, sitemap/robots inclusion, admin/API exclusion/noindex, real unknown
   404, and social-preview spot check. Validate rendered HTML and edge response,
   not only source code.
7. **Brand/claims (#2/#7):** Vibe From Cafe / VFC everywhere, broad community
   purpose first, no unsupported quantitative/deployment claims, and named
   evidence owner/date for every retained claim.

## Phase 4 — DNS TTL preparation and change freeze

**Operator:** `<DNS_OPERATOR>` witnessed by `<SECOND_OPERATOR>`.
**Expected:** approved low TTL has propagated before freeze; exact before-state
and rollback target are retained; TLS can activate on replacement.
**Abort gate:** incomplete before-state, unpropagated TTL, conflicting custom
domain, pending/failed certificate, DNSSEC uncertainty, active unauthorized
change, or `www` policy unresolved.

At least the approved lead time before cutover:

1. In **DNS > Records**, set only the approved apex/`www` TTL where editable.
   Cloudflare-proxied records normally show Auto; do not claim a change when the
   field is fixed. Do not change record target/proxy yet.
2. In both Pages projects **Custom domains**, record current ownership and the
   exact transfer sequence. Confirm replacement certificate readiness using the
   dashboard-supported prevalidation path; never detach production merely to
   test.
3. Capture read-only propagation:

```bash
set -Eeuo pipefail
for resolver in 1.1.1.1 8.8.8.8; do
  dig +noall +answer @"$resolver" vibefromcafe.id A
  dig +noall +answer @"$resolver" www.vibefromcafe.id CNAME
done | tee "$EVIDENCE_ROOT/dns-preflight.txt"
```

4. Start the freeze: no merge/deploy/config/Access/rule/KV/DNS changes outside
   this runbook. Record freeze acknowledgement from every writer owner.

## Phase 5 — final frozen export and reconciliation

**Operator:** `<DATA_OPERATOR>` witnessed by `<DATA_OWNER>`.
**Expected:** all public/admin writers are disabled, two frozen `source` captures
reconcile exactly, and the chosen namespace/write route is signed.
**Abort gate:** any write after freeze, captures differ, alert/logging unavailable,
unknown writer, malformed uncertainty, or final export cannot be retained.

1. Put join/contact/admin mutations into approved maintenance/read-only mode;
   stop deploy hooks, cron, scripts, and every inventoried writer.
2. Wait the documented KV convergence interval. Capture `final-a` and `final-b`
   using PR #18 and reconcile with `--same-namespace-stability-check`.
3. Retain encrypted raw exports privately and redacted counts/hashes/tool version/
   timestamps in evidence. Verify representative statuses, IDs, expiration,
   event overrides, and tombstones without screenshots.
4. If reusing `source`, run **no migration**. If using a separate production
   `destination`, stop: this repository intentionally supplies no production
   mutation command. A separately reviewed/approved migration execution plan and
   exact post-copy reconciliation are mandatory before proceeding.

### Mandatory replacement production-candidate gate

**Operator:** `<DEPLOY_OPERATOR>` witnessed by `<SECOND_OPERATOR>`.
**Expected:** the exact reviewed candidate commit/build exists on the replacement
production project with all writers disabled and can be tested on its direct
hosts before any domain action.
**Abort gate:** stale/different commit, unknown deployment mechanism, production
write enabled, effective binding/variable/rule/Access mismatch, untested direct
host, or no compatible static rollback deployment.

Use the deployment mechanism established by the signed inventory—Pages Git
integration, approved deploy hook, or separately approved manual path. If Git
integration already deployed the candidate, do not redeploy: attest it read-only.
Otherwise follow the approved private deployment procedure; this runbook does
not guess an unknown production deployment command. Record candidate commit,
build/deployment aliases, effective binding alias, variable-name presence,
Access/rule coverage, canonical and immutable host matrix, and the exact approved
rollback deployment. Keep public/admin writers disabled. `<DEPLOY_OPERATOR>` and
`<SECOND_OPERATOR>` sign this gate before Phase 6.

## Phase 6 — custom-domain cutover

**Operators:** `<DNS_OPERATOR>` and `<DEPLOY_OPERATOR>` with
`<CUTOVER_COMMANDER>` verbal confirmation at each gate.
**Expected:** only the reviewed replacement deployment owns the custom domain;
TLS is active; all production deployments/writers point to the single signed
namespace before writes resume.
**Abort gate:** wrong deployment/commit/binding, custom-domain conflict, TLS not
active, DNS divergence beyond `2 × captured TTL`, Access coverage gap, or more
than one write namespace.

No shell mutation is provided. Use Cloudflare Dashboard:

1. Reconfirm replacement deployment commit, static rollback deployment, binding,
   variables, Access, rules, alerts, and frozen writers.
2. **Workers & Pages > replacement > Custom domains > Set up a custom domain**;
   follow the pre-approved apex/`www` sequence. If Cloudflare requires detaching
   legacy first, record the detach time and immediately attach replacement.
3. **DNS > Records:** change only the pre-approved target/proxy fields if Pages
   did not manage them. Never improvise record type, flattening, or proxy state.
4. Wait until **Custom domains** says Active and **SSL/TLS > Edge Certificates**
   covers each supported hostname. Check authoritative and two public resolvers.
5. Keep every writer frozen. Do not resume writes until Phase 7 read/auth/data
   checks pass and all production bindings target the one signed namespace.

## Phase 7 — post-cutover smoke and monitoring

**Operators:** `<QA_OPERATOR>`, `<SECURITY_OWNER>`, `<DATA_OWNER>`,
`<MONITORING_OWNER>`.
**Expected:** route/security/data matrices pass through apex and every supported
host; metrics stay within approved thresholds; one authorized synthetic write
lands only in the chosen namespace and is cleaned up.
**Abort gate:** any threshold below or any Phase 3 regression.

Repeat all Phase 3 checks against apex, `www` if supported, canonical Pages host,
branch/immutable hosts, and staging. Confirm DNS/TLS with:

```bash
set -Eeuo pipefail
for host in $PRODUCTION_HOSTS; do
  dig +noall +answer "$host" A "$host" AAAA "$host" CNAME
  curl --silent --show-error --output /dev/null \
    --write-out "$host status=%{http_code} remote=%{remote_ip}\n" "https://$host/"
done | tee "$EVIDENCE_ROOT/post-cutover-network.txt"

if [ "$WWW_POLICY" = "intentional-nxdomain" ]; then
  test -z "$(dig +short www.vibefromcafe.id A)"
  test -z "$(dig +short www.vibefromcafe.id AAAA)"
  test -z "$(dig +short www.vibefromcafe.id CNAME)"
  echo 'www policy: intentional NXDOMAIN confirmed' \
    | tee "$EVIDENCE_ROOT/www-policy.txt"
else
  case " $PRODUCTION_HOSTS " in
    *" www.vibefromcafe.id "*) ;;
    *) echo 'ABORT: supported www missing from PRODUCTION_HOSTS' >&2; exit 1 ;;
  esac
fi
```

After all read/auth checks, `<CUTOVER_COMMANDER>` authorizes one reserved
synthetic join, inquiry, and event lifecycle. Prove each key exists only in the
chosen production namespace, audit/logs are safe, alerts are healthy, and
approved application deletion cleans up the record. Do not display the record.
Resume all writers together; there must never be a period where old and new
deployments accept writes to different namespaces.

Monitor continuously for 60 minutes, every 15 minutes for the next 3 hours,
hourly through 24 hours, and daily for 14 days (including PR #16 cafe/Search
Console monitoring). Retain status counts and graph links, not request bodies.

### Initial abort thresholds

Owners may tighten these before approval, never loosen them during cutover.

- **Immediate:** any anonymous/forged admin success; production PII visible on a
  Preview/staging host; wrong-namespace write; split-brain writer; TLS failure;
  KV/hash/sample/tombstone mismatch; secret/PII in logs; lost audit; or backup/
  alert pipeline unavailable.
- **Availability:** 3 consecutive synthetic failures on any critical public
  route, or 5xx >= 1% for 5 minutes with at least 20 requests.
- **Writes:** any join/contact/admin write failure in 5 minutes; freeze writes
  immediately while deciding rollback.
- **Latency:** critical-route p95 > 2 times the signed baseline for 10 minutes.
- **Routing/SEO:** unknown paths not real 404, any verified cafe destination
  fails, or `/cafes/*` 404s exceed 2 times baseline with at least 20 requests for
  15 minutes.
- **DNS:** resolver/custom-domain disagreement persists beyond 2 times the
  captured TTL, or any supported host resolves to an unapproved target.

## Phase 8 — abort and rollback

`<INCIDENT_COMMANDER>` records the trigger/time and chooses the smallest rollback
that restores invariants. Security/data/split-brain failures freeze writes before
any static or DNS change.

### A. Abort before domain change

Stop. Leave legacy production untouched, keep staging isolated, unfreeze legacy
writers only after proving their original deployment/binding, retain evidence,
and open an incident/follow-up. Do not “try once” in production.

### B. Static deployment rollback (domain stays on replacement project)

Before clicking rollback, freeze every writer and verify the rollback deployment's
effective schema and binding are compatible with the currently selected
namespace. If they differ, or if `destination` has received any legitimate
post-cutover mutation, **do not switch deployment**: complete section D's
forward-sync/rebind decision first. Only then use **Workers & Pages > replacement
> Deployments > approved prior deployment > Rollback to this deployment** (exact
dashboard wording may vary). Two operators verify commit, schema, and binding
before confirmation. Repeat TLS, public, admin, redirect, and data read checks
before resuming writers.

### C. DNS/custom-domain rollback to legacy

1. Freeze every writer and capture the current destination read-only.
2. If no post-cutover legitimate write exists, proceed. If any exists, DNS/static
   rollback is blocked until the data procedure below resolves it.
3. In Pages custom domains, detach apex/`www` from replacement only as required,
   reattach to the exact recorded legacy project/deployment, and restore exact
   before-state DNS type/target/proxy fields. Never guess from Git config.
4. Wait for legacy custom-domain/TLS Active and resolver convergence. Verify
   Access on every admin route before public confirmation.
5. Repeat route/auth/data read checks, then resume all legacy writers together.

### D. Data and write-routing rollback (no split brain)

1. Keep **all** writers frozen. Capture the active namespace and compare with the
   final frozen baseline.
2. If `source` was reused, no data rebind/copy is needed; verify every rolled-back
   deployment still points to `source`.
3. If `destination` received any legitimate create/update/delete/tombstone, do
   not point writers back to stale `source`. Either keep serving `destination`,
   or execute a separately reviewed forward synchronization including keys,
   values, deletions, expiration, metadata, and tombstones.
4. Capture both sides and require exact counts/hashes plus private samples. Only
   then rebind every deployment/writer to one namespace in one controlled change.
5. Make one authorized synthetic write, prove it exists only in the selected
   namespace, clean it up, and then resume service. Keep the other namespace
   read-only through the approved retention period.

Bulk put is not rollback: it does not remove destination-only keys. This runbook
does not implement production copy or reverse migration.

## Phase 9 — TTL restoration and postmortem

After 24 hours stable and `<CUTOVER_COMMANDER>` approval, `<DNS_OPERATOR>` restores
the privately recorded normal TTL where editable (or records that proxied Auto is
unchanged). Recheck two resolvers after propagation. Keep heightened monitoring
for 14 days.

Within two business days, `<INCIDENT_COMMANDER>` or `<CUTOVER_COMMANDER>` records
timeline, operators, deployment/commit aliases, decisions, threshold events,
achieved downtime/RPO/RTO, redacted report hashes, cleanup, access/evidence
retention, owner follow-ups, and whether rollback was exercised. Never include
records, identities, credentials, group links, namespace IDs, or Access values.

## Staging rehearsal report — current state

**Report date:** 2026-07-18
**Result:** **NOT RUN / BLOCKED**

### What was run read-only

- Read issue #11 and all native prerequisite issue bodies.
- Reviewed PRs #15–#19 metadata and their clean prerequisite worktrees without
  changing them.
- Inspected replacement, legacy, and cafein repository configs read-only.
- Queried public DNS/TLS/HTTP and GitHub branch/PR/deployment metadata.
- Observed apex public routes returning `200`, sampled apex admin routes entering
  Access, both canonical Pages hosts exposing sampled admin HTML anonymously,
  `www` unresolved, and inconsistent unknown-cafe behavior across hosts.
- Ran repository checks listed in this PR's evidence summary; these validate the
  docs/current code only, not a deployed staging environment.

### What was not run

- No Cloudflare dashboard/API inventory: no authenticated read-only Cloudflare
  session was available.
- No staging deploy, setting, binding, Access, secret, rule, DNS, domain, TLS, or
  monitoring mutation.
- No production KV inventory/export, actual category/tombstone/status counts,
  staging migration/restore, reconciliation, synthetic remote write, alert test,
  final frozen export, cutover, abort drill, or rollback rehearsal.
- No production mutation of any kind.

### Evidence required to replace this blocked report

Signed inventory; isolated binding/Access attestations; candidate deployment
commit; PR #18 redacted source/staging/final reconciliation hashes; synthetic
cleanup proof; full route/auth/form/a11y/SEO matrices; DNS/TLS before-state;
monitor/alert delivery; timed static, DNS, and write-routing rollback exercise;
named operators; decisions; and go/no-go signatures.

## Final go/no-go record

Every row requires evidence and two-person sign-off. Any **UNKNOWN** is **NO-GO**.

| Gate | Current 2026-07-18 state | Required sign-off |
| --- | --- | --- |
| Native issues #2–#10, #12–#14 resolved/integrated | **NO-GO** | `<CUTOVER_COMMANDER>` |
| Public brand Vibe From Cafe / VFC approved | **NO-GO (#2)** | `<CONTENT_OWNER>` |
| Full Cloudflare inventory and named owners | **NO-GO / unknown** | `<CLOUDFLARE_INVENTORY_OWNER>`, `<SECURITY_OWNER>` |
| Staging KV and Access isolated | **NO-GO / unverified** | `<DATA_OWNER>`, `<SECURITY_OWNER>` |
| #4 staging restore/reconciliation and final exports | **NO-GO / not run** | `<DATA_OWNER>` |
| #3 redirect matrix, owner rows, traffic/index evidence | **NO-GO / deploy and monitoring evidence missing** | `<SEO_OWNER>` |
| #5 every-host/route Access matrix | **NO-GO / observed Pages exposure** | `<SECURITY_OWNER>` |
| Join/contact/event synthetic flows and cleanup | **NO-GO / not run; #6/#9/#13 open** | `<PRODUCT_OWNER>`, `<DATA_OWNER>` |
| Accessibility and SEO accepted | **NO-GO / #10/#14 open** | `<ACCESSIBILITY_OWNER>`, `<SEO_OWNER>` |
| Backup/restore/alerts and transactional writes | **NO-GO / #12 operational and architecture blockers** | `<OPERATIONS_OWNER>`, `<DATA_OWNER>` |
| DNS/TTL/`www`/TLS before-state and rollback target | **NO-GO / partial public observation only** | `<DNS_OPERATOR>` |
| Static, DNS, and data rollback rehearsed | **NO-GO / not run** | `<INCIDENT_COMMANDER>` |
| Freeze, comms, baseline, thresholds, maintenance window | **NO-GO / owners and evidence unknown** | `<CUTOVER_COMMANDER>` |

**Current decision: NO-GO.** Completing this repository runbook does not close
issue #11 while its native and operational blockers remain.
