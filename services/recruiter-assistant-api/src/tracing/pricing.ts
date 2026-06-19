/**
 * OpenAI list-price estimates (USD per 1,000,000 tokens), captured 2026-06.
 *
 * These power the `costUSD` field in request traces only; they are estimates for
 * operational visibility, not billing-accurate figures. Update here when prices
 * change or when a new chat/embedding model is configured via env.
 */

export type ChatModelPricing = {
  inputPerMTokUSD: number;
  outputPerMTokUSD: number;
};

/** Chat models priced separately for input (prompt) and output (completion) tokens. */
export const CHAT_MODEL_PRICING: Readonly<Record<string, ChatModelPricing>> = {
  "gpt-4.1-nano": { inputPerMTokUSD: 0.1, outputPerMTokUSD: 0.4 },
  "gpt-4.1-mini": { inputPerMTokUSD: 0.4, outputPerMTokUSD: 1.6 },
  "gpt-4o-mini": { inputPerMTokUSD: 0.15, outputPerMTokUSD: 0.6 },
  // Verify against https://openai.com/api/pricing when this model is in use.
  "gpt-5.4-mini": { inputPerMTokUSD: 0.4, outputPerMTokUSD: 1.6 },
};

/** Embedding models priced per token (input only). */
export const EMBEDDING_MODEL_PRICING: Readonly<Record<string, number>> = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
};
