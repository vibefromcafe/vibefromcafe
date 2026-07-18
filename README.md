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

Redirects and cafe URL migration:

- `/cafes` redirects to `https://cafein.id`
- Verified `/cafes/:slug` paths redirect to `https://cafein.id/cafe/<mapped-slug>` (temporary 302 until owner promotion)
- Ambiguous / unmatched archived slugs keep a read-only legacy page on this site
- Unknown `/cafes/:slug` values return 404
- Public map: `/cafe-url-mapping.json` (see `docs/cafe-url-migration.md`)
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
```

Admin access is protected in deployed environments by Cloudflare Access.

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
