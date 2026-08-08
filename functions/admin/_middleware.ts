import {
  adminUnauthorized,
  authenticateAdmin,
  type AdminAuthData,
  type AdminAuthEnv,
} from "../api/admin/auth";

export const onRequest: PagesFunction<AdminAuthEnv, string, AdminAuthData> = async (context) => {
  const authentication = await authenticateAdmin(context.request, context.env);
  if (!authentication.ok) {
    return adminUnauthorized(authentication.status);
  }

  context.data.adminActor = authentication.actor;
  return context.next();
};
