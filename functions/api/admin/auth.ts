interface Env {
  ADMIN_SECRET?: string;
}

export function requireAdmin(request: Request, env: Env) {
  const url = new URL(request.url);

  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0"
  ) {
    return null;
  }

  if (request.headers.get("Cf-Access-Jwt-Assertion")) {
    return null;
  }

  const configuredSecret = env.ADMIN_SECRET?.trim();
  const providedSecret = request.headers.get("X-Admin-Secret")?.trim();
  if (configuredSecret && providedSecret === configuredSecret) {
    return null;
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
