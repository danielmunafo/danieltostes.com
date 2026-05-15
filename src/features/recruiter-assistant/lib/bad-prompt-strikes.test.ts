import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY,
  RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY,
} from "../constants/recruiter-assistant";
import {
  parseStrikeStoreSnapshot,
  readBadPromptStrikeState,
  recordBadIntentRejection,
} from "./bad-prompt-strikes";

describe("bad-prompt-strikes", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    } as Storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("increments count and locks at max strikes", () => {
    expect(readBadPromptStrikeState()).toEqual({ count: 0, locked: false });
    recordBadIntentRejection();
    expect(readBadPromptStrikeState()).toEqual({ count: 1, locked: false });
    recordBadIntentRejection();
    expect(readBadPromptStrikeState()).toEqual({ count: 2, locked: false });
    recordBadIntentRejection();
    expect(readBadPromptStrikeState()).toEqual({
      count: 3,
      locked: true,
    });
    expect(store.get(RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY)).toBe("1");
    expect(store.get(RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY)).toBe("3");
  });

  it("parseStrikeStoreSnapshot derives lock from count or flag", () => {
    expect(parseStrikeStoreSnapshot("2:0")).toEqual({
      count: 2,
      locked: false,
    });
    expect(parseStrikeStoreSnapshot("3:0")).toEqual({ count: 3, locked: true });
    expect(parseStrikeStoreSnapshot("0:1")).toEqual({ count: 0, locked: true });
  });
});
