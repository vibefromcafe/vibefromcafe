import {
  resolveCafeSlug,
  resolveCafesIndexDestination,
  TEMPORARY_REDIRECT_STATUS,
} from "../../app/data/cafe-url-migration";

function notFound(): Response {
  return new Response("Cafe not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/** Keep direct edge requests aligned with the client-side cafe resolver. */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const rawSlug = context.params.slug;
  const parts = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];

  if (parts.length === 0 || parts.every((part) => !part)) {
    return Response.redirect(
      resolveCafesIndexDestination(url.search),
      TEMPORARY_REDIRECT_STATUS,
    );
  }

  if (parts.length !== 1 || !parts[0]) return notFound();

  const resolution = resolveCafeSlug(parts[0], url.search);
  if (resolution.kind === "redirect") {
    return Response.redirect(resolution.destinationUrl, resolution.status);
  }
  if (resolution.kind === "not_found") return notFound();

  // Ambiguous and unmatched archived cafes are rendered by the read-only SPA route.
  return context.next();
};
