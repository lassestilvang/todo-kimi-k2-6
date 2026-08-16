import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancedProductivityDashboard } from '../enhanced-productivity-dashboard';

// Mock the hooks module
vi.mock('@/hooks/use-enhanced-productivity', () => ({
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
} from '@/hooks/use-enhanced-productivity';

const setupMockHooks = () => {
  (useCognitiveLoad as any).mockReturnValue({
    analysis: {
      loadTrend: 'stable',
      completionRate: 0.75,
      recommendations: ['Focus on high-priority tasks'],
    },
    loading: false,
    logLoad: vi.fn(),
    refetch: vi.fn(),
  });

  (useEnergyBudget as any).mockReturnValue({
    budget: { balance: 78, dailyLimit: 100, spent: 22 },
    profile: { wake_hour: 7, sleep_hour: 23 },
    loading: false,
    updateProfile: vi.fn(),
    logEnergy: vi.fn(),
    refetch: vi.fn(),
  });

  (useExternalTasks as any).mockReturnValue({
    tasks: [],
    loading: false,
    convertToTask: vi.fn(),
    refetch: vi.fn(),
  });

  (useDecisionShadow as any).mockReturnValue({
    analysis: {
      totalDecisions: 12,
      avgOutcomeRating: 3.8,
    },
    loading: false,
    createDecision: vi.fn(),
    refetch: vi.fn(),
  });

  (useMoodTracking as any).mockReturnValue({
    recommendations: { primaryMood: 'balanced' },
    loading: false,
    logMood: vi.fn(),
    getRecommendations: vi.fn(),
    refetch: vi.fn(),
  });
};

describe('Enhanced Productivity Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockHooks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Overview Tab', () => {
    it('should render all cards', () => {
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText('Cognitive Load')).toBeInTheDocument();
      expect(screen.getByText('Energy Budget')).toBeInTheDocument();
      expect(screen.getByText('Decisions Made')).toBeInTheDocument();
      expect(screen.getByText('External Sources')).toBeInTheDocument();
    });

    it('should display cognitive load status', () => {
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText('Stable')).toBeInTheDocument();
    });

    it('should display energy balance', () => {
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText('78/100')).toBeInTheDocument();
    });

    it('should show integration cards', () => {
      render(<EnhancedProductivityDashboard />);

      expect(screen.getByText('External Sources')).toBeInTheDocument();
    });
  });

  describe('Decision Shadow Tracker', () => {
    it('should render loading state', () => {
      (useDecisionShadow as any).mockReturnValue({
        analysis: null,
        loading: true,
        createDecision: vi.fn(),
        refetch: vi.fn(),
      });

      render(<EnhancedProductivityDashboard />);
      // Component should render without crashing with loading state
      expect(screen.getByText('Decisions Made')).toBeInTheDocument();
    });

    it('should display total decisions', () => {
      (useDecisionShadow as any).mockReturnValue({
        analysis: {
          totalDecisions: 15,
          avgOutcomeRating: 4.2,
        },
        loading: false,
        createDecision: vi.fn(),
        refetch: vi.fn(),
      });

      render(<EnhancedProductivityDashboard />);
      // Decision count appears in decision analysis section
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render the main dashboard container', () => {
      render(<EnhancedProductivityDashboard />);

      const container = document.querySelector('.space-y-6');
      expect(container).toBeInTheDocument();
    });

    it('should render all overview tabs', () => {
      render(<EnhancedProductivityDashboard />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(4);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Energy Planner')).toBeInTheDocument();
      expect(screen.getByText('Task Sync')).toBeInTheDocument();
      expect(screen.getByText('Decision Journal')).toBeInTheDocument();
    });
  });
});
