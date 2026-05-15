/**
 * Sentinel markers wrapping the evidence brief in the streamed assistant
 * response. Kept in sync with `THINKING_OPEN_MARKER` / `THINKING_CLOSE_MARKER`
 * in the recruiter-assistant API; values must match exactly.
 */
export const THINKING_OPEN_MARKER = "[[THINKING_START]]";
export const THINKING_CLOSE_MARKER = "[[THINKING_END]]";

export interface ThinkingSplit {
  /** Brief content between the open and (optional) close markers, trimmed. */
  readonly thinking: string;
  /** The remaining assistant text (pitch + references), trimmed. */
  readonly body: string;
  /**
   * True when the open marker has been seen but the close marker has not yet
   * arrived — the brief is still streaming.
   */
  readonly isThinkingStreaming: boolean;
  /** True when at least the open marker has been seen. */
  readonly hasThinking: boolean;
}

/**
 * Splits a streamed assistant message into the evidence-brief "thinking"
 * portion and the main pitch body, based on sentinel markers emitted by the
 * recruiter-assistant API. Designed to be safe to call on partial streams.
 */
export function splitThinkingFromBody(text: string): ThinkingSplit {
  const openIdx = text.indexOf(THINKING_OPEN_MARKER);
  if (openIdx === -1) {
    return {
      thinking: "",
      body: text,
      isThinkingStreaming: false,
      hasThinking: false,
    };
  }

  const afterOpen = openIdx + THINKING_OPEN_MARKER.length;
  const closeIdx = text.indexOf(THINKING_CLOSE_MARKER, afterOpen);
  const beforeOpen = text.slice(0, openIdx);

  if (closeIdx === -1) {
    return {
      thinking: text.slice(afterOpen).trim(),
      body: beforeOpen.trim(),
      isThinkingStreaming: true,
      hasThinking: true,
    };
  }

  const afterClose = closeIdx + THINKING_CLOSE_MARKER.length;
  const prefix = beforeOpen.trim();
  const suffix = text.slice(afterClose).trim();
  const body =
    prefix.length > 0 && suffix.length > 0
      ? `${prefix}\n\n${suffix}`
      : `${prefix}${suffix}`.trim();
  return {
    thinking: text.slice(afterOpen, closeIdx).trim(),
    body,
    isThinkingStreaming: false,
    hasThinking: true,
  };
}
