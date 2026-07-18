# Vibe Coding From Cafe

Public site and Cloudflare Pages app for Vibe Coding From Cafe.

This repository keeps the current VCFC visual design while using the same operational architecture as `zainfathoni/vibefromcafe`: React Router framework mode, Cloudflare Pages, Pages Functions, and Cloudflare KV-backed runtime data.

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
- `event-deleted:{id}` for runtime seed event deletion markers
- `event_deleted:{id}` is a legacy variant covered by production inventory

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
```

Admin pages and APIs validate Cloudflare Access identity tokens in the application as well as relying on the edge policy. See [Admin security operations](docs/admin-security.md) for required Access applications, runtime variables, isolated Preview bindings, and smoke tests.

Backup ownership, RPO/RTO, restore rehearsal, PII-safe logging, alert interfaces,
admin mutation history, and the KV consistency decision are documented in
[Recovery, observability, and admin history operations](docs/recovery-observability.md).

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

Use a staging Pages project and staging KV namespace first. Preview and Production must never share the `VFC_SUBMISSIONS` namespace. Follow the environment-specific configuration in [Admin security operations](docs/admin-security.md) before deploying.
