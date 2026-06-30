import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./join";

class MockKvNamespace {
  private readonly store = new Map<string, string>();

  async get<T>(key: string, type?: "json") {
    const value = this.store.get(key);
    if (!value) return null;
    return type === "json" ? JSON.parse(value) as T : value as T;
  }

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
    functionPath: "/api/join",
  } as unknown as Parameters<typeof onRequestPost>[0];
}

describe("join api", () => {
  it("stores successful submissions as invited when WhatsApp invite URL exists", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Immediate Invite",
            city: "Jogja",
            role: "Developer",
            whatsapp: "0812-3456-789",
            referralSource: "instagram",
          }),
        }),
        env: {
          VFC_SUBMISSIONS: kv,
          WHATSAPP_GROUP_INVITE_URL: "https://chat.whatsapp.com/vcfc-group",
          WHATSAPP_INVITE_MESSAGE_TEMPLATE: "Hi {{name}}, join {{group_link}}",
        },
      }),
    );

    const body = (await response.json()) as {
      success: boolean;
      submission: { id: string; invitationStatus: string };
      whatsappInvite: { groupInviteUrl: string };
    };
    const [[key, storedValue]] = kv.entries();
    const stored = JSON.parse(storedValue) as { id: string; invitationStatus: string; invited_at?: string };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.submission).toEqual({ id: stored.id, invitationStatus: "invited" });
    expect(body.whatsappInvite.groupInviteUrl).toBe("https://chat.whatsapp.com/vcfc-group");
    expect(key).toBe(`submission:${stored.id}`);
    expect(stored.invitationStatus).toBe("invited");
    expect(stored.invited_at).toBeTruthy();
  });

  it("keeps submissions signed_up when WhatsApp invite URL is missing", async () => {
    const kv = new MockKvNamespace();

    const response = await onRequestPost(
      createContext({
        request: new Request("https://example.com/api/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Missing Invite URL",
            city: "Jogja",
            role: "Developer",
            whatsapp: "0812-3456-789",
            referralSource: "instagram",
          }),
        }),
        env: {
          VFC_SUBMISSIONS: kv,
          WHATSAPP_GROUP_INVITE_URL: "",
        },
      }),
    );

    const body = (await response.json()) as { submission: { invitationStatus: string } };
    const [[, storedValue]] = kv.entries();
    const stored = JSON.parse(storedValue) as { invitationStatus: string; invited_at?: string };

    expect(response.status).toBe(200);
    expect(body.submission.invitationStatus).toBe("signed_up");
    expect(stored.invitationStatus).toBe("signed_up");
    expect(stored.invited_at).toBeUndefined();
  });
});
