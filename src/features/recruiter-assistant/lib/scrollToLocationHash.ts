/** Id from `window.location.hash`, without the leading `#`. */
export function getLocationHashTargetId(): string | null {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return null;
  const id = window.location.hash.slice(1).trim();
  return id || null;
}

/** Scrolls to the element matching the current location hash, if present. */
export function scrollToLocationHashTarget(
  behavior: ScrollBehavior = "smooth"
): boolean {
  const id = getLocationHashTargetId();
  if (!id) return false;
  const targetEl = document.getElementById(id);
  if (!targetEl) return false;
  targetEl.scrollIntoView({ behavior, block: "start" });
  return true;
}

/**
 * Scroll after layout so async-rendered anchor targets (e.g. fetched markdown)
 * exist in the DOM — the browser's native hash scroll often runs too early.
 */
export function scrollToLocationHashAfterPaint(
  behavior: ScrollBehavior = "smooth"
): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToLocationHashTarget(behavior);
    });
  });
}
