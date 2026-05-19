const PENDING_HASH_SESSION_KEY = "portfolio-pending-hash";

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

/** Remember a hash from an in-app link before Next.js client navigation. */
export function stashPendingLocationHash(href: string): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;
  try {
    const url = new URL(href, window.location.origin);
    if (url.hash) {
      sessionStorage.setItem(PENDING_HASH_SESSION_KEY, url.hash);
    }
  } catch {
    /* ignore malformed href */
  }
}

function consumePendingLocationHash(): string | null {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return null;
  const hash = sessionStorage.getItem(PENDING_HASH_SESSION_KEY);
  if (hash) sessionStorage.removeItem(PENDING_HASH_SESSION_KEY);
  return hash;
}

/** Performance navigation entry still has the hash when sessionStorage capture ran too late. */
function getInitialNavigationHash(): string | null {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return null;
  const navigationEntries = performance.getEntriesByType("navigation");
  const navigationEntry = navigationEntries[0];
  if (!navigationEntry || !("name" in navigationEntry)) return null;
  try {
    const url = new URL(String(navigationEntry.name));
    return url.hash || null;
  } catch {
    return null;
  }
}

/**
 * Re-applies a hash Next.js App Router may drop on hydration or client navigation.
 * Returns true when the URL was updated.
 */
export function restorePreservedLocationHash(): boolean {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return false;

  if (window.location.hash) return false;

  const hash = consumePendingLocationHash() ?? getInitialNavigationHash();
  if (!hash) return false;

  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl === nextUrl) return false;

  window.history.replaceState(null, "", nextUrl);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return true;
}

/** Scroll to a section/item and keep the URL shareable via hash. */
export function navigateToLocationHashTarget(
  scrollTargetId: string,
  behavior: ScrollBehavior = "smooth"
): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;

  const hash = `#${scrollTargetId}`;
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    window.history.replaceState(null, "", nextUrl);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  const targetEl = document.getElementById(scrollTargetId);
  targetEl?.scrollIntoView({ behavior, block: "start" });
}
