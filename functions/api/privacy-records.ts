import {
  PUBLIC_FORM_DELETION_RECEIPT_TTL_SECONDS,
  logPublicFormEvent,
  type FormProtectionEnv,
  type PublicFormName,
} from "./form-protection";

export type PublicFormRecordKind = "submission" | "inquiry";

type DedupeReference = {
  recordKey: string;
  dedupeKeys: string[];
  createdAt: string;
};

type PendingDeletion = {
  state: "pending";
  kind: PublicFormRecordKind;
  recordKeys: string[];
  referenceKeys: string[];
  dedupeKeys: string[];
  startedAt: string;
};

type CompletedDeletion = {
  state: "complete";
  kind: PublicFormRecordKind;
  completedAt: string;
};

type DeletionResult =
  | { ok: true }
  | { ok: false; status: 404 | 503 };

const KIND_CONFIG: Record<PublicFormRecordKind, {
  form: PublicFormName;
  recordPrefix: string;
}> = {
  submission: { form: "join", recordPrefix: "submission:" },
  inquiry: { form: "contact", recordPrefix: "inquiry:" },
};

function isReference(value: unknown): value is DedupeReference {
  if (!value || typeof value !== "object") return false;
  const reference = value as Partial<DedupeReference>;
  return (
    typeof reference.recordKey === "string" &&
    Array.isArray(reference.dedupeKeys) &&
    reference.dedupeKeys.length >= 1 &&
    reference.dedupeKeys.length <= 2 &&
    new Set(reference.dedupeKeys).size === reference.dedupeKeys.length &&
    reference.dedupeKeys.every((key) => (
      typeof key === "string" && /^form-dedupe:(join|contact):[a-z0-9_-]{1,24}:[a-f0-9]{64}$/i.test(key)
    )) &&
    typeof reference.createdAt === "string"
  );
}

function isReferenceForKind(value: unknown, kind: PublicFormRecordKind): value is DedupeReference {
  if (!isReference(value)) return false;
  const { form, recordPrefix } = KIND_CONFIG[kind];
  const recordId = value.recordKey.slice(recordPrefix.length);
  return (
    value.recordKey.startsWith(recordPrefix) &&
    /^[a-z0-9_-]{1,128}$/i.test(recordId) &&
    value.dedupeKeys.every((key) => key.startsWith(`form-dedupe:${form}:`))
  );
}

function isPendingDeletion(value: unknown): value is PendingDeletion {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<PendingDeletion>;
  return (
    receipt.state === "pending" &&
    (receipt.kind === "submission" || receipt.kind === "inquiry") &&
    Array.isArray(receipt.recordKeys) && receipt.recordKeys.every((key) => typeof key === "string") &&
    Array.isArray(receipt.referenceKeys) && receipt.referenceKeys.every((key) => typeof key === "string") &&
    Array.isArray(receipt.dedupeKeys) && receipt.dedupeKeys.every((key) => typeof key === "string") &&
    typeof receipt.startedAt === "string"
  );
}

function isCompleteDeletion(value: unknown): value is CompletedDeletion {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<CompletedDeletion>;
  return (
    receipt.state === "complete" &&
    (receipt.kind === "submission" || receipt.kind === "inquiry") &&
    typeof receipt.completedAt === "string"
  );
}

function isPendingDeletionForTarget(
  value: unknown,
  kind: PublicFormRecordKind,
  id: string,
): value is PendingDeletion {
  if (!isPendingDeletion(value) || value.kind !== kind) return false;
  const { form, recordPrefix } = KIND_CONFIG[kind];
  const referencePrefix = `privacy-dedupe-ref:${form}:`;
  const dedupePrefix = `form-dedupe:${form}:`;
  const recordKeyPattern = new RegExp(`^${recordPrefix}[a-z0-9_-]{1,128}$`, "i");
  const referenceKeyPattern = new RegExp(`^${referencePrefix}[a-z0-9_-]{1,128}$`, "i");
  return (
    value.recordKeys.includes(`${recordPrefix}${id}`) &&
    value.recordKeys.every((key) => recordKeyPattern.test(key)) &&
    value.referenceKeys.every((key) => (
      referenceKeyPattern.test(key) &&
      value.recordKeys.includes(`${recordPrefix}${key.slice(referencePrefix.length)}`)
    )) &&
    value.dedupeKeys.every((key) => (
      key.startsWith(dedupePrefix) &&
      /^form-dedupe:(join|contact):[a-z0-9_-]{1,24}:[a-f0-9]{64}$/i.test(key)
    ))
  );
}

async function listReferences(
  env: FormProtectionEnv,
  prefix: string,
  kind: PublicFormRecordKind,
) {
  const references: Array<{ key: string; value: DedupeReference }> = [];
  let cursor: string | undefined;

  do {
    const listing = await env.VFC_SUBMISSIONS.list<DedupeReference>({ prefix, cursor, limit: 1000 });
    for (const key of listing.keys) {
      const value = key.metadata;
      if (!isReferenceForKind(value, kind)) throw new Error("invalid dedupe reference");
      const expectedKey = `${prefix}${value.recordKey.slice(KIND_CONFIG[kind].recordPrefix.length)}`;
      if (key.name !== expectedKey) throw new Error("dedupe reference ownership mismatch");
      references.push({ key: key.name, value });
    }
    cursor = listing.list_complete ? undefined : listing.cursor;
  } while (cursor);

  return references;
}

function findConnectedReferences(
  references: Array<{ key: string; value: DedupeReference }>,
  initialDedupeKeys: Iterable<string>,
) {
  const dedupeKeys = new Set(initialDedupeKeys);
  const matched = new Map<string, DedupeReference>();
  let foundMatch: boolean;

  do {
    foundMatch = false;
    for (const reference of references) {
      if (
        matched.has(reference.key) ||
        !reference.value.dedupeKeys.some((key) => dedupeKeys.has(key))
      ) {
        continue;
      }

      matched.set(reference.key, reference.value);
      for (const key of reference.value.dedupeKeys) dedupeKeys.add(key);
      foundMatch = true;
    }
  } while (foundMatch);

  return {
    references: [...matched].map(([key, value]) => ({ key, value })),
    dedupeKeys: [...dedupeKeys],
  };
}

async function prepareDeletion(
  env: FormProtectionEnv,
  kind: PublicFormRecordKind,
  id: string,
): Promise<PendingDeletion | null> {
  const { form, recordPrefix } = KIND_CONFIG[kind];
  const targetRecordKey = `${recordPrefix}${id}`;
  const referencePrefix = `privacy-dedupe-ref:${form}:`;
  const targetReferenceKey = `${referencePrefix}${id}`;
  const [targetRecord, targetReferenceValue] = await Promise.all([
    env.VFC_SUBMISSIONS.get(targetRecordKey),
    env.VFC_SUBMISSIONS.get<unknown>(targetReferenceKey, "json"),
  ]);

  if (targetRecord === null && targetReferenceValue === null) return null;
  if (
    targetReferenceValue !== null &&
    (!isReferenceForKind(targetReferenceValue, kind) || targetReferenceValue.recordKey !== targetRecordKey)
  ) {
    throw new Error("invalid target dedupe reference");
  }

  const targetDedupeKeys = new Set(targetReferenceValue?.dedupeKeys ?? []);
  const connected = targetDedupeKeys.size > 0
    ? findConnectedReferences(
      await listReferences(env, referencePrefix, kind),
      targetDedupeKeys,
    )
    : { references: [], dedupeKeys: [] };

  const recordKeys = new Set(connected.references.map(({ value }) => value.recordKey));
  const referenceKeys = new Set(connected.references.map(({ key }) => key));
  recordKeys.add(targetRecordKey);
  if (targetReferenceValue) referenceKeys.add(targetReferenceKey);

  return {
    state: "pending",
    kind,
    recordKeys: [...recordKeys],
    referenceKeys: [...referenceKeys],
    dedupeKeys: connected.dedupeKeys,
    startedAt: new Date().toISOString(),
  };
}

async function expandPendingDeletion(env: FormProtectionEnv, pending: PendingDeletion) {
  if (pending.dedupeKeys.length === 0) return pending;
  const { form } = KIND_CONFIG[pending.kind];
  const referencePrefix = `privacy-dedupe-ref:${form}:`;
  const connected = findConnectedReferences(
    await listReferences(env, referencePrefix, pending.kind),
    pending.dedupeKeys,
  );

  return {
    ...pending,
    recordKeys: [...new Set([
      ...pending.recordKeys,
      ...connected.references.map(({ value }) => value.recordKey),
    ])],
    referenceKeys: [...new Set([
      ...pending.referenceKeys,
      ...connected.references.map(({ key }) => key),
    ])],
    dedupeKeys: connected.dedupeKeys,
  };
}

async function executeDeletion(
  env: FormProtectionEnv,
  receiptKey: string,
  pending: PendingDeletion,
) {
  for (const recordKey of pending.recordKeys) {
    await env.VFC_SUBMISSIONS.delete(recordKey);
  }

  for (const dedupeKey of pending.dedupeKeys) {
    const marker = await env.VFC_SUBMISSIONS.get<{ recordKey?: unknown }>(dedupeKey, "json");
    if (marker !== null) {
      if (typeof marker.recordKey !== "string" || !pending.recordKeys.includes(marker.recordKey)) {
        throw new Error("dedupe marker changed during deletion");
      }
    }
    await env.VFC_SUBMISSIONS.delete(dedupeKey);
  }

  for (const referenceKey of pending.referenceKeys) {
    await env.VFC_SUBMISSIONS.delete(referenceKey);
  }

  const complete: CompletedDeletion = {
    state: "complete",
    kind: pending.kind,
    completedAt: new Date().toISOString(),
  };
  await env.VFC_SUBMISSIONS.put(receiptKey, JSON.stringify(complete), {
    expirationTtl: PUBLIC_FORM_DELETION_RECEIPT_TTL_SECONDS,
  });
}

export async function deletePublicFormRecords(
  env: FormProtectionEnv,
  kind: PublicFormRecordKind,
  id: string,
): Promise<DeletionResult> {
  const receiptKey = `privacy-deletion:${kind}:${id}`;

  try {
    const existing = await env.VFC_SUBMISSIONS.get<unknown>(receiptKey, "json");
    let prepared: PendingDeletion | null;
    if (isCompleteDeletion(existing) && existing.kind === kind) {
      prepared = await prepareDeletion(env, kind, id);
      if (!prepared) return { ok: true };
    } else {
      if (existing !== null && !isPendingDeletionForTarget(existing, kind, id)) {
        throw new Error("invalid deletion receipt");
      }
      prepared = existing ?? await prepareDeletion(env, kind, id);
    }

    const pending = prepared ? await expandPendingDeletion(env, prepared) : null;
    if (!pending) return { ok: false, status: 404 };
    if (!isPendingDeletionForTarget(pending, kind, id)) {
      throw new Error("invalid pending deletion");
    }

    await env.VFC_SUBMISSIONS.put(receiptKey, JSON.stringify(pending), {
      expirationTtl: PUBLIC_FORM_DELETION_RECEIPT_TTL_SECONDS,
    });

    await executeDeletion(env, receiptKey, pending);
    return { ok: true };
  } catch {
    logPublicFormEvent("error", "privacy_deletion_incomplete", "privacy");
    return { ok: false, status: 503 };
  }
}
