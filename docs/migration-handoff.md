# Vibe From Cafe migration handoff

This document is the durable restart point for the paused Vibe From Cafe migration. It summarizes state and decisions; the linked runbooks remain authoritative for execution details. Do not interpret this handoff as authorization to mutate GitHub, Production Cloudflare resources, production data, DNS, domains, or traffic.

## Coordination context and pause state

- The initiative was deliberately narrowed from all repositories in the Vibe From Cafe organization to the website migration pair only: legacy `zainfathoni/vibefromcafe` and canonical `vibefromcafe/vibefromcafe`.
- The owner chose to **complete**, not cancel, the migration. Canonical issue [#1](https://github.com/vibefromcafe/vibefromcafe/issues/1) is the source-of-truth epic and dependency graph.
- Production remains **NO-GO**. Public forms remain launch scope, but only with the hardened controls already implemented and successful isolated staging evidence.
- The legacy repository/project is rollback capacity. It must remain available and must not be archived, disconnected, or disabled until a successful production cutover has completed its approved monitoring period and canonical #33 permits retirement.
- The owner approved only a bounded **non-production** staging provisioning and validation package. The approval explicitly excluded Production reconnection, binding/data/domain/DNS mutation, Production writes, and traffic cutover.
- Provisioning stopped before any mutation because the staging token lacked required Workers/Durable Object/Access permissions and the private privacy-channel and Access-principal inputs were absent.
- The owner is pausing now. Puck will archive implementation subthreads, keep the primary coordination thread active, and the owner will manually snooze that primary thread. This repository handoff—not an archived subthread—is the durable technical restart point. Do not archive the primary thread as part of this handoff.

User-facing setup references retained from coordination:

- [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- [Cloudflare: Create API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Amp environment variables](https://ampcode.com/settings/environment-variables)
- [Amp secrets and environment variables](https://ampcode.com/docs/orbs/handling-secrets#secrets-and-environment-variables)
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)

## Exact repository state

- Canonical repository: `https://github.com/vibefromcafe/vibefromcafe`; local branch: `main`.
- Remote baseline: `origin/main` at `64e735089be54f3ead94490c680daf6f84e75933`.
- Fully verified application baseline: `db5783a6d9c7c68427aa19bd82ce346e3211a671`.
- Before this handoff-only commit, local `main` was clean and **13 commits ahead, 0 behind** `origin/main`. None of those commits had been pushed.
- The commit containing this file is documentation-only and is the new local `HEAD`; its immutable SHA is recorded in the Amp parent-thread completion message because a commit cannot contain its own SHA.
- No GitHub issue/PR, Cloudflare resource, deployment, KV record, Access policy, DNS record, domain, or production setting was changed during this work.

Do not rebuild “the same” application from the handoff commit when staging was explicitly approved for `db5783a`. Create a detached worktree at the exact baseline:

```sh
git fetch origin
test "$(git rev-parse db5783a^{commit})" = "db5783a6d9c7c68427aa19bd82ce346e3211a671"
git worktree add --detach /tmp/vfc-staging-db5783a db5783a
```

Pass `db5783a6d9c7c68427aa19bd82ce346e3211a671` as deployment commit metadata and retain the resulting deployment identifier privately. Do not push merely to make a staging deployment.

## Integrated local commits and verification

| Commit | Integrated outcome |
| --- | --- |
| `87b201f` | Safe, dry-run-first KV capture/migration/reconciliation tooling and runbook |
| `0451dc2` | Shared navigation focus containment, Escape/focus return, and focus-visible styles |
| `223d959` | Archived cafe URL resolver: 56 slugs, 48 temporary redirects, 3 ambiguous and 5 unmatched fallbacks |
| `cd5aaec` | Evidence-based public claims and five active chapters |
| `326487c` | Owner-confirmed conservative `350+ members` public claim (369 dated evidence) |
| `12f7919` | Canonical SEO/robots/sitemap/404 infrastructure and ADR 0005 |
| `faee4d8` | Truthful event loading/error/empty/archive states and draft/publish/admin workflow |
| `10f2615` | Homepage mobile-menu keyboard and focus behavior |
| `67489c4` | Redacted authenticated read-only Cloudflare isolation findings |
| `a718a24` | Strict public-form intake, consent, runtime Turnstile parity, keyed dedupe, privacy deletion, and external rate-limiter contract |
| `6fa118e` | Keeps homepage test code out of production route discovery |
| `321a59e` | Bounded admin intake, triage, correction, assignment/notes, and resumable deletion |
| `db5783a` | UUID request correlation, allowlisted PII-safe logs, KV mutation history, failure tests, and recovery runbook |

Combined verification at `db5783a`:

- `pnpm test`: 26 files, 154/154 tests passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; only existing React Router future-flag warnings.
- Wrangler 4.127.1 Pages Functions compilation: passed; generated route inventory included `/*`.
- `git diff --check`: passed and the worktree was clean.

## Accepted decisions

1. `vibefromcafe/vibefromcafe` is canonical and keeps its name. `zainfathoni/vibefromcafe` remains the legacy rollback source until monitored cutover succeeds. Do **not** execute the old transfer/rename-to-`web` plan.
2. Complete, rather than cancel, the replacement migration, but production remains NO-GO until the gates below pass.
3. Exactly five chapters are active: Jogja, Jabodetabek, Surabaya–Malang, Kuala Lumpur, and Bandung. Jogja has `/chapters/jogja`; the other four use `/join` until owners supply better public destinations.
4. Public community wording is `350+ members`, supported by the owner-confirmed count of 369 as of 2026-08-30.
5. Cafe discovery belongs on `cafein.id`; VFC does not publish cafe totals/rankings/amenity/Wi-Fi claims. Archived cafe redirects remain temporary `302` until mapping owners and edge smoke tests approve permanence.
6. KopiChat, FlowPilot, and Insight Desk are labelled **Service example**, not released products or customer proof.
7. Canonical public origin is `https://vibefromcafe.id`. Keep SPA mode; unknown document routes must be true HTTP 404/noindex. Default document language is English with semantic `lang=id` on coherent Indonesian passages; no `hreflang` without real translated variants. See [ADR 0005](adr/0005-seo-origin-rendering-and-language.md).
8. Admin authorization uses verified Cloudflare Access identity tokens at both edge and application layers. Browser-managed shared secrets are prohibited; break-glass remains disabled by default. See [ADR 0003](adr/0003-dual-admin-auth.md).
9. Public forms fail closed when KV, privacy URL, keyed dedupe, runtime Turnstile pairing, or the atomic rate limiter is unavailable. The approved staging design is an external strongly consistent Durable Object; KV counters and the Workers per-location Rate Limiting binding are rejected. See [ADR 0004](adr/0004-public-form-protection.md).
10. KV dedupe is explicitly best-effort/race-aware. No owner acceptance of its residual race has yet been recorded. KV admin history is useful but neither atomic nor immutable; D1 transactions are the current smallest recommendation, not an approved production-storage decision.
11. The Cloudflare token may remain long-running by owner choice, but it still must be least-privilege and must never be committed or printed.

## Issue and pull-request disposition

GitHub state below was read-only verified on 2026-08-30. No closure/update was performed.

### Canonical issues

| Issue | Local disposition and remaining gate |
| --- | --- |
| [#1](https://github.com/vibefromcafe/vibefromcafe/issues/1) | Confirmed cutover epic/source of truth; keep open through #32/#33. |
| [#2](https://github.com/vibefromcafe/vibefromcafe/issues/2) | Closed upstream via PR #21; preserve its positioning. |
| [#3](https://github.com/vibefromcafe/vibefromcafe/issues/3) | Repository implementation is local in `223d959`; keep open for eight slug decisions, staging/edge evidence, monitoring, and redirect permanence. |
| [#4](https://github.com/vibefromcafe/vibefromcafe/issues/4) | Tooling is local in `87b201f`; keep open for authenticated inventory, rehearsal, final evidence, and separately approved production execution. |
| [#5](https://github.com/vibefromcafe/vibefromcafe/issues/5) | Code foundation merged upstream in PR #15; keep open for isolated bindings, Access configuration, deployment, and every-host evidence. |
| [#6](https://github.com/vibefromcafe/vibefromcafe/issues/6) | Repository controls are local in `a718a24`; parent remains open until children #27–#30 are proven or explicitly risk-accepted. |
| [#7](https://github.com/vibefromcafe/vibefromcafe/issues/7) | Claims implementation is local in `cd5aaec`/`326487c`; keep open for named claims owner/cadence, product proof, and any future metrics. |
| [#8](https://github.com/vibefromcafe/vibefromcafe/issues/8) | Five-chapter IA is local; keep open if chapter-specific destinations/follow-up ownership remain required. |
| [#9](https://github.com/vibefromcafe/vibefromcafe/issues/9) | Repository workflow is local in `faee4d8`; keep open for real content/actions, archive-policy approval, and staging mutation evidence. |
| [#10](https://github.com/vibefromcafe/vibefromcafe/issues/10) | Shared SEO/404 infrastructure is local in `12f7919`; keep open for unique route metadata/social images, redirect sign-off, host normalization, and edge verification. |
| [#11](https://github.com/vibefromcafe/vibefromcafe/issues/11) | Operator cutover/rollback issue; NO-GO and blocked by unresolved canonical gates plus legacy #39. PR #20 is only an unintegrated starting point. |
| [#12](https://github.com/vibefromcafe/vibefromcafe/issues/12) | Repository observability/history is local in `db5783a`; keep open for transactional architecture, owners, RPO/RTO, backup/restore, alerts, and staging evidence. |
| [#13](https://github.com/vibefromcafe/vibefromcafe/issues/13) | Repository workflow is local in `321a59e`; keep open for deployed Access-backed synthetic validation and owner-approved operations. |
| [#14](https://github.com/vibefromcafe/vibefromcafe/issues/14) | Navigation and event-state portions are local; keep open for remaining form announcements/keyboard coverage, card-affordance audit, language marking, and broader accessibility audit. |
| [#24](https://github.com/vibefromcafe/vibefromcafe/issues/24) | Operator-only: require canonical CI through a `main` ruleset and prove blocked/green behavior. |
| [#25](https://github.com/vibefromcafe/vibefromcafe/issues/25) | Owner/security gate: inspect two high and one low alert, remediate or record time-bounded risk acceptance. |
| [#26](https://github.com/vibefromcafe/vibefromcafe/issues/26) | Read-only findings are local in `67489c4`; remediation/isolation evidence remains open and blocks staging-dependent closure. |
| [#27](https://github.com/vibefromcafe/vibefromcafe/issues/27) | Pages-side contract is local; external DO code/resource and 100-request boundary/multi-PoP evidence are absent. |
| [#28](https://github.com/vibefromcafe/vibefromcafe/issues/28) | Repository privacy-safe dedupe/deletion is local; keep open for secret rotation, live key inspection, reconciliation, and residual-race acceptance or redesign. |
| [#29](https://github.com/vibefromcafe/vibefromcafe/issues/29) | Runtime parity is local; keep open for isolated widget/credentials, hostname allow-list, and real token smoke matrix. |
| [#30](https://github.com/vibefromcafe/vibefromcafe/issues/30) | Repository notice/correction/deletion support is local; keep open for channel, owners, identity policy, retention/export/backup process, and non-author drill. |
| [#31](https://github.com/vibefromcafe/vibefromcafe/issues/31) | PR #19 intent was semantically integrated in `db5783a` after #4 tooling; recommend close/update only after reviewing the local diff and pushing it. Operational #12 remains open. |
| [#32](https://github.com/vibefromcafe/vibefromcafe/issues/32) | Explicit production write-enablement gate; untouched and blocked. |
| [#33](https://github.com/vibefromcafe/vibefromcafe/issues/33) | Legacy retirement; untouched and blocked by #11/#32/legacy #39 plus monitored rollback/retention decisions. |

### Legacy issues

| Issue | Recommended disposition |
| --- | --- |
| [#17](https://github.com/zainfathoni/vibefromcafe/issues/17) | Keep until deciding whether the legacy cafe sync is needed through freeze; reconcile with #39/legacy PR #19. PAT provisioning and admin merge are operator-only. |
| [#27](https://github.com/zainfathoni/vibefromcafe/issues/27) | Superseded by canonical #1. Recommend close as superseded; never execute its transfer/rename commands. |
| [#37](https://github.com/zainfathoni/vibefromcafe/issues/37) | Unrelated cafe-hours backlog; does not block VFC cutover and belongs with the external cafe product if retained. |
| [#39](https://github.com/zainfathoni/vibefromcafe/issues/39) | Keep open; explain zero-job sync failures and decide freeze/retirement before #11/#33. |

### Canonical pull requests

- PRs [#15](https://github.com/vibefromcafe/vibefromcafe/pull/15), [#21](https://github.com/vibefromcafe/vibefromcafe/pull/21), and [#23](https://github.com/vibefromcafe/vibefromcafe/pull/23) are merged foundations.
- Open PRs [#16](https://github.com/vibefromcafe/vibefromcafe/pull/16), [#17](https://github.com/vibefromcafe/vibefromcafe/pull/17), [#18](https://github.com/vibefromcafe/vibefromcafe/pull/18), [#19](https://github.com/vibefromcafe/vibefromcafe/pull/19), and [#22](https://github.com/vibefromcafe/vibefromcafe/pull/22) are semantically superseded by the combined local commits for #3, #7, #4, #31/#12, and #6 respectively. Do not merge them unchanged. After the local series is pushed for review, update/close them with explicit replacement commit/PR links rather than losing their discussion.
- Open PR [#20](https://github.com/vibefromcafe/vibefromcafe/pull/20) maps to #11, is currently conflicting, and is **not** integrated. Its `docs/cloudflare-cutover-inventory.md` and `docs/cloudflare-cutover-runbook.md` may be reconciled later with the newer authenticated findings and current runbooks. Never treat its NOT-RUN checklist as execution evidence.

## Cloudflare findings and production NO-GO

The authenticated inspection was GET-only and redacted. It found:

- the accessible account contains the existing `vibefromcafe` Pages project, not the stale `vcfc-cloudflare-revamp` project;
- Production still builds from the legacy repository;
- Production and Preview bind `VFC_SUBMISSIONS` to the **same** KV namespace;
- the custom apex has an Access application, but the canonical `pages.dev` hostname is not covered;
- required Access issuer/audience, mutation, break-glass, public-form, and privacy configuration is absent;
- no Turnstile widget exists in the accessible account.

This is a production **NO-GO**: Preview can expose Production personal data, one reachable production hostname bypasses edge Access, the current application cannot validate Access without issuer/audience configuration, public forms fail closed without the external DO/privacy/dedupe setup, and no approved staging evidence exists. The detailed source is [Admin security operations](admin-security.md#authenticated-read-only-inventory-findings-2026-08-30-redacted).

The checked-in `wrangler.toml` contains a stale project name and a concrete KV ID. Treat it as repository history, **not** proof of a live binding and not a safe staging target. There is also a current documentation inconsistency: README’s Deployment section calls `vcfc-cloudflare-revamp` the current staging project, while `docs/admin-security.md` correctly records it as inaccessible/stale. Resolve both only in a separately reviewed repository change; never reuse the checked-in ID by assumption.

## Staging credentials and missing private inputs

These Amp-injected names existed during the preflight; values were never printed or committed:

- `VFC_CLOUDFLARE_ACCOUNT_ID`
- `VFC_CLOUDFLARE_READ_TOKEN`
- `VFC_CLOUDFLARE_STAGING_TOKEN`
- `VFC_CLOUDFLARE_ZONE`

`VFC_CLOUDFLARE_STAGING_TOKEN` was active and could read account, Pages, KV, Access-application, Access-policy, and Turnstile inventories. It repeatedly received Cloudflare `403` responses for Workers Scripts, Durable Object namespaces, Workers subdomain, Access organization, and Access groups. Provisioning stopped before creating anything.

Replace or expand the staging token, scoped only to the VFC account, with:

1. Account read.
2. Cloudflare Pages edit.
3. Workers KV Storage edit.
4. Workers Scripts edit, including service bindings and migrations.
5. Durable Objects edit/namespace-migration capability (the dashboard label may be combined with Workers Scripts; the preflight endpoints must no longer return `403`).
6. Access Apps and Policies edit, plus Access organization/team and group read.
7. Turnstile edit.
8. Workers logs/tail/observability read if runtime log evidence is required.

DNS edit is intentionally unnecessary when only generated Pages hostnames are used. Do not broaden the token to Production resources beyond the account-level capabilities Cloudflare cannot scope more narrowly.

The following private operator inputs are still missing. Use these exact Amp names on resume; do not commit their values:

- `VFC_STAGING_PRIVACY_REQUEST_URL`: required monitored staging `https://` or `mailto:` channel.
- Exactly one of `VFC_STAGING_ACCESS_GROUP_ID` or `VFC_STAGING_ACCESS_ALLOWED_EMAIL`: least-privilege staging administrator principal. Prefer an existing group; do not infer or publish membership.
- `VFC_STAGING_WHATSAPP_GROUP_INVITE_URL`: optional synthetic/non-production onboarding URL. Omit it if onboarding Health may truthfully remain “missing”; never copy the Production invite URL.

The public runtime variable is `PRIVACY_REQUEST_URL`; requirements, ownership attestations, and deletion drill are authoritative in [Privacy operations](privacy-operations.md#public-request-channel-gate). Access topology and runtime variables are authoritative in [Admin security operations](admin-security.md#required-cloudflare-dashboard-configuration). `WHATSAPP_GROUP_INVITE_URL` is a protected admin-only runtime secret and is never returned by public forms.

Before this handoff, the token permission matrix, the four existing Amp names, the three proposed private staging-input names, the repeated permission-preflight result, the exact resource provisioning order, and the detached-`db5783a` deployment procedure existed only in the Amp conversation/report and were **not committed**. The repository already documented the runtime privacy URL, least-privilege Access policy shape, external rate-limiter contract, isolated KV requirement, validation contracts, and Production safeguards, but not an end-to-end executable staging handoff. The optional WhatsApp runtime name existed only in Health code (`functions/api/admin/security.ts`), not operator documentation. This section and the sequence below close those documentation gaps without adding secret values.

## Safe non-production resume sequence

The owner approved one bounded non-production staging provisioning/validation package, but that approval does not cover Production or destructive cleanup. Stop at any missing permission, policy choice, conflicting existing resource, non-empty target, or required deletion.

### 1. Repository and read-only preflight

1. Use the detached `db5783a` worktree described above. Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, Pages Functions compilation, and `git diff --check` sequentially.
2. Verify the staging token is active and belongs to `VFC_CLOUDFLARE_ACCOUNT_ID`. Exercise GET-only list/read endpoints for Pages projects, KV namespaces, Worker scripts/subdomain, Durable Object namespaces, Access organization/apps/policies/groups, and Turnstile widgets. Record only status/count/name aliases—never IDs, audiences, principals, token values, or response bodies.
3. Re-read the existing Production Pages source, Production/Preview KV bindings, domains, Access coverage, and runtime variable **names**. Compare identities internally and record only same/different. Do not alter or read Production KV values.
4. Require all three private inputs above as applicable. Stop rather than infer a privacy channel or Access principal.
5. Inventory candidate staging resource names. Any collision or existing non-empty resource is a stop condition; deletion/reuse needs separate approval.

### 2. Provision isolated resources

1. The external Durable Object implementation is **not present at `db5783a`**; only its Pages-side contract exists. Before provisioning, add/review a maintainable Worker implementation in an approved repository or separately review an existing implementation. It must implement one global object named `public-form-rate-limit-v1`, policy `public-form-v1`, and at most five allowed attempts per endpoint/HMAC client key in every rolling 60 seconds. Do not deploy an untracked one-off script.
2. Provision the dedicated non-production Worker, Durable Object class/namespace migration, and service binding. Do not attach Production routes or domains.
3. Create a new empty staging KV namespace and, for restore testing, a second empty non-production restore namespace. Verify both differ internally from Production and from each other.
4. Create an isolated Turnstile widget restricted to every intended generated staging hostname. Keep site/secret keys environment-specific.
5. Create a dedicated direct-upload Pages project with no Production Git connection. Bind only the new staging KV and external DO. Configure encrypted dedupe/Turnstile/invite secrets and non-secret runtime values. Preview bindings must be isolated or absent; never point Preview at Production.
6. Create least-privilege Access coverage for the canonical project `pages.dev` hostname and enable Pages preview access for hash/branch aliases. Cover both `/admin*` and `/api/admin/*`; use the exact team issuer and one explicit audience topology. Configure `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUDIENCE`/`CF_ACCESS_AUDIENCES` without printing values.
7. Keep `ADMIN_BREAK_GLASS_ENABLED` false/unset and `ADMIN_SECRET` unset. On the dedicated staging project only, enable `ADMIN_MUTATIONS_ENABLED=true` for the bounded synthetic drill; disable it after the drill unless continued staging administration is explicitly approved.

### 3. Deploy exact application baseline

Deploy `build/client` plus `functions` from the detached `db5783a` worktree to the dedicated direct-upload staging project and set exact commit metadata. Do not connect Git, deploy the handoff commit as a substitute, target the existing `vibefromcafe` project, attach `vibefromcafe.id`, or change DNS. Re-read deployment bindings and variable names after deploy before sending any synthetic write.

### 4. Validate with synthetic data only

1. **Isolation:** prove staging and restore KV identities differ from Production/Preview internally. Confirm all synthetic writes appear only in staging; record aggregate key classes/counts, never values or IDs.
2. **Access every-host matrix:** enumerate canonical/hash/branch staging hostnames. Anonymous, missing, malformed, forged, wrong-issuer, wrong-audience, and invalid-assertion-plus-break-glass requests must fail closed for all admin pages/APIs. A human using the approved Access identity must verify authenticated reads; a service token is not a substitute for an identity token.
3. **Health/config:** protected `/admin/health` and `/api/admin/security` must report isolated KV, valid Access/dedupe/privacy/Turnstile configuration, disabled break-glass, and a bound rate limiter. Never retain response values containing identifiers.
4. **Public forms:** in a real browser verify rendered widgets and valid, missing, invalid, reused, expired, wrong-action, and wrong-host Turnstile tokens for both forms. First and duplicate accepted responses must be byte-equivalent generic `202`; no IDs, statuses, submitted values, or invite URL may leak.
5. **Rate limiter:** run at least 100 synthetic requests around rolling-window boundaries for each endpoint and from multiple PoPs. Assert no client key receives more than five allowed requests in any rolling 60 seconds; dependency failure must return `503`. One orb cannot prove multi-PoP behavior—use an approved distributed harness and retain only aggregate results.
6. **Admin workflow:** create synthetic join/inquiry/event records; exercise bounded pagination, allowed/rejected state transitions, assignment/notes, correction/reopen, draft/publish/archive, named delete confirmation, and actor/time attribution.
7. **Audit/privacy:** correlate response request IDs to PII-safe logs and audit records; audit contains actor, pseudonymous record ID, status/field names but no values. Exercise correction and resumable privacy deletion, including an injected failure/retry, then reconcile operational records, references, markers, receipts, audit, rate state, and logs.
8. **Synthetic backup/restore:** use only the staging namespace as source. Follow [Recovery and observability](recovery-observability.md#recovery-capture-and-staging-rehearsal) and the exact [KV cutover runbook](cloudflare-kv-cutover.md#2-rehearse-against-a-separate-staging-namespace): freeze writers, capture twice, stability-reconcile, create the private mode-`0600` authorization, dry-run, migrate into the empty restore namespace with the typed non-production confirmation, recapture, and require exact value/expiration/metadata hashes. Do not capture Production PII for this rehearsal.
9. Remove synthetic records through application/admin procedures where supported and recapture aggregate counts. Resource deletion is destructive and **not** authorized by the staging package; retain isolated resources disabled/restricted and report their cost/retention implications until an owner explicitly approves deletion.

Authoritative validation details: [Admin security smoke tests](admin-security.md#post-deployment-smoke-tests), [Admin intake](admin-intake.md), [Event workflow](events.md), [Privacy operations](privacy-operations.md), [Recovery/observability](recovery-observability.md), and [KV rehearsal](cloudflare-kv-cutover.md#2-rehearse-against-a-separate-staging-namespace).

## Production safeguards

- Never target or reconfigure the existing `vibefromcafe` Pages project during staging work.
- Never reconnect its Git source, alter Production/Preview bindings, read/write/delete Production KV values, attach production/custom domains, alter DNS/TLS, or move traffic.
- Never enable Production admin/public writes, reuse staging Turnstile/dedupe/invite secrets, or use staging aliases for Production resources.
- Never expose tokens, namespace IDs, Access audiences, principals, private URLs, PII, raw logs, backup locations, or raw snapshots in Git, GitHub, chat, CI artifacts, or reports.
- Keep cafe redirects `302`; no 301/308 promotion without owner sign-off and deployed evidence.
- Production remains NO-GO until #24/#25/#26, staging evidence, all required #1 blockers, a reconciled #11 runbook, approved #12 architecture/operations, and signed #32 go/no-go are complete.
- Production cutover requires a new explicit approval. The staging approval does not carry forward. Follow [the production-only section of the KV runbook](cloudflare-kv-cutover.md#3-production-cutover-requires-separate-explicit-approval) and preserve the legacy repository/project as rollback until #33.

## Remaining owner/operator decisions

1. Supply the private privacy URL and Access group/identity; decide whether synthetic WhatsApp onboarding should be configured.
2. Expand the staging token scopes listed above without exposing values.
3. Choose the durable home and review/ownership model for the external rate-limiter Worker implementation.
4. Approve or reject KV dedupe residual races; approve D1 transactions versus a per-record Durable Object for atomic admin record/history operations.
5. Approve RPO/RTO, encrypted backup storage/key ownership, backup and access-review cadence, retention/deletion protection, alert sink/thresholds, primary/backup operators, escalation, and recovery authority.
6. Resolve eight cafe mapping fallbacks before permanent redirects.
7. Name claims owner/review cadence; supply four chapter-specific destinations if desired; approve event archive policy and real event action/content URLs.
8. Define privacy identity verification, response target, retention scheduler, export/correction/backup procedure, primary/backup/escalation ownership, and non-author drill.
9. Resolve dependency alerts (#25), canonical branch rules (#24), and legacy sync #17/#39.
10. After complete staging evidence, decide whether to push the 14-commit local series and how to replace/close stale PRs. Pushing, PR mutation, merging, deployment, production cutover, and archival each require explicit approval.

## Precise resume checklist

1. Open this file and verify local `HEAD` is the handoff commit reported by the parent Amp thread; verify `db5783a6d9c7c68427aa19bd82ce346e3211a671` is its first parent and `git status --short` is empty.
2. Confirm the user still authorizes the bounded **non-production** package. Authorization expires semantically if account/resource topology or requested scope changes, even though the token itself is long-running.
3. Confirm all required Amp names exist without printing values. Repeat GET-only permission preflight. If any required endpoint is `403`, stop and report; do not partially provision.
4. Resolve the absent external DO implementation before deploying it. Run its unit/concurrency tests and review its migration/binding config.
5. Execute the provisioning/deployment/validation sequence above from the detached `db5783a` worktree. Keep an append-only private resource ledger with aliases, timestamps, actor, purpose, and encrypted identifier locations.
6. Report pass/fail evidence, any retained resources/costs, synthetic cleanup status, and blockers. Do not declare production readiness from staging success alone.
7. Request a separate owner decision for repository push/PR disposition and, much later, a separately signed #32 production go/no-go. Do not archive the legacy repository until #33 criteria and monitoring are complete.
