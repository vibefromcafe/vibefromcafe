import { describe, expect, it } from "vitest";
import { parseEventInput } from "./event-validation";

const requiredFields = {
  title: "Test event",
  description: "Synthetic event for validation",
  date: "2099-01-02",
  time: "10:00",
  location: "Test cafe",
};

describe("parseEventInput", () => {
  it.each(["scheduled", "PUBLISHED", "", null])("rejects invalid status %j", (status) => {
    expect(parseEventInput({ ...requiredFields, status }, true)).toEqual({
      error: "status must be draft or published",
    });
  });

  it("does not infer publication when status is omitted", () => {
    expect(parseEventInput(requiredFields, true)).toMatchObject({ input: { status: undefined } });
  });

  it("accepts dedicated action URLs and rejects unsafe URL schemes", () => {
    expect(parseEventInput({
      ...requiredFields,
      status: "draft",
      detailsUrl: "https://example.com/details",
      mapUrl: "http://maps.example.com/place",
      registrationUrl: "javascript:alert(1)",
    }, true)).toEqual({ error: "registrationUrl must be an http or https URL" });
  });
});
