'use server';

// import { getCurrentUser } from '@/lib/session'; // Disabled - not needed in this module
import { aiCache } from './providers';

export interface TaskItem {
  id: number;
  name: string;
  completed?: boolean;
  priority?: string;
  deadline?: string;
  estimate?: string;
  description?: string;
  date?: string;
}

export interface CognitiveLoadAnalysis {
  total_complexity: number;
  time_estimation_confidence: number;
  task_interdependencies: number;
  energy_requirements: number;
  prioritization_difficulty: number;
  memory_load: number;
  burnout_risk: number;
  procrastination_risk: number;
  overwhelm_risk: number;
  suggestions: string[];
  coping_strategies: string[];
  better_alternatives: string[];
}

export interface LoadReductionRecommendation {
  type: 'simplify' | 'delay' | 'prioritize' | 'delegate';
  message: string;
}

export interface FocusThreat {
  type: string;
  intensity: 'high' | 'medium' | 'low';
}

export interface FocusThreatAnalysis {
  threats: FocusThreat[];
  severity: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface FocusPlanBlock {
  period: string;
  tasks: Array<{ id: number; name: string }>;
}

export interface FocusPlan {
  timeBlocks: FocusPlanBlock[];
  recommendations: string[];
}

export interface ProductivityPattern {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  averagePriority: number;
  peakHours: number[];
  recommendations: string[];
}

export interface CognitiveState {
  current_load_level: 'low' | 'medium' | 'high' | 'overwhelmed';
  focus_ability: 'excellent' | 'good' | 'fair' | 'poor';
  energy_situation: 'peak' | 'high' | 'medium' | 'low' | 'depleted';
  recommendation: 'continue' | 'restructuring_needed' | 'breaks_needed' | 'delegate_suggested';
  immediate_actions: string[];
  recommendations_list: string[];
  longer_term_adjustments: string[];
}

export interface SmartReminder {
  taskId: number;
  message: string;
  priority: string;
}

/**
 * Calculate cognitive load for user's tasks based on multiple factors
 */
export async function calculateCognitiveLoad(
  tasks: TaskItem[],
  userContext: {
    userId: number;
    energyLevel?: 'high' | 'medium' | 'low';
    stressLevel?: number; // 0-10 scale
    availableTime?: number; // minutes
    currentFatigue?: number; // 0-10 scale
  }
): Promise<CognitiveLoadAnalysis> {
  const cacheKey = `cognitive-load:${userContext.userId}`;
  const cached = aiCache.get<CognitiveLoadAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  // Analyze task complexity and load
  const loadAnalysis: CognitiveLoadAnalysis = {
    total_complexity: 0,
    time_estimation_confidence: 0,
    task_interdependencies: 0,
    energy_requirements: 0,
    prioritization_difficulty: 0,
    memory_load: 0,
    // Risk factors
    burnout_risk: 0,
    procrastination_risk: 0,
    overwhelm_risk: 0,
    suggestions: [],
    coping_strategies: [],
    better_alternatives: [],
  };

  // Try AI-powered analysis
  try {
    const ai = await getAIManager();
    if (ai && typeof (ai as unknown as Record<string, unknown>).analyzeCognitiveLoad === 'function') {
      const analysis = await (ai as unknown as { analyzeCognitiveLoad?: (tasks: TaskItem[], ctx: typeof userContext) => Promise<CognitiveLoadAnalysis> }).analyzeCognitiveLoad?.(tasks, userContext) ?? {};
      Object.assign(loadAnalysis, analysis);
    }
  } catch {
    // AI not configured, use fallback analysis
  }

  aiCache.set(cacheKey, loadAnalysis);
  return loadAnalysis;
}

/**
 * Suggest ways to reduce cognitive load
 */
export async function suggestLoadReduction(
  tasks: TaskItem[],
  constraints: {
    userId: number;
    maxLoad?: number;
    deadline?: string;
    preferredApproach?: 'simplify' | 'delegate' | 'prioritize' | 'delay';
  }
): Promise<LoadReductionRecommendation[]> {
  const cacheKey = `load-reduction:${constraints.userId}`;
  const cached = aiCache.get<LoadReductionRecommendation[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const recommendations: LoadReductionRecommendation[] = [];

  // Basic load reduction logic
  if (tasks.length > 10) {
    recommendations.push({
      type: 'simplify',
      message: 'Reduce task count by breaking larger tasks into smaller pieces',
    });
  }

  if (!constraints.maxLoad && tasks.length > 5) {
    recommendations.push({
      type: 'delay',
      message: 'Consider deferring some tasks to tomorrow',
    });
  }

  aiCache.set(cacheKey, recommendations);
  return recommendations;
}

/**
 * Detect potential focus threats or distractions
 */
export interface FocusThreatEnv {
  userId: number;
  timeOfDay?: number;
  recentCompletions?: number;
  recentBreaks?: number;
  notifications?: number;
  emailVolume?: number;
  currentActivity?: string;
}

export async function detectFocusThreats(
  _tasks: TaskItem[],
  environment: FocusThreatEnv
): Promise<FocusThreatAnalysis> {
  const cacheKey = `focus-threats:${environment.userId}`;
  const cached = aiCache.get<FocusThreatAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  const threatAnalysis: FocusThreatAnalysis = {
    threats: [],
    severity: 'low',
    recommendations: [],
  };

  // Basic threat detection
  if (environment.notifications && environment.notifications > 10) {
    threatAnalysis.threats.push({
      type: 'notification_overload',
      intensity: 'high',
    });
  }

  if (environment.emailVolume && environment.emailVolume > 50) {
    threatAnalysis.threats.push({
      type: 'email_intrusion',
      intensity: 'medium',
    });
  }

  // Determine severity
  const threatCount = threatAnalysis.threats.length;
  if (threatCount >= 2) {
    threatAnalysis.severity = 'high';
  } else if (threatCount === 1) {
    threatAnalysis.severity = 'medium';
  }

  // Generate recommendations
  if (threatAnalysis.severity === 'high') {
    threatAnalysis.recommendations.push("Enable 'Do Not Disturb' mode");
    threatAnalysis.recommendations.push('Batch process notifications');
  } else if (threatAnalysis.severity === 'medium') {
    threatAnalysis.recommendations.push('Schedule notification breaks');
  }

  threatAnalysis.recommendations.push('Focus on one task at a time');

  aiCache.set(cacheKey, threatAnalysis);
  return threatAnalysis;
}

/**
 * Generate optimal focus plan for user
 */
export interface FocusContext {
  userId: number;
  energyProfile?: { peak_hours?: Array<{ hour: number; productivity_score: number }> };
  availableTimeBlocks?: Array<{ start: string; end: string; activity?: string }>;
  preferredWorkingStyle?: 'deep_work' | 'broad_exploration' | 'scheduled' | 'flexible';
  goals?: Array<{ name: string; target: number; deadline?: string }>;
}

export async function generateFocusPlan(
  tasks: TaskItem[],
  context: FocusContext
): Promise<FocusPlan> {
  const cacheKey = `focus-plan:${context.userId}`;
  const cached = aiCache.get<FocusPlan>(cacheKey);
  if (cached) {
    return cached;
  }

  const focusPlan: FocusPlan = {
    timeBlocks: [],
    recommendations: [],
  };

  // Basic focus plan generation based on task priority
  const sortedTasks = [...tasks].sort((a: TaskItem, b: TaskItem) => {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    return (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2);
  });

  // Create 3 time blocks
  const blocks = ['morning', 'afternoon', 'evening'];
  for (let i = 0; i < 3; i++) {
    const blockTasks = sortedTasks.slice(i * 3, (i + 1) * 3);
    focusPlan.timeBlocks.push({
      period: blocks[i],
      tasks: blockTasks.map((t: TaskItem) => ({ id: t.id, name: t.name })),
    });
  }

  focusPlan.recommendations = [
    'Start with critical tasks in the morning',
    'Take regular breaks between time blocks',
    'Review priorities at the end of each block',
  ];

  aiCache.set(cacheKey, focusPlan);
  return focusPlan;
}

/**
 * Analyze user's current cognitive state
 */
export async function analyzeCurrentState(
  userId: number,
  tasks: TaskItem[]
): Promise<CognitiveState> {
  const cacheKey = `current-state:${userId}`;
  const cached = aiCache.get<CognitiveState>(cacheKey);
  if (cached) {
    return cached;
  }

  // Analyze current task list, time patterns, and completion history
  const taskCount = tasks.length;
  const completedCount = tasks.filter((t: TaskItem) => t.completed).length;
  const completionRate = taskCount > 0 ? completedCount / taskCount : 0;

  const loadLevel: 'low' | 'medium' | 'high' | 'overwhelmed' =
    taskCount < 5
      ? 'low'
      : taskCount < 15
        ? 'medium'
        : taskCount < 30
          ? 'high'
          : 'overwhelmed';
  const focusAbility: 'excellent' | 'good' | 'fair' | 'poor' =
    completionRate > 0.8
      ? 'excellent'
      : completionRate > 0.5
        ? 'good'
        : completionRate > 0.2
          ? 'fair'
          : 'poor';
  const energySituation: 'peak' | 'high' | 'medium' | 'low' | 'depleted' =
    loadLevel === 'low' ? 'peak' : loadLevel === 'medium' ? 'high' : 'medium';
  const recommendation:
    | 'continue'
    | 'restructuring_needed'
    | 'breaks_needed'
    | 'delegate_suggested' =
    loadLevel === 'overwhelmed'
      ? 'restructuring_needed'
      : loadLevel === 'high'
        ? 'breaks_needed'
        : 'continue';

  const stateAnalysis: CognitiveState = {
    current_load_level: loadLevel,
    focus_ability: focusAbility,
    energy_situation: energySituation,
    recommendation: recommendation,
    immediate_actions: [],
    recommendations_list: [],
    longer_term_adjustments: [],
  };

  // Add recommendations based on state
  if (loadLevel === 'overwhelmed') {
    stateAnalysis.immediate_actions.push(
      'Prioritize and cancel lowest priority tasks'
    );
    stateAnalysis.recommendations_list = [
      'Delegate tasks where possible',
      'Break large tasks into smaller pieces',
    ];
  } else if (loadLevel === 'high') {
    stateAnalysis.immediate_actions.push('Take a short break to reset focus');
  }

  aiCache.set(cacheKey, stateAnalysis);
  return stateAnalysis;
}

export interface SmartReminderContext {
  currentTime?: Date;
  userBehavior?: unknown;
  externalEvents?: Array<{ date: string; title: string }>;
}

/**
 * Generate smart reminders and prompts
 */
export async function generateSmartReminders(
  userId: number,
  tasks: TaskItem[],
  context?: SmartReminderContext
): Promise<SmartReminder[]> {
  const cacheKey = `smart-reminders:${userId}`;
  const cached = aiCache.get<SmartReminder[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const reminders: SmartReminder[] = [];
  const now = context?.currentTime || new Date();

  // Generate reminders for upcoming deadlines
  tasks.forEach((task: TaskItem) => {
    if (task.deadline && task.deadline !== '') {
      const deadline = new Date(task.deadline);
      const hoursUntil =
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil <= 24 && hoursUntil > 0) {
        reminders.push({
          taskId: task.id,
          message: `Task "${task.name}" is due in ${Math.ceil(hoursUntil)} hours`,
          priority: task.priority || 'medium',
        });
      }
    }
  });

  aiCache.set(cacheKey, reminders);
  return reminders;
}

export interface ProductivityPatternResult {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  averagePriority: number;
  peakHours: number[];
  recommendations: string[];
}

/**
 * Analyze productivity patterns and suggest optimizations
 */
export async function analyzeProductivityPatterns(
  userId: number,
  tasks: TaskItem[],
  _timeRange: { start: string; end: string }
): Promise<ProductivityPatternResult> {
  const cacheKey = `productivity-patterns:${userId}`;
  const cached = aiCache.get<ProductivityPatternResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Basic productivity analysis
  const completedTasks = tasks.filter((t: TaskItem) => t.completed);
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? completedTasks.length / totalTasks : 0;

  const patterns: ProductivityPatternResult = {
    completionRate,
    totalTasks,
    completedTasks: completedTasks.length,
    averagePriority:
      completedTasks.reduce(
        (sum: number, t: TaskItem) =>
          sum +
          (t.priority === 'critical'
            ? 4
            : t.priority === 'high'
              ? 3
              : t.priority === 'medium'
                ? 2
                : 1),
        0
      ) / Math.max(completedTasks.length, 1),
    peakHours: [9, 10, 14, 15], // Default peak hours
    recommendations: [],
  };

  if (completionRate > 0.7) {
    patterns.recommendations.push('Maintain current productivity pace');
  } else if (completionRate > 0.4) {
    patterns.recommendations.push('Focus on completing high-priority tasks');
  } else {
    patterns.recommendations.push(
      'Reduce task load and improve time estimation'
    );
  }

  aiCache.set(cacheKey, patterns);
  return patterns;
}

export interface CognitiveLoadPrediction {
  predictedLoad: number;
  overloadRisk: 'high' | 'medium' | 'low';
  timing: string;
  recommendations: string[];
}

/**
 * Predict and prevent cognitive overload
 */
export async function predictCognitiveLoad(
  userId: number,
  upcomingTasks: TaskItem[],
  _currentContext: unknown
): Promise<CognitiveLoadPrediction> {
  const cacheKey = `cognitive-predict:${userId}`;
  const cached = aiCache.get<CognitiveLoadPrediction>(cacheKey);
  if (cached) {
    return cached;
  }

  // Simple load prediction based on task count and complexity
  const taskCount = upcomingTasks.length;
  const avgPriority =
    upcomingTasks.reduce((sum: number, t: TaskItem) => {
      const priorityValue =
        t.priority === 'critical'
          ? 4
          : t.priority === 'high'
            ? 3
            : t.priority === 'medium'
              ? 2
              : 1;
      return sum + priorityValue;
    }, 0) / Math.max(taskCount, 1);

  const predictedLoad = taskCount * (avgPriority / 4);
  const overloadRisk =
    predictedLoad > 10 ? 'high' : predictedLoad > 5 ? 'medium' : 'low';

  const prediction: CognitiveLoadPrediction = {
    predictedLoad,
    overloadRisk,
    timing: 'current',
    recommendations:
      overloadRisk !== 'low'
        ? [
            'Consider delegating some tasks',
            'Break large tasks into smaller pieces',
          ]
        : ['Continue with current pace'],
  };

  aiCache.set(cacheKey, prediction);
  return prediction;
}

/**
 * Generate personalized productivity tips
 */
export async function generateProductivityTips(
  userId: number,
  tasks: TaskItem[],
  _context?: {
    currentTime?: Date;
    energyLevel?: string;
    taskStatus?: 'stuck' | 'progress' | 'completed';
  }
): Promise<string[]> {
  const cacheKey = `productivity-tips:${userId}`;
  const cached = aiCache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const tips: string[] = [];

  // Generate tips based on task analysis
  const pendingTasks = tasks.filter((t: TaskItem) => !t.completed);
  const criticalTasks = pendingTasks.filter(
    (t: TaskItem) => t.priority === 'critical'
  );

  if (criticalTasks.length > 0) {
    tips.push(`Focus on your ${criticalTasks.length} critical task(s) first`);
  }

  tips.push('Use the Pomodoro technique for focused work sessions');
  tips.push('Take a 5-minute break every 25 minutes of focused work');
  tips.push('Review and update your task priorities daily');

  aiCache.set(cacheKey, tips);
  return tips;
}

export interface FocusPatternResult {
  morningFocus: boolean;
  peakPeriod: 'morning' | 'afternoon';
  streakLength: number;
  improvementAreas: string[];
}

/**
 * Analyze user's focus patterns and suggest optimizations
 */
export async function analyzeFocusPatterns(
  userId: number,
  tasks: TaskItem[]
): Promise<FocusPatternResult> {
  const cacheKey = `focus-patterns:${userId}`;
  const cached = aiCache.get<FocusPatternResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Basic focus pattern analysis
  const completedInMorning = tasks.filter(
    (t: TaskItem) => t.completed && t.date && new Date(t.date).getHours() < 12
  ).length;
  const completedInAfternoon = tasks.filter(
    (t: TaskItem) => t.completed && t.date && new Date(t.date).getHours() >= 12
  ).length;

  const patterns: FocusPatternResult = {
    morningFocus: completedInMorning > completedInAfternoon,
    peakPeriod:
      completedInMorning > completedInAfternoon ? 'morning' : 'afternoon',
    streakLength: 0,
    improvementAreas: [],
  };

  // Calculate consecutive days of completion
  const completedDates = [
    ...new Set(tasks.filter((t: TaskItem) => t.completed).map((t: TaskItem) => t.date)),
  ]
    .sort()
    .reverse();
  if (completedDates.length > 0) {
    let streak = 1;
    for (let i = 1; i < completedDates.length; i++) {
      const prevDate = new Date(completedDates[i - 1] || '');
      const currDate = new Date(completedDates[i] || '');
      const diffDays = Math.abs(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    patterns.streakLength = streak;
  }

  if (patterns.streakLength < 3) {
    patterns.improvementAreas.push('Build consistent daily habits');
  }

  aiCache.set(cacheKey, patterns);
  return patterns;
}

// AI Manager helper
async function getAIManager() {
  const { AIManager } = await import('./providers');
  return new AIManager();
}
