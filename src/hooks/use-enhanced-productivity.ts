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

export function useCognitiveLoad() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

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

export function useEnergyBudget() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EnergyProfile | null>(null);
  const [budget, setBudget] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enhanced-productivity/energy-budget');
      const data = await res.json();
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

  const logEnergy = useCallback(async (data: any) => {
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
      setBudget((prev: any) => ({ ...prev, balance: result.balance }));
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

export function useExternalTasks(status: string = 'pending') {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

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

export function useDecisionShadow() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  const fetchAnalysis = useCallback(async (limit: number = 20) => {
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

  const createDecision = useCallback(async (decisionData: any) => {
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

export function useMoodTracking() {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any>(null);

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

  const logMood = useCallback(async (moodData: any) => {
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
