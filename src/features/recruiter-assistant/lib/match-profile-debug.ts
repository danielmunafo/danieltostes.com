const MATCH_PROFILE_DEBUG_PREFIX = "[recruiter-match-profile]";

const isMatchProfileDebugEnabled = (): boolean =>
  process.env.NODE_ENV === "development";

/** Dev-only client logs for match profile marker parsing and render gating. */
export function logMatchProfileClientDebug(
  event: string,
  fields?: Record<string, unknown>
): void {
  if (!isMatchProfileDebugEnabled()) return;
  if (fields) {
    console.debug(MATCH_PROFILE_DEBUG_PREFIX, event, fields);
  } else {
    console.debug(MATCH_PROFILE_DEBUG_PREFIX, event);
  }
}
