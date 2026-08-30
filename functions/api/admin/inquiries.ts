import type { ProjectInquiry } from "../../../app/data/types";
import {
  INQUIRY_STATUS_FLOW,
  parseInquiryStatus,
  parseIntakeListOptions,
} from "./intake";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

const INQUIRY_PREFIX = "inquiry:";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const options = parseIntakeListOptions(request, parseInquiryStatus);
  if (options instanceof Response) return options;

  const inquiries: ProjectInquiry[] = [];
  const listing = await env.VFC_SUBMISSIONS.list({
    prefix: INQUIRY_PREFIX,
    cursor: options.cursor,
    limit: options.limit,
  });

  const batch = await Promise.all(
    listing.keys.map((key) => env.VFC_SUBMISSIONS.get<ProjectInquiry>(key.name, "json")),
  );

  for (const inquiry of batch) {
    if (inquiry) {
      const status = parseInquiryStatus(inquiry.status) ?? "new";
      if (options.status && status !== options.status) continue;
      inquiries.push({
        ...inquiry,
        status,
        allowedNextStatuses: [...INQUIRY_STATUS_FLOW[status]],
      });
    }
  }

  inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json(
    {
      inquiries,
      nextCursor: listing.list_complete ? null : listing.cursor,
      scannedCount: listing.keys.length,
    },
    { headers: { "cache-control": "no-store" } },
  );
};
