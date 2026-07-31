# Vibe Coding From Cafe

Public site and Cloudflare Pages app for Vibe Coding From Cafe.

This repository keeps the current VCFC visual design while using the same operational architecture as `zainfathoni/vibefromcafe`: React Router framework mode, Cloudflare Pages, Pages Functions, and Cloudflare KV-backed runtime data.

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
WHATSAPP_INVITE_MESSAGE_TEMPLATE = "Halo {{name}}! Selamat datang di Vibe Coding From Cafe. Yuk gabung ke grup komunitas kami di sini: {{group_link}}"
VITE_TURNSTILE_SITE_KEY = "your-public-turnstile-site-key"
```

Configure `TURNSTILE_SECRET_KEY` as a secret environment variable in Cloudflare Pages when Turnstile should be enforced. If `TURNSTILE_SECRET_KEY` is missing, public forms continue to work without Turnstile verification so local and preview environments do not break.

Admin access is protected in deployed environments by Cloudflare Access. `/admin/health` shows configured/missing status for public-form security settings without exposing secret values.

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

- Build command: `pnpm build`
- Build output directory: `build/client`
- Functions directory: `functions`
- KV binding: `VFC_SUBMISSIONS`

Use a staging Pages project and staging KV namespace first. Replace the placeholder KV namespace id in `wrangler.toml` before deploying.
