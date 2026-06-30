import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./contact";

class MockKvNamespace {
  private readonly store = new Map<string, string>();

  async put(key: string, value: string) {
    this.store.set(key, value);
  }

  entries() {
    return [...this.store.entries()];
  }
}

function createContext({ request, env }: { request: Request; env: Record<string, unknown> }) {
  return {
    request,
    env,
    params: {},
    data: {},
    next: vi.fn(),
    waitUntil: vi.fn(),
    functionPath: "/api/contact",
  } as unknown as Parameters<typeof onRequestPost>[0];
}

describe("contact api", () => {
  it("stores project inquiries under the inquiry prefix", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Project Lead",
            contact: "lead@example.com",
            message: "We need an AI support workflow.",
          }),
        }),
        env: { VFC_SUBMISSIONS: kv },
      }),
    );

    const body = (await response.json()) as { success: boolean; inquiry: { id: string; status: string } };
    const [[key, storedValue]] = kv.entries();
    const stored = JSON.parse(storedValue) as { id: string; status: string; message: string };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.inquiry.status).toBe("new");
    expect(key).toBe(`inquiry:${stored.id}`);
    expect(stored.message).toBe("We need an AI support workflow.");
  });

  it("rejects missing required fields", async () => {
    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Project Lead" }),
        }),
        env: { VFC_SUBMISSIONS: new MockKvNamespace() },
      }),
    );

    expect(response.status).toBe(400);
  });
});
