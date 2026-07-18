#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIES = ["submission", "event", "event-deleted", "event_deleted", "inquiry", "unknown"];
const KNOWN_SUBMISSION_STATUSES = new Set([
  "signed_up",
  "invited",
  "requested_to_join",
  "approved",
  "rejected",
]);
const LEGACY_SUBMISSION_STATUSES = new Set(["pending", "joined", "declined"]);
const KNOWN_EVENT_STATUSES = new Set(["published", "draft"]);

function usage() {
  console.log(`VFC Cloudflare KV cutover (dry-run by default)

Commands:
  capture   --alias <source|staging|production> --config <wrangler.toml> --output <snapshot.json> [--execute-read]
  inventory --input <snapshot.json> [--output <redacted-report.json>]
  migrate   --input <snapshot.json> --destination-alias staging --destination-config <wrangler.toml>
            --destination-before <snapshot.json> --authorization <private-authorization.json>
            --live-prewrite-output <new-snapshot.json>
            [--execute --writes-frozen --confirm "WRITE VERIFIED NON-PRODUCTION staging"]
  reconcile --source <snapshot.json> --destination <snapshot.json> [--output <redacted-report.json>]

capture reads remote KV only when --execute-read is supplied. migrate writes only
to an empty, independently authorized staging namespace when all execution guards
are supplied. Production writes are not implemented. Reports never contain keys or values.`);
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const name = arg.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[name] = true;
    } else {
      options[name] = next;
      index += 1;
    }
  }
  return { command, options };
}

function requireOption(options, name) {
  const value = options[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing --${name}`);
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function categoryForKey(key) {
  if (key.startsWith("submission:")) return "submission";
  if (key.startsWith("event:")) return "event";
  if (key.startsWith("event-deleted:")) return "event-deleted";
  if (key.startsWith("event_deleted:")) return "event_deleted";
  if (key.startsWith("inquiry:")) return "inquiry";
  return "unknown";
}

function suffixFor(record, category) {
  const prefixes = {
    submission: "submission:",
    event: "event:",
    "event-deleted": "event-deleted:",
    event_deleted: "event_deleted:",
    inquiry: "inquiry:",
  };
  return prefixes[category] ? record.key.slice(prefixes[category].length) : null;
}

function recordDigest(record) {
  return hash(stableJson({
    key: record.key,
    value: record.value,
    base64: record.base64 === true,
    expiration: record.expiration ?? null,
    metadata: record.metadata ?? null,
  }));
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function hasStringFields(record, fields) {
  return fields.every((field) => typeof record[field] === "string" && record[field].length > 0);
}

export function buildInventory(snapshot) {
  if (!Array.isArray(snapshot.records)) throw new Error("Snapshot records must be an array");

  const categories = Object.fromEntries(CATEGORIES.map((name) => [name, { count: 0, hash: hash("") }]));
  const digests = Object.fromEntries(CATEGORIES.map((name) => [name, []]));
  const malformed = {
    invalidJson: 0,
    nonUtf8: 0,
    nonObjectJson: 0,
    emptyKeySuffix: 0,
    keyIdMismatch: 0,
    schemaInvalid: 0,
  };
  const submissionStatuses = {};
  const eventStatuses = {};

  for (const record of snapshot.records) {
    if (!record || typeof record.key !== "string" || typeof record.value !== "string") {
      throw new Error("Every snapshot record must contain string key and value fields");
    }
    const category = categoryForKey(record.key);
    categories[category].count += 1;
    digests[category].push(recordDigest(record));

    const suffix = suffixFor(record, category);
    if (suffix === "") malformed.emptyKeySuffix += 1;

    if (record.base64 === true) {
      malformed.nonUtf8 += 1;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(record.value);
    } catch {
      malformed.invalidJson += 1;
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      malformed.nonObjectJson += 1;
      continue;
    }
    if (suffix && typeof parsed.id === "string" && parsed.id !== suffix) malformed.keyIdMismatch += 1;
    if (category === "submission") {
      increment(submissionStatuses, typeof parsed.invitationStatus === "string" ? parsed.invitationStatus : "<missing>");
      if (!hasStringFields(parsed, ["id", "name", "city", "role", "whatsapp", "referralSource", "createdAt"])) malformed.schemaInvalid += 1;
    }
    if (category === "event") {
      increment(eventStatuses, typeof parsed.status === "string" ? parsed.status : "<missing>");
      if (!hasStringFields(parsed, ["id", "title", "date", "location", "status", "createdAt"]) || !Array.isArray(parsed.tags)) malformed.schemaInvalid += 1;
    }
    if (category === "event-deleted" && !hasStringFields(parsed, ["deletedAt"])) malformed.schemaInvalid += 1;
    if (category === "inquiry" && !hasStringFields(parsed, ["id", "name", "contact", "message", "status", "createdAt"])) malformed.schemaInvalid += 1;
  }

  for (const category of CATEGORIES) {
    categories[category].hash = hash(digests[category].sort().join("\n"));
  }

  const legacyStatuses = Object.fromEntries(
    Object.entries(submissionStatuses).filter(([status]) => LEGACY_SUBMISSION_STATUSES.has(status)),
  );
  const unknownStatuses = Object.fromEntries(
    Object.entries(submissionStatuses).filter(([status]) => !KNOWN_SUBMISSION_STATUSES.has(status) && !LEGACY_SUBMISSION_STATUSES.has(status)),
  );
  const currentStatuses = Object.fromEntries(
    Object.entries(submissionStatuses).filter(([status]) => KNOWN_SUBMISSION_STATUSES.has(status)),
  );
  const knownEventStatuses = Object.fromEntries(
    Object.entries(eventStatuses).filter(([status]) => KNOWN_EVENT_STATUSES.has(status)),
  );

  return {
    formatVersion: 1,
    alias: snapshot.alias,
    capturedAt: snapshot.capturedAt,
    totalCount: snapshot.records.length,
    categories,
    malformed,
    statuses: {
      submission: currentStatuses,
      legacySubmission: legacyStatuses,
      missingSubmission: submissionStatuses["<missing>"] ?? 0,
      unknownSubmissionCount: Object.values(unknownStatuses).reduce((total, count) => total + count, 0),
      event: knownEventStatuses,
      missingEvent: eventStatuses["<missing>"] ?? 0,
      unknownEventCount: Object.entries(eventStatuses)
        .filter(([status]) => status !== "<missing>" && !KNOWN_EVENT_STATUSES.has(status))
        .reduce((total, [, count]) => total + count, 0),
    },
    tombstoneContract: {
      runtimePrefix: "event-deleted:",
      runtimePrefixCount: categories["event-deleted"].count,
      documentedLegacyVariantCount: categories.event_deleted.count,
    },
  };
}

export function buildReconciliation(source, destination) {
  const sourceInventory = buildInventory(source);
  const destinationInventory = buildInventory(destination);
  const categories = {};
  let matches = sourceInventory.totalCount === destinationInventory.totalCount;
  for (const name of CATEGORIES) {
    const sourceCategory = sourceInventory.categories[name];
    const destinationCategory = destinationInventory.categories[name];
    const categoryMatches = sourceCategory.count === destinationCategory.count && sourceCategory.hash === destinationCategory.hash;
    categories[name] = {
      sourceCount: sourceCategory.count,
      destinationCount: destinationCategory.count,
      sourceHash: sourceCategory.hash,
      destinationHash: destinationCategory.hash,
      matches: categoryMatches,
    };
    matches &&= categoryMatches;
  }
  return {
    formatVersion: 1,
    sourceAlias: source.alias,
    destinationAlias: destination.alias,
    totalCounts: { source: sourceInventory.totalCount, destination: destinationInventory.totalCount },
    categories,
    malformed: { source: sourceInventory.malformed, destination: destinationInventory.malformed },
    statuses: { source: sourceInventory.statuses, destination: destinationInventory.statuses },
    matches,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function writePrivateJson(path, value) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(absolute, 0o600);
}

function writeNewPrivateJson(path, value) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  chmodSync(absolute, 0o600);
}

function extractNamespaceId(configPath, binding) {
  const config = readFileSync(resolve(configPath), "utf8");
  const blocks = config.split(/(?=\[\[kv_namespaces\]\])/g);
  for (const block of blocks) {
    const bindingMatch = block.match(/^binding\s*=\s*["']([^"']+)["']/m);
    const idMatch = block.match(/^id\s*=\s*["']([^"']+)["']/m);
    if (bindingMatch?.[1] === binding && idMatch?.[1]) return idMatch[1];
  }
  throw new Error(`Binding ${binding} with an id was not found in the supplied config`);
}

export function validateNoImplicitEnvironment(environment = process.env) {
  if (environment.CLOUDFLARE_ENV) {
    throw new Error("CLOUDFLARE_ENV must be unset so it cannot override the validated namespace target");
  }
}

function wrangler(args, { binary = false } = {}) {
  validateNoImplicitEnvironment();
  try {
    return execFileSync("pnpm", ["dlx", "wrangler@4.112.0", ...args], {
      encoding: binary ? "buffer" : "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error("Wrangler failed; inspect it separately in a secure terminal because command details may identify records");
  }
}

function wranglerTargetArgs(config, namespaceId) {
  return ["--namespace-id", namespaceId, "--remote", "--config", resolve(config)];
}

function capture(options) {
  const alias = requireOption(options, "alias");
  if (!new Set(["source", "staging", "production"]).has(alias)) throw new Error("Alias must be source, staging, or production");
  const config = requireOption(options, "config");
  const output = requireOption(options, "output");
  const binding = typeof options.binding === "string" ? options.binding : "VFC_SUBMISSIONS";
  if (!options["execute-read"]) {
    console.log(JSON.stringify({ dryRun: true, operation: "capture", alias, output: resolve(output), remoteRead: false }, null, 2));
    return;
  }

  const namespaceId = extractNamespaceId(config, binding);
  const listed = JSON.parse(wrangler(["kv", "key", "list", ...wranglerTargetArgs(config, namespaceId)]));
  const records = listed.map((entry) => {
    const bytes = wrangler(["kv", "key", "get", entry.name, ...wranglerTargetArgs(config, namespaceId)], { binary: true });
    const value = bytes.toString("utf8");
    const isUtf8 = Buffer.from(value, "utf8").equals(bytes);
    return {
      key: entry.name,
      value: isUtf8 ? value : bytes.toString("base64"),
      ...(!isUtf8 ? { base64: true } : {}),
      ...(entry.expiration ? { expiration: entry.expiration } : {}),
      ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
    };
  });
  const snapshot = { formatVersion: 1, alias, capturedAt: new Date().toISOString(), namespaceId, records };
  writePrivateJson(output, snapshot);
  const reportPath = `${output}.inventory.json`;
  writePrivateJson(reportPath, buildInventory(snapshot));
  console.log(JSON.stringify({ dryRun: false, operation: "capture", alias, recordCount: records.length, snapshot: resolve(output), redactedReport: resolve(reportPath) }, null, 2));
}

function inventory(options) {
  const input = requireOption(options, "input");
  const report = buildInventory(readJson(input));
  if (typeof options.output === "string") {
    writePrivateJson(options.output, report);
    console.log(JSON.stringify({ report: resolve(options.output), totalCount: report.totalCount }, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

export function validateMigrationPreflight({ source, destinationBefore, authorization, destinationId }) {
  if (!source.namespaceId || !destinationBefore.namespaceId) throw new Error("Both snapshots must contain private namespace identities");
  if (source.alias !== "source") throw new Error("Migration input must be a source capture");
  if (source.namespaceId === destinationId) throw new Error("Source and destination resolve to the same namespace; refusing copy migration");
  if (destinationBefore.namespaceId !== destinationId || authorization.namespaceId !== destinationId) {
    throw new Error("Destination config, pre-write snapshot, and authorization identify different namespaces");
  }
  if (destinationBefore.alias !== "staging" || authorization.alias !== "staging") {
    throw new Error("Pre-write snapshot and authorization must identify staging");
  }
  if (authorization.scope !== "non-production-rehearsal" || authorization.dashboardVerified !== true) {
    throw new Error("Authorization must independently attest a dashboard-verified non-production rehearsal target");
  }
  if (!hasStringFields(authorization, ["verifiedBy", "verifiedAt"]) || Number.isNaN(Date.parse(authorization.verifiedAt))) {
    throw new Error("Authorization must record the dashboard verifier and verification timestamp");
  }
  if (!Array.isArray(destinationBefore.records) || destinationBefore.records.length !== 0) {
    throw new Error("Destination must have a retained, empty pre-write snapshot; non-empty overwrite/merge is refused");
  }
}

export function validateLiveDestinationPreflight({ destinationBefore, liveDestination, destinationId }) {
  if (liveDestination.namespaceId !== destinationId || destinationBefore.namespaceId !== destinationId) {
    throw new Error("Live destination identity does not match the explicitly authorized namespace");
  }
  if (liveDestination.alias !== "staging") {
    throw new Error("Live destination preflight must identify staging");
  }
  if (!Array.isArray(liveDestination.records)) {
    throw new Error("Live destination preflight returned an invalid record listing");
  }
  const reconciliation = buildReconciliation(destinationBefore, liveDestination);
  if (liveDestination.records.length !== 0 || !reconciliation.matches) {
    throw new Error("Live destination changed since authorization or is non-empty; no write attempted");
  }
}

export function runLiveDestinationPreflight({ readLiveDestination, destinationBefore, destinationId }) {
  let liveDestination;
  try {
    liveDestination = readLiveDestination();
  } catch {
    throw new Error("Live destination preflight fetch failed; no write attempted");
  }
  validateLiveDestinationPreflight({ destinationBefore, liveDestination, destinationId });
  return liveDestination;
}

function migrate(options) {
  const input = requireOption(options, "input");
  const destinationAlias = requireOption(options, "destination-alias");
  const destinationConfig = requireOption(options, "destination-config");
  const destinationBeforePath = requireOption(options, "destination-before");
  const authorizationPath = requireOption(options, "authorization");
  const livePrewriteOutput = requireOption(options, "live-prewrite-output");
  const binding = typeof options.binding === "string" ? options.binding : "VFC_SUBMISSIONS";
  if (destinationAlias !== "staging") throw new Error("Automated migration is restricted to staging; production writes require a separate reviewed plan after approval");
  const snapshot = readJson(input);
  const destinationBefore = readJson(destinationBeforePath);
  const authorization = readJson(authorizationPath);
  const destinationId = extractNamespaceId(destinationConfig, binding);
  validateMigrationPreflight({ source: snapshot, destinationBefore, authorization, destinationId });
  const report = buildInventory(snapshot);
  const plan = { dryRun: !options.execute, operation: "migrate", sourceAlias: snapshot.alias, destinationAlias, recordCount: report.totalCount, categoryCounts: Object.fromEntries(CATEGORIES.map((name) => [name, report.categories[name].count])) };
  if (!options.execute) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  if (!options["writes-frozen"]) throw new Error("Execution requires --writes-frozen after disabling all staging writers");
  if (options.confirm !== "WRITE VERIFIED NON-PRODUCTION staging") throw new Error("Execution requires --confirm \"WRITE VERIFIED NON-PRODUCTION staging\"");
  const liveDestination = runLiveDestinationPreflight({
    destinationBefore,
    destinationId,
    readLiveDestination: () => {
      const listed = JSON.parse(wrangler(["kv", "key", "list", ...wranglerTargetArgs(destinationConfig, destinationId)]));
      if (!Array.isArray(listed)) throw new Error("Invalid Wrangler key listing");
      return {
        formatVersion: 1,
        alias: "staging",
        capturedAt: new Date().toISOString(),
        namespaceId: destinationId,
        records: listed.map((entry) => ({ key: entry.name, value: "" })),
      };
    },
  });
  writeNewPrivateJson(livePrewriteOutput, liveDestination);
  const bulkPath = `${input}.bulk-put.json`;
  writePrivateJson(bulkPath, snapshot.records);
  wrangler(["kv", "bulk", "put", resolve(bulkPath), ...wranglerTargetArgs(destinationConfig, destinationId)]);
  console.log(JSON.stringify({ ...plan, dryRun: false, livePrewriteCapture: resolve(livePrewriteOutput), bulkFile: resolve(bulkPath), reconciliationRequired: true }, null, 2));
}

function reconcile(options) {
  const source = readJson(requireOption(options, "source"));
  const destination = readJson(requireOption(options, "destination"));
  if (source.namespaceId && destination.namespaceId && source.namespaceId === destination.namespaceId && !options["same-namespace-stability-check"]) {
    throw new Error("Source and destination snapshots identify the same namespace; refusing misleading reconciliation");
  }
  const report = buildReconciliation(source, destination);
  if (typeof options.output === "string") {
    writePrivateJson(options.output, report);
    console.log(JSON.stringify({ report: resolve(options.output), matches: report.matches }, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  if (!report.matches) process.exitCode = 2;
}

function main(argv) {
  const { command, options } = parseArgs(argv);
  if (!command || command === "help" || options.help) return usage();
  if (command === "capture") return capture(options);
  if (command === "inventory") return inventory(options);
  if (command === "migrate") return migrate(options);
  if (command === "reconcile") return reconcile(options);
  throw new Error(`Unknown command: ${command}`);
}

const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`kv-cutover: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
