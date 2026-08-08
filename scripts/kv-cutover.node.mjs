import assert from "node:assert/strict";
import test from "node:test";

import { buildInventory, buildReconciliation, categoryForKey, parseArgs, runLiveDestinationPreflight, validateLiveDestinationPreflight, validateMigrationPreflight, validateNoImplicitEnvironment } from "./kv-cutover.mjs";

// Kept outside Vitest's *.test.* glob because these tests use Node's test runner.

function snapshot(alias, records, namespaceId = `${alias}-namespace`) {
  return { formatVersion: 1, alias, capturedAt: "2026-07-18T00:00:00.000Z", namespaceId, records };
}

test("classifies the implemented and legacy tombstone prefixes separately", () => {
  assert.equal(categoryForKey("event-deleted:seed-1"), "event-deleted");
  assert.equal(categoryForKey("event_deleted:seed-1"), "event_deleted");
  assert.equal(categoryForKey("event:custom-1"), "event");
});

test("inventory reports only aggregate counts and hashes", () => {
  const report = buildInventory(snapshot("source", [
    { key: "submission:synthetic-id", value: JSON.stringify({ id: "synthetic-id", name: "Synthetic User", whatsapp: "synthetic-contact", invitationStatus: "pending" }) },
    { key: "event:event-1", value: JSON.stringify({ id: "different-id", status: "published" }) },
    { key: "event-deleted:seed-1", value: JSON.stringify({ deletedAt: "2026-01-01T00:00:00.000Z" }) },
    { key: "event_deleted:seed-2", value: "not-json" },
  ]));

  assert.equal(report.totalCount, 4);
  assert.equal(report.categories["event-deleted"].count, 1);
  assert.equal(report.categories.event_deleted.count, 1);
  assert.deepEqual(report.statuses.legacySubmission, { pending: 1 });
  assert.equal(report.malformed.invalidJson, 1);
  assert.equal(report.malformed.keyIdMismatch, 1);
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /Synthetic User|synthetic-contact|synthetic-id/);
});

test("redacts arbitrary status strings and reports binary records", () => {
  const report = buildInventory(snapshot("source", [
    { key: "submission:a", value: JSON.stringify({ id: "a", invitationStatus: "private-status-value" }) },
    { key: "event:b", value: "AAEC", base64: true },
  ]));
  assert.equal(report.statuses.unknownSubmissionCount, 1);
  assert.equal(report.malformed.nonUtf8, 1);
  assert.doesNotMatch(JSON.stringify(report), /private-status-value/);
});

test("reconciliation is order-independent and detects value drift", () => {
  const records = [
    { key: "event:a", value: JSON.stringify({ id: "a", status: "published" }) },
    { key: "submission:b", value: JSON.stringify({ id: "b", invitationStatus: "approved" }), metadata: { version: 1 } },
  ];
  assert.equal(buildReconciliation(snapshot("source", records), snapshot("staging", [...records].reverse())).matches, true);
  const changed = structuredClone(records);
  changed[1].value = JSON.stringify({ id: "b", invitationStatus: "rejected" });
  assert.equal(buildReconciliation(snapshot("source", records), snapshot("staging", changed)).matches, false);
});

test("argument parser keeps dry-run execution flags explicit", () => {
  assert.deepEqual(parseArgs(["migrate", "--input", "source.json", "--execute", "--confirm", "WRITE VERIFIED NON-PRODUCTION staging"]), {
    command: "migrate",
    options: { input: "source.json", execute: true, confirm: "WRITE VERIFIED NON-PRODUCTION staging" },
  });
});

test("migration preflight requires an empty independently authorized staging target", () => {
  const source = snapshot("source", [], "source-id");
  const destinationBefore = snapshot("staging", [], "staging-id");
  const authorization = { namespaceId: "staging-id", alias: "staging", scope: "non-production-rehearsal", dashboardVerified: true, verifiedBy: "operator", verifiedAt: "2026-07-18T00:00:00.000Z" };
  assert.doesNotThrow(() => validateMigrationPreflight({ source, destinationBefore, authorization, destinationId: "staging-id" }));
  assert.throws(() => validateMigrationPreflight({ source, destinationBefore: snapshot("staging", [{ key: "existing", value: "value" }], "staging-id"), authorization, destinationId: "staging-id" }), /empty pre-write snapshot/);
  assert.throws(() => validateMigrationPreflight({ source, destinationBefore, authorization, destinationId: "source-id" }), /same namespace/);
  assert.throws(() => validateMigrationPreflight({ source, destinationBefore, authorization: { ...authorization, dashboardVerified: false }, destinationId: "staging-id" }), /dashboard-verified/);
});

test("remote commands reject implicit Cloudflare environment selection", () => {
  assert.doesNotThrow(() => validateNoImplicitEnvironment({}));
  assert.throws(() => validateNoImplicitEnvironment({ CLOUDFLARE_ENV: "production" }), /must be unset/);
});

test("live preflight refuses a stale empty snapshot when destination is now non-empty", () => {
  const destinationBefore = snapshot("staging", [], "staging-id");
  const liveDestination = snapshot("staging", [{ key: "new-record", value: "" }], "staging-id");
  assert.throws(
    () => validateLiveDestinationPreflight({ destinationBefore, liveDestination, destinationId: "staging-id" }),
    /changed since authorization or is non-empty/,
  );
});

test("live preflight refuses destination identity drift", () => {
  assert.throws(
    () => validateLiveDestinationPreflight({
      destinationBefore: snapshot("staging", [], "staging-id"),
      liveDestination: snapshot("staging", [], "different-id"),
      destinationId: "staging-id",
    }),
    /identity does not match/,
  );
});

test("live preflight refuses malformed listing drift", () => {
  assert.throws(
    () => validateLiveDestinationPreflight({
      destinationBefore: snapshot("staging", [], "staging-id"),
      liveDestination: { ...snapshot("staging", [], "staging-id"), records: null },
      destinationId: "staging-id",
    }),
    /invalid record listing/,
  );
});

test("live preflight fails closed when destination fetch fails", () => {
  assert.throws(
    () => runLiveDestinationPreflight({
      readLiveDestination: () => { throw new Error("synthetic fetch failure"); },
      destinationBefore: snapshot("staging", [], "staging-id"),
      destinationId: "staging-id",
    }),
    /fetch failed; no write attempted/,
  );
});

test("live preflight accepts and returns an unchanged empty destination", () => {
  const liveDestination = snapshot("staging", [], "staging-id");
  assert.equal(runLiveDestinationPreflight({
    readLiveDestination: () => liveDestination,
    destinationBefore: snapshot("staging", [], "staging-id"),
    destinationId: "staging-id",
  }), liveDestination);
});
