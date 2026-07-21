import type { Submission, SubmissionStatus } from "../../../app/data/types";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
  WHATSAPP_GROUP_INVITE_URL?: string;
  WHATSAPP_INVITE_MESSAGE_TEMPLATE?: string;
}

type StoredSubmission = Omit<Submission, "invitationStatus"> & {
  invitationStatus?: SubmissionStatus | "pending" | "joined" | "declined";
};

const SUBMISSION_PREFIX = "submission:";
const DEFAULT_WHATSAPP_INVITE_MESSAGE =
  "Hi {{name}}, welcome to Vibe From Cafe. Join our WhatsApp community here: {{group_link}}";

const STATUS_FLOW: Record<SubmissionStatus, SubmissionStatus[]> = {
  signed_up: ["signed_up", "invited"],
  invited: ["invited", "requested_to_join"],
  requested_to_join: ["requested_to_join", "approved", "rejected"],
  approved: ["approved"],
  rejected: ["rejected"],
};

function parseSubmissionStatus(value: unknown): SubmissionStatus {
  if (value === "invited" || value === "requested_to_join" || value === "approved" || value === "rejected" || value === "signed_up") {
    return value;
  }
  if (value === "pending") return "signed_up";
  if (value === "joined") return "requested_to_join";
  if (value === "declined") return "rejected";
  return "signed_up";
}

function normalizeSubmission(submission: StoredSubmission): Submission {
  return {
    ...submission,
    invitationStatus: parseSubmissionStatus(submission.invitationStatus),
  };
}

function resolveInviteConfig(env: Env) {
  return {
    groupInviteUrl: env.WHATSAPP_GROUP_INVITE_URL?.trim() ?? "",
    messageTemplate:
      env.WHATSAPP_INVITE_MESSAGE_TEMPLATE?.trim() || DEFAULT_WHATSAPP_INVITE_MESSAGE,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const submissions: Submission[] = [];
  let cursor: string | undefined;

  do {
    const listing = await env.VFC_SUBMISSIONS.list({
      prefix: SUBMISSION_PREFIX,
      cursor,
      limit: 1000,
    });

    const batch = await Promise.all(
      listing.keys.map((key) => env.VFC_SUBMISSIONS.get<StoredSubmission>(key.name, "json")),
    );

    for (const submission of batch) {
      if (submission) {
        const normalized = normalizeSubmission(submission);
        submissions.push({
          ...normalized,
          allowedNextStatuses: STATUS_FLOW[normalized.invitationStatus] ?? [normalized.invitationStatus],
        });
      }
    }

    cursor = listing.list_complete ? undefined : listing.cursor;
  } while (cursor);

  submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ submissions, whatsappInvite: resolveInviteConfig(env) });
};
