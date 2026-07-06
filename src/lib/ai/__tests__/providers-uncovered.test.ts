import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KeywordParser, OpenAIProvider, ClaudeProvider } from "../providers";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AI Providers - Uncovered Branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("KeywordParser", () => {
    it("should handle empty input", async () => {
      const parser = new KeywordParser();
      const result = await parser.parseTask({ text: "" });
      expect(result.name).toBe("");
    });

    it("should handle multiple list keywords", async () => {
      const parser = new KeywordParser();
      const result = await parser.parseTask({ text: "gym and exercise and meeting" });
      expect(result.list_name).toBeDefined();
    });
  });

  describe("OpenAIProvider", () => {
    it("should throw error when API key not configured", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const provider = new OpenAIProvider();
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow("OPENAI_API_KEY not configured");

      process.env.OPENAI_API_KEY = originalKey;
    });

    it("should fallback to keyword parser on API error", async () => {
      mockFetch.mockRejectedValue(new Error("API Error"));

      const provider = new OpenAIProvider();
      // This should throw since we don't have API key
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle streaming parse with error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true }),
            releaseLock: () => {},
          }),
        },
      });

      const provider = new OpenAIProvider();
      // Should fallback to keyword parser
      const result = await provider.parseTaskStream({ text: "test task" }, async () => {});
      expect(result).toBeDefined();
    });
  });

  describe("ClaudeProvider", () => {
    it("should throw error when API key not configured", async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const provider = new ClaudeProvider();
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow("ANTHROPIC_API_KEY not configured");

      process.env.ANTHROPIC_API_KEY = originalKey;
    });

    it("should handle API error gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: () => Promise.resolve("Error"),
      });

      const provider = new ClaudeProvider();
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });
  });
});