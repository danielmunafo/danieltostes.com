import { describe, expect, it } from "vitest";
import {
  getFeedbackRequestIdForMessage,
  getRequestTraceIdFromAnnotations,
  REQUEST_TRACE_ANNOTATION_TYPE,
} from "./recruiter-assistant-trace-annotation";

describe("recruiter assistant trace annotations", () => {
  it("extracts the backend request trace id from message annotations", () => {
    expect(
      getRequestTraceIdFromAnnotations([
        { type: "other", requestId: "ignored" },
        { type: REQUEST_TRACE_ANNOTATION_TYPE, requestId: " trace-123 " },
      ])
    ).toBe("trace-123");
  });

  it("falls back to the UI message id when a trace annotation is absent", () => {
    expect(
      getFeedbackRequestIdForMessage({
        id: "message-123",
        annotations: [{ type: "other", requestId: "ignored" }],
      })
    ).toBe("message-123");
  });
});
