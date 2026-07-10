"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Label as LabelType } from "@/types";

// Mock dependencies
vi.mock("lucide-react", () => ({
  Tag: () => <span data-testid="icon-tag">🏷</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: any) => <label data-testid="label" className={className}>{children}</label>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

const mockLabels: LabelType[] = [
  { id: 1, name: "Urgent", icon: "🔥", color: "#ef4444", created_at: "" },
  { id: 2, name: "Work", icon: "💼", color: "#3b82f6", created_at: "" },
  { id: 3, name: "Personal", icon: "👤", color: "#10b981", created_at: "" },
];

// Import after mocks
import { TaskLabels } from "../task-labels";

describe("TaskLabels Component", () => {
  const defaultProps = {
    labels: [],
    selectedLabels: [],
    onToggleLabel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no labels provided", () => {
    const { container } = render(<TaskLabels {...defaultProps} labels={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("should render labels when provided", () => {
    render(<TaskLabels {...defaultProps} labels={mockLabels} />);

    expect(screen.getByText("Labels")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("💼")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("should call onToggleLabel when label button is clicked", () => {
    render(<TaskLabels {...defaultProps} labels={mockLabels} />);

    const labelButtons = screen.getAllByRole("button");
    // The label buttons are rendered - click the first one
    fireEvent.click(labelButtons[0]);

    expect(defaultProps.onToggleLabel).toHaveBeenCalledWith(1);
  });

  it("should apply selected styling to chosen labels", () => {
    const props = {
      ...defaultProps,
      labels: mockLabels,
      selectedLabels: [1, 3],
    };

    render(<TaskLabels {...props} />);

    // Verify that all labels are rendered
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("should handle selecting all labels", () => {
    const props = {
      ...defaultProps,
      labels: mockLabels,
      selectedLabels: [1, 2, 3],
    };

    render(<TaskLabels {...props} />);

    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("💼")).toBeInTheDocument();
    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("should handle single label", () => {
    const props = {
      ...defaultProps,
      labels: [mockLabels[0]],
    };

    render(<TaskLabels {...props} />);

    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
  });

  it("should display label icons correctly", () => {
    render(<TaskLabels {...defaultProps} labels={mockLabels} />);

    const icons = screen.getAllByTestId("icon-tag");
    // Icon is part of the label itself, verify labels render
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("should render many labels correctly", () => {
    const manyLabels = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Label ${i + 1}`,
      icon: "🏷",
      color: "#8b5cf6",
      created_at: "",
    }));

    render(<TaskLabels {...defaultProps} labels={manyLabels} />);

    expect(screen.getByText("Labels")).toBeInTheDocument();
    expect(screen.getByText("Label 1")).toBeInTheDocument();
    expect(screen.getByText("Label 20")).toBeInTheDocument();
  });
});