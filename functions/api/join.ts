import type { Submission, SubmissionStatus } from "../../app/data/types";
import { logSafe, requestIdFor, withRequestId } from "./observability";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
  WHATSAPP_GROUP_INVITE_URL?: string;
  WHATSAPP_INVITE_MESSAGE_TEMPLATE?: string;
}

interface SubmissionBody {
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: string;
  referralName?: string;
}

const DEFAULT_WHATSAPP_INVITE_MESSAGE =
  "Hi {{name}}, welcome to Vibe Coding From Cafe. Join our WhatsApp community here: {{group_link}}";

function resolveInviteConfig(env: Env) {
  return {
    groupInviteUrl: env.WHATSAPP_GROUP_INVITE_URL?.trim() ?? "",
    messageTemplate:
      env.WHATSAPP_INVITE_MESSAGE_TEMPLATE?.trim() || DEFAULT_WHATSAPP_INVITE_MESSAGE,
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const requestId = requestIdFor(request);

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return withRequestId(Response.json({ error: "Invalid JSON" }, { status: 400 }), requestId);
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return withRequestId(Response.json({ error: "Invalid JSON" }, { status: 400 }), requestId);
  }
  const body = parsedBody as SubmissionBody;

  const { name, city, role, whatsapp, referralSource, referralName } = body;

  if (!name?.trim() || !city?.trim() || !role?.trim() || !whatsapp?.trim() || !referralSource?.trim()) {
    return withRequestId(Response.json({ error: "All required fields must be filled" }, { status: 400 }), requestId);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const whatsappInvite = resolveInviteConfig(env);
  const invitationStatus: SubmissionStatus = whatsappInvite.groupInviteUrl ? "invited" : "signed_up";
  const submission: Submission = {
    id,
    name: name.trim(),
    city: city.trim(),
    role: role.trim(),
    whatsapp: whatsapp.trim(),
    referralSource: referralSource.trim(),
    ...((referralSource === "friend" || referralSource === "other") && referralName?.trim()
      ? { referralName: referralName.trim() }
      : {}),
    invitationStatus,
    ...(invitationStatus === "invited" ? { invited_at: now } : {}),
    createdAt: now,
  };

  try {
    await env.VFC_SUBMISSIONS.put(`submission:${id}`, JSON.stringify(submission));
  } catch {
    logSafe({
      event: "submission_write_failed",
      level: "error",
      requestId,
      method: "POST",
      route: "/api/join",
      status: 503,
      errorType: "kv_write",
    });
    return withRequestId(
      Response.json({ error: "Submission could not be saved", requestId }, { status: 503 }),
      requestId,
    );
  }

  logSafe({ event: "submission_write_succeeded", level: "info", requestId, method: "POST", route: "/api/join", status: 200 });
  return withRequestId(Response.json({
    success: true,
    submission: { id, invitationStatus: submission.invitationStatus },
    whatsappInvite,
  }), requestId);
};
