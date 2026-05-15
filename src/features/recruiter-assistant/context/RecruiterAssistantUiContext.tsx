"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getServerStrikeStoreSnapshot,
  getStrikeStoreSnapshot,
  parseStrikeStoreSnapshot,
  subscribeStrikeStore,
} from "../lib/bad-prompt-strikes";

type RecruiterAssistantUiContextValue = {
  hasConversation: boolean;
  setHasConversation: (value: boolean) => void;
  /** True after max off-topic API rejections (see `bad-prompt-strikes` localStorage). */
  assistantLocked: boolean;
  /** Current off-topic strike count (same source as localStorage). */
  badPromptStrikeCount: number;
};

const RecruiterAssistantUiContext =
  createContext<RecruiterAssistantUiContextValue | null>(null);

export function RecruiterAssistantUiProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hasConversation, setHasConversationState] = useState(false);
  const setHasConversation = useCallback((value: boolean) => {
    setHasConversationState(value);
  }, []);

  const strikeRaw = useSyncExternalStore(
    subscribeStrikeStore,
    getStrikeStoreSnapshot,
    getServerStrikeStoreSnapshot
  );
  const { locked: assistantLocked, count: badPromptStrikeCount } =
    parseStrikeStoreSnapshot(strikeRaw);

  useEffect(() => {
    if (!assistantLocked) return;
    void Promise.resolve().then(() => {
      setHasConversationState(false);
    });
  }, [assistantLocked]);

  const value = useMemo(
    () => ({
      hasConversation,
      setHasConversation,
      assistantLocked,
      badPromptStrikeCount,
    }),
    [hasConversation, setHasConversation, assistantLocked, badPromptStrikeCount]
  );

  return (
    <RecruiterAssistantUiContext.Provider value={value}>
      {children}
    </RecruiterAssistantUiContext.Provider>
  );
}

export function useRecruiterAssistantUi(): RecruiterAssistantUiContextValue {
  const context = useContext(RecruiterAssistantUiContext);
  if (context === null) {
    throw new Error(
      "useRecruiterAssistantUi must be used within RecruiterAssistantUiProvider"
    );
  }
  return context;
}
