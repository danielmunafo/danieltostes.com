import { getRecruiterApiBaseUrl } from "./api-url";

export type FeedbackReason =
  | "wrong_fit"
  | "off_topic"
  | "missing_context"
  | "too_long"
  | "other";

const FEEDBACK_SESSION_KEY =
  "danieltostes.recruiterAssistant.feedbackSessionId.v1";

function getFeedbackSessionId(): string {
  if (typeof sessionStorage === "undefined") return "unknown";
  let id = sessionStorage.getItem(FEEDBACK_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(FEEDBACK_SESSION_KEY, id);
  }
  return id;
}

async function sha256Hex16(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export type SubmitFeedbackParams = {
  messageId: string;
  questionText: string;
  responseText: string;
  rating: "positive" | "negative";
  reason?: FeedbackReason;
  comment?: string;
  locale: string;
};

export async function submitFeedback(
  params: SubmitFeedbackParams
): Promise<void> {
  const {
    messageId,
    questionText,
    responseText,
    rating,
    reason,
    comment,
    locale,
  } = params;

  const [questionHash, responseHash] = await Promise.all([
    sha256Hex16(questionText),
    sha256Hex16(responseText),
  ]);

  const body: Record<string, string> = {
    requestId: messageId,
    sessionId: getFeedbackSessionId(),
    timestamp: new Date().toISOString(),
    questionHash,
    responseHash,
    questionText,
    responseText,
    rating,
    locale,
    schemaVersion: "2",
  };
  if (reason) body.reason = reason;
  if (comment) body.comment = comment;

  const base = getRecruiterApiBaseUrl();
  await fetch(`${base}/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
