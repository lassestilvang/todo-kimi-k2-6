import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseLocation,
  suggestTaskSchedule,
  generateTaskInsights,
} from "@/lib/ai/index";

describe("AI Module - Uncovered Functions", () => {
  describe("parseLocation", () => {
    it("should return null when no locations provided", () => {
      const result = parseLocation("Meeting at the office", undefined);
      expect(result).toBeNull();
    });

    it("should match location keyword from provided locations", () => {
      const locations = [
        { name: "Home Office", keywords: ["home", "house"] },
        { name: "Work Office", keywords: ["office", "work"] },
        { name: "Gym", keywords: ["gym", "workout"] },
      ];

      const result = parseLocation("Meeting at the office", locations);
      expect(result).toBe("Work Office");
    });

    it("should return null when no match found", () => {
      const result = parseLocation("Random activity", []);
      expect(result).toBeNull();
    });

    it("should be case insensitive", () => {
      const locations = [{ name: "Gym", keywords: ["gym"] }];
      const result = parseLocation("GYM session", locations);
      expect(result).toBe("Gym");
    });
  });

  describe("suggestTaskSchedule", () => {
    it("should suggest schedule for tasks", async () => {
      const tasks = [
        { name: "Task 1", priority: "high", estimated_duration: 60, deadline: null, date: null },
        { name: "Task 2", priority: "medium", estimated_duration: 30, deadline: null, date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(2);
      expect(suggestions[0]).toHaveProperty("name");
      expect(suggestions[0]).toHaveProperty("suggested_date");
      expect(suggestions[0]).toHaveProperty("suggested_time");
      expect(suggestions[0]).toHaveProperty("confidence");
    });

    it("should use deadline as suggested date", async () => {
      const tasks = [
        { name: "Urgent Task", priority: "critical", estimated_duration: 30, deadline: "2024-12-25", date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(suggestions[0].suggested_date).toBe("2024-12-25");
    });

    it("should handle empty task array", async () => {
      const suggestions = await suggestTaskSchedule([]);
      expect(suggestions).toEqual([]);
    });
  });

  describe("generateTaskInsights", () => {
    it("should generate insights for tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high", date: null, deadline: null },
        { name: "Task 2", completed: false, priority: "medium", date: null, deadline: null },
      ];

      const insights = await generateTaskInsights(tasks);

      expect(insights.productivity_tips).toBeDefined();
      expect(insights.suggestions).toBeDefined();
      expect(insights.trends).toBeDefined();
      expect(insights.provider).toBe("keyword-parser");
    });

    it("should handle empty task array", async () => {
      const insights = await generateTaskInsights([]);

      expect(insights.productivity_tips).toBeDefined();
      expect(insights.suggestions).toBeDefined();
      expect(insights.trends).toBeDefined();
    });
  });
});