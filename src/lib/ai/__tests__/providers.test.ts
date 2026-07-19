import { describe, it, expect, beforeEach } from "vitest";
import { KeywordParser, AIManager } from "../providers";
import type { AITaskInput, ProjectPlanInput } from "../index";

describe("AI Providers", () => {
  let keywordParser: KeywordParser;
  let aiManager: AIManager;

  beforeEach(() => {
    keywordParser = new KeywordParser();
    aiManager = new AIManager();
  });

  describe("KeywordParser", () => {
    it("should parse basic task name", async () => {
      const input: AITaskInput = { text: "Buy groceries" };
      const result = await keywordParser.parseTask(input);
      expect(result.name).toBe("Buy groceries");
    });

    it("should extract priority from text", async () => {
      const input: AITaskInput = { text: "URGENT: Fix the bug" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("critical");
    });

    it("should extract high priority from text", async () => {
      const input: AITaskInput = { text: "This is important and needs to be done soon" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("high");
    });

    it("should extract medium priority from text", async () => {
      const input: AITaskInput = { text: "This is a medium priority task" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("medium");
    });

    it("should extract low priority from text", async () => {
      const input: AITaskInput = { text: "This can be done later or someday" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("low");
    });

    it("should extract recurring patterns", async () => {
      const input: AITaskInput = { text: "Walk the dog daily" };
      const result = await keywordParser.parseTask(input);
      expect(result.recurring).toBe("daily");
    });

    it("should extract weekly recurring", async () => {
      const input: AITaskInput = { text: "Review reports weekly" };
      const result = await keywordParser.parseTask(input);
      expect(result.recurring).toBe("weekly");
    });

    it("should extract estimated duration", async () => {
      const input: AITaskInput = { text: "Write a report - estimated 120 minutes" };
      const result = await keywordParser.parseTask(input);
      expect(result.estimated_duration).toBe(120);
    });

    it("should extract deadline from text", async () => {
      const input: AITaskInput = { text: "Submit project with deadline 2024-12-31" };
      const result = await keywordParser.parseTask(input);
      expect(result.deadline).toBe("2024-12-31");
    });

    it("should extract date patterns", async () => {
      const input: AITaskInput = { text: "Meeting tomorrow" };
      const result = await keywordParser.parseTask(input);
      expect(result.suggested_date).toBeDefined();
    });

    it("should extract list context", async () => {
      const input: AITaskInput = { text: "Work on project at work" };
      const result = await keywordParser.parseTask(input);
      expect(result.list_name).toBe("Work");
    });

    it("should handle complex task text", async () => {
      const input: AITaskInput = {
        text: "URGENT: Complete the quarterly review report by Friday with high priority",
      };
      const result = await keywordParser.parseTask(input);
      expect(result.name).toBeDefined();
      expect(result.priority).toBe("critical");
    });

    describe("generateProjectPlan", () => {
      it("should generate a project plan with basic input", async () => {
        const input: ProjectPlanInput = {
          projectName: "Website Redesign",
        };
        const result = await keywordParser.generateProjectPlan(input);

        expect(result.name).toBe("Website Redesign");
        expect(result.phases).toBeDefined();
        expect(result.phases.length).toBeGreaterThan(0);
        expect(result.total_duration_days).toBeGreaterThan(0);
        expect(result.provider).toBe("keyword-parser");
      });

      it("should generate phases with proper structure", async () => {
        const input: ProjectPlanInput = {
          projectName: "E-commerce Launch",
          description: "Build a complete e-commerce platform with planning, development, testing, and launch phases.",
        };
        const result = await keywordParser.generateProjectPlan(input);

        expect(result.phases).toBeInstanceOf(Array);
        for (const phase of result.phases) {
          expect(phase.name).toBeDefined();
          expect(phase.priority).toBeDefined();
          expect(phase.duration_days).toBeGreaterThan(0);
        }
      });

      it("should respect deadline constraints", async () => {
        const input: ProjectPlanInput = {
          projectName: "Short Project",
          description: "Quick launch project",
          constraints: {
            deadline: "2024-12-31",
            startDate: "2024-11-01",
          },
        };
        const result = await keywordParser.generateProjectPlan(input);

        // Duration should be based on constraint dates (30 days)
        expect(result.total_duration_days).toBeGreaterThanOrEqual(1);
      });

      it("should detect development phases from description", async () => {
        const input: ProjectPlanInput = {
          projectName: "Tech Project",
          description: "This includes planning, development, testing, and launch phases for the new feature.",
        };
        const result = await keywordParser.generateProjectPlan(input);

        const phaseNames = result.phases.map(p => p.name.toLowerCase());
        expect(phaseNames.some(name => name.includes("planning") || name.includes("design"))).toBe(true);
        expect(phaseNames.some(name => name.includes("development") || name.includes("coding"))).toBe(true);
        expect(phaseNames.some(name => name.includes("testing") || name.includes("qa"))).toBe(true);
        expect(phaseNames.some(name => name.includes("launch") || name.includes("release"))).toBe(true);
      });

      it("should set priority based on keywords", async () => {
        const input: ProjectPlanInput = {
          projectName: "Critical Project",
          description: "Urgent critical project that needs immediate attention - must be done ASAP.",
        };
        const result = await keywordParser.generateProjectPlan(input);

        // At least one phase should have high or critical priority
        const priorities = result.phases.map(p => p.priority);
        expect(priorities.some(p => p === "critical" || p === "high")).toBe(true);
      });

      it("should calculate duration based on complexity keywords", async () => {
        const simpleInput: ProjectPlanInput = {
          projectName: "Simple Task",
          description: "A simple basic project",
        };
        const simpleResult = await keywordParser.generateProjectPlan(simpleInput);

        const complexInput: ProjectPlanInput = {
          projectName: "Enterprise Project",
          description: "A large enterprise project with comprehensive features",
        };
        const complexResult = await keywordParser.generateProjectPlan(complexInput);

        expect(complexResult.total_duration_days).toBeGreaterThan(simpleResult.total_duration_days);
      });

      it("should include description in result", async () => {
        const input: ProjectPlanInput = {
          projectName: "My Project",
          description: "This is my detailed project description",
        };
        const result = await keywordParser.generateProjectPlan(input);

        expect(result.description).toBe("This is my detailed project description");
      });
    });
  });

  describe("AIManager", () => {
    it("should parse task with fallback", async () => {
      const input: AITaskInput = { text: "Buy milk" };
      const result = await aiManager.parseTask(input);
      expect(result.name).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    it("should generate insights", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: false, priority: "medium" },
      ];
      const result = await aiManager.generateInsights(tasks);
      expect(result.tips).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it("should handle empty tasks array", async () => {
      const result = await aiManager.generateInsights([]);
      expect(result.tips).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    describe("generateProjectPlan", () => {
      it("should generate project plan through AIManager", async () => {
        const input: ProjectPlanInput = {
          projectName: "Test Project",
          description: "A test project description",
        };
        const result = await aiManager.generateProjectPlan(input);

        expect(result.name).toBe("Test Project");
        expect(result.phases).toBeDefined();
        expect(result.provider).toBeDefined();
        expect(result.total_duration_days).toBeGreaterThan(0);
      });
    });
  });
});
