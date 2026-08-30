import {
  isAdminPath,
  isApiPath,
  publicCanonicalUrl,
} from "../app/seo";

interface AssetsEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const REDIRECT_PATHS = new Set([
  "/cafes",
  "/chapter",
  "/event",
  "/join-community",
  "/join-comunity",
]);

function isRedirectPath(pathname: string) {
  return REDIRECT_PATHS.has(pathname) || pathname.startsWith("/cafes/");
}

function isStaticAssetPath(pathname: string) {
  return pathname.split("/").at(-1)?.includes(".") ?? false;
}

function replaceDocumentSeo(html: string, canonicalUrl?: string) {
  const withoutRouteSeo = html
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:url"[^>]*>/gi, "")
    .replace(/<meta\s+name="robots"[^>]*>/gi, "");
  const routeSeo = canonicalUrl
    ? `<link rel="canonical" href="${canonicalUrl}"/><meta property="og:url" content="${canonicalUrl}"/>`
    : '<meta name="robots" content="noindex, nofollow"/>';

  return withoutRouteSeo.replace("</head>", `${routeSeo}</head>`);
}

async function spaDocument(
  request: Request,
  env: AssetsEnv,
  canonicalUrl?: string,
  status = 200,
) {
  const indexUrl = new URL("/index.html", request.url);
  const indexResponse = await env.ASSETS.fetch(
    new Request(indexUrl, { headers: request.headers }),
  );
  const headers = new Headers(indexResponse.headers);
  headers.delete("content-length");
  headers.set("cache-control", status === 404 ? "no-store" : "public, max-age=0, must-revalidate");
  headers.set("content-type", "text/html; charset=utf-8");

  if (request.method === "HEAD") {
    return new Response(null, { status, headers });
  }

  const html = replaceDocumentSeo(await indexResponse.text(), canonicalUrl);
  return new Response(html, { status, headers });
}

export const onRequest: PagesFunction<AssetsEnv> = async ({ request, env }) => {
  const { pathname } = new URL(request.url);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Not Found", { status: 404 });
  }

  if (isApiPath(pathname)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (isStaticAssetPath(pathname) || isRedirectPath(pathname)) {
    return env.ASSETS.fetch(request);
  }

  const canonicalUrl = publicCanonicalUrl(pathname);
  if (canonicalUrl) {
    return spaDocument(request, env, canonicalUrl);
  }

  if (isAdminPath(pathname)) {
    return spaDocument(request, env);
  }

  return spaDocument(request, env, undefined, 404);
};
