import type { Message } from "ai";

type MessageWithParts = Message & { readonly parts?: unknown };

function joinTextPartsFromPartsArray(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const part of parts) {
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      (part as { type: string }).type === "text" &&
      "text" in part &&
      typeof (part as { text: unknown }).text === "string"
    ) {
      texts.push((part as { text: string }).text);
    }
  }
  return texts.join("\n");
}

function joinTextPartsFromContentArray(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const part of content) {
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      (part as { type: string }).type === "text" &&
      "text" in part &&
      typeof (part as { text: unknown }).text === "string"
    ) {
      texts.push((part as { text: string }).text);
    }
  }
  return texts.join("\n");
}

/**
 * Latest user turn as plain text. Prefer `parts` (AI SDK UI / `useChat`) when present
 * so intent gate and RAG match what the UI shows; `content` alone can be stale on follow-ups.
 */
export function getLastUserText(messages: readonly Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as MessageWithParts;
    if (m.role !== "user") continue;

    const fromParts = joinTextPartsFromPartsArray(m.parts).trim();
    if (fromParts.length > 0) {
      return fromParts;
    }

    if (typeof m.content === "string") {
      const trimmed = m.content.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    const fromContentArray = joinTextPartsFromContentArray(m.content).trim();
    if (fromContentArray.length > 0) {
      return fromContentArray;
    }
  }
  return "";
}
