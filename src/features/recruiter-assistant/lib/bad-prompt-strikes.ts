import {
  RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY,
  RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY,
  RECRUITER_BAD_PROMPT_MAX_STRIKES,
  RECRUITER_BAD_PROMPT_STRIKE_EVENT,
} from "../constants/recruiter-assistant";

export type BadPromptStrikeState = {
  readonly count: number;
  readonly locked: boolean;
};

function parseCount(raw: string | null): number {
  const n = parseInt(raw ?? "0", 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, 999);
}

/**
 * Reads strike count and lock flag from `localStorage` (client only).
 */
export function readBadPromptStrikeState(): BadPromptStrikeState {
  if (typeof window === "undefined") {
    return { count: 0, locked: false };
  }
  try {
    const lockedFlag = window.localStorage.getItem(
      RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY
    );
    const count = parseCount(
      window.localStorage.getItem(RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY)
    );
    const locked =
      lockedFlag === "1" || count >= RECRUITER_BAD_PROMPT_MAX_STRIKES;
    return { count, locked };
  } catch {
    return { count: 0, locked: false };
  }
}

/**
 * Snapshot string for `useSyncExternalStore` (count + lock bit).
 */
export function getStrikeStoreSnapshot(): string {
  const s = readBadPromptStrikeState();
  return `${s.count}:${s.locked ? 1 : 0}`;
}

export function getServerStrikeStoreSnapshot(): string {
  return "0:0";
}

export function parseStrikeStoreSnapshot(raw: string): BadPromptStrikeState {
  const [countPart, lockedPart] = raw.split(":");
  const count = parseCount(countPart ?? "0");
  const lockedFromFlag = lockedPart === "1";
  const locked = lockedFromFlag || count >= RECRUITER_BAD_PROMPT_MAX_STRIKES;
  return { count, locked };
}

export function subscribeStrikeStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onStoreChange();
  window.addEventListener(RECRUITER_BAD_PROMPT_STRIKE_EVENT, handler);
  return () => {
    window.removeEventListener(RECRUITER_BAD_PROMPT_STRIKE_EVENT, handler);
  };
}

/**
 * Increments the off-topic strike counter and sets the lock flag at the max.
 * Dispatches {@link RECRUITER_BAD_PROMPT_STRIKE_EVENT} so subscribers refresh.
 */
export function recordBadIntentRejection(): BadPromptStrikeState {
  if (typeof window === "undefined") {
    return { count: 0, locked: false };
  }
  try {
    const nextCount =
      parseCount(
        window.localStorage.getItem(RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY)
      ) + 1;
    window.localStorage.setItem(
      RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY,
      String(nextCount)
    );
    const locked = nextCount >= RECRUITER_BAD_PROMPT_MAX_STRIKES;
    if (locked) {
      window.localStorage.setItem(RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY, "1");
    }
    window.dispatchEvent(new Event(RECRUITER_BAD_PROMPT_STRIKE_EVENT));
    return { count: nextCount, locked };
  } catch {
    return readBadPromptStrikeState();
  }
}
