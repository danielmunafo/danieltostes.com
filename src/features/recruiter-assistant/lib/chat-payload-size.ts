/**
 * Mirrors `useChat` request message shaping (`sendExtraMessageFields` false)
 * and API `JSON.stringify(messages).length` in `handleChatRequest`.
 */

export type RecruiterChatRequestMessage = {
  readonly role: string;
  readonly content?: unknown;
  readonly parts?: readonly unknown[];
  readonly experimental_attachments?: unknown;
  readonly data?: unknown;
  readonly annotations?: unknown;
  readonly toolInvocations?: unknown;
};

type MessageLike = {
  readonly role: string;
  readonly content?: unknown;
  readonly parts?: readonly unknown[];
  readonly experimental_attachments?: unknown;
  readonly data?: unknown;
  readonly annotations?: unknown;
  readonly toolInvocations?: unknown;
};

export function toRecruiterRequestMessages(
  messages: readonly MessageLike[]
): RecruiterChatRequestMessage[] {
  return messages.map(
    ({
      role,
      content,
      experimental_attachments,
      data,
      annotations,
      toolInvocations,
      parts,
    }) => ({
      role,
      ...(content !== undefined ? { content } : {}),
      ...(experimental_attachments !== undefined
        ? { experimental_attachments }
        : {}),
      ...(data !== undefined ? { data } : {}),
      ...(annotations !== undefined ? { annotations } : {}),
      ...(toolInvocations !== undefined ? { toolInvocations } : {}),
      ...(parts !== undefined ? { parts } : {}),
    })
  );
}

/** Projected next user message as `useChat` `handleSubmit` builds it (content + parts). */
export function buildProjectedUserMessage(
  text: string
): RecruiterChatRequestMessage {
  return {
    role: "user",
    content: text,
    parts: [{ type: "text", text }],
  };
}

export function estimateRecruiterChatMessagesJsonChars(
  messages: readonly MessageLike[],
  nextUserText?: string
): number {
  const trimmed = nextUserText?.trim() ?? "";
  const payload = trimmed
    ? [
        ...toRecruiterRequestMessages(messages),
        buildProjectedUserMessage(trimmed),
      ]
    : toRecruiterRequestMessages(messages);
  return JSON.stringify(payload).length;
}

export function wouldExceedRecruiterChatHistoryLimit(
  messages: readonly MessageLike[],
  nextUserText: string,
  maxChars: number
): boolean {
  const trimmed = nextUserText.trim();
  if (!trimmed) return false;
  return estimateRecruiterChatMessagesJsonChars(messages, trimmed) > maxChars;
}
