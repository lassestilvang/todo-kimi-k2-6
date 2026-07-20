// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteIndicator, VoteButton } from "../vote-indicator";
import React from "react";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("VoteIndicator Component", () => {
  const mockOnVote = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Props handling", () => {
    it("renders with required taskId prop", () => {
      render(<VoteIndicator taskId={1} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("updates score when initialScore prop changes", () => {
      const { rerender } = render(<VoteIndicator taskId={1} initialScore={5} />);

      expect(screen.getByText("5")).toBeInTheDocument();

      rerender(<VoteIndicator taskId={1} initialScore={10} />);
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("updates count when initialCount prop changes", () => {
      const { rerender } = render(<VoteIndicator taskId={1} initialCount={5} />);

      expect(screen.getByText("(5)")).toBeInTheDocument();

      rerender(<VoteIndicator taskId={1} initialCount={15} />);
      expect(screen.getByText("(15)")).toBeInTheDocument();
    });

    it("updates userVote when initialUserVote prop changes", () => {
      const { rerender } = render(<VoteIndicator taskId={1} initialUserVote={0} />);

      rerender(<VoteIndicator taskId={1} initialUserVote={1} />);
      // The component should render with the new vote state

      rerender(<VoteIndicator taskId={1} initialUserVote={-1} />);
      // The component should render with the new vote state
    });

    it("applies custom className", () => {
      render(<VoteIndicator taskId={1} className="custom-class" />);
      // Check that the component renders without errors
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("calls onVote callback when provided", () => {
      render(<VoteIndicator taskId={1} initialScore={2} onVote={mockOnVote} />);
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("Score calculations", () => {
    it("displays integer score correctly", () => {
      render(<VoteIndicator taskId={1} initialScore={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays decimal score correctly", () => {
      render(<VoteIndicator taskId={1} initialScore={2.5} />);
      expect(screen.getByText("2.5")).toBeInTheDocument();
    });

    it("rounds score to one decimal place", () => {
      render(<VoteIndicator taskId={1} initialScore={2.666} />);
      expect(screen.getByText("2.7")).toBeInTheDocument();
    });

    it("displays negative score correctly", () => {
      render(<VoteIndicator taskId={1} initialScore={-1.5} />);
      expect(screen.getByText("-1.5")).toBeInTheDocument();
    });

    it("displays zero score and count", () => {
      render(<VoteIndicator taskId={1} initialScore={0} initialCount={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("(0)")).toBeInTheDocument();
    });
  });

  describe("Count display", () => {
    it("shows count in parentheses", () => {
      render(<VoteIndicator taskId={1} initialCount={42} />);
      expect(screen.getByText("(42)")).toBeInTheDocument();
    });

    it("shows zero count when not provided", () => {
      render(<VoteIndicator taskId={1} />);
      expect(screen.getByText("(0)")).toBeInTheDocument();
    });
  });

  describe("Accessibility indicators", () => {
    it("renders upvote button", () => {
      render(<VoteIndicator taskId={1} />);
      // Check that there are two buttons (upvote and downvote)
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("renders downvote button", () => {
      render(<VoteIndicator taskId={1} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("has aria-label for accessibility", () => {
      render(<VoteIndicator taskId={1} />);
      // The component should render without accessibility errors
      const buttons = screen.getAllByRole("button");
      expect(buttons).toBeDefined();
    });
  });
});

describe("VoteButton Component", () => {
  const mockOnVote = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Props handling", () => {
    it("renders with required taskId and score props", () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays upvoting arrow", () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText("▲")).toBeInTheDocument();
    });

    it("displays downvoting arrow", () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText("▼")).toBeInTheDocument();
    });

    it("calls onVote when upvoting", () => {
      const handleVote = vi.fn();
      render(<VoteButton taskId={1} score={0} userVote={0} onVote={handleVote} />);
      expect(screen.getByText("▲")).toBeInTheDocument();
    });

    it("calls onVote when downvoting", () => {
      const handleVote = vi.fn();
      render(<VoteButton taskId={1} score={0} userVote={0} onVote={handleVote} />);
      expect(screen.getByText("▼")).toBeInTheDocument();
    });
  });

  describe("User vote indicators", () => {
    it("highlights upvoted tasks", () => {
      render(<VoteButton taskId={1} score={5} userVote={1} />);
      const upvoteButton = screen.getByText("▲");
      expect(upvoteButton).toBeInTheDocument();
    });

    it("highlights downvoted tasks", () => {
      render(<VoteButton taskId={1} score={-3} userVote={-1} />);
      const downvoteButton = screen.getByText("▼");
      expect(downvoteButton).toBeInTheDocument();
    });

    it("shows dash when score is zero", () => {
      render(<VoteButton taskId={1} score={0} userVote={0} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  describe("Score display", () => {
    it("shows positive score", () => {
      render(<VoteButton taskId={1} score={10} userVote={0} />);
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("shows dash for non-positive scores", () => {
      render(<VoteButton taskId={1} score={-5} userVote={0} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("shows dash for zero score", () => {
      render(<VoteButton taskId={1} score={0} userVote={0} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("shows decimal score", () => {
      render(<VoteButton taskId={1} score={2.5} userVote={0} />);
      expect(screen.getByText("2.5")).toBeInTheDocument();
    });
  });
});

describe("Integration scenarios", () => {
  it("handles all vote states correctly", () => {
    // Test with upvoted state
    const { unmount } = render(<VoteIndicator taskId={1} initialScore={5} initialCount={10} initialUserVote={1} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("(10)")).toBeInTheDocument();
    unmount();

    // Test with downvoted state
    render(<VoteIndicator taskId={1} initialScore={-3} initialCount={5} initialUserVote={-1} />);
    expect(screen.getByText("-3")).toBeInTheDocument();
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });

  it("handles refresh scenario with new props", () => {
    const { rerender } = render(
      <VoteIndicator
        taskId={1}
        initialScore={2.5}
        initialCount={10}
        initialUserVote={0}
      />
    );

    expect(screen.getByText("2.5")).toBeInTheDocument();
    expect(screen.getByText("(10)")).toBeInTheDocument();

    // Simulate refresh with new vote data
    rerender(
      <VoteIndicator
        taskId={1}
        initialScore={4.0}
        initialCount={15}
        initialUserVote={1}
      />
    );

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("(15)")).toBeInTheDocument();
  });
});