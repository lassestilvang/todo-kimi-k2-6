import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIProvider } from "../providers";
import { ClaudeProvider } from "../providers";
import { AIManager } from "../providers";
import {
  categorizeWorkload,
  calculateBalanceScore,
  calculateWorkloadScore,
} from "../workload";

describe("AI Provider Branch Coverage", () => {
  let originalEnv: { [key: string]: string | undefined };

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("OpenAIProvider edge cases", () => {
    it("should handle API error response with error body", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      const provider = new OpenAIProvider();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"error": {"message": "Invalid API key"}}',
      });
      global.fetch = mockFetch;

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle streaming response with invalid JSON", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      const provider = new OpenAIProvider();

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('{"choices":[{"delta":{"content":"test"}}]}') })
              .mockResolvedValueOnce({ done: true }),
            release: vi.fn(),
            releaseLock: vi.fn(),
          }),
        },
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      // This tests the streaming path - parseTaskStream returns keyword parser result on parse error
      const result = await provider.parseTaskStream({ text: "test" }, () => {});
      expect(result).toBeDefined();
    });
  });

  describe("ClaudeProvider edge cases", () => {
    it("should handle API error response", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const provider = new ClaudeProvider();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"error": "Unauthorized"}',
      });
      global.fetch = mockFetch;

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle generateInsights API error", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const provider = new ClaudeProvider();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const result = await provider.generateInsights([]);
      expect(result.tips).toEqual([]);
    });
  });
});

describe("Workload Branch Coverage", () => {
  describe("categorizeWorkload", () => {
    it("should return balanced for zero average", () => {
      expect(categorizeWorkload(10, 0)).toBe("balanced");
    });

    it("should return underloaded for negative deviation", () => {
      expect(categorizeWorkload(30, 100)).toBe("underloaded");
    });

    it("should return overloaded for positive deviation", () => {
      expect(categorizeWorkload(150, 100)).toBe("overloaded");
    });
  });

  describe("calculateBalanceScore", () => {
    it("should handle zero average workload", () => {
      // When avgWorkload is 0, the formula uses || 1
      const result = calculateBalanceScore({ workloadScore: 50 } as any, 0);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should return 0 for zero workload score with non-zero average", () => {
      const result = calculateBalanceScore({ workloadScore: 0 } as any, 50);
      expect(result).toBe(0);
    });
  });

  describe("calculateWorkloadScore", () => {
    it("should handle all zero inputs", () => {
      expect(calculateWorkloadScore(0, 0, 0, 0)).toBe(0);
    });

    it("should handle large inputs", () => {
      const score = calculateWorkloadScore(100, 10, 5, 100);
      expect(score).toBeGreaterThan(100);
    });
  });
});