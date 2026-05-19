import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLocationHashTargetId,
  navigateToLocationHashTarget,
  restorePreservedLocationHash,
  scrollToLocationHashAfterPaint,
  scrollToLocationHashTarget,
  stashPendingLocationHash,
} from "./locationHash";

describe("locationHash", () => {
  beforeEach(() => {
    window.location.hash = "";
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when hash is empty", () => {
    expect(getLocationHashTargetId()).toBeNull();
  });

  it("parses hash target id", () => {
    window.location.hash = "#section-professional-context-item-5";
    expect(getLocationHashTargetId()).toBe(
      "section-professional-context-item-5"
    );
  });

  it("scrolls to the element matching the hash", () => {
    const el = document.createElement("div");
    el.id = "section-professional-context-item-5";
    document.body.appendChild(el);
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    window.location.hash = "#section-professional-context-item-5";

    expect(scrollToLocationHashTarget("auto")).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });

    document.body.removeChild(el);
  });

  it("returns false when the hash target is missing", () => {
    window.location.hash = "#missing-section";
    expect(scrollToLocationHashTarget()).toBe(false);
  });

  it("scrolls after paint via requestAnimationFrame", () => {
    const el = document.createElement("div");
    el.id = "section-professional-context-item-2";
    document.body.appendChild(el);
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    window.location.hash = "#section-professional-context-item-2";

    scrollToLocationHashAfterPaint();
    expect(scrollIntoView).not.toHaveBeenCalled();

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          expect(scrollIntoView).toHaveBeenCalledWith({
            behavior: "smooth",
            block: "start",
          });
          document.body.removeChild(el);
          resolve();
        });
      });
    });
  });

  it("restores hash captured before Next.js hydration", () => {
    sessionStorage.setItem(
      "portfolio-pending-hash",
      "#section-experience-item-0"
    );
    history.replaceState(null, "", "/en");

    expect(restorePreservedLocationHash()).toBe(true);
    expect(window.location.hash).toBe("#section-experience-item-0");
  });

  it("restores hash stashed before client navigation", () => {
    stashPendingLocationHash("/en#section-experience-item-2");
    history.replaceState(null, "", "/en");

    expect(restorePreservedLocationHash()).toBe(true);
    expect(window.location.hash).toBe("#section-experience-item-2");
  });

  it("updates the URL when navigating to a hash target", () => {
    const el = document.createElement("div");
    el.id = "section-experience-item-1";
    document.body.appendChild(el);
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    history.replaceState(null, "", "/en");

    navigateToLocationHashTarget("section-experience-item-1");

    expect(window.location.hash).toBe("#section-experience-item-1");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    document.body.removeChild(el);
  });
});
