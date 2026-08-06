import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

const createMatchMediaMock = (matches: boolean) => {
  return vi.fn().mockImplementation(() => ({
    matches,
    media: "(max-width: 767px)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as MediaQueryBuilder;
};

interface MediaQueryBuilder {
  (query: string): MediaQueryList;
}

describe("useIsMobile", () => {
  let originalMatchMedia: MediaQueryBuilder;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia.bind(window);
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalInnerWidth;
    cleanup();
  });

  it("should be defined", () => {
    expect(typeof useIsMobile).toBe("function");
  });

  it("should return false when viewport width is >= 768px", () => {
    window.innerWidth = 1024;
    window.matchMedia = createMatchMediaMock(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true when viewport width is < 768px", () => {
    window.innerWidth = 600;
    window.matchMedia = createMatchMediaMock(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should handle matchMedia change events", () => {
    let changeHandler: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null;

    window.innerWidth = 1024;
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const mql = {
        matches: query === "(max-width: 767px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (type: string, handler: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => {
          if (type === "change") {
            changeHandler = handler;
          }
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
      return mql;
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate viewport change to mobile
    window.innerWidth = 600;
    if (changeHandler) {
      const mockEvent = {
        matches: true,
        media: "(max-width: 767px)",
      } as MediaQueryListEvent;
      (changeHandler as any).call({ matches: true, media: "(max-width: 767px)" } as MediaQueryList, mockEvent);
    }
  });

  it("should cleanup matchMedia listener on unmount", () => {
    window.innerWidth = 1024;
    let removed = false;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: () => {
        removed = true;
      },
      dispatchEvent: vi.fn(),
    })) as unknown as MediaQueryBuilder;

    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removed).toBe(true);
  });

  it("should handle edge case at breakpoint (767px)", () => {
    window.innerWidth = 767;
    window.matchMedia = createMatchMediaMock(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should handle edge case at breakpoint (768px)", () => {
    window.innerWidth = 768;
    window.matchMedia = createMatchMediaMock(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});