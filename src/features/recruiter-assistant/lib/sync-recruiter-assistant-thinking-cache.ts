import type { ThinkingSplit } from "./split-thinking-from-body";

/** Prefer live `split.thinking`; fall back to `cache` keyed by assistant `message.id`. */
export function mergedThinkingMarkdownForEvidence(
  messageId: string,
  split: ThinkingSplit,
  cache: ReadonlyMap<string, string>
): string {
  if (split.thinking.trim().length > 0) {
    return split.thinking;
  }

  const cachedThinking = cache.get(messageId);
  return cachedThinking?.trim() ? cachedThinking : "";
}

export function shouldMountEvidenceReviewPanel(
  split: ThinkingSplit,
  mergedThinkingMarkdown: string
): boolean {
  return split.hasThinking || mergedThinkingMarkdown.trim().length > 0;
}
