import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SECTION_IDS } from "@/constants/sections";
import { useActiveSection } from "./useActiveSection";

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe("useActiveSection", () => {
  let observerCallback: ObserverCallback;
  let observedElements: Element[];
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observedElements = [];
    disconnectSpy = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      class MockIntersectionObserver {
        constructor(callback: ObserverCallback) {
          observerCallback = callback;
        }
        observe(el: Element) {
          observedElements.push(el);
        }
        unobserve() {}
        disconnect() {
          disconnectSpy();
        }
      }
    );

    for (const id of SECTION_IDS) {
      const el = document.createElement("div");
      el.id = `section-${id}`;
      document.body.appendChild(el);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("defaults to the first section", () => {
    const { result } = renderHook(() => useActiveSection());
    expect(result.current).toBe(SECTION_IDS[0]);
  });

  it("observes all section elements", () => {
    renderHook(() => useActiveSection());
    expect(observedElements).toHaveLength(SECTION_IDS.length);
  });

  it("updates when a section becomes intersecting", () => {
    const { result } = renderHook(() => useActiveSection());

    const experienceEl = document.getElementById("section-experience")!;
    act(() => {
      observerCallback([{ isIntersecting: true, target: experienceEl }]);
    });

    expect(result.current).toBe("experience");
  });

  it("ignores non-intersecting entries", () => {
    const { result } = renderHook(() => useActiveSection());

    const educationEl = document.getElementById("section-education")!;
    act(() => {
      observerCallback([{ isIntersecting: false, target: educationEl }]);
    });

    expect(result.current).toBe(SECTION_IDS[0]);
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() => useActiveSection());
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
