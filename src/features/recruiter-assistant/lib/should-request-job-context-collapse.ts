import { THINKING_OPEN_MARKER } from "./split-thinking-from-body";

type ChatMessageRole = "user" | "assistant" | "system" | "data";

type CollapseTimingMessage = {
  readonly id: string;
  readonly role: ChatMessageRole | string;
};

function findLastUserMessageIndex(
  messages: readonly CollapseTimingMessage[]
): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return i;
  }
  return -1;
}

/**
 * Job context stays expanded while the latest user JD is awaiting the assistant
 * row (`submitted` / early `streaming`) and until the streamed assistant text
 * contains `[[THINKING_START]]` (evidence brief stream has begun). Older user
 * turns stay collapsed.
 */
export function shouldRequestJobContextCollapse(
  messages: readonly CollapseTimingMessage[],
  messageId: string,
  chatStatus: string,
  followingAssistantPlainText: string | null
): boolean {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1) return true;
  const message = messages[index];
  if (message?.role !== "user") return true;

  const lastUserIndex = findLastUserMessageIndex(messages);
  const isLatestUserMessage = index === lastUserIndex;

  if (!isLatestUserMessage) {
    return true;
  }

  const hasAssistantImmediatelyAfter =
    messages[index + 1]?.role === "assistant";

  if (!hasAssistantImmediatelyAfter) {
    // Keep expanded while waiting on the API or after a failed turn (no assistant row).
    return false;
  }

  if (chatStatus !== "streaming" && chatStatus !== "submitted") {
    return true;
  }

  const plain = followingAssistantPlainText ?? "";
  return plain.includes(THINKING_OPEN_MARKER);
}
