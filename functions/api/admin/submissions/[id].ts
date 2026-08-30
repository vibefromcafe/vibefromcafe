import type { Submission, SubmissionStatus } from "../../../../app/data/types";
import { REFERRAL_SOURCES } from "../../../../app/data/public-forms";
import {
  isResponse,
  isValidPhoneNumber,
  readLimitedJson,
  rejectUnknownFields,
} from "../../form-protection";
import type { AdminAuthData } from "../auth";
import { auditMutation, type AuditedField } from "../../observability";
import {
  optionalPatchText,
  parseSubmissionStatus,
  SUBMISSION_STATUS_FLOW,
} from "../intake";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

type PatchBody = {
  invitationStatus?: SubmissionStatus | "pending" | "joined" | "declined";
  name?: string;
  city?: string;
  role?: string;
  whatsapp?: string;
  referralSource?: string;
  referralName?: string;
  assigned_to?: string;
  admin_notes?: string;
};

type StoredSubmission = Omit<Submission, "invitationStatus"> & {
  invitationStatus?: PatchBody["invitationStatus"];
};

const SUBMISSION_PREFIX = "submission:";

function normalizeSubmission(submission: StoredSubmission): Submission {
  return {
    ...submission,
    invitationStatus: parseSubmissionStatus(submission.invitationStatus) ?? "signed_up",
  };
}

export const onRequestPatch: PagesFunction<Env, "id", AdminAuthData> = async ({ request, env, params, data }) => {
  const actor = data.adminActor;
  const requestId = data.requestId ?? crypto.randomUUID();
  if (!actor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

  const idParam = params.id;
  const id = typeof idParam === "string" ? idParam.trim() : "";
  if (!/^[a-z0-9_-]{1,128}$/i.test(id)) {
    return Response.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;
  const fieldsError = rejectUnknownFields(parsed.value, [
    "invitationStatus", "name", "city", "role", "whatsapp", "referralSource", "referralName",
    "assigned_to", "admin_notes",
  ]);
  if (fieldsError) return fieldsError;
  if (Object.keys(parsed.value).length === 0) {
    return Response.json({ error: "At least one change is required" }, { status: 400 });
  }
  const body = parsed.value as PatchBody;

  const targetStatus = body.invitationStatus === undefined ? undefined : parseSubmissionStatus(body.invitationStatus);
  if (body.invitationStatus !== undefined && !targetStatus) {
    return Response.json({ error: "Invalid invitationStatus" }, { status: 400 });
  }

  const key = `${SUBMISSION_PREFIX}${id}`;
  const storedCurrent = await env.VFC_SUBMISSIONS.get<StoredSubmission>(key, "json");
  if (!storedCurrent) {
    return Response.json({ error: "Submission not found" }, { status: 404 });
  }

  const current = normalizeSubmission(storedCurrent);
  const currentStatus = current.invitationStatus;
  const nextStatus = targetStatus ?? currentStatus;
  if (!SUBMISSION_STATUS_FLOW[currentStatus].includes(nextStatus)) {
    return Response.json({ error: `Invalid status transition: ${currentStatus} -> ${targetStatus}` }, { status: 400 });
  }

  const textFields = {
    name: optionalPatchText(parsed.value, "name", 100),
    city: optionalPatchText(parsed.value, "city", 80),
    role: optionalPatchText(parsed.value, "role", 280, true),
    whatsapp: optionalPatchText(parsed.value, "whatsapp", 32),
    referralSource: optionalPatchText(parsed.value, "referralSource", 40),
    referralName: optionalPatchText(parsed.value, "referralName", 120),
    assigned_to: optionalPatchText(parsed.value, "assigned_to", 120),
    admin_notes: optionalPatchText(parsed.value, "admin_notes", 2000, true),
  };
  for (const value of Object.values(textFields)) if (isResponse(value)) return value;

  const namePatch = textFields.name as string | undefined;
  const cityPatch = textFields.city as string | undefined;
  const rolePatch = textFields.role as string | undefined;
  const whatsappPatch = textFields.whatsapp as string | undefined;
  const referralSourcePatch = textFields.referralSource as string | undefined;
  const referralNamePatch = textFields.referralName as string | undefined;
  const assignedToPatch = textFields.assigned_to as string | undefined;
  const adminNotesPatch = textFields.admin_notes as string | undefined;
  const name = namePatch ?? current.name;
  const city = cityPatch ?? current.city;
  const role = rolePatch ?? current.role;
  const whatsapp = whatsappPatch ?? current.whatsapp;
  const referralSource = referralSourcePatch ?? current.referralSource;
  const referralName = referralNamePatch ?? current.referralName;
  if (!name || !city || !role || !whatsapp || !referralSource) {
    return Response.json({ error: "Required submission fields cannot be empty" }, { status: 400 });
  }
  if (whatsappPatch !== undefined && !isValidPhoneNumber(whatsapp)) {
    return Response.json({ error: "WhatsApp number format is invalid" }, { status: 400 });
  }
  if (referralSourcePatch !== undefined && !REFERRAL_SOURCES.some(({ value }) => value === referralSource)) {
    return Response.json({ error: "Referral source is invalid" }, { status: 400 });
  }
  if ((referralNamePatch !== undefined || referralSourcePatch !== undefined) && referralName && referralSource !== "friend" && referralSource !== "other") {
    return Response.json({ error: "Referral detail is invalid for this source" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated: Submission = {
    ...current,
    id,
    name,
    city,
    role,
    whatsapp,
    referralSource,
    ...(referralName ? { referralName } : { referralName: undefined }),
    invitationStatus: nextStatus,
    ...(assignedToPatch !== undefined ? { assigned_to: assignedToPatch || undefined } : {}),
    ...(adminNotesPatch !== undefined ? { admin_notes: adminNotesPatch || undefined } : {}),
    updated_by: actor,
    updated_at: now,
  };

  if (currentStatus !== nextStatus && nextStatus === "invited") {
    updated.invited_at = now;
  }

  if (currentStatus !== nextStatus && nextStatus === "approved") {
    updated.approved_by = actor;
    updated.approved_at = now;
  }

  await env.VFC_SUBMISSIONS.put(key, JSON.stringify(updated));

  const auditedFields = ([
    "name", "city", "role", "whatsapp", "referralSource", "referralName",
    "invitationStatus", "assigned_to", "admin_notes",
  ] as AuditedField[]).filter((field) => JSON.stringify(current[field as keyof Submission]) !== JSON.stringify(updated[field as keyof Submission]));
  await auditMutation(env.VFC_SUBMISSIONS, {
    timestamp: now,
    actor,
    action: "submission.update",
    recordType: "submission",
    recordId: id,
    requestId,
    changes: {
      fields: auditedFields,
      ...(currentStatus !== nextStatus ? { oldStatus: currentStatus, newStatus: nextStatus } : {}),
    },
  });

  return Response.json(
    { success: true, submission: updated },
    { headers: { "cache-control": "no-store" } },
  );
};
