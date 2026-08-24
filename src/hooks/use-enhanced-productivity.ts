'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// COGNITIVE LOAD HOOK
// ============================================================================

export interface CognitiveLoadState {
  taskCount: number;
  completedCount: number;
  focusBlocks: number;
  interruptionCount: number;
  avgTimePerTask: number;
}

export interface CognitiveLoadAnalysis {
  totalTasks?: number;
  completedTasks?: number;
  avgFocusBlocks?: number;
  interruptionRate?: number;
  // Additional properties used by components
  avgTaskCount?: number;
  completionRate?: number;
  avgEnergyLevel?: number;
  loadTrend?: 'increasing' | 'decreasing' | 'stable';
  recommendations?: string[];
  avgInterruptions?: number;
}

export function useCognitiveLoad() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<CognitiveLoadAnalysis | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        '/api/enhanced-productivity/cognitive-load?days=7'
      );
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to fetch cognitive load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const logLoad = useCallback(async (data: CognitiveLoadState) => {
    const res = await fetch('/api/enhanced-productivity/cognitive-load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        ...data,
      }),
    });
    return res.json();
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { analysis, loading, logLoad, refetch: fetchAnalysis };
}

// ============================================================================
// ENERGY BUDGET HOOK
// ============================================================================

export interface EnergyProfile {
  wake_hour: number;
  sleep_hour: number;
  work_hours: { start: number; end: number };
  peak_energy_times: Array<{ start: string; end: string }>;
  energy_levels: Array<{ time: string; level: number; type: string }>;
  energy_budget: { daily: number; balance: number };
}

export interface EnergyBudget {
  daily: number;
  balance: number;
  spent?: number;
  // Additional properties used by components
  date?: string;
  dailyLimit?: number;
  recovered?: number;
  energy_spent?: number;
  percentageUsed?: number;
}

export interface EnergyData {
  profile: EnergyProfile;
  budget: EnergyBudget;
}

export function useEnergyBudget() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EnergyProfile | null>(null);
  const [budget, setBudget] = useState<EnergyBudget | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enhanced-productivity/energy-budget');
      const data: EnergyData = await res.json();
      setProfile(data.profile);
      setBudget(data.budget);
    } catch (error) {
      console.error('Failed to fetch energy data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (profileData: Partial<EnergyProfile>) => {
      const res = await fetch('/api/enhanced-productivity/energy-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveProfile',
          profile: profileData,
        }),
      });
      return res.json();
    },
    []
  );

  const logEnergy = useCallback(async (data: Partial<EnergyBudget>) => {
    const res = await fetch('/api/enhanced-productivity/energy-budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log',
        ...data,
      }),
    });
    const result = await res.json();
    if (result.balance !== undefined) {
      setBudget((prev: EnergyBudget | null) => prev ? { ...prev, balance: result.balance } : result);
    }
    return result;
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    budget,
    loading,
    updateProfile,
    logEnergy,
    refetch: fetchData,
  };
}

// ============================================================================
// EXTERNAL TASKS HOOK (Cross-App Sync)
// ============================================================================

export interface ExternalTask {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  dueDate?: string;
  createdAt: string;
  // Additional properties used by component
  external_id?: string;
  external_app_type?: string;
  priority?: string;
  confidence?: number;
  due_date?: string;
  energy_cost_estimate?: number;
  created_at?: string;
}

export function useExternalTasks(status = 'pending') {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ExternalTask[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/enhanced-productivity/external-tasks?status=${status}`
      );
      const data = await res.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch external tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  const convertToTask = useCallback(async (externalTaskId: number) => {
    const res = await fetch('/api/enhanced-productivity/external-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'convert',
        taskId: externalTaskId,
      }),
    });
    return res.json();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, convertToTask, refetch: fetchTasks };
}

// ============================================================================
// DECISION SHADOW HOOK
// ============================================================================

export interface DecisionAnalysisItem {
  id: number;
  decision: string;
  outcome?: string;
  confidence: number;
  timestamp: string;
}

export interface DecisionAnalysis {
  items: DecisionAnalysisItem[];
  total: number;
  accuracy: number;
  // Additional properties used by components
  totalDecisions?: number;
  avgOutcomeRating?: number;
  decisionTypes?: Record<string, { avgRating: number }>;
  patternAnalysis?: Array<{ pattern: string; recommendation: string; count?: number; improvement?: string }>;
}

export interface DecisionData {
  decision?: string;
  options?: string[];
  context?: string;
  confidence?: number;
  // Additional properties used by component
  decision_type?: 'approach' | 'priority' | 'tool' | 'timeline' | 'allocation' | 'cancellation';
  question?: string;
  chosen_option_text?: string;
  rationale?: string;
  opportunity_cost?: string;
  outcome?: string;
  outcome_rating?: number;
}

export function useDecisionShadow() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);

  const fetchAnalysis = useCallback(async (limit = 20) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/enhanced-productivity/decisions?limit=${limit}`
      );
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to fetch decision analysis:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDecision = useCallback(async (decisionData: DecisionData) => {
    const res = await fetch('/api/enhanced-productivity/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionData),
    });
    return res.json();
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { analysis, loading, createDecision, refetch: fetchAnalysis };
}

// ============================================================================
// MOOD TRACKING HOOK
// ============================================================================

export interface MoodData {
  mood: number;
  energy: number;
  stress?: number;
  notes?: string;
  timestamp?: string;
}

export interface MoodRecommendations {
  suggestions: string[];
  focusTime: string;
  breakInterval: number;
  recommendations?: string[];
  // Additional properties used by component
  primary_mood?: string;
}

export function useMoodTracking() {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<MoodRecommendations | null>(null);

  const fetchRecommendations = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const res = await fetch(
        `/api/enhanced-productivity/mood?date=${targetDate}`
      );
      const data = await res.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch mood recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const logMood = useCallback(async (moodData: MoodData) => {
    const res = await fetch('/api/enhanced-productivity/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log',
        ...moodData,
      }),
    });
    return res.json();
  }, []);

  const getRecommendations = useCallback(async (date?: string) => {
    const res = await fetch('/api/enhanced-productivity/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recommend',
        date: date || new Date().toISOString().split('T')[0],
      }),
    });
    return res.json();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    logMood,
    getRecommendations,
    refetch: fetchRecommendations,
  };
}

// ============================================================================
// COMBINED HOOK
// ============================================================================

export function useEnhancedProductivity() {
  const cognitiveLoad = useCognitiveLoad();
  const energyBudget = useEnergyBudget();
  const externalTasks = useExternalTasks();
  const decisionShadow = useDecisionShadow();
  const moodTracking = useMoodTracking();

  return {
    cognitiveLoad,
    energyBudget,
    externalTasks,
    decisionShadow,
    moodTracking,
    loading:
      cognitiveLoad.loading ||
      energyBudget.loading ||
      externalTasks.loading ||
      decisionShadow.loading ||
      moodTracking.loading,
    refreshAll: () => {
      cognitiveLoad.refetch();
      energyBudget.refetch();
      externalTasks.refetch();
      decisionShadow.refetch();
      moodTracking.refetch();
    },
  };
}
