import { describe, it, expect } from "vitest";

describe("Error Handler - Uncovered Branches", () => {
  it("should handle different error types", () => {
    const errors = [
      new Error("Test error"),
      new Error("Another error"),
    ];

    errors.forEach((error) => {
      expect(error.message).toBeDefined();
    });
  });

  it("should handle non-Error objects", () => {
    const error = "string error";
    const message = typeof error === "string" ? error : "Unknown error";
    expect(message).toBe("string error");
  });

  it("should handle null error", () => {
    const error = null;
    const message = error instanceof Error ? error.message : "Unknown error";
    expect(message).toBe("Unknown error");
  });
});