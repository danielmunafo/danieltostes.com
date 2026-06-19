import { CHAT_MODEL_PRICING, EMBEDDING_MODEL_PRICING } from "./pricing.js";

const TOKENS_PER_MILLION = 1_000_000;

/** Chat token usage shape (structurally compatible with AI SDK `LanguageModelUsage`). */
export type ChatTokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

/** Embedding token usage shape (structurally compatible with AI SDK `EmbeddingModelUsage`). */
export type EmbeddingTokenUsage = {
  tokens: number;
};

export type AnyTokenUsage = ChatTokenUsage | EmbeddingTokenUsage;

function safeTokens(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Estimated USD cost for a chat completion. Returns `null` for unknown models so
 * callers can record token usage without a misleading zero cost.
 */
export function estimateChatCostUSD(
  model: string,
  usage: ChatTokenUsage
): number | null {
  const pricing = CHAT_MODEL_PRICING[model];
  if (!pricing) return null;
  const promptTokens = safeTokens(usage.promptTokens);
  const completionTokens = safeTokens(usage.completionTokens);
  return (
    (promptTokens * pricing.inputPerMTokUSD +
      completionTokens * pricing.outputPerMTokUSD) /
    TOKENS_PER_MILLION
  );
}

/**
 * Estimated USD cost for an embedding call. Returns `null` for unknown models.
 */
export function estimateEmbeddingCostUSD(
  model: string,
  usage: EmbeddingTokenUsage
): number | null {
  const perMTokUSD = EMBEDDING_MODEL_PRICING[model];
  if (perMTokUSD === undefined) return null;
  return (safeTokens(usage.tokens) * perMTokUSD) / TOKENS_PER_MILLION;
}

/**
 * Dispatches to the chat or embedding estimator based on the usage shape.
 * Returns `null` for unknown models or unrecognized usage objects.
 */
export function estimateCostUSD(
  model: string,
  usage: AnyTokenUsage
): number | null {
  if ("promptTokens" in usage) {
    return estimateChatCostUSD(model, usage);
  }
  if ("tokens" in usage) {
    return estimateEmbeddingCostUSD(model, usage);
  }
  return null;
}
