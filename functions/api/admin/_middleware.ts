import {
  adminUnauthorized,
  authenticateAdmin,
  type AdminAuthData,
  type AdminAuthEnv,
} from "./auth";
import { logSafe, requestIdFor, withRequestId } from "../observability";

export const onRequest: PagesFunction<AdminAuthEnv, string, AdminAuthData> = async (context) => {
  const requestId = requestIdFor(context.request);
  context.data.requestId = requestId;
  const authentication = await authenticateAdmin(context.request, context.env);
  if (!authentication.ok) {
    logSafe({
      event: "admin_auth_failed",
      level: "warn",
      requestId,
      method: context.request.method,
      route: context.functionPath,
      status: authentication.status,
    });
    return withRequestId(adminUnauthorized(authentication.status), requestId);
  }

  if (
    !["GET", "HEAD", "OPTIONS"].includes(context.request.method) &&
    context.env.ADMIN_MUTATIONS_ENABLED !== "true"
  ) {
    return withRequestId(Response.json(
      { error: "Admin mutations are disabled in this environment" },
      { status: 403 },
    ), requestId);
  }

  context.data.adminActor = authentication.actor;
  try {
    return withRequestId(await context.next(), requestId);
  } catch {
    logSafe({
      event: "admin_request_failed",
      level: "error",
      requestId,
      method: context.request.method,
      route: context.functionPath,
      actor: authentication.actor,
      status: 500,
      errorType: "unhandled",
    });
    return withRequestId(
      Response.json({ error: "Admin request failed", requestId }, { status: 500 }),
      requestId,
    );
  }
};
