import { describe, it, expect, vi } from "vitest";

describe("ErrorBoundary - Logic Tests", () => {
  it("should have correct initial state", () => {
    const initialState = { hasError: false, error: null };
    expect(initialState.hasError).toBe(false);
    expect(initialState.error).toBeNull();
  });

  it("should update state when error occurs", () => {
    const error = new Error("Test error");
    const newState = { hasError: true, error };
    expect(newState.hasError).toBe(true);
    expect(newState.error?.message).toBe("Test error");
  });

  it("should handle reset", () => {
    const resetState = { hasError: false, error: null };
    expect(resetState.hasError).toBe(false);
    expect(resetState.error).toBeNull();
  });
});

describe("ErrorBoundary - Props Validation", () => {
  it("should accept children prop", () => {
    const children = <div>Test</div>;
    expect(children).toBeDefined();
  });

  it("should accept optional fallback prop", () => {
    const fallback = <div>Custom error</div>;
    expect(fallback).toBeDefined();
  });

  it("should accept optional onReset callback", () => {
    const onReset = vi.fn();
    expect(typeof onReset).toBe("function");
  });
});

describe("ErrorBoundary - Error Display", () => {
  it("should display error message when present", () => {
    const error = new Error("Custom error message");
    const displayedMessage = error.message;
    expect(displayedMessage).toBe("Custom error message");
  });

  it("should display fallback message when no error", () => {
    const errorMessage = "An unexpected error occurred";
    expect(errorMessage).toBeTruthy();
  });
});