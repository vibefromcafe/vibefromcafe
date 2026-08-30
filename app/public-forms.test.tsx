import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "./routes/contact";
import JoinPage from "./routes/join";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public form privacy UI", () => {
  it.each([
    ["join", JoinPage, "I agree that VFC may use my WhatsApp number and submitted details for community onboarding and related follow-up."],
    ["contact", ContactPage, "I agree that VFC may use my contact details and message to respond to this project inquiry."],
  ] as const)("loads the runtime privacy channel and explicit consent on %s", async (_name, Page, consentLabel) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      privacyRequestUrl: "https://privacy.example.invalid/request",
      turnstileSiteKey: null,
    })));

    const view = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );

    const privacyLink = await screen.findByRole("link", { name: "Request access, correction, or deletion." });
    expect(privacyLink).toHaveAttribute("href", "https://privacy.example.invalid/request");
    expect(screen.getByRole("checkbox", { name: consentLabel })).toBeRequired();
    expect(view.container.textContent).toContain("VFC");
    expect(view.container.textContent).not.toContain("VCFC");
  });
});
