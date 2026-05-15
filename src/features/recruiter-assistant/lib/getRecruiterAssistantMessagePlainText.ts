/**
 * Builds the full streamed assistant string for recruiter UI parsing.
 *
 * The AI SDK may split model output across interleaved `parts` entries
 * (`text` vs `reasoning`). Joining only `text` drops evidence content and
 * breaks `[[THINKING_*]]` / chart marker detection after the stream finishes.
 */
export function getRecruiterAssistantMessagePlainText(message: {
  readonly content?: unknown;
  readonly reasoning?: unknown;
  readonly parts?: readonly {
    readonly type?: string;
    readonly text?: string;
    readonly reasoning?: string;
  }[];
}): string {
  const parts = message.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const joined = parts
      .map((part) => {
        if (part.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        if (part.type === "reasoning" && typeof part.reasoning === "string") {
          return part.reasoning;
        }
        return "";
      })
      .join("");

    if (joined) {
      return joined;
    }
  }

  if (typeof message.content === "string") {
    const reasoning =
      typeof message.reasoning === "string" ? message.reasoning : "";
    return reasoning.length > 0
      ? `${reasoning}${message.content}`
      : message.content;
  }

  return "";
}
