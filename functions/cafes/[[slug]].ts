import {
  resolveCafeSlug,
  resolveCafesIndexDestination,
  TEMPORARY_REDIRECT_STATUS,
} from "../../app/data/cafe-url-migration";

/**
 * Edge handler for /cafes and /cafes/:slug.
 * Keeps temporary redirects aligned with the client resolver and returns a
 * real HTTP 404 for unknown slugs (SPA soft-nav still uses the route module).
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const raw = context.params.slug;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const slug = parts.filter(Boolean).join("/");

  // /cafes or /cafes/ → cafe discovery home
  if (!slug) {
    return Response.redirect(
      resolveCafesIndexDestination(url.search),
      TEMPORARY_REDIRECT_STATUS,
    );
  }

  // Nested paths under /cafes/:slug/... are not part of the archived surface.
  if (parts.length > 1) {
    return new Response("Cafe not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const resolution = resolveCafeSlug(slug, url.search);

  if (resolution.kind === "redirect") {
    return Response.redirect(resolution.destinationUrl, resolution.status);
  }

  if (resolution.kind === "not_found") {
    return new Response("Cafe not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Ambiguous / unmatched / retired: fall through to the SPA legacy page.
  return context.next();
};
