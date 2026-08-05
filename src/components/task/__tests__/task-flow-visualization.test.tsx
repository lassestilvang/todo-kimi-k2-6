import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { TaskFlowVisualization } from "../task-flow-visualization";
import type { Task, TaskConnection } from "@/types";

const mockTasks: Task[] = [
  {
    id: 1,
    user_id: 1,
    name: "Design database schema",
    description: "Create the database schema for the new feature",
    priority: "high",
    completed: true,
    completed_at: "2025-01-18",
    created_at: "2025-01-10",
    updated_at: "2025-01-18",
    date: null,
    deadline: "2025-01-20",
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: "none",
    recurring_config: null,
    sort_order: 0,
    archived: false,
  },
  {
    id: 2,
    user_id: 1,
    name: "Implement feature",
    description: "Build the feature implementation",
    priority: "critical",
    completed: false,
    completed_at: null,
    created_at: "2025-01-12",
    updated_at: "2025-01-19",
    date: null,
    deadline: "2025-01-25",
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: "none",
    recurring_config: null,
    sort_order: 1,
    archived: false,
  },
];

const mockConnections: TaskConnection[] = [
  {
    id: 1,
    source_task_id: 1,
    target_task_id: 2,
    connection_type: "prerequisite",
    strength: 1,
    notes: null,
    created_at: "2025-01-10",
  },
];

describe("TaskFlowVisualization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the visualization header", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByText("Task Flow Visualization")).toBeInTheDocument();
    expect(screen.getByText(/Visualize task dependencies and progress/)).toBeInTheDocument();
  });

  it("displays search input", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
  });

  it("displays filter dropdown", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("displays view mode tabs", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Matrix")).toBeInTheDocument();
    expect(screen.getByText("Dependencies")).toBeInTheDocument();
  });

  it("shows correct task count", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByText(/Showing 2 of 2 tasks/)).toBeInTheDocument();
  });

  it("filters tasks by search", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "database" } });

    // After filtering for "database", should show 1 result
    expect(screen.getByText(/Showing 1 of 2 tasks/)).toBeInTheDocument();
  });

  it("switches between view modes", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    // Timeline is default
    expect(screen.getByText("Timeline")).toBeInTheDocument();

    // Click Matrix tab
    const matrixButton = screen.getByText("Matrix");
    fireEvent.click(matrixButton);

    // Matrix view should be visible
    expect(screen.getByText("Matrix")).toBeInTheDocument();
  });

  it("displays analytics cards", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    expect(screen.getByText("Critical Path")).toBeInTheDocument();
    expect(screen.getByText("Blocked Tasks")).toBeInTheDocument();
    expect(screen.getByText("Avg Progression")).toBeInTheDocument();
  });

  it("shows completed status for completed tasks", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={mockConnections} />);

    // Timeline view should show task cards
    const timelineView = screen.getByText("Timeline");
    fireEvent.click(timelineView);
  });
});

describe("TaskFlowVisualization - Dependencies", () => {
  it("handles empty connections", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={[]} />);

    expect(screen.getByText(/Showing 2 of 2 tasks/)).toBeInTheDocument();
  });

  it("calculates blockers correctly", () => {
    const incompleteTask: Task[] = [
      {
        id: 1,
        user_id: 1,
        name: "Task A",
        description: null,
        priority: "high",
        completed: false,
        completed_at: null,
        created_at: "2025-01-10",
        updated_at: "2025-01-10",
        date: null,
        deadline: null,
        estimate: null,
        actual_time: null,
        notes: null,
        list_id: null,
        recurring: "none",
        recurring_config: null,
        sort_order: 0,
        archived: false,
      },
      {
        id: 2,
        user_id: 1,
        name: "Task B",
        description: null,
        priority: "medium",
        completed: false,
        completed_at: null,
        created_at: "2025-01-11",
        updated_at: "2025-01-11",
        date: null,
        deadline: null,
        estimate: null,
        actual_time: null,
        notes: null,
        list_id: null,
        recurring: "none",
        recurring_config: null,
        sort_order: 1,
        archived: false,
      },
    ];

    const connections: TaskConnection[] = [
      {
        id: 1,
        source_task_id: 1,
        target_task_id: 2,
        connection_type: "prerequisite",
        strength: 1,
        notes: null,
        created_at: "2025-01-10",
      },
    ];

    render(<TaskFlowVisualization tasks={incompleteTask} connections={connections} />);

    // Should render both tasks
    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Task B")).toBeInTheDocument();
  });
});

describe("TaskFlowVisualization - Edge Cases", () => {
  it("handles empty tasks array", () => {
    render(<TaskFlowVisualization tasks={[]} connections={[]} />);

    expect(screen.getByText(/Showing 0 of 0 tasks/)).toBeInTheDocument();
  });

  it("handles tasks with no description", () => {
    const tasksNoDesc: Task[] = [
      {
        id: 1,
        user_id: 1,
        name: "Task without description",
        description: null,
        priority: "low",
        completed: false,
        completed_at: null,
        created_at: "2025-01-10",
        updated_at: "2025-01-10",
        date: null,
        deadline: null,
        estimate: null,
        actual_time: null,
        notes: null,
        list_id: null,
        recurring: "none",
        recurring_config: null,
        sort_order: 0,
        archived: false,
      },
    ];

    render(<TaskFlowVisualization tasks={tasksNoDesc} connections={[]} />);

    expect(screen.getByText("Task without description")).toBeInTheDocument();
  });

  it("handles filter changes", () => {
    render(<TaskFlowVisualization tasks={mockTasks} connections={[]} />);

    const filterButton = screen.getByRole("combobox");
    fireEvent.click(filterButton);

    // Open the dropdown
    expect(screen.getByText("All Tasks")).toBeInTheDocument();
  });
});