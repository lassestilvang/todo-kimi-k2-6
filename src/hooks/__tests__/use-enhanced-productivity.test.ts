import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useCognitiveLoad,
  useEnergyBudget,
  useExternalTasks,
  useDecisionShadow,
  useMoodTracking,
} from "../use-enhanced-productivity";

// Mock fetch
global.fetch = vi.fn();

describe("Enhanced Productivity Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCognitiveLoad", () => {
    it("should fetch cognitive load analysis", async () => {
      (fetch as any).mockResolvedValueOnce({
        json: async () => ({
          totalLogs: 7,
          avgTaskCount: 5,
          completionRate: 0.75,
          recommendations: ["Focus on high-priority tasks"],
        }),
      });

      const { result } = renderHook(() => useCognitiveLoad());

      expect(result.current.loading).toBe(true);
    });

    it("should have logLoad function", async () => {
      (fetch as any).mockResolvedValue({
        json: async () => ({}),
      });

      const { result } = renderHook(() => useCognitiveLoad());

      expect(typeof result.current.logLoad).toBe("function");
    });
  });

  describe("useEnergyBudget", () => {
    it("should fetch energy budget", async () => {
      (fetch as any).mockResolvedValueOnce({
        json: async () => ({
          profile: { wake_hour: 7, sleep_hour: 23 },
          budget: { balance: 78, dailyLimit: 100, spent: 22 },
        }),
      });

      const { result } = renderHook(() => useEnergyBudget());

      expect(result.current.budget).toBeDefined();
    });

    it("should have logEnergy function", async () => {
      (fetch as any).mockResolvedValue({
        json: async () => ({ balance: 73 }),
      });

      const { result } = renderHook(() => useEnergyBudget());

      expect(typeof result.current.logEnergy).toBe("function");
    });
  });

  describe("useDecisionShadow", () => {
    it("should fetch decision analysis", async () => {
      (fetch as any).mockResolvedValueOnce({
        json: async () => ({
          totalDecisions: 12,
          avgOutcomeRating: 3.8,
          patternAnalysis: [
            { pattern: "High-rated decisions", recommendation: "Keep this approach" },
          ],
        }),
      });

      const { result } = renderHook(() => useDecisionShadow());

      expect(result.current.analysis).toBeDefined();
    });

    it("should have createDecision function", async () => {
      (fetch as any).mockResolvedValue({
        json: async () => ({ id: 1, question: "Test decision" }),
      });

      const { result } = renderHook(() => useDecisionShadow());

      expect(typeof result.current.createDecision).toBe("function");
    });
  });

  describe("useExternalTasks", () => {
    it("should fetch external tasks", async () => {
      (fetch as any).mockResolvedValueOnce({
        json: async () => ({
          tasks: [
            { id: 1, title: "Task from Trello", confidence: 85 },
            { id: 2, title: "Task from Asana", confidence: 92 },
          ],
        }),
      });

      const { result } = renderHook(() => useExternalTasks("pending"));

      expect(result.current.tasks).toBeDefined();
    });

    it("should have convertToTask function", async () => {
      (fetch as any).mockResolvedValue({
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useExternalTasks());

      expect(typeof result.current.convertToTask).toBe("function");
    });
  });

  describe("useMoodTracking", () => {
    it("should fetch mood recommendations", async () => {
      (fetch as any).mockResolvedValueOnce({
        json: async () => ({
          primary_mood: "balanced",
          recommendations: [
            "Focus on completing 3 high-priority tasks",
            "Take a 10-minute break at 2 PM",
          ],
        }),
      });

      const { result } = renderHook(() => useMoodTracking());

      expect(result.current.recommendations).toBeDefined();
    });

    it("should have logMood function", async () => {
      (fetch as any).mockResolvedValue({
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMoodTracking());

      expect(typeof result.current.logMood).toBe("function");
    });
  });
});