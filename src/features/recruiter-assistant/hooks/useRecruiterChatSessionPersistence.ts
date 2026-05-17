import type { UIMessage } from "@ai-sdk/ui-utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import {
  registerRecruiterChatSessionFlush,
  unregisterRecruiterChatSessionFlush,
} from "../lib/recruiter-chat-session-flush";
import {
  clearRecruiterChatSessionSnapshot,
  readRecruiterChatSessionSnapshot,
  RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION,
  writeRecruiterChatSessionSnapshot,
  type RecruiterChatComposerExitPhase,
  type RecruiterChatSessionSnapshot,
} from "../lib/recruiter-chat-session-storage";

const PERSIST_DEBOUNCE_MS = 300;

type UseRecruiterChatSessionPersistenceParams = {
  readonly sessionBoot: RecruiterChatSessionSnapshot | null;
  readonly messages: UIMessage[];
  readonly input: string;
  readonly isBusy: boolean;
  readonly thinkingEvidenceMarkdownByMessageId: ReadonlyMap<string, string>;
  readonly latestEvidencePanelOpen: boolean;
  readonly isLatestJobContextPanelOpen: boolean;
  readonly composerExitPhase: RecruiterChatComposerExitPhase;
  readonly messagesScrollRef: RefObject<HTMLDivElement | null>;
  readonly assistantLocked: boolean;
};

export function readRecruiterChatSessionBoot(): RecruiterChatSessionSnapshot | null {
  return readRecruiterChatSessionSnapshot();
}

export function thinkingEvidenceMapFromSessionBoot(
  boot: RecruiterChatSessionSnapshot | null
): Map<string, string> {
  if (!boot) return new Map();
  return new Map(Object.entries(boot.thinkingEvidenceByMessageId));
}

export function useRecruiterChatSessionPersistence({
  sessionBoot,
  messages,
  input,
  isBusy,
  thinkingEvidenceMarkdownByMessageId,
  latestEvidencePanelOpen,
  isLatestJobContextPanelOpen,
  composerExitPhase,
  messagesScrollRef,
  assistantLocked,
}: UseRecruiterChatSessionPersistenceParams): void {
  const didRestoreScrollRef = useRef(false);

  const buildSnapshot = useCallback((): RecruiterChatSessionSnapshot | null => {
    if (messages.length === 0) return null;
    const messagesScrollTop = messagesScrollRef.current?.scrollTop ?? 0;
    const isWindowUndefined = typeof window === "undefined";
    const windowScrollY = isWindowUndefined ? 0 : window.scrollY;
    const thinkingEvidenceByMessageId: Record<string, string> = {};
    for (const [messageId, markdown] of thinkingEvidenceMarkdownByMessageId) {
      thinkingEvidenceByMessageId[messageId] = markdown;
    }
    return {
      version: RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION,
      messages,
      input,
      thinkingEvidenceByMessageId,
      messagesScrollTop,
      windowScrollY,
      latestEvidencePanelOpen,
      isLatestJobContextPanelOpen,
      composerExitPhase,
    };
  }, [
    composerExitPhase,
    input,
    isLatestJobContextPanelOpen,
    latestEvidencePanelOpen,
    messages,
    messagesScrollRef,
    thinkingEvidenceMarkdownByMessageId,
  ]);

  const persistSession = useCallback(() => {
    if (assistantLocked) {
      clearRecruiterChatSessionSnapshot();
      return;
    }
    const snapshot = buildSnapshot();
    if (!snapshot) {
      clearRecruiterChatSessionSnapshot();
      return;
    }
    writeRecruiterChatSessionSnapshot(snapshot);
  }, [assistantLocked, buildSnapshot]);

  useLayoutEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (!sessionBoot || messages.length === 0) return;

    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTop = sessionBoot.messagesScrollTop;
    }
    const isWindowUndefined = typeof window === "undefined";
    if (!isWindowUndefined && sessionBoot.windowScrollY > 0) {
      window.scrollTo(0, sessionBoot.windowScrollY);
    }
    didRestoreScrollRef.current = true;
  }, [messages.length, messagesScrollRef, sessionBoot]);

  useEffect(() => {
    registerRecruiterChatSessionFlush(persistSession);
    return () => unregisterRecruiterChatSessionFlush();
  }, [persistSession]);

  useEffect(() => {
    if (assistantLocked) {
      clearRecruiterChatSessionSnapshot();
      return;
    }
    if (isBusy) return;

    const timeoutId = window.setTimeout(persistSession, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    assistantLocked,
    composerExitPhase,
    input,
    isBusy,
    isLatestJobContextPanelOpen,
    latestEvidencePanelOpen,
    messages,
    persistSession,
    thinkingEvidenceMarkdownByMessageId,
  ]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || messages.length === 0) return;

    let scrollTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (scrollTimeoutId !== undefined) {
        window.clearTimeout(scrollTimeoutId);
      }
      scrollTimeoutId = window.setTimeout(persistSession, PERSIST_DEBOUNCE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollTimeoutId !== undefined) {
        window.clearTimeout(scrollTimeoutId);
      }
    };
  }, [messages.length, messagesScrollRef, persistSession]);
}
