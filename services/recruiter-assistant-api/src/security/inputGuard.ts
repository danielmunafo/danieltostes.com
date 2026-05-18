import { MAX_USER_MESSAGE_CHARS } from "../constants.js";

const INJECTION_PATTERNS: readonly RegExp[] = [
  /\bignore (all )?(previous|prior) instructions\b/i,
  /\bdisregard (the )?(above|prior)\b/i,
  /\byou are now\b/i,
  /\bnew instructions\b/i,
  /\bsystem prompt\b/i,
  /\breveal (your )?prompt\b/i,
  /\bbase64\b.*\bdecode\b/i,
  /\bjailbreak\b/i,
];

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type InputGuardResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

/**
 * Validates and normalizes user input: length, control chars, naive injection heuristics.
 */
export function runInputGuard(raw: string): InputGuardResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, reason: "too_long" };
  }
  if (CONTROL_CHAR_REGEX.test(trimmed)) {
    return { ok: false, reason: "invalid_chars" };
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: "blocked_pattern" };
    }
  }
  return { ok: true, text: trimmed };
}
