let flushRecruiterChatSessionHandler: (() => void) | undefined;

/** Registers a flush callback from `RecruiterChat` (client-only). */
export function registerRecruiterChatSessionFlush(handler: () => void): void {
  flushRecruiterChatSessionHandler = handler;
}

export function unregisterRecruiterChatSessionFlush(): void {
  flushRecruiterChatSessionHandler = undefined;
}

/** Persists chat state immediately before in-app navigation away from home. */
export function flushRecruiterChatSession(): void {
  flushRecruiterChatSessionHandler?.();
}
