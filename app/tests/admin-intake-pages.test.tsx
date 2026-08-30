import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import AdminInquiriesPage from "../routes/admin.inquiries";
import AdminSubmissionsPage from "../routes/admin";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("admin intake pages", () => {
  it("sends only changed inquiry fields for safe triage", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ inquiries: [{
        id: "lead-1",
        name: "Synthetic Lead",
        contact: "lead@example.invalid",
        message: "Synthetic inquiry",
        status: "new",
        allowedNextStatuses: ["new", "contacted", "closed", "spam"],
        createdAt: "2026-08-30T00:00:00.000Z",
      }], nextCursor: null }))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ inquiries: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><AdminInquiriesPage /></MemoryRouter>);

    const user = userEvent.setup();
    const status = await screen.findByLabelText("Triage status");
    await user.selectOptions(status, "contacted");
    expect(status).toHaveValue("contacted");
    await user.click(screen.getByRole("button", { name: "Save triage and corrections" }));

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/inquiries/lead-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "contacted" }),
    }));
  });

  it("requires named confirmation before invoking privacy deletion", async () => {
    const fetchMock = vi.fn(async () => Response.json({ submissions: [{
      id: "member-1",
      name: "Synthetic Member",
      city: "Jogja",
      role: "Builder",
      whatsapp: "+62 812 3456 7890",
      referralSource: "github",
      invitationStatus: "signed_up",
      allowedNextStatuses: ["signed_up", "invited"],
      createdAt: "2026-08-30T00:00:00.000Z",
    }], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MemoryRouter><AdminSubmissionsPage /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: "Complete verified deletion" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Synthetic Member"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("privacy/submission"), expect.anything());
  });
});
