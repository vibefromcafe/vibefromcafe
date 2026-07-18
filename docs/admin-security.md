# Admin security operations

This runbook is the configuration and verification contract for VFC admin routes. Do not place Access audience tags, tokens, shared secrets, private identities, or KV namespace IDs in this repository, tickets, PRs, or smoke-test output.

## Application contract

Both route trees are protected in Pages Functions:

- `/admin` and every descendant route;
- `/api/admin` and every descendant route.

The application accepts only a valid Cloudflare Access identity application token. It fetches the configured team's JWKS, verifies the RS256 signature, issuer, audience, expiry and not-before claims, and derives the mutation actor from the signed email claim. A service token is not an admin identity.

The normal browser interface uses the Access session injected by Cloudflare. It never reads, stores, or sends a shared admin secret. Break-glass access is disabled unless both `ADMIN_BREAK_GLASS_ENABLED=true` and an `ADMIN_SECRET` secret are deliberately set. Do not enable break-glass in Production or Preview as routine configuration.

## Required Cloudflare dashboard configuration

Credentials were unavailable during issue #5 implementation, so an owner with Zero Trust and Pages read access must inventory and verify every item below. Record identifiers only in the private operational system, not in public GitHub artifacts.

### Zero Trust > Access controls > Applications

1. Inventory every self-hosted and Pages preview Access application relevant to VFC.
2. For each application, privately record its name, application type, session duration, audience tag, covered public hostnames and paths, and every attached policy in precedence order.
3. Ensure every reachable custom domain, apex/`www` variant, canonical `*.pages.dev` hostname, branch alias, immutable hash preview URL, and staging hostname is covered.
4. Ensure both `/admin*` and `/api/admin/*` are included. Prefer a hostname-wide application when the host is admin-only; otherwise verify both path trees explicitly.
5. Ensure the Allow policy is identity-based and limited to the intended admin group or identities. Remove broad email-domain, Everyone, Bypass, and service-token policy paths unless separately approved and justified.
6. Enable the Pages preview access policy under **Workers & Pages > project > Settings > General**. Cloudflare documents that this protects hash and branch previews, but not the canonical `*.pages.dev` or custom domains; those require explicit Access application coverage.
7. Verify the issuer is the exact HTTPS team domain and privately copy each application's audience tag for the matching Pages environment.

### Workers & Pages > VFC project > Settings

Configure these runtime variables separately for **Production** and **Preview**:

| Variable | Production | Preview |
| --- | --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | Exact HTTPS Access team domain | Same team domain |
| `CF_ACCESS_AUDIENCE` | Audience of the application covering Production hosts | Audience of the application covering Preview hosts |
| `ADMIN_MUTATIONS_ENABLED` | `true` after authenticated write smoke tests are approved | `false` or unset |
| `ADMIN_BREAK_GLASS_ENABLED` | `false` or unset | `false` or unset |
| `ADMIN_SECRET` | Unset for normal operation | Unset |

Under **Settings > Bindings**, inspect Production and Preview independently:

1. Production `VFC_SUBMISSIONS` must point to the production KV namespace.
2. Preview `VFC_SUBMISSIONS` must point to a distinct staging/preview namespace. Leaving the Preview binding absent is safer than sharing Production, but admin reads will then fail.
3. Compare the namespace selections by name in the dashboard; do not copy IDs into GitHub.
4. Redeploy after binding or variable changes, because Pages settings do not affect an already-built deployment.

The `ADMIN_MUTATIONS_ENABLED` guard prevents writes when unset, but it does not make a shared production KV binding acceptable: admin GET routes can read personal data. Binding isolation is mandatory.

## Host and Access inventory findings (2026-07-18, redacted)

Read-only public inspection found:

- the custom apex redirected anonymous and forged-header requests for sampled admin page/API routes to the Access login flow;
- the `www` hostname resolved through the Pages hostname but did not complete TLS during the probes;
- two reachable canonical `pages.dev` production hostnames served sampled `/admin*` routes anonymously;
- those same Pages hosts returned `401` when the API assertion was missing, but returned `200` for an arbitrary forged assertion;
- Cloudflare credentials were not available, so applications, policies, audiences, hidden custom/staging hosts, branch aliases, and immutable preview hostnames could not be enumerated privately.

These are pre-deployment observations only. Do not treat the apex result as proof that every hostname or route is covered.

## Smoke tests

Build a private host list from the dashboard inventory. For every host, test all concrete admin routes listed in the application README plus these API patterns:

- `GET /api/admin/submissions`
- `GET /api/admin/inquiries`
- `GET /api/admin/events`
- `GET /api/admin/events/<existing-id>`
- `PATCH /api/admin/submissions/<test-id>`
- `POST /api/admin/events`
- `PATCH /api/admin/events/<test-id>`
- `DELETE /api/admin/events/<test-id>`

Use synthetic staging records for mutation tests; never print response bodies containing submissions, inquiries, tokens, or identities.

### Before deployment (observed)

1. Anonymous requests to the custom apex sampled routes: Access login redirect.
2. Anonymous requests to sampled Pages admin pages: `200` (failure).
3. Missing assertion on sampled Pages admin APIs: `401`.
4. Arbitrary forged assertion on sampled Pages admin APIs: `200` (failure).

### After deployment (required, not yet performed)

For each inventoried hostname and route:

1. Anonymous request returns Access login redirect, `401`, or `403`; never admin HTML/data or a successful mutation.
2. `Cf-Access-Jwt-Assertion: forged.invalid.token` returns Access login redirect or `403`; never `2xx`.
3. An authorized admin can load every page and complete read operations.
4. In Production, an authorized admin can create, update, and delete only synthetic smoke data, and stored records attribute the change to that admin identity.
5. In Preview, the same authenticated write requests return `403` while `ADMIN_MUTATIONS_ENABLED` is false/unset.
6. Temporarily created synthetic records are removed through the admin API; do not directly alter KV during this runbook.
7. Confirm no browser local/session storage key contains an admin secret and no `X-Admin-Secret` header is sent by the interface.

Capture only host labels, route templates, status codes, timestamps, and pass/fail results. Redact login redirect query strings because they can contain transient signed metadata.

## Ownership boundary with issue #12

Issue #5 records the validated Access actor on each mutated resource or event tombstone. Issue #12 remains responsible for immutable mutation history, request IDs, old/new state, concurrent-write safety, retention, backup/restore, alerting, and structured PII-safe logging. Do not duplicate that audit system in this security gate.
