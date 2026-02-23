import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useParallaxScroll } from "./useParallaxScroll";

describe("useParallaxScroll", () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    rafCallbacks = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushRaf() {
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    pending.forEach((cb) => cb(performance.now()));
  }

  it("returns 0 when scroll position is 0", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useParallaxScroll(0.3));
    flushRaf();
    expect(result.current).toBe(0);
  });

  it("returns scrollY × factor after scroll", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useParallaxScroll(0.3));
    flushRaf();

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 1000, writable: true });
      window.dispatchEvent(new Event("scroll"));
      flushRaf();
    });

    expect(result.current).toBe(300);
  });

  it("uses the provided factor", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useParallaxScroll(0.5));

    act(() => {
      flushRaf();
    });

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 500, writable: true });
      window.dispatchEvent(new Event("scroll"));
      flushRaf();
    });

    expect(result.current).toBe(250);
  });
});
