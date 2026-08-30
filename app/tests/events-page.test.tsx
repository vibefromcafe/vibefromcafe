import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import EventsPage from "../routes/events._index";
import type { Event } from "../data/types";

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: "synthetic-event",
    title: "Synthetic event",
    description: "Test-only event details",
    date: "2099-01-02",
    time: "10:00",
    location: "Test cafe",
    status: "published",
    tags: [],
    createdAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(<MemoryRouter initialEntries={["/events#synthetic-event"]}><EventsPage /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("events page states", () => {
  it("shows upcoming actions, stable permalinks, and a past archive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ events: [
      event({
        detailsUrl: "https://example.com/details",
        mapUrl: "https://example.com/map",
        registrationUrl: "https://example.com/register",
      }),
      event({ id: "past-event", title: "Past synthetic event", date: "2000-01-02", registrationUrl: "https://example.com/old-register" }),
      event({ id: "draft-event", title: "Hidden draft", status: "draft" }),
    ] })));

    const { container } = renderPage();

    expect(await screen.findByRole("heading", { name: "Upcoming events" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "https://example.com/register");
    expect(screen.getByRole("link", { name: "Event details" })).toHaveAttribute("href", "https://example.com/details");
    expect(screen.getByRole("link", { name: "View map" })).toHaveAttribute("href", "https://example.com/map");
    expect(screen.getByRole("link", { name: "Permalink to Synthetic event" })).toHaveAttribute("href", "#synthetic-event");
    expect(container.querySelector("article#synthetic-event")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Past events" })).toBeInTheDocument();
    const pastCard = screen.getByText("Past synthetic event").closest("article");
    expect(pastCard).toBeInTheDocument();
    expect(pastCard?.querySelector('a[href="https://example.com/old-register"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden draft")).not.toBeInTheDocument();
  });

  it("shows an actionable empty upcoming state while retaining the archive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ events: [event({ date: "2000-01-02" })] })));
    renderPage();

    expect(await screen.findByText("No upcoming events are scheduled.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh events" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Past events" })).toBeInTheDocument();
  });

  it("reports API failures and retries instead of substituting seed data", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("service unavailable", { status: 503, headers: { "Content-Type": "text/plain" } }))
      .mockResolvedValueOnce(Response.json({ events: [] }));
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Events could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No upcoming events are scheduled.")).toBeInTheDocument();
  });
});
