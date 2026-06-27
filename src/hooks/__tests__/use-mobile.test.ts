import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

describe("useIsMobile", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    // Store original values
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original values
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalInnerWidth;
    cleanup();
  });

  it("should be defined", () => {
    expect(typeof useIsMobile).toBe("function");
  });

  it("should return false when viewport width is >= 768px", () => {
    window.innerWidth = 1024;

    // Mock matchMedia
    window.matchMedia = (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true when viewport width is < 768px", () => {
    window.innerWidth = 600;

    // Mock matchMedia
    window.matchMedia = (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should handle matchMedia change events", () => {
    let changeHandler: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null;

    window.innerWidth = 1024;
    window.matchMedia = (query: string) => {
      const mql = {
        matches: query === "(max-width: 767px)",
        addEventListener: (type: string, handler: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => {
          if (type === "change") {
            changeHandler = handler;
          }
        },
        removeEventListener: () => {},
      };
      return mql as unknown as MediaQueryList;
    };

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate viewport change to mobile
    window.innerWidth = 600;
    if (changeHandler) {
      const mockEvent = {
        matches: true,
        media: "(max-width: 767px)",
      } as MediaQueryListEvent;
      changeHandler.call({ matches: true } as MediaQueryList, mockEvent);
    }
  });

  it("should cleanup matchMedia listener on unmount", () => {
    window.innerWidth = 1024;
    let removed = false;

    window.matchMedia = (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: () => {},
      removeEventListener: () => {
        removed = true;
      },
    }) as unknown as typeof window.matchMedia;

    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removed).toBe(true);
  });

  it("should handle edge case at breakpoint (767px)", () => {
    window.innerWidth = 767;

    window.matchMedia = (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should handle edge case at breakpoint (768px)", () => {
    window.innerWidth = 768;

    window.matchMedia = (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});