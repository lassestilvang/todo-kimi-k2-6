// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the createTemplate action
vi.mock("@/lib/actions", () => ({
  createTemplate: vi.fn(),
}));

const mockOnSuccess = vi.fn();
const mockOnUseTemplate = vi.fn();
const mockOnCategoryChange = vi.fn();

describe("TaskTemplateTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Component Structure", () => {
    it("should render the component with title", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          description="Test description"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[{ id: 1, name: "Work", description: "Work templates", created_at: "2024-01-01" }]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Save as Template")).toBeInTheDocument();
    });

    it("should render the description text", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          description="Test description"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/Save this task configuration as a reusable template/)).toBeInTheDocument();
    });

    it("should render the save button", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          description="Test description"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: /save current as template/i })).toBeInTheDocument();
    });
  });

  describe("Category Selection", () => {
    it("should render category dropdown when categories exist", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[{ id: 1, name: "Work", description: "Work templates", created_at: "2024-01-01" }]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Category (optional)")).toBeInTheDocument();
    });

    it("should not render category dropdown when no categories", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText("Category (optional)")).not.toBeInTheDocument();
    });
  });

  describe("Template List", () => {
    it("should render saved templates list", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[
            { id: 1, name: "Template 1", description: "Desc 1", list_id: 1, priority: "medium", label_ids: [], subtasks: [], category_id: null, created_at: "2024-01-01" },
            { id: 2, name: "Template 2", description: "Desc 2", list_id: 1, priority: "high", label_ids: [], subtasks: [], category_id: null, created_at: "2024-01-01" },
          ]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Saved Templates")).toBeInTheDocument();
      expect(screen.getByText("Template 1")).toBeInTheDocument();
      expect(screen.getByText("Template 2")).toBeInTheDocument();
    });

    it("should render template with description", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Test Task"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[
            { id: 1, name: "Template with Desc", description: "This is a detailed description", list_id: 1, priority: "medium", label_ids: [], subtasks: [], category_id: null, created_at: "2024-01-01" },
          ]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("This is a detailed description")).toBeInTheDocument();
    });
  });

  describe("Save Template Functionality", () => {
    it("should validate that task name is required", async () => {
      const { toast } = await import("sonner");
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name=""
          description="Test description"
          listId="1"
          priority="high"
          selectedLabels={[1, 2]}
          subtasks={["Subtask 1"]}
          templates={[]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      const saveButton = screen.getByRole("button", { name: /save current as template/i });
      fireEvent.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith("Task name is required to save as template");
    });
  });

  describe("Layout Structure", () => {
    it("should have proper spacing", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");
      const { container } = render(
        <TaskTemplateTab
          name="Test Task"
          listId="1"
          priority="medium"
          selectedLabels={[]}
          subtasks={[]}
          templates={[]}
          categories={[]}
          selectedCategory={null}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("space-y-4");
      expect(wrapper).toHaveClass("pt-4");
    });
  });

  describe("Props Handling", () => {
    it("should accept all props correctly", async () => {
      const { TaskTemplateTab } = await import("../task-template-tab");

      render(
        <TaskTemplateTab
          name="Complete Task"
          description="Complete task description"
          listId="5"
          priority="critical"
          selectedLabels={[1, 2, 3]}
          subtasks={["Subtask 1", "Subtask 2"]}
          templates={[]}
          categories={[{ id: 1, name: "Work", description: "Work", created_at: "2024-01-01" }]}
          selectedCategory={1}
          onCategoryChange={mockOnCategoryChange}
          onUseTemplate={mockOnUseTemplate}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Save as Template")).toBeInTheDocument();
    });
  });
});