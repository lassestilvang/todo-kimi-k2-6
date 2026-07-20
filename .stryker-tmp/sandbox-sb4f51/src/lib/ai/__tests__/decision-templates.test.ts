// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { KeywordParser } from "../providers";

describe("Decision Templates", () => {
  const parser = new KeywordParser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateDecisionTemplate", () => {
    it("returns priority template for priority type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "priority",
      });

      expect(result.name).toBe("Priority Decision Template");
      expect(result.prompt_template).toBeDefined();
      expect(result.option_template).toBeDefined();
    });

    it("returns approach template for approach type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "approach",
      });

      expect(result.name).toBe("Approach Decision Template");
      expect(result.prompt_template).toBeDefined();
    });

    it("returns tool template for tool type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "tool",
      });

      expect(result.name).toBe("Tool Selection Template");
      expect(result.prompt_template).toBeDefined();
    });

    it("returns timeline template for timeline type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "timeline",
      });

      expect(result.name).toBe("Timeline Decision Template");
      expect(result.prompt_template).toBeDefined();
    });

    it("returns allocation template for allocation type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "allocation",
      });

      expect(result.name).toBe("Resource Allocation Template");
      expect(result.prompt_template).toContain("resource");
    });

    it("returns cancellation template for cancellation type", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "cancellation",
      });

      expect(result.name).toBe("Cancellation Decision Template");
      expect(result.prompt_template).toContain("cancel");
    });

    it("returns default template when no type specified", async () => {
      const result = await parser.generateDecisionTemplate({});

      expect(result.name).toBe("Approach Decision Template");
      expect(result.provider).toBe("keyword-parser");
    });

    it("returns provider field", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "approach",
      });

      expect(result.provider).toBe("keyword-parser");
    });
  });

  describe("Decision Templates Structure", () => {
    it("each template has required fields", async () => {
      const types = ["priority", "approach", "tool", "timeline", "allocation", "cancellation"];

      for (const type of types) {
        const result = await parser.generateDecisionTemplate({ decisionType: type });

        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("prompt_template");
        expect(result).toHaveProperty("provider");
        expect(typeof result.name).toBe("string");
        expect(typeof result.prompt_template).toBe("string");
        expect(result.prompt_template.length).toBeGreaterThan(50);
      }
    });

    it("option templates contain JSON format", async () => {
      const result = await parser.generateDecisionTemplate({
        decisionType: "priority",
      });

      expect(result.option_template).toBeDefined();
      expect(result.option_template).toContain("critical");
      expect(result.option_template).toContain("high");
    });
  });
});