import type { Submission, SubmissionStatus } from "../../../app/data/types";
import {
  parseIntakeListOptions,
  parseSubmissionStatus,
  SUBMISSION_STATUS_FLOW,
} from "./intake";

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
  "Hi {{name}}, welcome to Vibe From Cafe. Join our community for discussions, sessions, hands-on building, webinars, podcasts, and career support: {{group_link}}";

function normalizeSubmission(submission: StoredSubmission): Submission {
  return {
    ...submission,
    invitationStatus: parseSubmissionStatus(submission.invitationStatus) ?? "signed_up",
  };
}

function resolveInviteConfig(env: Env) {
  return {
    groupInviteUrl: env.WHATSAPP_GROUP_INVITE_URL?.trim() ?? "",
    messageTemplate:
      env.WHATSAPP_INVITE_MESSAGE_TEMPLATE?.trim() || DEFAULT_WHATSAPP_INVITE_MESSAGE,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const options = parseIntakeListOptions(request, parseSubmissionStatus);
  if (options instanceof Response) return options;

  const submissions: Submission[] = [];
  const listing = await env.VFC_SUBMISSIONS.list({
    prefix: SUBMISSION_PREFIX,
    cursor: options.cursor,
    limit: options.limit,
  });

  const batch = await Promise.all(
    listing.keys.map((key) => env.VFC_SUBMISSIONS.get<StoredSubmission>(key.name, "json")),
  );

  for (const submission of batch) {
    if (submission) {
      const normalized = normalizeSubmission(submission);
      if (options.status && normalized.invitationStatus !== options.status) continue;
      submissions.push({
        ...normalized,
        allowedNextStatuses: [...SUBMISSION_STATUS_FLOW[normalized.invitationStatus]],
      });
    }
  }

  submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json(
    {
      submissions,
      nextCursor: listing.list_complete ? null : listing.cursor,
      scannedCount: listing.keys.length,
      whatsappInvite: resolveInviteConfig(env),
    },
    { headers: { "cache-control": "no-store" } },
  );
};
