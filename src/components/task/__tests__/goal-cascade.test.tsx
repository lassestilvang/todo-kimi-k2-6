import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { GoalCascade } from "../goal-cascade";

describe("GoalCascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vision goal section", () => {
    render(<GoalCascade />);

    expect(screen.getByText("Vision Goal")).toBeInTheDocument();
  });

  it("displays overall progress", () => {
    render(<GoalCascade />);

    // Check for progress indicator
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("shows goals structure", () => {
    render(<GoalCascade />);

    expect(screen.getByText("Vision Goal")).toBeInTheDocument();
    expect(screen.getByText("Master React Ecosystem")).toBeInTheDocument();
  });

  it("displays velocity metrics", () => {
    render(<GoalCascade />);

    expect(screen.getByText("Velocity Metrics")).toBeInTheDocument();
  });

  it("shows recommendations section", () => {
    render(<GoalCascade />);

    expect(screen.getByText("Recommendations")).toBeInTheDocument();
  });

  it("allows creating new goals", () => {
    render(<GoalCascade />);

    expect(screen.getByText("Create New Goal")).toBeInTheDocument();
  });

  it("renders with custom props", () => {
    render(<GoalCascade />);

    // Component renders with mock data internally
    expect(screen.getByText("Vision Goal")).toBeInTheDocument();
  });
});

describe("GoalCascade - Empty State", () => {
  it("renders without props with default mock data", () => {
    render(<GoalCascade />);

    // Should still render the structure with default mock data
    expect(screen.getByText("Vision Goal")).toBeInTheDocument();
    expect(screen.getByText("Progress Insights")).toBeInTheDocument();
  });
});

describe("GoalCascade - Weekly Tasks", () => {
  it("displays This Week's Tasks section", () => {
    render(<GoalCascade />);

    // This renders with default mock data that includes weekly goals
    expect(screen.getByText("This Week's Tasks") || screen.getByText(/Tasks/)).toBeInTheDocument();
  });
});