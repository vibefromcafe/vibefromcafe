import type { ProjectInquiry } from "../../app/data/types";
import { logSafe, requestIdFor, withRequestId } from "./observability";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

type InquiryBody = {
  name?: string;
  contact?: string;
  message?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
  const body = parsedBody as InquiryBody;

  const name = body.name?.trim();
  const contact = body.contact?.trim();
  const message = body.message?.trim();

  if (!name || !contact || !message) {
    return withRequestId(Response.json({ error: "name, contact, and message are required" }, { status: 400 }), requestId);
  }

  const id = crypto.randomUUID();
  const inquiry: ProjectInquiry = {
    id,
    name,
    contact,
    message,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  try {
    await env.VFC_SUBMISSIONS.put(`inquiry:${id}`, JSON.stringify(inquiry));
  } catch {
    logSafe({
      event: "inquiry_write_failed",
      level: "error",
      requestId,
      method: "POST",
      route: "/api/contact",
      status: 503,
      errorType: "kv_write",
    });
    return withRequestId(
      Response.json({ error: "Inquiry could not be saved", requestId }, { status: 503 }),
      requestId,
    );
  }

  logSafe({ event: "inquiry_write_succeeded", level: "info", requestId, method: "POST", route: "/api/contact", status: 200 });
  return withRequestId(Response.json({ success: true, inquiry: { id, status: inquiry.status } }), requestId);
};
