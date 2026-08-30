import type { ProjectInquiry } from "../../../../app/data/types";
import {
  isResponse,
  isValidEmail,
  isValidPhoneNumber,
  readLimitedJson,
  rejectUnknownFields,
} from "../../form-protection";
import type { AdminAuthData } from "../auth";
import {
  INQUIRY_STATUS_FLOW,
  optionalPatchText,
  parseInquiryStatus,
} from "../intake";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

export const onRequestPatch: PagesFunction<Env, "id", AdminAuthData> = async ({ request, env, params, data }) => {
  const actor = data.adminActor;
  if (!actor) return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  const id = typeof params.id === "string" ? params.id.trim() : "";
  if (!/^[a-z0-9_-]{1,128}$/i.test(id)) return Response.json({ error: "Invalid inquiry id" }, { status: 400 });

  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;
  const fieldsError = rejectUnknownFields(parsed.value, [
    "status", "name", "contact", "message", "assigned_to", "admin_notes",
  ]);
  if (fieldsError) return fieldsError;
  if (Object.keys(parsed.value).length === 0) {
    return Response.json({ error: "At least one change is required" }, { status: 400 });
  }

  const key = `inquiry:${id}`;
  const current = await env.VFC_SUBMISSIONS.get<ProjectInquiry>(key, "json");
  if (!current) return Response.json({ error: "Inquiry not found" }, { status: 404 });
  const currentStatus = parseInquiryStatus(current.status) ?? "new";
  const nextStatus = Object.hasOwn(parsed.value, "status") ? parseInquiryStatus(parsed.value.status) : currentStatus;
  if (!nextStatus) return Response.json({ error: "Invalid inquiry status" }, { status: 400 });
  if (!INQUIRY_STATUS_FLOW[currentStatus].includes(nextStatus)) {
    return Response.json({ error: `Invalid status transition: ${currentStatus} -> ${nextStatus}` }, { status: 400 });
  }

  const textFields = {
    name: optionalPatchText(parsed.value, "name", 100),
    contact: optionalPatchText(parsed.value, "contact", 254),
    message: optionalPatchText(parsed.value, "message", 2000, true),
    assigned_to: optionalPatchText(parsed.value, "assigned_to", 120),
    admin_notes: optionalPatchText(parsed.value, "admin_notes", 2000, true),
  };
  for (const value of Object.values(textFields)) if (isResponse(value)) return value;
  const namePatch = textFields.name as string | undefined;
  const contactPatch = textFields.contact as string | undefined;
  const messagePatch = textFields.message as string | undefined;
  const assignedToPatch = textFields.assigned_to as string | undefined;
  const adminNotesPatch = textFields.admin_notes as string | undefined;
  const name = namePatch ?? current.name;
  const contact = contactPatch ?? current.contact;
  const message = messagePatch ?? current.message;
  if (!name || !contact || !message) return Response.json({ error: "Required inquiry fields cannot be empty" }, { status: 400 });
  if (contactPatch !== undefined && !isValidEmail(contact) && !isValidPhoneNumber(contact)) {
    return Response.json({ error: "Contact must be a valid email or WhatsApp number" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated: ProjectInquiry = {
    ...current,
    id,
    name,
    contact,
    message,
    status: nextStatus,
    ...(assignedToPatch !== undefined ? { assigned_to: assignedToPatch || undefined } : {}),
    ...(adminNotesPatch !== undefined ? { admin_notes: adminNotesPatch || undefined } : {}),
    updated_by: actor,
    updated_at: now,
  };
  await env.VFC_SUBMISSIONS.put(key, JSON.stringify(updated));
  return Response.json(
    { success: true, inquiry: updated },
    { headers: { "cache-control": "no-store" } },
  );
};
