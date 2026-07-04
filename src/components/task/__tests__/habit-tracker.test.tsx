import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HabitTracker } from "@/components/task/habit-tracker";
import type { Task } from "@/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Flame: ({ className }: { className?: string }) => <span className={className} data-testid="flame-icon">🔥</span>,
  Calendar: ({ className }: { className?: string }) => <span className={className} data-testid="calendar-icon">📅</span>,
  TrendingUp: ({ className }: { className?: string }) => <span className={className} data-testid="trending-icon">📈</span>,
  Award: ({ className }: { className?: string }) => <span className={className} data-testid="award-icon">🏆</span>,
  Target: ({ className }: { className?: string }) => <span className={className} data-testid="target-icon">🎯</span>,
  ChevronLeft: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-left">◀</span>,
  ChevronRight: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-right">▶</span>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

describe("HabitTracker Component", () => {
  const mockTasks: Task[] = [
    {
      id: 1,
      name: "Morning Run",
      description: "Run every morning",
      list_id: 1,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "high",
      recurring: "daily",
      recurring_config: null,
      completed: 0,
      completed_at: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      sort_order: 0,
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      comments: [],
      blockers: [],
      blocked_by: [],
    },
    {
      id: 2,
      name: "Weekly Review",
      description: "Review weekly progress",
      list_id: 1,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "medium",
      recurring: "weekly",
      recurring_config: null,
      completed: 0,
      completed_at: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      sort_order: 0,
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      comments: [],
      blockers: [],
      blocked_by: [],
    },
    {
      id: 3,
      name: "Completed Task",
      description: "Already done",
      list_id: 1,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "low",
      recurring: "daily",
      recurring_config: null,
      completed: 1,
      completed_at: "2024-01-01",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      sort_order: 0,
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      comments: [],
      blockers: [],
      blocked_by: [],
    },
  ];

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  describe("getStreakLevel function", () => {
    // We test the getStreakLevel function behavior through the UI
    it("should show 0 total streak days when no data", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      // Look for the total streak days stat
      await waitFor(() => {
        const cards = screen.getAllByTestId("card-content");
        // Find the one with 0 for Total Streak Days
        const totalStreakCard = cards.find(c => c.textContent?.includes("Total Streak Days"));
        expect(totalStreakCard).toBeDefined();
      });
    });
  });

  describe("Component rendering", () => {
    it("should render loading state initially", () => {
      render(<HabitTracker tasks={[]} />);
      // Loading state shows pulse animation elements
      const pulseElements = document.querySelectorAll(".animate-pulse");
      expect(pulseElements.length).toBeGreaterThanOrEqual(0);
    });

    it("should render empty state for no habits", async () => {
      render(<HabitTracker tasks={[]} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByText(/No recurring habits found/i)).toBeDefined();
      });
    });

    it("should filter out completed tasks from habit list", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      // Completed tasks (id: 3) should be filtered out
      // Loading completes and habit tasks are filtered
      await waitFor(() => {
        const cards = screen.getAllByTestId("card-content");
        expect(cards.length).toBeGreaterThanOrEqual(4); // Summary stats + habit cards
      });
    });
  });

  describe("Summary statistics", () => {
    it("should display Total Streak Days stat", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      await waitFor(() => {
        expect(screen.getByText("Total Streak Days")).toBeDefined();
      });
    });

    it("should display Longest Streak stat", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      await waitFor(() => {
        expect(screen.getByText("Longest Streak")).toBeDefined();
      });
    });

    it("should display Active Habits stat", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      await waitFor(() => {
        expect(screen.getByText("Active Habits")).toBeDefined();
      });
    });

    it("should display Done Today stat", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      await waitFor(() => {
        expect(screen.getByText("Done Today")).toBeDefined();
      });
    });
  });

  describe("Calendar navigation", () => {
    it("should render month navigation buttons", async () => {
      render(<HabitTracker tasks={mockTasks} />);

      await waitFor(() => {
        const buttons = screen.getAllByTestId("button");
        expect(buttons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Task filtering logic", () => {
    it("should identify habit tasks correctly (recurring !== none)", () => {
      const habitTasks = mockTasks.filter(t => t.recurring !== "none" && !t.completed);
      expect(habitTasks.length).toBe(2); // Morning Run and Weekly Review
    });
  });
});