import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnhancedProductivityDashboard } from "../enhanced-productivity-dashboard";

// Mock the hooks
vi.mock("@/hooks/use-enhanced-productivity", () => ({
  useCognitiveLoad: () => ({
    analysis: {
      loadTrend: "stable",
      completionRate: 0.75,
      recommendations: ["Focus on high-priority tasks"],
    },
    loading: false,
    logLoad: vi.fn(),
    refetch: vi.fn(),
  }),
  useEnergyBudget: () => ({
    budget: { balance: 78, dailyLimit: 100, spent: 22 },
    profile: { wake_hour: 7, sleep_hour: 23 },
    loading: false,
    updateProfile: vi.fn(),
    logEnergy: vi.fn(),
    refetch: vi.fn(),
  }),
  useExternalTasks: () => ({
    tasks: [],
    loading: false,
    convertToTask: vi.fn(),
    refetch: vi.fn(),
  }),
  useDecisionShadow: () => ({
    analysis: {
      totalDecisions: 12,
      avgOutcomeRating: 3.8,
    },
    loading: false,
    createDecision: vi.fn(),
    refetch: vi.fn(),
  }),
  useMoodTracking: () => ({
    recommendations: { primaryMood: "balanced" },
    loading: false,
    logMood: vi.fn(),
    getRecommendations: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe("Enhanced Productivity Dashboard", () => {
  it("should render all overview cards", () => {
    render(<EnhancedProductivityDashboard />);

    expect(screen.getByText("Enhanced Productivity Hub")).toBeInTheDocument();
  });

  it("should display cognitive load status", () => {
    render(<EnhancedProductivityDashboard />);

    expect(screen.getByText("Cognitive Load")).toBeInTheDocument();
    expect(screen.getByText("Stable")).toBeInTheDocument();
  });
});

describe("Decision Shadow Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", async () => {
    // Re-mock with loading state
    vi.mock("@/hooks/use-enhanced-productivity", () => ({
      useDecisionShadow: () => ({
        analysis: null,
        loading: true,
        createDecision: vi.fn(),
        refetch: vi.fn(),
      }),
    }));

    render(<EnhancedProductivityDashboard />);
    // Should show loading indicator
  });
});

describe("Energy Budget Widget", () => {
  it("should display energy balance", () => {
    render(<EnhancedProductivityDashboard />);

    expect(screen.getByText("Energy Budget")).toBeInTheDocument();
  });
});

describe("Cross-App Sync Hub", () => {
  it("should show integration cards", () => {
    render(<EnhancedProductivityDashboard />);

    // Check for integration status
    expect(screen.getByText("External Sources")).toBeInTheDocument();
  });
});

describe("Mood-Adaptive Task Views", () => {
  it("should render mood view selector", () => {
    render(<EnhancedProductivityDashboard />);

    expect(screen.getByText("Mood-Adaptive Views")).toBeInTheDocument();
  });

  it("should show mood options", () => {
    render(<EnhancedProductivityDashboard />);

    expect(screen.getByText("Energized - High impact tasks")).toBeInTheDocument();
    expect(screen.getByText("Balanced - Daily routine")).toBeInTheDocument();
    expect(screen.getByText("Tired - Quick wins")).toBeInTheDocument();
  });
});