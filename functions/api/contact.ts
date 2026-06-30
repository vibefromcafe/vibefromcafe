import type { ProjectInquiry } from "../../app/data/types";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

type InquiryBody = {
  name?: string;
  contact?: string;
  message?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: InquiryBody;
  try {
    body = (await request.json()) as InquiryBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const contact = body.contact?.trim();
  const message = body.message?.trim();

  if (!name || !contact || !message) {
    return Response.json({ error: "name, contact, and message are required" }, { status: 400 });
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

  await env.VFC_SUBMISSIONS.put(`inquiry:${id}`, JSON.stringify(inquiry));

  return Response.json({ success: true, inquiry: { id, status: inquiry.status } });
};
