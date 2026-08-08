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

## Data Model

Runtime data is stored in the `VFC_SUBMISSIONS` Cloudflare KV binding.

Key prefixes:

- `submission:{id}` for community join submissions
- `inquiry:{id}` for project inquiries
- `event:{id}` for event overrides and custom events
- `event_deleted:{id}` for seed event deletion markers

Seed event data lives in `app/data/events.json`. Deprecated cafe support data lives in `app/data/cafes.json` and is only used for chapter context.

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
```

This is the repository default. The value available to a deployed Function comes from that Pages deployment's runtime configuration and may differ from the repository, including an older or environment-specific override. Before cutover, an owner must verify `WHATSAPP_INVITE_MESSAGE_TEMPLATE` in both preview and production Cloudflare Pages environments without copying private invite URLs or secrets into the repository or PR.

Admin pages and APIs validate Cloudflare Access identity tokens in the application as well as relying on the edge policy. See [Admin security operations](docs/admin-security.md) for required Access applications, runtime variables, isolated Preview bindings, and smoke tests.

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
