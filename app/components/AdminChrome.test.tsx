import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminFrame } from "./AdminChrome";

describe("AdminFrame", () => {
  it("removes the admin secret persisted by the legacy browser UI", async () => {
    window.localStorage.setItem("vcfc-admin-secret", "legacy-secret");

    render(
      <MemoryRouter>
        <AdminFrame title="Admin" intro="Security test">
          content
        </AdminFrame>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("vcfc-admin-secret")).toBeNull();
    });
  });
});
