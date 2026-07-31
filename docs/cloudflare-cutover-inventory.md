# Cloudflare cutover inventory

**Status:** incomplete and **not production-ready** as of 2026-07-18. This is
the redacted repository record for issue
[#11](https://github.com/vibefromcafe/vibefromcafe/issues/11). It never contains
credential values, namespace identities, Access audiences, private operator
identities, form records, or private group links.

## Evidence classes

- **Repository-verified:** read directly from the named repository/worktree at
  the recorded commit. This does not prove deployed Cloudflare state.
- **Read-only observed:** DNS, TLS, HTTP, GitHub, or Cloudflare data inspected
  without mutation on 2026-07-18. Public probes are samples, not complete
  configuration proof.
- **Manual-unverified:** requires an authorized operator in the Cloudflare
  dashboard/API or another private system. Unknown means unknown; do not infer a
  value from a checked-in config.

Store the private inventory and screenshots in `<EVIDENCE_ROOT>` with restricted
access. Public evidence records only aliases, timestamps, status codes, commit
SHAs, redacted report hashes, and pass/fail results.

## Known inventory

| Surface | Classification | Redacted finding | Required evidence / decision |
| --- | --- | --- | --- |
| Legacy Pages project | Repository-verified | The read-only legacy repository config names project alias `legacy`; output is `build/client`; its checked-in `VFC_SUBMISSIONS` identity differs from the replacement config. | Prove the actual project, production branch, repository connection, latest known-good deployment, custom domains, and deployed binding in the dashboard. |
| Replacement Pages project | Repository-verified | This repository config names project alias `replacement`; output is `build/client`; repository branch is `main`. The checked-in project name and public copy still use unapproved VCFC branding. | Issue [#2](https://github.com/vibefromcafe/vibefromcafe/issues/2) must approve and land Vibe From Cafe / VFC naming before launch. Prove project and branch settings privately. |
| GitHub deployment automation | Read-only observed | No Actions workflows, GitHub environments, or GitHub deployment records were returned. Open prerequisite PRs target the branches documented below. | Determine whether Pages Git integration, deploy hooks, or another CI system deploys either project; identify `<DEPLOY_OPERATOR>` and `<ROLLBACK_OPERATOR>`. |
| Public Pages hosts | Read-only observed | Both canonical project hosts returned `200` for sampled `/admin` HTML while sampled admin API requests without an assertion returned `401`. This matches the unresolved pre-fix exposure documented by PR #15. | Enumerate canonical, branch-alias, immutable preview, staging, and custom hosts; deploy PR #15; execute the complete host/route auth matrix. |
| Apex DNS and HTTPS | Read-only observed | Apex resolves through Cloudflare anycast; sampled DNS TTL was 300 seconds; HTTPS served a valid apex certificate and public routes returned `200`. Sampled `/admin` and admin API routes redirected to Access. | Dashboard-export the exact record type/content/proxy/TTL and prove which Pages project owns the custom domain. Record pre-cutover values privately for rollback. |
| `www` DNS/TLS | Read-only observed | `www` did not resolve; no TLS or redirect behavior could be tested. | Owner must choose whether `www` is supported. If supported, provision DNS, custom domain/TLS, host normalization, Access, and smoke coverage; otherwise document intentional NXDOMAIN. Issue #10 owns canonical/host policy. |
| Unknown cafe paths | Read-only observed | Sampled behavior differed: apex and one Pages host returned `200`; the other Pages host returned `302`. | Land PR #16, then require unknown slugs to return a real `404` on every host and verify known mappings at the edge. |
| TLS | Read-only observed | Apex certificate was valid for the apex on the observation date. This does not cover `www`, staging, Pages hosts, or cutover certificate activation. | Capture Universal/Advanced Certificate state, custom-host coverage, minimum TLS version, mode, expiration monitoring, and replacement custom-domain activation before traffic moves. |
| KV binding name | Repository-verified | Runtime reads/writes binding `VFC_SUBMISSIONS`. Legacy and replacement checked-in configs reference different identities; neither proves deployed Production or Preview bindings. | Record alias-only mapping for `source`, `staging`, and proposed `destination` separately for Production and Preview. Prove staging is distinct and production writers all use one namespace. |
| Runtime key contracts | Repository-verified via PR #18 | `submission:*`, `inquiry:*`, `event:*`, runtime tombstones `event-deleted:*`, possible legacy variant `event_deleted:*`, unknown keys, expiration, and metadata must be inventoried. | Produce authenticated redacted counts/statuses/hashes and malformed/unknown-key decisions using PR #18 formatVersion 1 tooling. |
| Access | Read-only observed + PR #15 | Apex sampled routes were behind Access; two canonical Pages hosts exposed admin HTML and previously accepted forged assertions before the reviewed app fix. | Inventory every application, host/path, application type, session duration, audience alias, policy order, identity group, bypass/service-token rule, and preview-protection setting. Never record audience values here. |
| Variables and secrets | Repository-verified | See the owner matrix below. No value or deployed-environment presence has been verified. | Inventory names and environment scope in Pages > Settings > Variables and Secrets; assign named primary/backup owners privately; redeploy after changes. |
| Redirect/rule layers | Repository-verified + manual-unverified | Repository `_redirects` has temporary redirects. PR #16 provides 48 verified temporary cafe redirects, 3 ambiguous and 5 unmatched legacy fallbacks, and unknown 404 behavior. Dashboard rules are unknown. | Inventory Redirect Rules, Bulk Redirects/lists, Transform Rules, Page Rules, Configuration Rules, origin/host rewrites, and ordering. Prove none overrides repository behavior. |
| Cache/security rules | Manual-unverified | Unknown. | Inventory Cache Rules, Cache Reserve/Tiered Cache if used, WAF custom/managed rules, rate limiting, bot/Turnstile settings, Browser Integrity Check, Security Level, and exceptions by host/path. Issue #6 must own form abuse controls. |
| Analytics/search | Manual-unverified | No Cloudflare analytics export, Web Analytics dataset, or Search Console evidence was available to PR #16. | Record dataset/property aliases, retention, baseline traffic/5xx/404/write rates, dashboard links, and `<MONITORING_OWNER>`. Never export form bodies. |
| Logs/monitoring/backups | Repository-verified via PR #19 + manual-unverified | PR #19 defines safe request IDs/logs, KV audit history, 6-hour RPO and 4-hour RTO, but no restore or alert evidence exists. KV cannot atomically couple mutations/audit or serialize transitions. | Configure restricted log sink, alerts/on-call, encrypted backup job, owner register, test delivery, restore to staging, and implement/verify transactional D1 or Durable Object semantics before readiness. |

### Required variable, secret, and binding owners

Names are safe to inventory; values are never evidence. Replace role placeholders
with named primary and backup owners in the private operator register.

| Name | Kind | Intended scope | Accountable owner placeholder | Gate |
| --- | --- | --- | --- | --- |
| `VFC_SUBMISSIONS` | KV binding | Production and Preview configured independently | `<DATA_OWNER>` | Preview/staging must never reference production. |
| `WHATSAPP_GROUP_INVITE_URL` | encrypted secret | Only environments with approved invitation behavior | `<COMMUNITY_OPERATIONS_OWNER>` | Never print or capture the value; #2 and #6 copy/privacy approval required. |
| `WHATSAPP_INVITE_MESSAGE_TEMPLATE` | variable | Environment-specific | `<CONTENT_OWNER>` | Must say Vibe From Cafe / VFC after #2; no private group URL in the template. |
| `CF_ACCESS_TEAM_DOMAIN` | variable | Production and Preview | `<SECURITY_OWNER>` | Introduced by PR #15; exact issuer must match the environment. |
| `CF_ACCESS_AUDIENCE` | protected variable | Production and Preview separately | `<SECURITY_OWNER>` | Introduced by PR #15; retain only an alias in evidence. |
| `ADMIN_MUTATIONS_ENABLED` | variable | Production remains false/unset through rehearsal and freeze; staging may be enabled only for the controlled Phase 2 window | `<CUTOVER_COMMANDER>` | Introduced by PR #15; staging must be disabled and redeployed after synthetic cleanup; Production requires a later signed cutover gate. |
| `ADMIN_BREAK_GLASS_ENABLED` | variable | false/unset normally | `<SECURITY_OWNER>` | Break-glass is not routine production authentication. |
| `ADMIN_SECRET` | encrypted secret | unset for normal Production/Preview operation | `<SECURITY_OWNER>` | Existing implementation is unsafe until PR #15; no browser persistence. |
| Cloudflare/Git deploy credentials | encrypted secret(s), names unknown | CI/operator scope | `<DEPLOY_OWNER>` | Least privilege, rotation, and storage remain manual-unverified. |
| Backup encryption/storage credentials | encrypted secret(s), names unknown | private backup job | `<SECURITY_OWNER>` | Required by PR #19; no backup job evidence exists. |

## Exact manual inventory procedure

An authorized read-only operator performs these checks for aliases `legacy` and
`replacement`. Export configuration where Cloudflare supports it; otherwise
capture a redacted screenshot and transcribe only aliases and safe fields.

1. **Workers & Pages > Overview > each project**
   - **Deployments:** production and preview deployment commit, branch, status,
     age, canonical/branch/immutable host aliases, and last known-good deployment.
   - **Settings > Builds & deployments:** connected Git provider/repository,
     production branch, preview branch rules, build command/output, root path,
     deploy hooks, automatic builds, and build watch paths.
   - **Custom domains:** domain, status, certificate status, and target project.
   - **Settings > Bindings:** Production and Preview `VFC_SUBMISSIONS` aliases.
   - **Settings > Variables and Secrets:** names, encrypted/plain classification,
     Production/Preview presence, last changed time, and owner; never values.
   - **Settings > General:** preview access protection and project ownership.
2. **Domain registration > `vibefromcafe.id` > DNS > Records:** apex and `www`
   type, target alias, proxy state, TTL, comments/tags, and any verification
   records. Also inspect **DNS > Settings** for DNSSEC and CNAME flattening.
3. **SSL/TLS:** Overview mode, Edge Certificates host coverage/status/expiry,
   Always Use HTTPS, minimum TLS, HSTS, and custom-host certificate state. Do not
   enable HSTS during cutover.
4. **Zero Trust > Access > Applications:** every application covering any VFC
   host; privately record audience identities, then record only aliases here.
   Inspect policy precedence, Include/Require/Exclude selectors, and Bypass,
   Everyone, service-token, or broad-domain rules.
5. **Rules:** zone **Redirect Rules**, **Transform Rules**, **Cache Rules**,
   **Configuration Rules**, legacy **Page Rules**, and account **Bulk Redirects**
   including list/order. Record matching host/path and action without private
   values.
6. **Security:** WAF managed/custom rules, rate limiting, Bots/Turnstile, and
   exceptions affecting public forms or admin paths.
7. **Analytics & Logs:** Traffic/Web Analytics datasets, Logpush destinations
   (alias only), retention, 30-day route/status baseline, notification policies,
   alert recipients/on-call aliases, and Search Console property ownership.
8. **Private writer inventory:** Pages/Workers deployments, cron triggers,
   webhooks, CI, operator scripts, and admin clients capable of writing `source`
   or `destination`. An unknown writer is an automatic no-go.

The inventory is complete only when `<CLOUDFLARE_INVENTORY_OWNER>` and
`<SECURITY_OWNER>` sign the private export hash and timestamp. Repository config
alone cannot satisfy this gate.

## Prerequisite status and ownership boundary

Issue #11 is formally blocked by
[#2](https://github.com/vibefromcafe/vibefromcafe/issues/2)–[#10](https://github.com/vibefromcafe/vibefromcafe/issues/10) and
[#12](https://github.com/vibefromcafe/vibefromcafe/issues/12)–[#14](https://github.com/vibefromcafe/vibefromcafe/issues/14).

- Reviewed, read-only prerequisites: [PR #16](https://github.com/vibefromcafe/vibefromcafe/pull/16)
  (#3 redirects), [PR #18](https://github.com/vibefromcafe/vibefromcafe/pull/18)
  (#4 KV tooling), [PR #15](https://github.com/vibefromcafe/vibefromcafe/pull/15)
  (#5 admin security), [PR #17](https://github.com/vibefromcafe/vibefromcafe/pull/17)
  (#7 claims), and stacked [PR #19](https://github.com/vibefromcafe/vibefromcafe/pull/19)
  (#12 recovery/observability).
- As observed on 2026-07-18, assignee `irsyaadbp` issues
  [#2](https://github.com/vibefromcafe/vibefromcafe/issues/2),
  [#6](https://github.com/vibefromcafe/vibefromcafe/issues/6),
  [#8](https://github.com/vibefromcafe/vibefromcafe/issues/8),
  [#9](https://github.com/vibefromcafe/vibefromcafe/issues/9),
  [#10](https://github.com/vibefromcafe/vibefromcafe/issues/10),
  [#13](https://github.com/vibefromcafe/vibefromcafe/issues/13), and
  [#14](https://github.com/vibefromcafe/vibefromcafe/issues/14) were open with no
  comments, PRs, or matching remote issue branches. They remain owner blockers;
  issue #11 does not take over their implementation scope.
