/**
 * AI Provider abstraction for task parsing
 * Supports multiple AI providers with fallback
 */

import type { TaskSuggestion, AITaskInput, AIEditCommand } from './index';
import type {
  ProjectPlanInput,
  GeneratedProject,
  ProjectPhase,
  DecisionContext,
  GeneratedDecisionTemplate,
} from './index';
import { logError, logWarn } from '@/lib/logger';
import { taskSuggestionSchema, aiInsightsSchema } from './index';
import {
  formatMinutesToTime,
  parseTimeToMinutes,
  getNextDay,
  parseTimeRange,
  parseTime,
} from '../time-utils';

export interface AIProvider {
  name: string;
  parseTask(input: AITaskInput): Promise<TaskSuggestion>;
  parseTaskStream?(
    input: AITaskInput,
    onChunk: (chunk: string) => void
  ): Promise<TaskSuggestion>;
  generateInsights(
    tasks: Array<{
      name: string;
      completed: boolean;
      priority: string;
      date?: string | null;
      deadline?: string | null;
    }>
  ): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }>;
  generateTasksFromNotes?(
    notes: string,
    context?: { lists?: Array<{ id: number; name: string; emoji: string }> }
  ): Promise<
    Array<{
      name: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
    }>
  >;
  parseEditCommand?(
    text: string,
    context: {
      tasks: Array<{
        id: number;
        name: string;
        completed: boolean;
        priority: string;
      }>;
    }
  ): Promise<AIEditCommand>;
  generateProjectPlan?(input: ProjectPlanInput): Promise<GeneratedProject>;
  generateDecisionTemplate?(
    context: DecisionContext
  ): Promise<GeneratedDecisionTemplate>;
  predictTaskDuration?(
    task: any,
    context?: any
  ): Promise<{
    estimated_duration: number;
    confidence: number;
    factors: string[];
  }>;
}

/**
 * Default timeout for AI API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Helper function to add timeout to a promise
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms`)),
      ms
    );
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Simple in-memory cache for AI responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AICache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const aiCache = new AICache();

/**
 * Keyword-based fallback parser (no API required)
 * Works well for basic task parsing
 */
export class KeywordParser implements AIProvider {
  name = 'keyword-parser';

  private readonly projectPhaseKeywords = {
    planning: ['planning', 'setup', 'foundation', 'design', 'architect'],
    development: [
      'development',
      'coding',
      'building',
      'implementation',
      'feature',
    ],
    testing: ['testing', 'qa', 'quality', 'review', 'debug', 'audit'],
    launch: ['launch', 'release', 'deployment', 'go-live', 'production'],
    maintenance: ['maintenance', 'update', 'optimize', 'refactor', 'support'],
  };

  private readonly phasePriorityKeywords = {
    critical: [
      'critical',
      'urgent',
      'asap',
      'must-have',
      'blocking',
      'immediately',
    ],
    high: ['high priority', 'important', 'soon', 'required', 'needed'],
    medium: [
      'medium priority',
      'normal',
      'standard',
      'important but not urgent',
    ],
    low: ['low priority', 'later', 'optional', 'nice-to-have', 'backlog'],
  };

  private readonly priorityKeywords = {
    critical: ['urgent', 'asap', 'critical', 'high priority', 'deadline'],
    high: ['important', 'high priority', 'soon', 'today', 'this week'],
    medium: ['medium priority', 'normal', 'standard'],
    low: ['low priority', 'later', 'someday', 'optional', 'backlog'],
  };

  private readonly durationKeywords: Record<string, number> = {
    meeting: 30,
    call: 30,
    review: 15,
    write: 120,
    report: 120,
    email: 15,
    research: 60,
    coding: 120,
    design: 90,
    planning: 60,
    reading: 30,
    brainstorm: 45,
    presentation: 60,
    interview: 60,
    debugging: 90,
    refactoring: 120,
  };

  private readonly recurringKeywords = {
    daily: ['daily', 'every day', 'each day'],
    weekly: ['weekly', 'every week', 'each week'],
    weekdays: [
      'weekdays',
      'mon-fri',
      'monday tuesday wednesday thursday friday',
    ],
    monthly: ['monthly', 'every month', 'each month'],
    yearly: ['yearly', 'every year', 'each year'],
  };

  private readonly listKeywords: Record<string, string> = {
    work: 'Work',
    personal: 'Personal',
    health: 'Health',
    finance: 'Finance',
    home: 'Home',
    family: 'Family',
    travel: 'Travel',
    errand: 'Errands',
    gym: 'Health',
    exercise: 'Health',
    meeting: 'Work',
    call: 'Work',
    email: 'Work',
    review: 'Work',
    project: 'Work',
    study: 'Personal',
    learning: 'Personal',
    grocery: 'Shopping',
    buy: 'Shopping',
    doctor: 'Health',
    appointment: 'Health',
    pay: 'Finance',
    bill: 'Finance',
    budget: 'Finance',
    clean: 'Home',
    chore: 'Home',
    trip: 'Travel',
    vacation: 'Travel',
  };

  private readonly dayKeywords = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Common project phase names based on typical project workflows
  private readonly standardPhaseNames = [
    ['Planning', 'Initiation', 'Setup', 'Research', 'Design'],
    ['Development', 'Implementation', 'Building', 'Creation'],
    ['Testing', 'Quality Assurance', 'Review', 'Debugging', 'Audit'],
    ['Launch', 'Release', 'Deployment', 'Go-Live'],
    ['Maintenance', 'Updates', 'Optimization', 'Support'],
  ];

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    const text = input.text.toLowerCase();

    // Extract priority
    let priority: 'critical' | 'high' | 'medium' | 'low' | 'none' = 'none';
    for (const [p, keywords] of Object.entries(this.priorityKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        priority = p as 'critical' | 'high' | 'medium' | 'low' | 'none';
        break;
      }
    }

    // Extract recurring pattern FIRST (before everyMatch check)
    let recurring:
      | 'none'
      | 'daily'
      | 'weekly'
      | 'weekdays'
      | 'monthly'
      | 'yearly'
      | 'custom' = 'none';
    for (const [rec, keywords] of Object.entries(this.recurringKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        recurring = rec as
          | 'none'
          | 'daily'
          | 'weekly'
          | 'weekdays'
          | 'monthly'
          | 'yearly'
          | 'custom';
        break;
      }
    }

    // Variable for custom recurring config (set in everyMatch block below)
    let recurringConfig: string | undefined;

    // Extract duration
    let estimated_duration: number | undefined;
    for (const [keyword, duration] of Object.entries(this.durationKeywords)) {
      if (text.includes(keyword)) {
        estimated_duration = duration;
        break;
      }
    }

    // Extract date patterns
    let suggested_date: string | undefined;
    let deadline: string | undefined;

    // Check for specific dates
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 1000);

    if (text.includes('tomorrow')) {
      suggested_date = tomorrow.toISOString().split('T')[0];
    } else if (text.includes('next week') || text.includes('weekend')) {
      suggested_date = nextWeek.toISOString().split('T')[0];
    } else if (text.includes('today')) {
      suggested_date = today.toISOString().split('T')[0];
    }

    // Check for specific weekdays
    for (const day of this.dayKeywords) {
      if (text.includes(day)) {
        const nextDay = this.getNextDay(day);
        if (!suggested_date)
          suggested_date = nextDay.toISOString().split('T')[0];
        break;
      }
    }

    // Enhanced date parsing: "in X days/weeks"
    const inMatch = text.match(/in\s+(\d+)\s+(day|week|month|year)s?/);
    if (inMatch && !suggested_date) {
      const daysNum = parseInt(inMatch[1]);
      const daysUnit = inMatch[2];
      const multiplier =
        daysUnit === 'day'
          ? 1
          : daysUnit === 'week'
            ? 7
            : daysUnit === 'month'
              ? 30
              : 365;
      const futureDate = new Date(
        Date.now() + daysNum * multiplier * 24 * 60 * 60 * 1000
      );
      suggested_date = futureDate.toISOString().split('T')[0];
    }

    // Parse "every X day/week/month/year" patterns for custom recurring
    // Supports: "every day", "every 3 days", "every week", "every 2 weeks", etc.
    const everyMatch = text.match(
      /every\s+(\d+)\s*(day|week|weekday|month|year)s?/i
    );
    if (everyMatch && recurring === 'none') {
      const recNum = parseInt(everyMatch[1]);
      const recUnit = everyMatch[2].toLowerCase();
      const intervalMap: Record<
        string,
        { interval: number; unit: 'days' | 'weeks' | 'months' | 'years' }
      > = {
        day: { interval: recNum, unit: 'days' },
        week: { interval: recNum, unit: 'weeks' },
        weekday: { interval: 1, unit: 'days' }, // weekdays treated as daily for config
        month: { interval: recNum, unit: 'months' },
        year: { interval: recNum, unit: 'years' },
      };
      const interval = intervalMap[recUnit];
      if (interval) {
        recurring = 'custom';
        // Store for later use in return

        recurringConfig = JSON.stringify(interval);
      }
    }

    // Enhanced deadline parsing
    const deadlinePatterns = [
      {
        pattern: /deadline[:\s]+(\d{4}-\d{2}-\d{2})/i,
        parse: (m: string[]) => m[1],
      },
      {
        pattern: /due[:\s]+(\d{4}-\d{2}-\d{2})/i,
        parse: (m: string[]) => m[1],
      },
      {
        pattern: /by[:\s]+(tomorrow)/i,
        parse: () => tomorrow.toISOString().split('T')[0],
      },
      {
        pattern: /by[:\s]+(next week)/i,
        parse: () => nextWeek.toISOString().split('T')[0],
      },
    ];

    for (const { pattern, parse } of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        deadline = parse(match);
        break;
      }
    }

    // Extract list/project context - first check explicit list mention, then keywords
    let list_name: string | undefined;
    let list_id: number | undefined;

    // Check for explicit list mention
    const listMatch = text.match(
      /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i
    );
    if (listMatch) {
      list_name = listMatch[1].trim();
    }

    // Check context lists if available
    if (input.context?.lists && !list_name) {
      for (const list of input.context.lists) {
        if (
          text.includes(list.name.toLowerCase()) ||
          text.includes(list.emoji)
        ) {
          list_name = list.name;
          list_id = list.id;
          break;
        }
      }
    }

    // Check list keywords
    if (!list_name) {
      for (const [keyword, name] of Object.entries(this.listKeywords)) {
        if (text.includes(keyword)) {
          list_name = name;
          break;
        }
      }
    }

    // Parse time range for start/end times
    const timeRange = this.parseTimeRange(text);

    // Build recurring_config for custom intervals
    if (recurring === 'custom') {
      // recurringConfig is already set above from the everyMatch block
    }

    return {
      name: this.cleanTaskName(input.text),
      description: this.generateDescription(
        input.text,
        priority,
        estimated_duration
      ),
      priority,
      estimated_duration,
      suggested_date: suggested_date ?? undefined,
      recurring,
      recurring_config: recurringConfig,
      list_name,
      list_id,
      deadline: deadline ?? undefined,
      start_time: timeRange?.start_time,
      end_time: timeRange?.end_time,
    };
  }

  private cleanTaskName(text: string): string {
    // Remove common prefixes and keywords
    const prefixes = [
      'create a task for',
      'add',
      'schedule',
      'remind me to',
      'i need to',
      'please',
      "don't forget to",
      'remember to',
      "let's",
      'let us',
    ];

    let name = text;
    for (const prefix of prefixes) {
      name = name.replace(new RegExp(`^${prefix}\\s*`, 'i'), '');
    }

    // Remove trailing context that's not part of the task name
    name = name.replace(/\s*\(due.*?\)$/i, '');
    name = name.replace(/\s*\binbox\b/i, '');

    return name.trim().charAt(0).toUpperCase() + name.slice(1);
  }

  private generateDescription(
    text: string,
    priority: string,
    duration?: number
  ): string | undefined {
    const desc: string[] = [];

    if (priority === 'critical' || text.includes('urgent')) {
      desc.push('High priority task - requires immediate attention');
    }

    if (duration) {
      desc.push(`Estimated time: ${duration} minutes`);
    }

    return desc.length > 0 ? desc.join('. ') : undefined;
  }

  /**
   * Parse time from text - using shared utility
   */
  private parseTime(text: string): { hours: number; minutes: number } | null {
    return parseTime(text);
  }

  /**
   * Parse time range - using shared utility
   */
  private parseTimeRange(
    text: string
  ): { start_time?: string; end_time?: string } | null {
    return parseTimeRange(text);
  }

  /**
   * Find the next occurrence of a specific day - using shared utility
   */
  private getNextDay(dayName: string): Date {
    return getNextDay(dayName);
  }

  /**
   * Generate tasks from bullet points or notes
   */
  async generateTasksFromNotes(notes: string): Promise<
    Array<{
      name: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
    }>
  > {
    const lines = notes.split('\n').filter(line => line.trim());
    const tasks: Array<{
      name: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
    }> = [];

    for (const line of lines) {
      // Remove markdown bullet characters
      const cleanLine = line.replace(/^[\s]*[-*>\d.\)\s]+/, '').trim();
      if (cleanLine && cleanLine.length > 3) {
        tasks.push({
          name: cleanLine,
          priority: 'medium',
        });
      }
    }

    return tasks;
  }

  /**
   * Generate a project plan from natural language description
   */
  async generateProjectPlan(
    input: ProjectPlanInput
  ): Promise<GeneratedProject> {
    const {
      projectName,
      description = '',
      constraints = {},
      context = {},
    } = input;
    const normalizedDescription = (
      description +
      ' ' +
      projectName
    ).toLowerCase();

    // Determine project duration based on constraints or description analysis
    const totalDuration = this.calculateProjectDuration(
      normalizedDescription,
      constraints
    );

    // Identify phases based on keywords in the description
    const phases = this.identifyPhases(normalizedDescription, totalDuration);

    // Calculate total duration (sum of all phase durations)
    let calculatedDuration = 0;
    for (const phase of phases) {
      if (phase.duration_days) {
        calculatedDuration += phase.duration_days;
      }
    }

    // If no phases detected, create a default single phase
    if (phases.length === 0) {
      phases.push({
        name: 'Execution',
        description: `Primary phase for ${projectName}`,
        duration_days: totalDuration,
        priority: 'high',
      });
      calculatedDuration = totalDuration;
    }

    // Distribute remaining days across phases if calculated < total
    if (calculatedDuration < totalDuration) {
      const remainingDays = totalDuration - calculatedDuration;
      // Add remaining days to the highest priority phase or spread across all
      if (phases.length > 0) {
        phases[0] = {
          ...phases[0],
          duration_days: (phases[0].duration_days || 0) + remainingDays,
        };
      }
    }

    return {
      name: projectName,
      description: description || undefined,
      phases,
      total_duration_days: calculatedDuration || totalDuration,
      provider: this.name,
    };
  }

  /**
   * Generate a decision template based on context
   */
  async generateDecisionTemplate(context: {
    decisionType?: string;
    task?: { name: string; priority?: string; deadline?: string };
  }): Promise<{
    name: string;
    prompt_template: string;
    option_template?: string;
    provider: string;
  }> {
    const decisionTemplates: Record<
      string,
      { name: string; prompt_template: string; option_template?: string }
    > = {
      priority: {
        name: 'Priority Decision Template',
        prompt_template:
          "You need to decide on priority for task: {task_name}. Consider: deadline, urgency, impact, effort required. What's the best priority level (critical, high, medium, low)?",
        option_template:
          '[{{ "critical": "Urgent and important - do immediately", "high": "Important but not urgent - schedule soon", "medium": "Standard priority - do when scheduled", "low": "Can wait - low impact" }}]',
      },
      approach: {
        name: 'Approach Decision Template',
        prompt_template:
          "You need to decide on an approach for: {task_name}. What's the best strategy? Consider: available resources, constraints, past learnings, and desired outcome.",
        option_template:
          '[{{ "method1": "Description", "method2": "Description", "method3": "Description" }}]',
      },
      tool: {
        name: 'Tool Selection Template',
        prompt_template:
          'You need to select a tool for: {task_name}. What tool best fits the need? Consider: cost, integration, learning curve, and capabilities.',
        option_template:
          '[{{ "tool_name": "Features, pros, cons", "alternative": "Features, pros, cons" }}]',
      },
      timeline: {
        name: 'Timeline Decision Template',
        prompt_template:
          'You need to decide on a timeline for: {task_name}. When should this be completed? Consider: dependencies, deadlines, and available time.',
        option_template:
          '[{{ "date": "Duration, milestones", "alternative_date": "Duration, milestones" }}]',
      },
      allocation: {
        name: 'Resource Allocation Template',
        prompt_template:
          'You need to allocate resources for: {task_name}. How should resources be distributed? Consider: team capacity, skill requirements, and priority.',
        option_template:
          '[{{ "allocation1": "Resources, rationale", "allocation2": "Resources, rationale" }}]',
      },
      cancellation: {
        name: 'Cancellation Decision Template',
        prompt_template:
          'You need to decide whether to cancel: {task_name}. What are the costs and benefits of cancellation vs. completion? Consider: time invested, remaining work, and opportunity cost.',
        option_template:
          '[{{ "cancel": "Rationale, costs", "complete": "Rationale, benefits", "defer": "Conditions for deferral" }}]',
      },
    };

    const template =
      decisionTemplates[context.decisionType || 'approach'] ||
      decisionTemplates.approach;
    return { ...template, provider: this.name };
  }

  /**
   * Calculate project duration from description and constraints
   */
  private calculateProjectDuration(
    description: string,
    constraints: ProjectPlanInput['constraints']
  ): number {
    // Check for explicit constraint dates
    if (constraints?.deadline && constraints?.startDate) {
      const deadline = new Date(constraints.deadline);
      const startDate = new Date(constraints.startDate);
      const diffDays = Math.ceil(
        (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0) return diffDays;
    }

    // Check for duration keywords in description
    const durationPatterns = [
      { pattern: /(\d+)\s*day/i, days: 1 },
      { pattern: /(\d+)\s*week/i, days: 7 },
      { pattern: /(\d+)\s*month/i, days: 30 },
      { pattern: /(\d+)\s*hour/i, days: 0 },
    ];

    // Look for timeline indicators
    const timelineMatch = description.match(
      /(quick|fast|rapid|short).*?(project|delivery|milestone)/i
    );
    if (timelineMatch) {
      return 14;
    }

    const mediumMatch = description.match(/medium|standard|normal|typical/i);
    if (mediumMatch) {
      return 60;
    }

    const longMatch = description.match(
      /(long|extended|comprehensive|major|enterprise|large)/i
    );
    if (longMatch) {
      return 180;
    }

    // Default duration based on project complexity keywords
    const complexityKeywords = {
      simple: 30,
      basic: 30,
      standard: 60,
      complex: 90,
      advanced: 90,
      enterprise: 180,
      major: 120,
      comprehensive: 150,
    };

    for (const [keyword, defaultDays] of Object.entries(complexityKeywords)) {
      if (description.includes(keyword)) {
        return defaultDays;
      }
    }

    // Check for "sprint" or "agile" patterns
    if (description.includes('sprint') || description.includes('agile')) {
      return 90;
    }

    // Check for "launch" or "rollout" keywords
    if (
      description.includes('launch') ||
      description.includes('rollout') ||
      description.includes('release')
    ) {
      return 60;
    }

    // Default project duration
    return 60;
  }

  /**
   * Identify phases based on keywords in the description
   */
  private identifyPhases(
    description: string,
    totalDuration: number
  ): ProjectPhase[] {
    const phases: ProjectPhase[] = [];
    let remainingDays = totalDuration;

    // Define standard phase templates
    const phaseTemplates: Array<{
      namePattern: string[];
      description?: string;
      priorityKeyword: string[];
      estimatedDays?: number;
    }> = [
      {
        namePattern: ['planning', 'setup', 'design', 'research'],
        description: 'Initial planning, research, and design work',
        priorityKeyword: ['critical', 'important', 'essential', 'foundational'],
        estimatedDays: Math.floor(totalDuration * 0.15),
      },
      {
        namePattern: [
          'development',
          'building',
          'implementation',
          'coding',
          'creation',
        ],
        description: 'Core development and implementation work',
        priorityKeyword: ['high', 'critical', 'essential', 'main'],
        estimatedDays: Math.floor(totalDuration * 0.5),
      },
      {
        namePattern: ['testing', 'review', 'qa', 'quality', 'debug'],
        description: 'Testing, quality assurance, and bug fixes',
        priorityKeyword: ['high', 'important', 'required'],
        estimatedDays: Math.floor(totalDuration * 0.2),
      },
      {
        namePattern: ['launch', 'deployment', 'release', 'go-live'],
        description: 'Final deployment and launch activities',
        priorityKeyword: ['critical', 'urgent', 'must-have', 'final'],
        estimatedDays: Math.floor(totalDuration * 0.1),
      },
      {
        namePattern: ['maintenance', 'support', 'update', 'optimization'],
        description: 'Post-launch monitoring and optimization',
        priorityKeyword: ['medium', 'ongoing', 'support'],
        estimatedDays: Math.floor(totalDuration * 0.05),
      },
    ];

    // Track which phases have been detected
    const detectedPhaseKeys = new Set<string>();

    // Find matching phases based on keywords
    for (const [phaseIndex, template] of phaseTemplates.entries()) {
      const matches = template.namePattern.filter(
        pattern =>
          description.includes(pattern) || detectedPhaseKeys.has(pattern)
      );

      if (matches.length > 0) {
        // Determine priority based on keywords in description
        let priority: 'critical' | 'high' | 'medium' | 'low' | 'none' =
          'medium';
        if (template.priorityKeyword.some(k => description.includes(k))) {
          if (
            template.priorityKeyword.includes('critical') ||
            template.priorityKeyword.includes('must-have') ||
            template.priorityKeyword.includes('urgent')
          ) {
            priority = 'critical';
          } else if (template.priorityKeyword.includes('high')) {
            priority = 'high';
          } else if (template.priorityKeyword.includes('medium')) {
            priority = 'medium';
          } else {
            priority = 'low';
          }
        }

        // Calculate duration (minimum 3 days, use estimatedDays if found)
        let phaseDays =
          template.estimatedDays || Math.max(3, Math.floor(totalDuration / 5));

        // Check if there are specific duration mentions
        const phaseNumberMatch = description.match(
          new RegExp(`${matches[0]}\\s*(\\d+)\\s*(?:day|week)`, 'i')
        );
        if (phaseNumberMatch) {
          const num = parseInt(phaseNumberMatch[1], 10);
          const unit = phaseNumberMatch[2].toLowerCase();
          phaseDays = unit === 'week' ? num * 7 : num;
        }

        // Mark these patterns as detected
        for (const match of matches) {
          detectedPhaseKeys.add(match);
        }

        phases.push({
          name: this.formatPhaseName(matches[0], phaseIndex),
          description: template.description,
          duration_days: phaseDays,
          priority,
        });

        remainingDays -= phaseDays;
      }
    }

    return phases;
  }

  /**
   * Format phase name to be more readable and appropriate
   */
  private formatPhaseName(keyword: string, phaseIndex: number): string {
    const nameMap: Record<string, string> = {
      planning: 'Planning',
      setup: 'Setup',
      design: 'Design',
      research: 'Research',
      development: 'Development',
      building: 'Building',
      implementation: 'Implementation',
      coding: 'Coding',
      creation: 'Creation',
      testing: 'Testing',
      review: 'Review',
      qa: 'QA',
      quality: 'Quality Assurance',
      debug: 'Debugging',
      launch: 'Launch',
      deployment: 'Deployment',
      release: 'Release',
      'go-live': 'Go Live',
      maintenance: 'Maintenance',
      support: 'Support',
      update: 'Update',
      optimization: 'Optimization',
    };

    return (
      nameMap[keyword.toLowerCase()] ||
      keyword.charAt(0).toUpperCase() + keyword.slice(1)
    );
  }

  async generateInsights(
    tasks: Array<{
      name: string;
      completed: boolean;
      priority: string;
      date?: string | null;
      deadline?: string | null;
    }>
  ): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const now = new Date();

    const tips: string[] = [];
    const suggestions: string[] = [];
    const trends: string[] = [];

    // Productivity tips based on completion rate
    if (completionRate < 30) {
      tips.push(
        'Your completion rate is quite low. Try breaking large tasks into smaller, actionable steps.'
      );
    } else if (completionRate < 50) {
      tips.push(
        'Focus on completing high-priority tasks first to improve your completion rate.'
      );
    } else if (completionRate >= 80) {
      tips.push(
        'Great job! Your completion rate is excellent. Consider taking on more challenging tasks.'
      );
    } else if (completionRate >= 60) {
      tips.push(
        'Good progress! Keep focusing on consistency to reach the next level.'
      );
    }

    // Priority-based suggestions
    const criticalTasks = tasks.filter(
      t => t.priority === 'critical' && !t.completed
    );
    const highPriorityTasks = tasks.filter(
      t => t.priority === 'high' && !t.completed
    );

    if (criticalTasks.length > 3) {
      suggestions.push(
        `You have ${criticalTasks.length} critical tasks pending. Consider breaking them into smaller steps.`
      );
    } else if (criticalTasks.length === 1) {
      suggestions.push(
        `Focus on completing "${criticalTasks[0].name}" - your only critical task.`
      );
    }

    if (highPriorityTasks.length > 5) {
      suggestions.push(
        `${highPriorityTasks.length} high-priority tasks could be rescheduled if not urgent.`
      );
    }

    // Overdue analysis
    const overdueTasks = tasks.filter(
      t => t.deadline && new Date(t.deadline) < now && !t.completed
    );
    if (overdueTasks.length > 0) {
      const oldestOverdue = overdueTasks.reduce(
        (oldest, t) =>
          t.deadline &&
          (!oldest.deadline || new Date(t.deadline) < new Date(oldest.deadline))
            ? t
            : oldest,
        { deadline: null as string | null } as (typeof tasks)[0]
      );
      suggestions.push(
        `${overdueTasks.length} task(s) are overdue. Review and update deadlines or prioritize completion.`
      );
      if (oldestOverdue.deadline) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(oldestOverdue.deadline).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        suggestions.push(
          `Your oldest overdue task "${oldestOverdue.name}" has been pending for ${daysOverdue} days.`
        );
      }
    }

    // Deadline proximity suggestions
    const thisWeek = tasks.filter(
      t =>
        t.deadline &&
        new Date(t.deadline) >= now &&
        new Date(t.deadline) <=
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) &&
        !t.completed
    );
    if (thisWeek.length > 0) {
      tips.push(
        `${thisWeek.length} task(s) due this week. Consider blocking dedicated time for them.`
      );
    }

    // Trends analysis
    trends.push(`Current completion rate: ${completionRate}%`);
    trends.push(
      `${criticalTasks.length} critical, ${highPriorityTasks.length} high-priority tasks in progress`
    );
    trends.push(
      `${overdueTasks.length} overdue, ${thisWeek.length} due this week`
    );

    // Productivity insights
    const avgCompletion = tasks.length > 0 ? completed / tasks.length : 0;
    if (avgCompletion > 0.8) {
      trends.push(
        'Excellent productivity - consider setting more ambitious goals'
      );
    } else if (avgCompletion > 0.5) {
      trends.push('Steady progress - focus on consistency');
    } else {
      trends.push('Opportunity to improve task completion habits');
    }

    return { tips, suggestions, trends };
  }

  async predictTaskDuration(
    task: {
      name: string;
      description?: string;
      priority?: string;
      estimate?: string;
      date?: string;
      deadline?: string;
    },
    context?: {
      userId?: number;
      taskHistory?: any[];
      factors?: {
        taskComplexity?: 'simple' | 'moderate' | 'complex';
        energyLevel?: 'high' | 'medium' | 'low';
        deadlineUrgency?: number;
      };
    }
  ): Promise<{
    estimated_duration: number;
    confidence: number;
    factors: string[];
  }> {
    const factors: string[] = [];

    // Base duration based on priority
    let estimatedDuration = 45; // default 45 minutes
    if (task.priority === 'critical') {
      estimatedDuration = 120;
      factors.push('priority');
    } else if (task.priority === 'high') {
      estimatedDuration = 90;
      factors.push('priority');
    } else if (task.priority === 'medium') {
      estimatedDuration = 60;
    } else if (task.priority === 'low') {
      estimatedDuration = 30;
    }

    // Adjust based on task complexity
    const textLength =
      (task.name || '').length + (task.description || '').length;
    if (textLength > 200) {
      estimatedDuration += 30;
      factors.push('complexity');
    }

    // Adjust based on estimate field
    if (task.estimate) {
      const estimateMinutes = parseTimeToMinutes(task.estimate);
      if (estimateMinutes !== null && estimateMinutes > 0) {
        estimatedDuration = estimateMinutes;
        factors.push('estimate_field');
      }
    }

    // Adjust based on context
    if (context?.factors?.taskComplexity === 'complex') {
      estimatedDuration += 60;
      factors.push('complexity');
    } else if (context?.factors?.taskComplexity === 'simple') {
      estimatedDuration = Math.max(15, estimatedDuration - 30);
    }

    if (context?.factors?.energyLevel === 'low') {
      estimatedDuration += 15;
      factors.push('energy_decrease');
    }

    if (context?.factors?.deadlineUrgency) {
      if (context.factors.deadlineUrgency > 0.7) {
        estimatedDuration -= 15; // Rush
        factors.push('urgency');
      }
    }

    const confidence = factors.length > 0 ? 0.7 + factors.length * 0.05 : 0.6;
    factors.push('historical_data');

    return {
      estimated_duration: Math.max(15, estimatedDuration),
      confidence: Math.min(0.95, confidence),
      factors,
    };
  }
}

/**
 * OpenAI GPT-4 integration for advanced task parsing
 * Requires OPENAI_API_KEY environment variable
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai-gpt4';
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.maxRetries = 3;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, i) * 1000)
          );
        }
      }
    }
    throw lastError;
  }

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const prompt = `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`;

    try {
      return await this.withRetry(async () => {
        const response = await withTimeout(
          fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              stream: false,
            }),
          }),
          DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
          const errorBody = await response.text();
          logError('OpenAI API error', {
            status: response.status,
            body: errorBody,
          });
          throw new Error(
            `OpenAI API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content ?? '{}';
        const parsed = taskSuggestionSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          logWarn('OpenAI response validation failed, using fallback', {
            issues: parsed.error.issues,
          });
          // Fallback to keyword parser on validation failure
          return new KeywordParser().parseTask(input);
        }
        return parsed.data;
      });
    } catch (error) {
      logError(
        'OpenAI parsing failed',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async parseTaskStream(
    input: AITaskInput,
    onChunk: (chunk: string) => Promise<void> | void
  ): Promise<TaskSuggestion> {
    if (!process.env.OPENAI_API_KEY) {
      return new KeywordParser().parseTask(input);
    }

    const prompt = `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return new KeywordParser().parseTask(input);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                accumulatedContent += content;
                await onChunk(content);
              }
            } catch {
              // Skip invalid JSON - streaming chunks may be partial
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Return parsed result from the accumulated content
    try {
      const parsed = taskSuggestionSchema.safeParse(
        JSON.parse(accumulatedContent || '{}')
      );
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // Fall back to keyword parser on parse error
    }

    return new KeywordParser().parseTask(input);
  }

  async generateInsights(
    tasks: Array<{
      name: string;
      completed: boolean;
      priority: string;
      date?: string | null;
      deadline?: string | null;
    }>
  ): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      return { tips: [], suggestions: [], trends: [] };
    }

    const prompt = `
Analyze these tasks and provide productivity insights:

Tasks: ${JSON.stringify(tasks)}

Return JSON:
{
  "tips": ["tip1", "tip2"],
  "suggestions": ["suggestion1"],
  "trends": ["trend1"]
}
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content =
          data.choices[0]?.message?.content ??
          '{"tips":[],"suggestions":[],"trends":[]}';
        const parsed = aiInsightsSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          logWarn('OpenAI insights validation failed', {
            issues: parsed.error.issues,
          });
          return { tips: [], suggestions: [], trends: [] };
        }
        return parsed.data;
      });
    } catch (error) {
      logError(
        'OpenAI insights failed',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      return { tips: [], suggestions: [], trends: [] };
    }
  }

  async generateTasksFromNotes(notes: string): Promise<
    Array<{
      name: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
    }>
  > {
    if (!process.env.OPENAI_API_KEY) {
      return [];
    }

    const prompt = `
Extract actionable tasks from the following notes/bullet points. Return JSON array only:

"${notes}"

Format:
[
  {"name": "Task 1", "description": "optional description", "priority": "medium"},
  {"name": "Task 2", "priority": "high"}
]
Only return valid JSON.
`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return JSON.parse(data.choices[0]?.message?.content || '[]');
    } catch {
      return [];
    }
  }

  async generateProjectPlan(
    input: ProjectPlanInput
  ): Promise<GeneratedProject> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const prompt = `
Generate a detailed project plan from this description:

Project Name: ${input.projectName}
Description: ${input.description || 'No description provided'}
Constraints: ${JSON.stringify(input.constraints || {})}

Return JSON:
{
  "name": "Project Name",
  "description": "Description",
  "phases": [
    {"name": "Phase 1", "description": "...", "duration_days": 10, "priority": "high", "deadline": "YYYY-MM-DD"}
  ],
  "total_duration_days": 30
}
Only return valid JSON.
`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate project plan');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch {
      // Fallback to keyword parser
      return new KeywordParser().generateProjectPlan(input);
    }
  }

  async generateDecisionTemplate(
    context: DecisionContext
  ): Promise<GeneratedDecisionTemplate> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const prompt = `
Generate a decision template for: ${context.decisionType || 'general'}

Context:
- Task: ${context.task?.name}
- Deadline: ${context.task?.deadline}

Return JSON:
{
  "name": "Decision Template Name",
  "prompt_template": "Template for AI reasoning",
  "option_template": "[{\"option\": \"description, pros, cons\"}]"
}
Only return valid JSON.
`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        return {
          name: 'General Decision Template',
          prompt_template:
            'You need to make a decision about: {task_name}. What are the options, pros, and cons of each?',
          option_template: '[{"option": "Description, pros, cons"}]',
          provider: this.name,
        };
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return { ...parsed, provider: this.name };
    } catch {
      return {
        name: 'General Decision Template',
        prompt_template:
          'You need to make a decision about: {task_name}. What are the options, pros, and cons of each?',
        option_template: '[{"option": "Description, pros, cons"}]',
        provider: this.name,
      };
    }
  }
}

/**
 * Claude integration via Anthropic API
 * Requires ANTHROPIC_API_KEY environment variable
 */
export class ClaudeProvider implements AIProvider {
  name = 'claude-sonnet';
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;

  constructor() {
    this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
    this.baseURL = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com';
    this.maxRetries = 3;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, i) * 1000)
          );
        }
      }
    }
    throw lastError;
  }

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const prompt = `
Parse this task request into structured JSON:

"${input.text}"

Return only JSON with these fields:
- name: string (clear, concise task name)
- description: string or null
- priority: "critical" | "high" | "medium" | "low" | "none"
- estimated_duration: number (minutes) or null
- suggested_date: "YYYY-MM-DD" or null
- recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom"
- deadline: "YYYY-MM-DD" or null
`;

    try {
      return await this.withRetry(async () => {
        const response = await withTimeout(
          fetch(`${this.baseURL}/v1/messages`, {
            method: 'POST',
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY!,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: this.model,
              max_tokens: 500,
              messages: [{ role: 'user', content: prompt }],
            }),
          }),
          DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
          const errorBody = await response.text();
          logError('Claude API error', {
            status: response.status,
            body: errorBody,
          });
          throw new Error(
            `Claude API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const content = data.content[0]?.text ?? '{}';
        const parsed = taskSuggestionSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          logWarn('Claude response validation failed, using fallback', {
            issues: parsed.error.issues,
          });
          // Fallback to keyword parser on validation failure
          return new KeywordParser().parseTask(input);
        }
        return parsed.data;
      });
    } catch (error) {
      logError(
        'Claude parsing failed',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async generateInsights(
    tasks: Array<{
      name: string;
      completed: boolean;
      priority: string;
      date?: string | null;
      deadline?: string | null;
    }>
  ): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { tips: [], suggestions: [], trends: [] };
    }

    const prompt = `
Analyze these tasks and provide productivity insights:

${JSON.stringify(tasks)}

Return JSON: {"tips":["..."],"suggestions":["..."],"trends":["..."]}
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/v1/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const content =
          data.content[0]?.text ?? '{"tips":[],"suggestions":[],"trends":[]}';
        const parsed = aiInsightsSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          logWarn('Claude insights validation failed', {
            issues: parsed.error.issues,
          });
          return { tips: [], suggestions: [], trends: [] };
        }
        return parsed.data;
      });
    } catch (error) {
      logError(
        'Claude insights failed',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      return { tips: [], suggestions: [], trends: [] };
    }
  }

  async generateTasksFromNotes(notes: string): Promise<
    Array<{
      name: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
    }>
  > {
    if (!process.env.ANTHROPIC_API_KEY) {
      return [];
    }

    const prompt = `
Extract actionable tasks from the following notes/bullet points. Return JSON array:

"${notes}"

Format:
[
  {"name": "Task 1", "description": "optional description", "priority": "medium"},
  {"name": "Task 2", "priority": "high"}
]
Only return valid JSON.
`;

    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return JSON.parse(data.content[0]?.text ?? '[]');
    } catch {
      return [];
    }
  }

  async generateProjectPlan(
    input: ProjectPlanInput
  ): Promise<GeneratedProject> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const prompt = `
Generate a detailed project plan:

Project Name: ${input.projectName}
Description: ${input.description || 'No description'}
Constraints: ${JSON.stringify(input.constraints || {})}

Return JSON with phases and total_duration_days.
`;

    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        return new KeywordParser().generateProjectPlan(input);
      }

      const data = await response.json();
      const content = data.content[0]?.text ?? '{}';
      return JSON.parse(content);
    } catch {
      return new KeywordParser().generateProjectPlan(input);
    }
  }

  async generateDecisionTemplate(
    context: DecisionContext
  ): Promise<GeneratedDecisionTemplate> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const prompt = `
Generate decision template for: ${context.decisionType || 'general'}

Task: ${context.task?.name}

Return JSON with name, prompt_template, and option_template.
`;

    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const defaultTemplate = {
          name: 'General Decision Template',
          prompt_template:
            'You need to decide on: {task_name}. What are the options?',
          option_template: '[{"option": "description, pros, cons"}]',
          provider: this.name,
        };
        return defaultTemplate;
      }

      const data = await response.json();
      const content = data.content[0]?.text ?? '{}';
      const parsed = JSON.parse(content);
      return { ...parsed, provider: this.name };
    } catch {
      return {
        name: 'General Decision Template',
        prompt_template:
          'You need to decide on: {task_name}. What are the options?',
        option_template: '[{"option": "description, pros, cons"}]',
        provider: this.name,
      };
    }
  }
}

/**
 * Provider manager - selects best available provider
 */
export class AIManager {
  private providers: AIProvider[];

  constructor() {
    this.providers = [];

    // Add keyword parser as fallback
    this.providers.push(new KeywordParser());

    // Add AI providers if configured
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAIProvider());
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push(new ClaudeProvider());
    }
  }

  async parseTask(
    input: AITaskInput
  ): Promise<TaskSuggestion & { provider: string }> {
    // Check cache first (only for keyword parser to avoid stale AI results)
    const cacheKey = `parse:${input.text}`;
    const cachedResult = aiCache.get<TaskSuggestion & { provider: string }>(
      cacheKey
    );
    if (cachedResult) {
      return cachedResult;
    }

    for (const provider of this.providers) {
      try {
        const result = await provider.parseTask(input);
        const resultWithProvider = { ...result, provider: provider.name };

        // Cache keyword parser results
        if (provider.name === 'keyword-parser') {
          aiCache.set(cacheKey, resultWithProvider);
        }

        return resultWithProvider;
      } catch (error) {
        logWarn(`${provider.name} failed, trying next provider`, {
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    // Fallback to keyword parser (should never fail)
    const result = await new KeywordParser().parseTask(input);
    return { ...result, provider: 'keyword-parser' };
  }

  async generateInsights(
    tasks: Array<{
      name: string;
      completed: boolean;
      priority: string;
      date?: string | null;
      deadline?: string | null;
    }>
  ): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
    provider: string;
  }> {
    // Use the first AI provider, fallback to keyword parser
    for (const provider of this.providers) {
      if (provider.name !== 'keyword-parser') {
        try {
          const result = await provider.generateInsights(tasks);
          return { ...result, provider: provider.name };
        } catch (error) {
          logWarn(`${provider.name} insights failed`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const result = await new KeywordParser().generateInsights(tasks);
    return { ...result, provider: 'keyword-parser' };
  }

  async generateTasksFromNotes(
    notes: string,
    context?: {
      lists?: Array<{ id: number; name: string; emoji: string }>;
    }
  ): Promise<Array<TaskSuggestion & { provider: string }>> {
    // Try AI providers first (skip keyword-parser since we want to use it as fallback)
    for (const provider of this.providers) {
      if (
        provider.name !== 'keyword-parser' &&
        typeof (provider as any).generateTasksFromNotes === 'function'
      ) {
        try {
          const result = await (provider as any).generateTasksFromNotes(
            notes,
            context
          );
          if (result && result.length > 0) {
            return result.map((task: TaskSuggestion) => ({
              ...task,
              provider: provider.name,
            }));
          }
        } catch (error) {
          logWarn(
            `${provider.name} notes generation failed, trying next provider`,
            { error: error instanceof Error ? error.message : String(error) }
          );
        }
      }
    }

    // Fallback to keyword parser
    const parser = new KeywordParser();
    const result = await parser.generateTasksFromNotes(notes);
    return result.map(task => ({
      ...task,
      provider: 'keyword-parser',
    }));
  }

  /**
   * Generate a project plan from natural language description
   */
  async generateProjectPlan(
    input: ProjectPlanInput
  ): Promise<GeneratedProject & { provider: string }> {
    // Try providers that support project planning (keyword parser always has it)
    for (const provider of this.providers) {
      if (typeof (provider as any).generateProjectPlan === 'function') {
        try {
          const result = await (provider as any).generateProjectPlan(input);
          if (result) {
            return { ...result, provider: provider.name };
          }
        } catch (error) {
          logWarn(`${provider.name} project plan generation failed`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Fallback to keyword parser (should never fail)
    const parser = new KeywordParser();
    const result = await parser.generateProjectPlan(input);
    return { ...result, provider: 'keyword-parser' };
  }

  /**
   * Generate a decision template based on context
   */
  async generateDecisionTemplate(context: {
    decisionType?: string;
    task?: { name: string; priority?: string; deadline?: string };
  }): Promise<{
    name: string;
    prompt_template: string;
    option_template?: string;
  }> {
    // Try keyword parser first (always available)
    const parser = new KeywordParser();
    try {
      return await parser.generateDecisionTemplate(context);
    } catch (error) {
      logWarn('Decision template generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return a default template
      return {
        name: 'General Decision Template',
        prompt_template:
          'You need to make a decision about: {task_name}. What are the options, pros, and cons of each?',
        option_template: '[{{ "option1": "Description, pros, cons" }}]',
      };
    }
  }

  /**
   * Predict task duration
   */
  async predictTaskDuration(
    task: any,
    context?: any
  ): Promise<{
    estimated_duration: number;
    confidence: number;
    factors: string[];
  }> {
    const provider = this.providers[0]; // Use keyword parser by default
    if (typeof provider.predictTaskDuration === 'function') {
      return provider.predictTaskDuration(task, context);
    }
    // Fallback
    return {
      estimated_duration: 45,
      confidence: 0.6,
      factors: ['default'],
    };
  }

  clearCache(): void {
    aiCache.clear();
  }

  /**
   * Parse natural language edit commands for existing tasks
   */
  async parseEditCommand(
    text: string,
    context: {
      tasks: Array<{
        id: number;
        name: string;
        completed: boolean;
        priority: string;
      }>;
    }
  ): Promise<AIEditCommand & { provider: string }> {
    const cacheKey = `edit:${text}`;
    const cachedResult = aiCache.get<AIEditCommand & { provider: string }>(
      cacheKey
    );
    if (cachedResult) {
      return cachedResult;
    }

    // Check for simple keyword patterns first
    const simpleResult = this.trySimpleEditCommand(text, context);
    if (simpleResult) {
      aiCache.set(cacheKey, { ...simpleResult, provider: 'keyword-parser' });
      return { ...simpleResult, provider: 'keyword-parser' };
    }

    // Try AI providers
    for (const provider of this.providers) {
      try {
        if (
          provider.name !== 'keyword-parser' &&
          typeof (provider as any).parseEditCommand === 'function'
        ) {
          const result = await (provider as any).parseEditCommand(
            text,
            context
          );
          if (result) {
            return { ...result, provider: provider.name };
          }
        }
      } catch (error) {
        logWarn(`${provider.name} edit command failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    // Fallback: return a safe command that won't modify anything
    return { action: 'edit' as const, provider: 'keyword-parser' };
  }

  /**
   * Try to parse using simple keyword patterns
   */
  private trySimpleEditCommand(
    text: string,
    context: {
      tasks: Array<{
        id: number;
        name: string;
        completed: boolean;
        priority: string;
      }>;
    }
  ): AIEditCommand | null {
    // Pattern: "complete/mark done [task name]" or "mark [task] as complete"
    const completeMatch = text.match(
      /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i
    );
    if (completeMatch) {
      const taskName = completeMatch[1].trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        return { action: 'complete', taskId: task.id };
      }
    }

    // Pattern: "delete/remove [task name]"
    const deleteMatch = text.match(
      /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i
    );
    if (deleteMatch) {
      const taskName = deleteMatch[1].trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        return { action: 'delete', taskId: task.id };
      }
    }

    // Pattern: "change priority of [task] to [level]"
    const priorityMatch = text.match(
      /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i
    );
    if (priorityMatch) {
      const taskName = priorityMatch[1].trim();
      const priority = priorityMatch[2].toLowerCase();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        return { action: 'prioritize', taskId: task.id, updates: { priority } };
      }
    }

    // Pattern: "add label [label] to [task]"
    const labelMatch = text.match(
      /(?:add|assign)\s+(?:label\s+)?(\w+)\s+to\s+(.+)/i
    );
    if (labelMatch) {
      const labelName = labelMatch[1];
      const taskName = labelMatch[2].replace(/[.!?]$/, '').trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        return { action: 'add_label', taskId: task.id, updates: { labelName } };
      }
    }

    // Pattern: "move [task] to [list name]" or "move [task] to inbox"
    const moveMatch = text.match(
      /(?:move|put)\s+(?:task\s+)?(.+?)\s+to\s+(.+)/i
    );
    if (moveMatch) {
      const taskName = moveMatch[1].trim();
      const listName = moveMatch[2].trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        return { action: 'edit', taskId: task.id, updates: { listName } };
      }
    }

    // Pattern: "schedule [task] for [date]" or "move [task] to [day]"
    const scheduleMatch = text.match(
      /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s+(?:for|on|to)\s+(.+)/i
    );
    if (scheduleMatch && !completeMatch && !deleteMatch) {
      const taskName = scheduleMatch[1].trim();
      const dateStr = scheduleMatch[2].trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        // Try to parse date
        const date = this.parseNaturalDate(dateStr);
        if (date) {
          return { action: 'schedule', taskId: task.id, updates: { date } };
        }
      }
    }

    // Pattern: "postpone [task] to tomorrow/today/next week"
    const postponeMatch = text.match(
      /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\s+)?(.+)/i
    );
    if (postponeMatch) {
      const taskName = postponeMatch[1].trim();
      const timeRef = postponeMatch[2].trim();
      const task = context.tasks.find(t =>
        t.name.toLowerCase().includes(taskName.toLowerCase())
      );
      if (task) {
        const date = this.parseNaturalDate(timeRef);
        if (date) {
          return { action: 'schedule', taskId: task.id, updates: { date } };
        }
      }
    }

    // Pattern: "search for [query]" or "find [query]"
    const searchMatch = text.match(/(?:search|find)\s+(?:for\s+)?(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      return { action: 'search', searchQuery: query };
    }

    return null;
  }

  /**
   * Parse natural language dates (tomorrow, today, monday, next week, etc.)
   */
  private parseNaturalDate(dateStr: string): string | null {
    const normalized = dateStr.toLowerCase().trim();
    const today = new Date();

    if (normalized === 'today') {
      return today.toISOString().split('T')[0];
    }

    if (normalized === 'tomorrow') {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return tomorrow.toISOString().split('T')[0];
    }

    if (normalized === 'next week' || normalized === 'weekend') {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek.toISOString().split('T')[0];
    }

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    if (dayMap[normalized] !== undefined) {
      const targetDay = dayMap[normalized];
      const daysUntil = (targetDay - today.getDay() + 7) % 7 || 7;
      const targetDate = new Date(
        today.getTime() + daysUntil * 24 * 60 * 60 * 1000
      );
      return targetDate.toISOString().split('T')[0];
    }

    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    // "in X days/weeks"
    const inMatch = normalized.match(/in\s+(\d+)\s+(day|week|month)/);
    if (inMatch) {
      const num = parseInt(inMatch[1]);
      const unit = inMatch[2];
      const multiplier = unit === 'day' ? 1 : unit === 'week' ? 7 : 30;
      const targetDate = new Date(
        today.getTime() + num * multiplier * 24 * 60 * 60 * 1000
      );
      return targetDate.toISOString().split('T')[0];
    }

    return null;
  }
}

// Singleton instance
let aiManager: AIManager | null = null;

export function getAIManager(): AIManager {
  if (!aiManager) {
    aiManager = new AIManager();
  }
  return aiManager;
}
