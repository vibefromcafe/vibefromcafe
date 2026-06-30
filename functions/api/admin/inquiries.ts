import type { ProjectInquiry } from "../../../app/data/types";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

const INQUIRY_PREFIX = "inquiry:";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const inquiries: ProjectInquiry[] = [];
  let cursor: string | undefined;

  do {
    const listing = await env.VFC_SUBMISSIONS.list({
      prefix: INQUIRY_PREFIX,
      cursor,
      limit: 1000,
    });

    const batch = await Promise.all(
      listing.keys.map((key) => env.VFC_SUBMISSIONS.get<ProjectInquiry>(key.name, "json")),
    );

    for (const inquiry of batch) {
      if (inquiry) {
        inquiries.push(inquiry);
      }
    }

    cursor = listing.list_complete ? undefined : listing.cursor;
  } while (cursor);

  inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ inquiries });
};
