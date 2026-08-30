import type { AdminAuthData } from "../../auth";
import {
  deletePublicFormRecords,
  type PublicFormRecordKind,
} from "../../../privacy-records";
import type { FormProtectionEnv } from "../../../form-protection";
import { auditMutation } from "../../../observability";

function parseKind(value: string | string[] | undefined): PublicFormRecordKind | null {
  return value === "submission" || value === "inquiry" ? value : null;
}

export const onRequestDelete: PagesFunction<FormProtectionEnv, "kind" | "id", AdminAuthData> = async ({
  env,
  params,
  data,
}) => {
  if (!data.adminActor) {
    return Response.json({ error: "Authenticated admin identity missing" }, { status: 500 });
  }

  const kind = parseKind(params.kind);
  const id = typeof params.id === "string" ? params.id.trim() : "";
  if (!kind || !/^[a-z0-9_-]{1,128}$/i.test(id)) {
    return Response.json({ error: "Invalid privacy record reference" }, { status: 400 });
  }

  const result = await deletePublicFormRecords(env, kind, id);
  if (!result.ok) {
    return Response.json(
      { error: result.status === 404 ? "Record not found" : "Privacy deletion is incomplete; retry is required" },
      { status: result.status },
    );
  }

  await auditMutation(env.VFC_SUBMISSIONS, {
    timestamp: new Date().toISOString(),
    actor: data.adminActor,
    action: "privacy.delete",
    recordType: kind,
    recordId: id,
    requestId: data.requestId ?? crypto.randomUUID(),
    changes: {},
  });

  return Response.json({ success: true });
};
