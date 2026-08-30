import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import AdminEventsPage from "../routes/admin.events._index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("admin event deletion", () => {
  it("does not send DELETE until the operator confirms", async () => {
    const fetchMock = vi.fn(async () => Response.json({ events: [{
      id: "synthetic-event",
      title: "Synthetic event",
      description: "Test only",
      date: "2099-01-02",
      time: "10:00",
      location: "Test cafe",
      status: "draft",
      tags: [],
      createdAt: "2099-01-01T00:00:00.000Z",
    }] }));
    vi.stubGlobal("fetch", fetchMock);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MemoryRouter><AdminEventsPage /></MemoryRouter>);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Synthetic event"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("synthetic-event"), expect.objectContaining({ method: "DELETE" }));
  });
});
