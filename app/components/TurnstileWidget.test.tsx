import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "./TurnstileWidget";

afterEach(() => {
  delete window.turnstile;
});

describe("TurnstileWidget", () => {
  it("renders the runtime site key with the endpoint-specific action and clears expired tokens", async () => {
    const renderWidget = vi.fn((
      _container: HTMLElement,
      _options: Parameters<NonNullable<Window["turnstile"]>["render"]>[1],
    ) => "widget-id");
    const removeWidget = vi.fn();
    const onToken = vi.fn();
    const onError = vi.fn();
    window.turnstile = { render: renderWidget, remove: removeWidget };

    const view = render(
      <TurnstileWidget
        siteKey="runtime-public-test-key"
        action="join"
        onToken={onToken}
        onError={onError}
      />,
    );
    await waitFor(() => expect(renderWidget).toHaveBeenCalledOnce());
    const options = renderWidget.mock.calls[0][1];

    expect(options).toMatchObject({ sitekey: "runtime-public-test-key", action: "join" });
    options.callback("synthetic-token");
    expect(onToken).toHaveBeenCalledWith("synthetic-token");
    options["expired-callback"]();
    expect(onToken).toHaveBeenLastCalledWith("");

    view.unmount();
    expect(removeWidget).toHaveBeenCalledWith("widget-id");
    expect(onError).not.toHaveBeenCalled();
  });
});
