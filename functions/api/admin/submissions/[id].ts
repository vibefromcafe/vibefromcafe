import type { Submission, SubmissionStatus } from "../../../../app/data/types";
import type { AdminAuthData } from "../auth";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

type PatchBody = {
  invitationStatus?: SubmissionStatus | "pending" | "joined" | "declined";
};

type StoredSubmission = Omit<Submission, "invitationStatus"> & {
  invitationStatus?: PatchBody["invitationStatus"];
};

const SUBMISSION_PREFIX = "submission:";

const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "signed_up",
  "invited",
  "requested_to_join",
  "approved",
  "rejected",
];

const STATUS_FLOW: Record<SubmissionStatus, SubmissionStatus[]> = {
  signed_up: ["signed_up", "invited"],
  invited: ["invited", "requested_to_join"],
  requested_to_join: ["requested_to_join", "approved", "rejected"],
  approved: ["approved"],
  rejected: ["rejected"],
};

function parseSubmissionStatus(value: unknown): SubmissionStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  if (SUBMISSION_STATUSES.includes(value as SubmissionStatus)) {
    return value as SubmissionStatus;
  }

  if (value === "pending") return "signed_up";
  if (value === "joined") return "requested_to_join";
  if (value === "declined") return "rejected";

  return null;
}

function normalizeSubmission(submission: StoredSubmission): Submission {
  return {
    ...submission,
    invitationStatus: parseSubmissionStatus(submission.invitationStatus) ?? "signed_up",
  };
}

export const onRequestPatch: PagesFunction<Env, "id", AdminAuthData> = async ({ request, env, params, data }) => {
  const actor = data.adminActor;
  if (!actor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

  const idParam = params.id;
  const id = typeof idParam === "string" ? idParam.trim() : "";
  if (!id) {
    return Response.json({ error: "Submission id is required" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetStatus = parseSubmissionStatus(body.invitationStatus);
  if (!targetStatus) {
    return Response.json({ error: "Invalid invitationStatus" }, { status: 400 });
  }

  const key = `${SUBMISSION_PREFIX}${id}`;
  const storedCurrent = await env.VFC_SUBMISSIONS.get<StoredSubmission>(key, "json");
  if (!storedCurrent) {
    return Response.json({ error: "Submission not found" }, { status: 404 });
  }

  const current = normalizeSubmission(storedCurrent);
  const currentStatus = current.invitationStatus;
  if (!STATUS_FLOW[currentStatus].includes(targetStatus)) {
    return Response.json({ error: `Invalid status transition: ${currentStatus} -> ${targetStatus}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated: Submission = {
    ...current,
    id,
    invitationStatus: targetStatus,
    updated_by: actor,
    updated_at: now,
  };

  if (currentStatus !== targetStatus && targetStatus === "invited") {
    updated.invited_at = now;
  }

  if (currentStatus !== targetStatus && targetStatus === "approved") {
    updated.approved_by = actor;
    updated.approved_at = now;
  }

  await env.VFC_SUBMISSIONS.put(key, JSON.stringify(updated));

  return Response.json({ success: true, submission: updated });
};
