export const CANONICAL_ORIGIN = "https://vibefromcafe.id";

export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/about",
  "/chapters",
  "/chapters/jogja",
  "/contact",
  "/events",
  "/join",
] as const;

const PUBLIC_ROUTE_PATH_SET = new Set<string>(PUBLIC_ROUTE_PATHS);

export function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) {
    throw new Error("Site paths must start with a slash");
  }

  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

export function absoluteSiteUrl(pathname: string) {
  return new URL(normalizePathname(pathname), `${CANONICAL_ORIGIN}/`).href;
}

export function publicCanonicalUrl(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return PUBLIC_ROUTE_PATH_SET.has(normalizedPathname)
    ? absoluteSiteUrl(normalizedPathname)
    : undefined;
}

export function isAdminPath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/");
}

export function isApiPath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return normalizedPathname === "/api" || normalizedPathname.startsWith("/api/");
}
