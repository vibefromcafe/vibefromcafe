interface Env {
  ADMIN_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0"
  ) {
    return next();
  }

  const cfAccessJwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (cfAccessJwt) {
    return next();
  }

  const configuredSecret = env.ADMIN_SECRET?.trim();
  if (configuredSecret) {
    const providedSecret = request.headers.get("X-Admin-Secret")?.trim();
    if (providedSecret === configuredSecret) {
      return next();
    }
  }

  return Response.json(
    { error: "Unauthorized: admin access requires authentication" },
    { status: 401 },
  );
};
