/** Pixels of scroll over which the chat hero fades for the parallax handoff. */
export const CHAT_HERO_FADE_DISTANCE_PX = 480;

/**
 * Sticky top bar height (MUI default `Toolbar`) for assistant viewport height math.
 */
export const CHAT_HERO_TOPBAR_OFFSET_XS_PX = 56;
export const CHAT_HERO_TOPBAR_OFFSET_MD_PX = 64;

/** Max width for the recruiter chat column (common assistant UI width). */
export const RECRUITER_CHAT_MAX_WIDTH_PX = 768;

/**
 * Max height of the evidence-review markdown body while the stream is active.
 * Inner scroll keeps the chat log from growing and avoids constant auto-scroll jumps.
 */
export const RECRUITER_EVIDENCE_REVIEW_STREAMING_MAX_HEIGHT_PX = 320;

/**
 * sessionStorage key: user accepted feature terms for the recruiter assistant
 */
export const RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY =
  "danieltostes.recruiterAssistant.termsAccepted.v4" as const;

/**
 * localStorage: incremented when the API rejects input as off-topic / not recruiting
 * (`off_topic`, `intent_unclear`). At `RECRUITER_BAD_PROMPT_MAX_STRIKES`, the assistant locks out.
 */
export const RECRUITER_BAD_PROMPT_COUNT_STORAGE_KEY =
  "danieltostes.recruiterAssistant.badPromptCount.v1" as const;

/** localStorage flag set when bad-prompt strikes reach the max (assistant disabled). */
export const RECRUITER_ASSISTANT_LOCKED_STORAGE_KEY =
  "danieltostes.recruiterAssistant.locked.v1" as const;

/** After this many rejected non-recruiting prompts, the assistant disables until storage is cleared. */
export const RECRUITER_BAD_PROMPT_MAX_STRIKES = 3;

/** Dispatched on `window` after the bad-prompt counter changes (same tab). */
export const RECRUITER_BAD_PROMPT_STRIKE_EVENT =
  "danieltostes:recruiterAssistantBadPromptUpdated" as const;

/** Max width for the prompt composer (matches chat column on GPT-style layouts). */
export const RECRUITER_COMPOSER_MAX_WIDTH_PX = 768;

/** Composer corner radius — ChatGPT-like rounded rectangle (px). */
export const RECRUITER_COMPOSER_BORDER_RADIUS_PX = 24;

/**
 * Uniform inner padding (px) for the expanded composer (JD paste).
 * Compact single-line bar uses `RECRUITER_COMPOSER_COMPACT_INNER_PADDING_PX`.
 */
export const RECRUITER_COMPOSER_INNER_PADDING_PX = 14;

/** Uniform inner padding (px) for the compact (post-message) composer bar. */
export const RECRUITER_COMPOSER_COMPACT_INNER_PADDING_PX = 10;

/** Max height of the scrollable prompt field only (px), excluding the footer row. */
export const RECRUITER_COMPOSER_INPUT_MAX_HEIGHT_PX = 120;

/**
 * Visible `<textarea rows>` for the expanded JD field. Native rows avoid MUI
 * TextareaAutosize (layout-dependent measurement and 0-width first paint).
 * Keep consistent with `RECRUITER_COMPOSER_INPUT_MAX_HEIGHT_PX` (~line height × rows).
 */
export const RECRUITER_COMPOSER_EXPANDED_ROWS = 5;

/** Pixels of window scroll over which the “scroll for more” cue fades out. */
export const ASSISTANT_SCROLL_CUE_FADE_DISTANCE_PX = 160;

/**
 * Caps cue opacity at scroll 0 (multiplied with the scroll-based fade). Keeps the
 * control discrete on first paint; still fades to zero over `ASSISTANT_SCROLL_CUE_FADE_DISTANCE_PX`.
 */
export const ASSISTANT_SCROLL_CUE_MAX_OPACITY = 0.52;

/**
 * Alpha of the scroll-down chevron glyph at scroll position 0 (0-1). Disk uses its
 * own fill/border alphas; overall visibility still uses `ASSISTANT_SCROLL_CUE_MAX_OPACITY`.
 */
export const ASSISTANT_SCROLL_CUE_CHEVRON_OPACITY = 0.45;

/** Vertical nudge for the chevron inside the cue (px); negative moves up. */
export const ASSISTANT_SCROLL_CUE_CHEVRON_OFFSET_Y_PX = -5;

/** Frosted disk fill alpha (theme grey channel). */
export const ASSISTANT_SCROLL_CUE_FILL_ALPHA = 0.42;

/** Border contrast vs surface (multiplied with theme white/black alpha). */
export const ASSISTANT_SCROLL_CUE_BORDER_ALPHA_DARK = 0.2;
export const ASSISTANT_SCROLL_CUE_BORDER_ALPHA_LIGHT = 0.14;

/** Drop shadow alpha multipliers (dark / light mode). */
export const ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_DARK = 0.22;
export const ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_LIGHT = 0.08;
