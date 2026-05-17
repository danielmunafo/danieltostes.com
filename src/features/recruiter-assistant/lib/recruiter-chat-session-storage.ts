import type { UIMessage } from "@ai-sdk/ui-utils";
import { RECRUITER_CHAT_SESSION_STORAGE_KEY } from "../constants/recruiter-assistant";

export const RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION = 1 as const;

export type RecruiterChatComposerExitPhase = "visible" | "exiting" | "hidden";

export type RecruiterChatSessionSnapshot = {
  readonly version: typeof RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION;
  readonly messages: UIMessage[];
  readonly input: string;
  readonly thinkingEvidenceByMessageId: Readonly<Record<string, string>>;
  readonly messagesScrollTop: number;
  readonly windowScrollY: number;
  readonly latestEvidencePanelOpen: boolean;
  readonly isLatestJobContextPanelOpen: boolean;
  readonly composerExitPhase: RecruiterChatComposerExitPhase;
};

type PersistedPayload = {
  version: number;
  messages: unknown;
  input?: unknown;
  thinkingEvidenceByMessageId?: unknown;
  messagesScrollTop?: unknown;
  windowScrollY?: unknown;
  latestEvidencePanelOpen?: unknown;
  isLatestJobContextPanelOpen?: unknown;
  composerExitPhase?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPersistedMessage(value: unknown): value is UIMessage {
  if (!isRecord(value)) return false;
  const { id, role } = value;
  if (typeof id !== "string" || id.length === 0) return false;
  if (role !== "user" && role !== "assistant" && role !== "system") {
    return false;
  }
  const hasContent =
    typeof value.content === "string" || value.content === undefined;
  const hasParts = Array.isArray(value.parts) || value.parts === undefined;
  return hasContent && hasParts;
}

function parseComposerExitPhase(
  value: unknown
): RecruiterChatComposerExitPhase | null {
  if (value === "visible" || value === "exiting" || value === "hidden") {
    return value;
  }
  return null;
}

function parseThinkingEvidenceRecord(
  value: unknown
): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries: Record<string, string> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof key !== "string" || key.length === 0) return null;
    if (typeof entryValue !== "string") return null;
    entries[key] = entryValue;
  }
  return entries;
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function parseRecruiterChatSessionSnapshot(
  raw: string
): RecruiterChatSessionSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as PersistedPayload;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.version !== RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION) {
    return null;
  }
  if (!Array.isArray(parsed.messages)) return null;
  if (!parsed.messages.every(isPersistedMessage)) return null;
  if (typeof parsed.input !== "string") return null;

  const thinkingEvidenceByMessageId = parseThinkingEvidenceRecord(
    parsed.thinkingEvidenceByMessageId
  );
  if (!thinkingEvidenceByMessageId) return null;

  const messagesScrollTop = parseNonNegativeNumber(parsed.messagesScrollTop);
  const windowScrollY = parseNonNegativeNumber(parsed.windowScrollY);
  const composerExitPhase = parseComposerExitPhase(parsed.composerExitPhase);
  if (
    messagesScrollTop === null ||
    windowScrollY === null ||
    composerExitPhase === null
  ) {
    return null;
  }
  if (typeof parsed.latestEvidencePanelOpen !== "boolean") return null;
  if (typeof parsed.isLatestJobContextPanelOpen !== "boolean") return null;

  return {
    version: RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION,
    messages: parsed.messages as UIMessage[],
    input: parsed.input,
    thinkingEvidenceByMessageId,
    messagesScrollTop,
    windowScrollY,
    latestEvidencePanelOpen: parsed.latestEvidencePanelOpen,
    isLatestJobContextPanelOpen: parsed.isLatestJobContextPanelOpen,
    composerExitPhase,
  };
}

export function readRecruiterChatSessionSnapshot(): RecruiterChatSessionSnapshot | null {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return null;
  try {
    const raw = window.sessionStorage.getItem(
      RECRUITER_CHAT_SESSION_STORAGE_KEY
    );
    if (!raw) return null;
    return parseRecruiterChatSessionSnapshot(raw);
  } catch {
    return null;
  }
}

export function writeRecruiterChatSessionSnapshot(
  snapshot: RecruiterChatSessionSnapshot
): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;
  try {
    window.sessionStorage.setItem(
      RECRUITER_CHAT_SESSION_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearRecruiterChatSessionSnapshot(): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;
  try {
    window.sessionStorage.removeItem(RECRUITER_CHAT_SESSION_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
