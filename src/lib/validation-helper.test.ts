import { describe, expect, it } from "vitest";
import { validateBody } from "../../server/lib/validation-helper.js";

describe("validation helper", () => {
  it("accepts array fields used by session payloads", () => {
    const validated = validateBody(
      {
        segments: [{ id: "segment-1" }],
        audit_events: [{ id: "event-1" }],
      },
      {
        segments: { type: "array", required: true },
        audit_events: { type: "array", required: true },
      },
    );

    expect(validated).toEqual({
      segments: [{ id: "segment-1" }],
      audit_events: [{ id: "event-1" }],
    });
  });

  it("keeps string array validation strict", () => {
    const validated = validateBody(
      {
        tag_ids: ["tag-1", 2],
      },
      {
        tag_ids: { type: "string[]", required: true },
      },
    );

    expect(validated).toBeNull();
  });
});
