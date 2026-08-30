# ADR 0005: SEO origin, rendering, and mixed-language policy

## Status
Accepted for the issue #10 infrastructure slice

## Context
Vibe From Cafe is deployed as a React Router SPA on Cloudflare Pages. The public copy intentionally mixes English and Indonesian, while crawlers need one canonical origin, explicit discovery files, and real not-found statuses. Converting the application to server rendering or statically generating every route would widen the deployment architecture and requires owner approval.

## Decision

- Use `https://vibefromcafe.id` as the canonical origin, matching the repository's Domain definition.
- Keep SPA mode. Cloudflare Pages Functions serve the SPA document for known application routes and serve that document with HTTP 404 for unknown browser routes, allowing React Router to render the branded not-found page without converting the app to SSR.
- Publish only intentional, indexable public routes in `sitemap.xml`. Redirect aliases, cafe redirects, admin routes, and API routes are excluded. `robots.txt` disallows the complete `/admin` and `/api` trees. Admin, API, and unknown client-side locations also receive `noindex, nofollow` metadata.
- Use an absolute canonical URL, Open Graph URL, and social-image URL on the canonical production origin. Route-specific titles, descriptions, and images remain follow-up work in the route-owning changes.
- Keep the document-level language as English (`lang="en"`) because navigation and the shared interface are currently English. Indonesian phrases are intentional code-switching, not a separately translated page. New or materially edited coherent Indonesian passages should use `lang="id"` on their nearest semantic container. Do not publish `hreflang` alternatives unless independently translated route variants exist.

## Consequences

- Preview deployments deliberately emit production canonical URLs; previews must remain access-controlled and unindexed operationally.
- The public route inventory has one tested source in `app/seo.ts`; changes to public routes must update that inventory and the sitemap together.
- Route owners still need to add unique titles and descriptions, mark existing Indonesian passages where practical, and choose route-specific social images where they add value.
- The redirect inventory, permanence, host normalization, and Cloudflare edge verification remain separate issue #10 work and must not be inferred from this infrastructure slice.
