# Vibe From Cafe

Public site and Cloudflare Pages app for Vibe From Cafe.

Vibe From Cafe is an AI community for learning, sharing, and career growth through discussions, sessions, hands-on building, webinars, and podcasts, with an adjacent studio that helps businesses build useful AI.

This repository keeps the current VFC visual design while using the same operational architecture as `zainfathoni/vibefromcafe`: React Router framework mode, Cloudflare Pages, Pages Functions, and Cloudflare KV-backed runtime data.

## Repository status

- [`vibefromcafe/vibefromcafe`](https://github.com/vibefromcafe/vibefromcafe) is the canonical repository. Its name remains `vibefromcafe`.
- [`zainfathoni/vibefromcafe`](https://github.com/zainfathoni/vibefromcafe) is the legacy source until the production cutover is complete; it has not been transferred or archived.
- [Organization issue #1](https://github.com/vibefromcafe/vibefromcafe/issues/1) and its native sub-issue/blocker relationships are the source of truth for migration and cutover readiness. Legacy issue #27 and the `.tickets/br-jv0*` transfer plan are superseded.

Do not rename this repository to `web`, transfer or archive the legacy repository, or mutate production Cloudflare resources as part of ordinary repository work. Those actions require an explicit cutover decision recorded in the organization tracker.

## Stack

- React 19
- React Router framework mode
- Tailwind CSS 4
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare KV
- Vitest

## Routes

Public routes:

- `/`
- `/chapters`
- `/chapters/jogja`
- `/events`
- `/about`
- `/join`
- `/contact`

Redirects:

- `/cafes` and `/cafes/*` redirect to `https://cafein.id`
- `/chapter` redirects to `/chapters`
- `/event` redirects to `/events`
- `/join-community` and `/join-comunity` redirect to `/join`

Admin routes:

- `/admin`
- `/admin/inquiries`
- `/admin/events`
- `/admin/events/new`
- `/admin/events/:id/edit`
- `/admin/health`

## Data Model

Runtime data is stored in the `VFC_SUBMISSIONS` Cloudflare KV binding.

Key prefixes:

- `submission:{id}` for community join submissions
- `inquiry:{id}` for project inquiries
- `form-dedupe:{form}:{version}:{hmac}` for short-lived keyed duplicate markers
- `privacy-dedupe-ref:{form}:{id}` for deletion references/metadata that contain no submitted fields
- `privacy-deletion:{kind}:{id}` for resumable, expiring deletion receipts
- `event:{id}` for event overrides and custom events
- `event-deleted:{id}` for seed event deletion markers

Seed event data lives in `app/data/events.json`. Deprecated cafe support data lives in `app/data/cafes.json` and is only used for chapter context.

For export, migration, reconciliation, and rollback procedures, see the
[Cloudflare KV cutover runbook](docs/cloudflare-kv-cutover.md). The tooling is
dry-run-first and redacts record contents from reports.

## Environment

Cloudflare configuration lives in `wrangler.toml`.

Required KV binding:

```toml
[[kv_namespaces]]
binding = "VFC_SUBMISSIONS"
id = "your-staging-kv-namespace-id"
```

Variables:

```toml
[vars]
WHATSAPP_INVITE_MESSAGE_TEMPLATE = "Halo {{name}}! Selamat datang di Vibe From Cafe. Gabung untuk diskusi, sesi, hands-on building, webinar, podcast, dan dukungan karier: {{group_link}}"
PUBLIC_FORM_DEDUPE_KEY_VERSION = "v1"
```

This is the repository default. The value available to a deployed Function comes from that Pages deployment's runtime configuration and may differ from the repository, including an older or environment-specific override. Before cutover, an owner must verify `WHATSAPP_INVITE_MESSAGE_TEMPLATE` in both preview and production Cloudflare Pages environments without copying private invite URLs or secrets into the repository or PR.

Public forms additionally require environment-specific runtime configuration:

- `TURNSTILE_SITE_KEY` and the encrypted `TURNSTILE_SECRET_KEY` must be configured together or both absent. The browser reads the public site key from `/api/public-form-config`; there is no build-time `VITE_*` key, so Health and the rendered widget inspect the same deployed runtime configuration.
- encrypted `PUBLIC_FORM_DEDUPE_KEY` must contain at least 32 bytes and match `PUBLIC_FORM_DEDUPE_KEY_VERSION`. During rotation, configure both `PUBLIC_FORM_DEDUPE_PREVIOUS_KEY` and `PUBLIC_FORM_DEDUPE_PREVIOUS_KEY_VERSION`; remove them only after the accepted marker window.
- `PRIVACY_REQUEST_URL` must be the operator-approved, monitored public HTTPS or `mailto:` request channel. The forms fail closed when it is absent or invalid. The repository does not choose that channel, its owners, or a response target.
- `PUBLIC_FORM_RATE_LIMITER` must be a binding to an external, strongly consistent Durable Object implementation of the contract below.

Do not put secrets in `wrangler.toml`, build variables, fixtures, logs, tickets, or command output. Use encrypted Pages secrets and environment-isolated credentials.

### Atomic rate-limiter deployment gate

Cloudflare Pages Functions do not support the Workers Rate Limiting binding. That Workers API is also permissive, eventually consistent, and scoped per Cloudflare location, so it cannot satisfy the strict concurrent/multi-PoP requirement. KV read/modify/write counters are non-atomic and must not be used.

Pages can bind an external Durable Object, but cannot create or deploy one. An authorized owner must approve and provision a separate Worker/Durable Object, then add a Pages Durable Object binding named `PUBLIC_FORM_RATE_LIMITER`. Its single object named `public-form-rate-limit-v1` must atomically enforce policy `public-form-v1`: no more than 5 allowed attempts per endpoint for one HMAC-derived client key in any rolling 60-second interval. `POST /limit` receives only `{ key, policy }` and must return JSON `{ "allowed": boolean }`. The client key uses only Cloudflare's trusted `CF-Connecting-IP` header; it never falls back to caller-controlled forwarding headers. Missing bindings, missing client IP, exceptions, non-2xx responses, and malformed responses fail closed with `503`; exhausted limits return `429`.

The exact external Worker script name, Durable Object class, namespace/migration, cost acceptance, and Preview/Production bindings are intentionally not present in this repository because they require the unresolved operator/resource decision in issue #27. Do not add placeholder `[[durable_objects.bindings]]` configuration and call it deployed. Before enabling writes, retain redacted evidence that at least 100 concurrent requests near rolling-window edges and multi-PoP traffic stay within the approved tolerance for both endpoints.

Admin pages and APIs validate Cloudflare Access identity tokens in the application as well as relying on the edge policy. Protected `/admin/health` and `/api/admin/security` report status and blockers without values. See [Admin security operations](docs/admin-security.md) for required Access applications, runtime variables, isolated Preview bindings, and smoke tests, [Admin intake workflow](docs/admin-intake.md) for bounded triage/correction behavior, and [Privacy operations](docs/privacy-operations.md) for the repository deletion workflow and remaining operator gates.

## Development

Install dependencies:

```bash
pnpm install
```

Run the React Router dev server:

```bash
pnpm dev
```

This is useful for UI work. Cloudflare Pages Functions are not served by `pnpm dev`.

Build the app:

```bash
pnpm build
```

Run Cloudflare Pages locally after building:

```bash
pnpm cf:dev
```

Use this mode to test `/api/join`, `/api/contact`, `/api/events`, and admin APIs against the Cloudflare Pages runtime.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Deployment

Cloudflare Pages should use:

- Current preview/staging Pages project: `vcfc-cloudflare-revamp`
- Build command: `pnpm build`
- Build output directory: `build/client`
- Functions directory: `functions`
- KV binding: `VFC_SUBMISSIONS`

Use the staging Pages project and an isolated staging KV namespace first. Preview and Production must never share the `VFC_SUBMISSIONS` namespace. Verify the configured KV namespace belongs to the intended environment and follow the environment-specific configuration in [Admin security operations](docs/admin-security.md) before deploying.

The eventual Production target is the existing `vibefromcafe` Pages project and its dashboard-bound Production `VFC_SUBMISSIONS`; neither is changed or represented as owned by this repository configuration during this phase. The Cloudflare dashboard is authoritative for live project bindings, namespace IDs, Access audiences, secrets, and variables. Connecting or renaming projects, changing domains, rebinding KV, and deploying Production require a separate verified cutover decision; this repository change does none of them.
