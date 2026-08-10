import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnhancedProductivityDashboard } from "../enhanced-productivity-dashboard";

// Mock the hooks module
vi.mock("@/hooks/use-enhanced-productivity", () => ({
  useCognitiveLoad: vi.fn(),
  useEnergyBudget: vi.fn(),
  useExternalTasks: vi.fn(),
  useDecisionShadow: vi.fn(),
  useMoodTracking: vi.fn(),
}));

// Import the mocked hooks to control their return values
import {
  useCognitiveLoad,
  useEnergyBudget,
  useExternalTasks,
  useDecisionShadow,
  useMoodTracking,
} from "@/hooks/use-enhanced-productivity";

const setupMockHooks = (overrides: Partial<{
  cognitiveLoad: ReturnType<typeof useCognitiveLoad>;
  energyBudget: ReturnType<typeof useEnergyBudget>;
  externalTasks: ReturnType<typeof useExternalTasks>;
  decisionShadow: ReturnType<typeof useDecisionShadow>;
  moodTracking: ReturnType<typeof useMoodTracking>;
}> = {}) => {
  (useCognitiveLoad as any).mockReturnValue(overrides.cognitiveLoad || {
    analysis: {
      loadTrend: "stable",
      completionRate: 0.75,
      recommendations: ["Focus on high-priority tasks"],
    },
    loading: false,
    logLoad: vi.fn(),
    refetch: vi.fn(),
  });

  (useEnergyBudget as any).mockReturnValue(overrides.energyBudget || {
    budget: { balance: 78, dailyLimit: 100, spent: 22 },
    profile: { wake_hour: 7, sleep_hour: 23 },
    loading: false,
    updateProfile: vi.fn(),
    logEnergy: vi.fn(),
    refetch: vi.fn(),
  });

  (useExternalTasks as any).mockReturnValue(overrides.externalTasks || {
    tasks: [],
    loading: false,
    convertToTask: vi.fn(),
    refetch: vi.fn(),
  });

  (useDecisionShadow as any).mockReturnValue(overrides.decisionShadow || {
    analysis: {
      totalDecisions: 12,
      avgOutcomeRating: 3.8,
    },
    loading: false,
    createDecision: vi.fn(),
    refetch: vi.fn(),
  });

  (useMoodTracking as any).mockReturnValue(overrides.moodTracking || {
    recommendations: { primaryMood: "balanced" },
    loading: false,
    logMood: vi.fn(),
    getRecommendations: vi.fn(),
    refetch: vi.fn(),
  });
};

describe("Enhanced Productivity Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Overview Tab", () => {
    it("should render all overview cards", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("Enhanced Productivity Hub")).toBeInTheDocument();
    });

    it("should display cognitive load status", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("Cognitive Load")).toBeInTheDocument();
      expect(screen.getByText("Stable")).toBeInTheDocument();
    });

    it("should display energy balance", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("Energy Budget")).toBeInTheDocument();
    });

    it("should show integration cards", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("External Sources")).toBeInTheDocument();
    });
  });

  describe("Decision Shadow Tracker", () => {
    it("should render loading state", () => {
      setupMockHooks({
        decisionShadow: {
          analysis: null,
          loading: true,
          createDecision: vi.fn(),
          refetch: vi.fn(),
        },
      });

      render(<EnhancedProductivityDashboard />);
      // Component should not crash with loading state
    });

    it("should display total decisions", () => {
      setupMockHooks({
        decisionShadow: {
          analysis: {
            totalDecisions: 15,
            avgOutcomeRating: 4.2,
          },
          loading: false,
          createDecision: vi.fn(),
          refetch: vi.fn(),
        },
      });

      render(<EnhancedProductivityDashboard />);
      expect(screen.getByText("15")).toBeInTheDocument();
    });
  });

  describe("Mood-Adaptive Task Views", () => {
    it("should render mood view selector", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("Mood-Adaptive Views")).toBeInTheDocument();
    });

    it("should show mood options", () => {
      setupMockHooks();
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText("Energized - High impact tasks")).toBeInTheDocument();
      expect(screen.getByText("Balanced - Daily routine")).toBeInTheDocument();
      expect(screen.getByText("Tired - Quick wins")).toBeInTheDocument();
    });
  });
});