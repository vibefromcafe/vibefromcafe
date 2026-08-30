import { describe, expect, it } from "vitest";
import { onRequestPost as createEvent } from "./admin/events/index";

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
  }
}

function request(body: Record<string, unknown>) {
  return new Request("https://example.com/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "synthetic-event",
      title: "Synthetic event",
      description: "Test only",
      date: "2099-01-02",
      time: "10:00",
      location: "Test cafe",
      ...body,
    }),
  });
}

async function invoke(body: Record<string, unknown>) {
  const kv = new MockKv();
  const response = await createEvent({
    request: request(body),
    env: { VFC_SUBMISSIONS: kv as unknown as KVNamespace },
    params: {},
    data: { adminActor: "operator@example.com" },
  } as unknown as Parameters<typeof createEvent>[0]);
  return { response, kv };
}

describe("admin event API", () => {
  it("creates an omitted status as draft with verified actor attribution", async () => {
    const { response, kv } = await invoke({});

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ event: { status: "draft" } });
    expect(kv.metadata.get("event:synthetic-event")).toMatchObject({ updatedBy: "operator@example.com" });
  });

  it("rejects an invalid status instead of publishing", async () => {
    const { response, kv } = await invoke({ status: "scheduled" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "status must be draft or published" });
    expect(kv.store.has("event:synthetic-event")).toBe(false);
  });
});
