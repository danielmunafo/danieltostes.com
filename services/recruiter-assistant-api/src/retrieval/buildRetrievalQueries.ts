import { buildJdHardGateRetrievalQueries } from "../rag/hardGates/buildJdHardGateRetrievalQueries.js";

export function buildRetrievalQueries(userText: string): string[] {
  return [userText, ...buildJdHardGateRetrievalQueries(userText)];
}
