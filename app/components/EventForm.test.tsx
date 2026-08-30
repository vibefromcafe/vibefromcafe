import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";
import type { Event } from "../data/types";

const initialEvent: Event = {
  id: "synthetic-event",
  title: "Synthetic event",
  description: "Test-only event",
  date: "2099-01-02",
  time: "10:00",
  location: "Test cafe",
  status: "draft",
  tags: [],
  createdAt: "2099-01-01T00:00:00.000Z",
};

afterEach(cleanup);

describe("EventForm", () => {
  it.each([
    ["Save as draft", "draft"],
    ["Publish event", "published"],
  ] as const)("submits the explicit %s intent", async (button, status) => {
    const onSubmit = vi.fn(async () => undefined);
    render(<EventForm initialValue={initialEvent} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: button }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });
});
