import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitFeedback } from "./recruiter-assistant-feedback";

const FEEDBACK_SESSION_KEY =
  "danieltostes.recruiterAssistant.feedbackSessionId.v1";

let fetchMock: ReturnType<typeof vi.fn>;

describe("submitFeedback", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(FEEDBACK_SESSION_KEY, "session-123");
    vi.stubEnv("NEXT_PUBLIC_RECRUITER_API_URL", "https://api.example/");
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it("sends the backend trace id as requestId and preserves the UI message id", async () => {
    await submitFeedback({
      requestId: "trace-123",
      messageId: "message-456",
      questionText: "Senior TypeScript role",
      responseText: "Briefing body",
      rating: "positive",
      locale: "en",
    });

    expect(fetchMock).toHaveBeenCalledOnce();

    const [, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    const body = JSON.parse(String(init?.body)) as Record<string, string>;

    expect(init?.method).toBe("POST");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/feedback",
      expect.any(Object)
    );
    expect(body).toMatchObject({
      requestId: "trace-123",
      messageId: "message-456",
      sessionId: "session-123",
      questionText: "Senior TypeScript role",
      responseText: "Briefing body",
      rating: "positive",
      locale: "en",
      schemaVersion: "2",
    });
    expect(body.questionHash).toHaveLength(16);
    expect(body.responseHash).toHaveLength(16);
  });
});
