/**
 * Productivity Personas and Task DNA
 */

'use server';

import { getDb } from '@/lib/db';
import {
  calculateOptimalSchedule,
  getUserEnergyProfile,
} from '@/lib/ai/scheduler';

export type PersonaType =
  | 'deep_work'
  | 'sprint_runner'
  | 'steady_stream'
  | 'creative_genius'
  | 'strategic_planner';

export type EnergyType =
  | 'morning_energy'
  | 'afternoon_focus'
  | 'creative_window'
  | 'recovery_time'
  | 'morning_routine'
  | 'lunch_break'
  | 'end_of_day';

export interface EnergyLevel {
  time: string;
  level: 1 | 2 | 3 | 4 | 5;
  type: EnergyType;
}

export interface PersonaConfig {
  id: number;
  user_id: number;
  name: string;
  type: PersonaType;
  work_hours: { start: number; end: number };
  energy_pattern: {
    primary_peak: string;
    secondary_peak?: string;
    energy_levels: EnergyLevel[];
  };
  preferred_working_styles: string[];
  focus_traits: string[];
  productivity_signals: {
    high_energy: string[];
    low_energy: string[];
  };
  recommendations: {
    task_assignment: string;
    scheduling: string;
    focus: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TaskDNAResult {
  taskId: number;
  complexity: number;
  cognitiveLoad: number;
  estimatedTime: number;
  requiredEnergy: number;
  bestTimeSlot: string;
  personaMatch: number; // 0-100
  dnaTags: string[];
}

export interface PersonaAnalysis {
  userId: number;
  currentPersona: PersonaConfig;
  detectedPersona: PersonaType;
  confidence: number;
  evidence: {
    completionPatterns: string[];
    timePreferences: string[];
    energyLevels: string[];
  };
  suggestions: string[];
}

export interface PersonaRecommendation {
  personaId: number;
  taskMatch: number;
  timeRecommendation: string;
  technique: string;
  confidence: number;
}

/**
 * Get or create user persona
 */
export async function getUserPersona(
  userId: number
): Promise<PersonaConfig | null> {
  const db = getDb();

  const persona = db
    .prepare(
      `
    SELECT * FROM user_personas
    WHERE user_id = ?
  `
    )
    .get(userId) as PersonaConfig | undefined;

  return persona || null;
}

/**
 * Create or update user persona
 */
export async function saveUserPersona(
  userId: number,
  config: Partial<PersonaConfig>
): Promise<PersonaConfig> {
  const db = getDb();

  const existing = await getUserPersona(userId);
  const energyLevels = config.energy_pattern?.energy_levels || [];

  if (existing) {
    db.prepare(
      `
      UPDATE user_personas
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          work_hours = ?,
          energy_pattern = ?,
          preferred_working_styles = ?,
          focus_traits = ?,
          productivity_signals = ?,
          recommendations = ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `
    ).run(
      config.name,
      config.type,
      JSON.stringify(config.work_hours || { start: 9, end: 17 }),
      JSON.stringify({
        primary_peak: config.energy_pattern?.primary_peak || 'morning',
        secondary_peak: config.energy_pattern?.secondary_peak,
        energy_levels: energyLevels,
      }),
      JSON.stringify(config.preferred_working_styles || []),
      JSON.stringify(config.focus_traits || []),
      JSON.stringify(config.productivity_signals || {}),
      JSON.stringify(config.recommendations || {}),
      userId
    );
  } else {
    db.prepare(
      `
      INSERT INTO user_personas (
        user_id, name, type, work_hours, energy_pattern,
        preferred_working_styles, focus_traits, productivity_signals, recommendations,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(
      userId,
      config.name || 'My Persona',
      config.type || 'steady_stream',
      JSON.stringify(config.work_hours || { start: 9, end: 17 }),
      JSON.stringify({
        primary_peak: config.energy_pattern?.primary_peak || 'morning',
        secondary_peak: config.energy_pattern?.secondary_peak,
        energy_levels: energyLevels,
      }),
      JSON.stringify(config.preferred_working_styles || []),
      JSON.stringify(config.focus_traits || []),
      JSON.stringify(config.productivity_signals || {}),
      JSON.stringify(config.recommendations || {})
    );
  }

  return db
    .prepare('SELECT * FROM user_personas WHERE user_id = ?')
    .get(userId) as PersonaConfig;
}

/**
 * Analyze user to detect their productivity persona
 */
export async function analyzeUserPersona(
  userId: number
): Promise<PersonaAnalysis> {
  const db = getDb();

  // Get completed tasks with timestamps
  const completedTasks = db
    .prepare(
      `
    SELECT completed_at, actual_minutes, priority_score, name
    FROM tasks
    WHERE user_id = ? AND completed = 1
    ORDER BY completed_at DESC
    LIMIT 100
  `
    )
    .all(userId) as any[];

  if (completedTasks.length < 10) {
    return {
      userId,
      currentPersona:
        (await getUserPersona(userId)) || getDefaultPersona(userId),
      detectedPersona: 'steady_stream',
      confidence: 0.3,
      evidence: {
        completionPatterns: ['Not enough data'],
        timePreferences: [],
        energyLevels: [],
      },
      suggestions: ['Complete more tasks to get better persona detection'],
    };
  }

  // Analyze completion times
  const byHour = new Map<number, number>();
  const byDayOfWeek = new Map<number, number>();
  let totalMinutes = 0;

  completedTasks.forEach(task => {
    const date = new Date(task.completed_at);
    const hour = date.getHours();
    const day = date.getDay();

    byHour.set(hour, (byHour.get(hour) || 0) + 1);
    byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + 1);

    if (task.actual_minutes) {
      totalMinutes += task.actual_minutes;
    }
  });

  // Find peak hours
  const peakHours = Array.from(byHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  // Determine persona type
  let detectedType: PersonaType = 'steady_stream';
  const confidence = 0.7;
  const evidence: PersonaAnalysis['evidence'] = {
    completionPatterns: [],
    timePreferences: [],
    energyLevels: [],
  };

  const morningPeaks = peakHours.filter(h => h < 12).length;
  const afternoonPeaks = peakHours.filter(h => h >= 12 && h < 18).length;
  const eveningPeaks = peakHours.filter(h => h >= 18).length;

  if (morningPeaks >= 2) {
    detectedType = 'deep_work';
    evidence.completionPatterns = [
      'Morning peak productivity',
      'Consistent early output',
    ];
  } else if (eveningPeaks >= 2) {
    detectedType = 'creative_genius';
    evidence.completionPatterns = ['Late day creativity', 'Evening focus'];
  } else if (
    peakHours.length > 0 &&
    peakHours[peakHours.length - 1] - (peakHours[0] || 0) > 4
  ) {
    detectedType = 'sprint_runner';
    evidence.completionPatterns = [
      'Burst productivity',
      'Variable energy patterns',
    ];
  }

  evidence.timePreferences = peakHours.map(h => `${h}:00 - ${h + 1}:00`);
  evidence.energyLevels = [
    `${morningPeaks > afternoonPeaks ? 'Morning' : 'Afternoon'} preference`,
  ];

  const suggestions = generatePersonaSuggestions(detectedType);

  const existing = await getUserPersona(userId);
  const currentPersona = existing || getDefaultPersona(userId);

  return {
    userId,
    currentPersona,
    detectedPersona: detectedType,
    confidence,
    evidence,
    suggestions,
  };
}

/**
 * Get default persona for a user
 */
function getDefaultPersona(userId: number): PersonaConfig {
  return {
    id: 0,
    user_id: userId,
    name: 'Default Persona',
    type: 'steady_stream',
    work_hours: { start: 9, end: 17 },
    energy_pattern: {
      primary_peak: 'morning',
      energy_levels: [
        { time: '08:00', level: 2, type: 'morning_routine' },
        { time: '09:00', level: 4, type: 'morning_energy' },
        { time: '10:00', level: 5, type: 'morning_energy' },
        { time: '11:00', level: 3, type: 'afternoon_focus' },
        { time: '12:00', level: 2, type: 'lunch_break' },
        { time: '13:00', level: 3, type: 'afternoon_focus' },
        { time: '14:00', level: 4, type: 'afternoon_focus' },
        { time: '15:00', level: 3, type: 'creative_window' },
        { time: '16:00', level: 3, type: 'creative_window' },
        { time: '17:00', level: 2, type: 'end_of_day' },
        { time: '18:00', level: 1, type: 'recovery_time' },
      ],
    },
    preferred_working_styles: ['time_blocking', 'pomodoro'],
    focus_traits: ['deep_work', 'single_tasking'],
    productivity_signals: {
      high_energy: ['completed early', 'solved complex problems'],
      low_energy: ['task switching', 'email checking'],
    },
    recommendations: {
      task_assignment: 'High-complexity tasks in peak hours',
      scheduling: 'Block 2-3 hour focused sessions',
      focus: 'Eliminate distractions during focus periods',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate suggestions based on persona type
 */
function generatePersonaSuggestions(type: PersonaType): string[] {
  const suggestions: Record<PersonaType, string[]> = {
    deep_work: [
      'Schedule complex tasks in 90-minute blocks',
      'Use time blocking for deep focus sessions',
      'Protect morning hours for high-value work',
    ],
    sprint_runner: [
      'Batch similar tasks together',
      'Set sprint goals and deadlines',
      'Track progress hourly for momentum',
    ],
    steady_stream: [
      'Maintain consistent daily progress',
      'Use standard 25-minute pomodoro sessions',
      'Review and plan at the end of each day',
    ],
    creative_genius: [
      'Save creative work for afternoon/evening',
      'Take breaks between creative sessions',
      'Use meditation or light exercise to recharge',
    ],
    strategic_planner: [
      'Plan the night before',
      'Review weekly goals each morning',
      'Focus on big-picture tasks',
    ],
  };

  return suggestions[type] || suggestions.steady_stream;
}

/**
 * Calculate Task DNA for a specific task
 */
export async function calculateTaskDNA(
  taskId: number,
  userId: number
): Promise<TaskDNAResult> {
  const db = getDb();

  const task = db
    .prepare(
      `
    SELECT t.*, td.depends_on_task_id as dependency
    FROM tasks t
    LEFT JOIN task_dependencies td ON t.id = td.task_id
    WHERE t.id = ? AND t.user_id = ?
  `
    )
    .all(taskId, userId) as any[];

  if (task.length === 0) {
    throw new Error('Task not found');
  }

  // Calculate complexity based on dependencies and description
  const dependencyCount = task.filter(t => t.dependency).length;
  const descriptionLength = (task[0].description || '').length;
  const complexity = Math.min(
    1,
    dependencyCount * 0.2 + descriptionLength / 500
  );

  // Cognitive load based on priority and type
  const priorityScore = task[0].priority_score || 50;
  const cognitiveLoad = priorityScore / 100;

  // Estimate required time
  const estimateMinutes = parseDuration(task[0].estimate) || 30;
  const estimatedTime = estimateMinutes;

  // Required energy level based on complexity and deadline
  const isUrgent =
    task[0].deadline &&
    new Date(task[0].deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const requiredEnergy = Math.min(
    5,
    Math.ceil(complexity * 3) + (isUrgent ? 1 : 0)
  );

  // Find best time slot
  const schedule = await calculateOptimalSchedule(userId, [taskId]);
  const bestSlot = schedule.optimalTimes[0];
  const bestTimeSlot = bestSlot?.startTime || '09:00';

  // Determine persona match
  const persona = await analyzeUserPersona(userId);
  const energyProfile = await getUserEnergyProfile(userId);

  const taskHour = parseInt(bestSlot?.startTime?.split(':')[0] || '9');
  const peakHours = energyProfile.peakEnergyTimes.flatMap(range => [
    parseInt(range.start.split(':')[0]),
    parseInt(range.end.split(':')[0]),
  ]);

  const isInPeak = peakHours.some(
    h => h === taskHour || (h < taskHour && taskHour < h + 2)
  );
  const personaMatch = isInPeak ? 85 : 65;

  const dnaTags = [
    complexity > 0.5 ? 'complex' : 'simple',
    cognitiveLoad > 0.5 ? 'high_cognitive' : 'low_cognitive',
    estimatedTime > 60 ? 'long_session' : 'short_session',
    isUrgent ? 'urgent' : 'not_urgent',
    dependencyCount > 0 ? 'has_dependencies' : 'independent',
  ];

  return {
    taskId,
    complexity,
    cognitiveLoad,
    estimatedTime,
    requiredEnergy,
    bestTimeSlot,
    personaMatch,
    dnaTags,
  };
}

/**
 * Match tasks to user persona
 */
export async function matchTasksToPersona(
  userId: number,
  taskIds: number[]
): Promise<TaskDNAResult[]> {
  const results = await Promise.all(
    taskIds.map(id => calculateTaskDNA(id, userId).catch(() => null))
  );

  return results.filter((r): r is TaskDNAResult => r !== null);
}

/**
 * Get persona-specific task recommendations
 */
export async function getPersonaRecommendations(
  userId: number
): Promise<PersonaRecommendation[]> {
  const db = getDb();

  const persona = await analyzeUserPersona(userId);
  const personaData = await getUserPersona(userId);

  // Get incomplete tasks
  const tasks = db
    .prepare(
      `
    SELECT id, name, priority_score, deadline, estimate
    FROM tasks
    WHERE user_id = ? AND completed = 0
  `
    )
    .all(userId) as any[];

  const recommendations: PersonaRecommendation[] = [];

  for (const task of tasks) {
    const dna = await calculateTaskDNA(task.id, userId).catch(() => null);
    if (!dna) continue;

    // Calculate match based on persona
    let match = 50;

    // Time-based matching
    if (persona.currentPersona?.type === 'deep_work') {
      if (task.priority_score > 70) match += 30;
    } else if (persona.currentPersona?.type === 'creative_genius') {
      const estimatedMinutes = parseDuration(task.estimate);
      if (task.estimate && estimatedMinutes && estimatedMinutes > 120)
        match += 25;
    } else if (persona.currentPersona?.type === 'steady_stream') {
      if (task.priority_score >= 40 && task.priority_score <= 60) match += 20;
    }

    // Energy matching
    match += dna.personaMatch - 65;

    recommendations.push({
      personaId: persona.currentPersona?.id || 0,
      taskMatch: Math.min(100, Math.max(0, match)),
      timeRecommendation: dna.bestTimeSlot,
      technique: getPersonaTechnique(
        persona.currentPersona?.type || 'steady_stream'
      ),
      confidence: persona.confidence,
    });
  }

  return recommendations.sort((a, b) => b.taskMatch - a.taskMatch).slice(0, 5);
}

function getPersonaTechnique(type: PersonaType): string {
  const techniques: Record<PersonaType, string> = {
    deep_work: '90-minute focused blocks with zero interruptions',
    sprint_runner: 'Batch similar tasks, track progress hourly',
    steady_stream: '25-minute pomodoros with 5-minute breaks',
    creative_genius: '2-hour creative sessions with meditation breaks',
    strategic_planner: 'Time-boxed planning and review sessions',
  };

  return techniques[type] || techniques.steady_stream;
}

/**
 * Parse duration string to minutes
 */
function parseDuration(duration: string | null): number | null {
  if (!duration) return null;

  const match = duration.match(/(\d+)(min|hr|h)?/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2] || 'min';

  if (unit.startsWith('h') || unit === 'hr') {
    return value * 60;
  }
  return value;
}

/**
 * Get productivity persona types for selection
 */
export async function getPersonaTypes(): Promise<
  Array<{
    id: PersonaType;
    name: string;
    description: string;
    icon: string;
  }>
> {
  return [
    {
      id: 'deep_work',
      name: 'Deep Worker',
      description: 'Thrives on 1-3 hour focused blocks, best in morning hours',
      icon: '🧠',
    },
    {
      id: 'sprint_runner',
      name: 'Sprint Runner',
      description: 'Bursts of high energy, prefers varied tasks and deadlines',
      icon: '⚡',
    },
    {
      id: 'steady_stream',
      name: 'Steady Streamer',
      description: 'Consistent productivity with regular breaks and routine',
      icon: '🏃',
    },
    {
      id: 'creative_genius',
      name: 'Creative Genius',
      description: 'Peak creativity in afternoon/evening, needs recovery time',
      icon: '🎨',
    },
    {
      id: 'strategic_planner',
      name: 'Strategic Planner',
      description:
        'Plans ahead, works best with long-term vision and structure',
      icon: '📊',
    },
  ];
}
