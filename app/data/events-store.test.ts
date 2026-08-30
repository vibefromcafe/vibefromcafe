import { describe, expect, it } from "vitest";
import { getAllEvents, removeEvent, saveEvent } from "./events-store";
import type { Event } from "./types";

class MockKv {
  store = new Map<string, string>();
  metadata = new Map<string, unknown>();

  async get<T>(key: string, type?: "json" | "text") {
    const value = this.store.get(key);
    if (value === undefined) return null;
    return (type === "json" ? JSON.parse(value) : value) as T;
  }

  async put(key: string, value: string, options?: { metadata?: unknown }) {
    this.store.set(key, value);
    if (options?.metadata) this.metadata.set(key, options.metadata);
  }

  async delete(key: string) {
    this.store.delete(key);
    this.metadata.delete(key);
  }

  async list({ prefix }: { prefix: string }) {
    return {
      keys: [...this.store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
      cacheStatus: null,
    };
  }
}

function syntheticEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "synthetic-event",
    title: "Synthetic event",
    description: "Test only",
    date: "2099-01-02",
    time: "10:00",
    location: "Test cafe",
    status: "draft",
    tags: [],
    createdAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("events store", () => {
  it("fails closed for a stored event with an invalid status", async () => {
    const kv = new MockKv();
    kv.store.set("event:synthetic-event", JSON.stringify(syntheticEvent({ status: "invalid" as Event["status"] })));

    const events = await getAllEvents({ VFC_SUBMISSIONS: kv as unknown as KVNamespace });
    expect(events.find((event) => event.id === "synthetic-event")?.status).toBe("draft");
  });

  it("keeps verified actor attribution on writes and delete tombstones", async () => {
    const kv = new MockKv();
    const env = { VFC_SUBMISSIONS: kv as unknown as KVNamespace };
    await saveEvent(env, syntheticEvent(), "operator@example.com");

    expect(kv.metadata.get("event:synthetic-event")).toMatchObject({ updatedBy: "operator@example.com" });
    await expect(removeEvent(env, "synthetic-event", "operator@example.com")).resolves.toBe(true);
    expect(JSON.parse(kv.store.get("event-deleted:synthetic-event")!)).toMatchObject({
      deletedBy: "operator@example.com",
    });
  });
});
