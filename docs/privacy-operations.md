# Privacy Operations for Public Forms

This runbook defines the repository-supported portion of public-form privacy handling. It does not invent or approve the monitored request channel, owners, identity-verification policy, response target, escalation path, retention authority, backup procedure, or operational schedule. Authorized operators must decide and privately attest those items before public writes are enabled.

## Data inventory and purpose

Community join records (`submission:{id}`) contain name, city, role, WhatsApp number, referral source/detail, consent version/time, creation time, and onboarding status. They are used for VFC community onboarding and related follow-up.

Project inquiry records (`inquiry:{id}`) contain name, contact detail, message, consent version/time, creation time, and inquiry status. They are used to respond to the submitted project inquiry.

Supporting live-KV data:

- `form-dedupe:{form}:{version}:{hmac}`: keyed, pseudonymous duplicate marker; 30-day TTL.
- `privacy-dedupe-ref:{form}:{id}`: submitted-field-free pseudonymous reverse reference, duplicated in KV metadata and retained with its operational record so deletion survives key rotation and marker-write failure.
- `privacy-deletion:{kind}:{id}`: pending cleanup state or submitted-field-free pseudonymous completion receipt; 30-day TTL.
- external Durable Object rate counters: HMAC-derived client key; required policy window 60 seconds. Retention beyond the active implementation window is prohibited by the contract but must be verified in the approved external Worker.
- Turnstile verification data: token and optional client IP sent only to Cloudflare Siteverify; never stored or logged by this application.

Admin APIs expose operational records only behind verified Cloudflare Access. Public APIs return no record ID, status, prior-state signal, submitted fields, or WhatsApp invitation URL.

## Public request channel gate

`PRIVACY_REQUEST_URL` must be an operator-approved, monitored HTTPS or `mailto:` URL. Both forms obtain and display exactly that runtime value. Missing or malformed configuration disables the form config endpoint and public writes with a generic temporary-unavailable response.

Before setting it, privately record:

- primary and backup owner;
- response target and escalation path;
- identity-verification method proportionate to the request;
- supported access, correction, export, and deletion workflow;
- where PII-free request evidence is retained.

Do not use an ambiguous social handle as the request channel, and do not record private owner identities or internal escalation details in this public repository.

## Repository deletion procedure

The protected mutation routes are:

```text
DELETE /api/admin/privacy/submission/{id}
DELETE /api/admin/privacy/inquiry/{id}
```

They require a verified Access actor and `ADMIN_MUTATIONS_ENABLED=true`. A deletion:

1. reads the target submitted-field-free pseudonymous reverse reference;
2. scans the full connected chain of current/previous rotation references for currently discoverable equivalent records created by a KV dedupe race;
3. persists a pending receipt containing only record/reference/marker keys;
4. removes the operational records, owned dedupe markers, and reverse references;
5. replaces pending state with a submitted-field-free pseudonymous completion receipt.

The route persists pending state before deleting data. A later partial failure returns `503` and retains that pending state so the operation can be retried; failure to persist the initial pending state also returns `503` before deletion begins. A completed retry is idempotent and checks whether the target was restored before returning success. Logs contain only the static event name and `privacy` category. Never claim completion from the HTTP response alone: in the authorized staging drill, inspect redacted key-class counts and confirm the pending receipt became `complete` without publishing IDs or hashes.

KV listing is eventually consistent, so the repository cannot prove that a racing write, stale replica, or backup copy was removed. Freeze synthetic test writes during the final reconciliation, inspect all live key classes, and reconcile backups under the separately approved backup procedure. If strict concurrent deletion/claim semantics are required, move that coordination into the approved Durable Object design rather than claiming KV atomicity.

## Correction and export

Existing protected admin list APIs can locate and export live operational records. Treat any export as sensitive, least-privilege, encrypted, and short-lived; do not place it in tickets, chat, test fixtures, logs, or this repository.

No general personal-field correction API is added in this wave. A correction that changes WhatsApp/contact/message fingerprint material must atomically re-key its dedupe reference and marker or use delete-and-resubmit under an approved procedure. Until that workflow is implemented and drilled, operators must not represent correction as automated or deletion-complete.

## Retention and drill gates

The 30-day dedupe and deletion-receipt TTLs are executable repository defaults. Operational-record and backup retention still requires owner approval and an enforceable scheduler; a prose “90-day review” is not a schedule and is not claimed here.

Before production enablement, a non-author operator must use synthetic data to demonstrate:

1. receipt and approved identity verification through the monitored channel;
2. protected export without fixture/log leakage;
3. the approved correction path or its explicit blocker;
4. deletion and retry after an injected marker failure;
5. reconciliation of operational records, dedupe markers/references, rate state, logs, and backups;
6. PII-free evidence, timestamps, owner/backup-owner attestation, response target, and escalation result.

Do not perform the drill with real data, Production writes, or unapproved Cloudflare mutations.

## Logging and incidents

Application events must use static event/category fields only. Never log submitted fields, raw IP addresses, HMAC inputs/outputs, KV keys, record IDs, Turnstile tokens, site/secret keys, Access tokens/audiences, invitation URLs, or raw exceptions.

If exposure is suspected, stop public writes, preserve PII-free evidence, notify the approved escalation owner, rotate affected secret/key versions with an overlap window where safe, review Access and environment isolation, reconcile live and backup copies, and make any notification decision under the approved incident policy.
