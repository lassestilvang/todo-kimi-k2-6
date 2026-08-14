import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Workflow Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT,
        action_type TEXT NOT NULL,
        action_config TEXT,
        condition_json TEXT,
        enabled INTEGER DEFAULT 1,
        run_count INTEGER DEFAULT 0,
        last_run_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL,
        triggered_at TEXT NOT NULL,
        status TEXT NOT NULL,
        input_data TEXT,
        result_data TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe("getWorkflows", () => {
    it("should return all workflows for a user", async () => {
      const { getWorkflows } = await import("../workflows");

      // Insert a test workflow
      db.prepare(`
        INSERT INTO workflows (user_id, name, trigger_type, action_type, enabled)
        VALUES (1, 'Test Workflow', 'manual', 'create_task', 1)
      `).run();

      const workflows = await getWorkflows(1);
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
    });
  });

  describe("getWorkflow", () => {
    it("should return undefined for non-existent workflow", async () => {
      const { getWorkflow } = await import("../workflows");

      const workflow = await getWorkflow(99999, 1);
      expect(workflow).toBeUndefined();
    });
  });

  describe("createWorkflow", () => {
    it("should create a new workflow", async () => {
      const { createWorkflow } = await import("../workflows");

      const result = await createWorkflow(1, {
        name: "Test Workflow",
        trigger_type: "manual",
        action_type: "create_task",
        enabled: true,
        action_config: JSON.stringify({ task_name: "Test" }),
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Workflow");
      expect(result.trigger_type).toBe("manual");
      expect(result.action_type).toBe("create_task");
    });

    it("should throw error when name is missing", async () => {
      const { createWorkflow } = await import("../workflows");

      await expect(createWorkflow(1, {
        name: "",
        trigger_type: "manual",
        action_type: "create_task",
      })).rejects.toThrow("Name is required");
    });
  });

  describe("updateWorkflow", () => {
    it("should update workflow name", async () => {
      const { createWorkflow, updateWorkflow } = await import("../workflows");

      // Create a workflow first
      const created = await createWorkflow(1, {
        name: "Original Name",
        trigger_type: "manual",
        action_type: "create_task",
      });

      const updated = await updateWorkflow(1, created.id, { name: "Updated Name" });
      expect(updated.name).toBe("Updated Name");
    });

    it("should throw error for non-existent workflow", async () => {
      const { updateWorkflow } = await import("../workflows");

      await expect(updateWorkflow(1, 99999, { name: "Updated" })).rejects.toThrow("Workflow not found");
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const { createWorkflow, deleteWorkflow, getWorkflow } = await import("../workflows");

      // Create a workflow first
      const created = await createWorkflow(1, {
        name: "Test Workflow Delete",
        trigger_type: "manual",
        action_type: "create_task",
      });

      const deleted = await deleteWorkflow(created.id, 1);
      expect(deleted).toBe(true);

      const workflow = await getWorkflow(created.id, 1);
      expect(workflow).toBeUndefined();
    });

    it("should return false for non-existent workflow", async () => {
      const { deleteWorkflow } = await import("../workflows");

      const deleted = await deleteWorkflow(99999, 1);
      expect(deleted).toBe(false);
    });
  });

  describe("toggleWorkflow", () => {
    it("should toggle workflow enabled status from true to false", async () => {
      const { createWorkflow, toggleWorkflow } = await import("../workflows");

      // Create a workflow first (enabled defaults to true)
      const created = await createWorkflow(1, {
        name: "Test Workflow Toggle",
        trigger_type: "manual",
        action_type: "create_task",
      });

      // Toggle should return false (was true, now false)
      const newStatus = await toggleWorkflow(created.id, 1);
      expect(newStatus).toBe(false);
    });

    it("should throw error for non-existent workflow", async () => {
      const { toggleWorkflow } = await import("../workflows");

      await expect(toggleWorkflow(99999, 1)).rejects.toThrow("Workflow not found");
    });
  });

  describe("getWorkflowExecutions", () => {
    it("should return empty array when no executions exist", async () => {
      const { getWorkflowExecutions } = await import("../workflows");

      const executions = await getWorkflowExecutions(99999);
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBe(0);
    });

    it("should filter executions by status", async () => {
      const { createWorkflow, getWorkflowExecutions } = await import("../workflows");

      // Create a workflow first
      const created = await createWorkflow(101, {
        name: "Test Workflow Filter",
        trigger_type: "manual",
        action_type: "create_task",
      });

      // Insert only one completed execution
      db.prepare(`
        INSERT INTO workflow_executions (workflow_id, status, triggered_at)
        VALUES (?, 'completed', datetime('now'))
      `).run(created.id);

      const completed = await getWorkflowExecutions(created.id, { status: "completed" });
      expect(completed.length).toBe(1);
      expect(completed[0].status).toBe("completed");
    });

    it("should limit executions", async () => {
      const { createWorkflow, getWorkflowExecutions } = await import("../workflows");

      // Create a workflow first
      const created = await createWorkflow(102, {
        name: "Test Workflow Limit",
        trigger_type: "manual",
        action_type: "create_task",
      });

      // Insert two execution records
      db.prepare(`
        INSERT INTO workflow_executions (workflow_id, status, triggered_at)
        VALUES (?, 'completed', datetime('now'))
      `).run(created.id);

      db.prepare(`
        INSERT INTO workflow_executions (workflow_id, status, triggered_at)
        VALUES (?, 'completed', datetime('now', '-1 minute'))
      `).run(created.id);

      const limited = await getWorkflowExecutions(created.id, { limit: 1 });
      expect(limited.length).toBe(1);
    });
  });

  describe("executeAction", () => {
    it("should throw error for unknown action type", async () => {
      const { executeAction } = await import("../workflows");

      const workflow = {
        action_type: "unknown_action" as any,
        action_config: "{}",
      };

      await expect(executeAction(workflow)).rejects.toThrow("Unknown action type");
    });
  });

  describe("checkTriggers", () => {
    it("should return true for manual trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("manual", {}, 1);
      expect(result).toBe(true);
    });

    it("should return true for task_created trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("task_created", {}, 1);
      expect(result).toBe(true);
    });

    it("should return true for task_completed trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("task_completed", {}, 1);
      expect(result).toBe(true);
    });

    it("should return true for due_date trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("due_date", {}, 1);
      expect(result).toBe(true);
    });

    it("should return true for cron trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("cron", {}, 1);
      expect(result).toBe(true);
    });

    it("should return true for schedule trigger", async () => {
      const { checkTriggers } = await import("../workflows");

      const result = await checkTriggers("schedule", {}, 1);
      expect(result).toBe(true);
    });
  });

  describe("evaluateConditions", () => {
    it("should return true when no conditions provided", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions(null as any, {});
      expect(result).toBe(true);
    });

    it("should return true when conditions is empty string", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions("" as any, {});
      expect(result).toBe(true);
    });

    it("should parse JSON conditions string", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions(JSON.stringify({ task_priority: "high" }), {
        task_priority: "high",
      });
      expect(result).toBe(true);
    });

    it("should return false when priority requirement not met", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions({ task_priority: "critical" }, {
        task_priority: "medium",
      });
      expect(result).toBe(false);
    });

    it("should check task label condition", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions({ task_label: "work" }, {
        task_labels: ["work", "important"],
      });
      expect(result).toBetrue();
    });

    it("should return false when label not found", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions({ task_label: "urgent" }, {
        task_labels: ["work", "important"],
      });
      expect(result).toBe(false);
    });

    it("should check due date condition", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions({ due_date_before: "2024-12-31" }, {
        due_date: "2024-06-15",
      });
      expect(result).toBe(true);
    });

    it("should return false when due date is after threshold", async () => {
      const { evaluateConditions } = await import("../workflows");

      const result = await evaluateConditions({ due_date_before: "2024-06-01" }, {
        due_date: "2024-12-31",
      });
      expect(result).toBe(false);
    });
  });
});