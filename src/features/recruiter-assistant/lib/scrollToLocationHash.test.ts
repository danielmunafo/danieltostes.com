import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLocationHashTargetId,
  scrollToLocationHashAfterPaint,
  scrollToLocationHashTarget,
} from "./scrollToLocationHash";

describe("scrollToLocationHash", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = "";
  });

  it("returns null when hash is empty", () => {
    window.location.hash = "";
    expect(getLocationHashTargetId()).toBeNull();
  });

  it("parses hash target id", () => {
    window.location.hash = "#section-professional-context-item-5";
    expect(getLocationHashTargetId()).toBe(
      "section-professional-context-item-5"
    );
  });

  it("scrolls to the element matching the hash", () => {
    const el = document.createElement("h2");
    el.id = "section-professional-context-item-5";
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    document.body.append(el);
    window.location.hash = "#section-professional-context-item-5";

    expect(scrollToLocationHashTarget("auto")).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });

    el.remove();
  });

  it("returns false when the hash target is missing", () => {
    window.location.hash = "#missing-section";
    expect(scrollToLocationHashTarget()).toBe(false);
  });

  it("scrolls after paint via double rAF", () => {
    const el = document.createElement("h2");
    el.id = "section-professional-context-item-2";
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    document.body.append(el);
    window.location.hash = "#section-professional-context-item-2";

    scrollToLocationHashAfterPaint();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    el.remove();
  });
});
