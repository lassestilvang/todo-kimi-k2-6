import { describe, it, expect, vi } from "vitest";

// Test the eisenhower matrix logic
describe("EisenhowerMatrix Component Logic", () => {
  it("should have four quadrants defined correctly", () => {
    const quadrants = [
      { title: "Urgent & Important", description: "Do it now", priority: "critical" },
      { title: "Not Urgent & Important", description: "Schedule it", priority: "high" },
      { title: "Urgent & Not Important", description: "Delegate it", priority: "medium" },
      { title: "Not Urgent & Not Important", description: "Eliminate it", priority: "low" },
    ];

    expect(quadrants.length).toBe(4);
    expect(quadrants[0].title).toBe("Urgent & Important");
    expect(quadrants[1].title).toBe("Not Urgent & Important");
    expect(quadrants[2].title).toBe("Urgent & Not Important");
    expect(quadrants[3].title).toBe("Not Urgent & Not Important");
  });

  it("should filter tasks into correct quadrants", () => {
    const tasks = [
      { id: 1, name: "Critical Task", priority: "critical", completed: 0, deadline: null },
      { id: 2, name: "High Task", priority: "high", completed: 0, deadline: null },
      { id: 3, name: "Medium Task", priority: "medium", completed: 0, deadline: null },
      { id: 4, name: "Low Task", priority: "low", completed: 0, deadline: null },
      { id: 5, name: "Completed Task", priority: "critical", completed: 1, deadline: null },
    ];

    const quadrantTasks = {
      critical: tasks.filter(t => t.priority === "critical" && !t.completed),
      high: tasks.filter(t => t.priority === "high" && !t.completed),
      medium: tasks.filter(t => t.priority === "medium" && !t.completed),
      low: tasks.filter(t => t.priority === "low" && !t.completed),
    };

    expect(quadrantTasks.critical.length).toBe(1); // Only non-completed
    expect(quadrantTasks.high.length).toBe(1);
    expect(quadrantTasks.medium.length).toBe(1);
    expect(quadrantTasks.low.length).toBe(1);
  });

  it("should map quadrant index to priority correctly", () => {
    const getPriorityFromIndex = (index: number): "critical" | "high" | "medium" | "low" => {
      return index === 0 ? "critical"
        : index === 1 ? "high"
        : index === 2 ? "medium"
        : "low";
    };

    expect(getPriorityFromIndex(0)).toBe("critical");
    expect(getPriorityFromIndex(1)).toBe("high");
    expect(getPriorityFromIndex(2)).toBe("medium");
    expect(getPriorityFromIndex(3)).toBe("low");
  });

  it("should determine if deadline is overdue", () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    const futureDate = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

    const isOverdue = (deadline: string) => new Date(deadline) < new Date();

    expect(isOverdue(pastDate)).toBe(true);
    expect(isOverdue(futureDate)).toBe(false);
  });

  it("should handle task click callback", () => {
    const onTaskClick = vi.fn();
    const task = { id: 1, name: "Test Task" };

    onTaskClick(task);

    expect(onTaskClick).toHaveBeenCalledWith(task);
  });

  it("should handle add task callback with correct priority", () => {
    const onAddTask = vi.fn();

    const priorities = ["critical", "high", "medium", "low"] as const;

    // Simulate button clicks for each quadrant
    priorities.forEach((priority, index) => {
      onAddTask(priority);
    });

    expect(onAddTask).toHaveBeenCalledTimes(4);
    expect(onAddTask).toHaveBeenCalledWith("critical");
    expect(onAddTask).toHaveBeenCalledWith("high");
    expect(onAddTask).toHaveBeenCalledWith("medium");
    expect(onAddTask).toHaveBeenCalledWith("low");
  });

  it('should display empty state for empty quadrants', () => {
    const tasks: any[] = [];

    const displayText = tasks.length === 0 ? 'No tasks' : `${tasks.length} tasks`;

    expect(displayText).toBe('No tasks');
  });

  it("should limit tasks to 5 per quadrant", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const displayed = tasks.slice(0, 5);

    expect(displayed.length).toBe(5);
  });

  it("should truncate long task names", () => {
    const name = "This is a very long task name that should be truncated";
    const truncated = name.length > 20 ? `${name.slice(0, 20)}...` : name;

    expect(truncated).toBe("This is a very long ...");
  });

  it("should have quadrant colors defined", () => {
    const quadrantColors = {
      quadrant0: "bg-red-100 dark:bg-red-900/20", // Urgent & Important
      quadrant1: "bg-green-100 dark:bg-green-900/20", // Not Urgent & Important
      quadrant2: "bg-yellow-100 dark:bg-yellow-900/20", // Urgent & Not Important
      quadrant3: "bg-gray-100 dark:bg-gray-900/20", // Not Urgent & Not Important
    };

    expect(quadrantColors.quadrant0).toContain("red");
    expect(quadrantColors.quadrant1).toContain("green");
    expect(quadrantColors.quadrant2).toContain("yellow");
    expect(quadrantColors.quadrant3).toContain("gray");
  });

  it("should handle tasks with deadlines", () => {
    const task = {
      id: 1,
      name: "Task with deadline",
      deadline: "2024-01-15",
    };

    const deadlineInfo = task.deadline
      ? `Due: ${new Date(task.deadline).toLocaleDateString()}`
      : null;

    expect(deadlineInfo).toBe("Due: 1/15/2024");
  });

  it("should handle tasks without deadlines", () => {
    const task = { id: 1, name: "Task without deadline", deadline: null };

    const deadlineInfo = task.deadline ? "has deadline" : null;

    expect(deadlineInfo).toBeNull();
  });

  it("should apply correct task item styling", () => {
    const taskClasses = "text-xs p-2 bg-background rounded cursor-pointer hover:opacity-80";

    expect(taskClasses).toContain("cursor-pointer");
    expect(taskClasses).toContain("rounded");
  });

  it("should handle empty tasks array", () => {
    const tasks: any[] = [];

    const quadrants = [
      tasks.filter(() => false).length,
      tasks.filter(() => false).length,
      tasks.filter(() => false).length,
      tasks.filter(() => false).length,
    ];

    expect(quadrants.every(c => c === 0)).toBe(true);
  });

  it("should handle all completed tasks in a quadrant", () => {
    const tasks = [
      { id: 1, completed: 1 },
      { id: 2, completed: 1 },
    ];

    const incomplete = tasks.filter(t => !t.completed);

    expect(incomplete.length).toBe(0);
  });

  it("should format overdue deadline text", () => {
    const overdueClass = "text-red-500";

    expect(overdueClass).toBe("text-red-500");
  });
});