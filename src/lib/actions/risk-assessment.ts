'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';
import type { Task } from '@/types';

export interface RiskAssessment {
  id: number;
  user_id: number;
  task_id: number | null;
  risk_type: 'schedule' | 'resource' | 'quality' | 'dependency' | 'complexity' | 'external';
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  factors: string | null;
  mitigation: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskAlert {
  id: number;
  user_id: number;
  risk_assessment_id: number;
  message: string;
  is_read: number;
  triggered_at: string;
}

export interface RiskFactors {
  daysUntilDue: number;
  isRecurring: boolean;
  hasDescription: boolean;
  hasEstimate: boolean;
  hasDependencies: number;
  urgencyScore: number;
  complexityScore: number;
  factors: string[];
}

export interface RiskAnalysis {
  risk_id: number;
  task_id: number;
  task_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  probability: number;
  impact: number;
  factors: string[];
  mitigation: string;
  recommendation: string;
}

/**
 * Analyze a single task for risks
 */
export async function analyzeTaskRisk(
  taskId: number
): Promise<RiskAnalysis | null> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return null;
  }

  // Get the task
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId) as Task | undefined;

  if (!task) {
    return null;
  }

  const riskFactors = calculateRiskFactors(task);
  const riskScore = calculateRiskScore(riskFactors);
  const riskLevel = determineRiskLevel(riskScore);

  // Create or update risk assessment
  const assessmentId = await upsertRiskAssessment({
    task_id: task.id,
    risk_type: determineRiskType(task, riskFactors),
    risk_score: riskScore,
    risk_level: riskLevel,
    probability: riskFactors.urgencyScore,
    impact: riskFactors.complexityScore,
    factors: JSON.stringify(riskFactors.factors || []),
    mitigation: generateMitigation(riskLevel, riskFactors),
  });

  // Generate alert if risk is high or critical
  if (riskLevel === 'high' || riskLevel === 'critical') {
    await createRiskAlert(assessmentId, generateAlertMessage(riskLevel, task, riskFactors));
  }

  return {
    risk_id: assessmentId,
    task_id: task.id,
    task_name: task.name,
    risk_level: riskLevel,
    risk_score: riskScore,
    probability: riskFactors.urgencyScore,
    impact: riskFactors.complexityScore,
    factors: riskFactors.factors || [],
    mitigation: generateMitigation(riskLevel, riskFactors),
    recommendation: generateRecommendation(riskLevel, task, riskFactors),
  };
}

/**
 * Analyze all tasks for the current user
 */
export async function analyzeAllTaskRisks(): Promise<RiskAnalysis[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const tasks = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? AND completed = 0 AND archived = 0')
    .all(user.id) as Task[];

  const risks: RiskAnalysis[] = [];

  for (const task of tasks) {
    const risk = await analyzeTaskRisk(task.id);
    if (risk && risk.risk_score > 30) {
      risks.push(risk);
    }
  }

  return risks.sort((a, b) => b.risk_score - a.risk_score);
}

/**
 * Get risk alerts for the current user
 */
export async function getRiskAlerts(options?: { read?: boolean; limit?: number }): Promise<RiskAlert[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  let query = 'SELECT * FROM risk_alerts WHERE user_id = ?';
  const params: unknown[] = [user.id];

  if (options?.read !== undefined) {
    query += ' AND is_read = ?';
    params.push(options.read ? 1 : 0);
  }

  query += ' ORDER BY triggered_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.prepare(query).all(...params) as RiskAlert[];
}

/**
 * Mark risk alert as read
 */
export async function markRiskAlertRead(alertId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  const result = db
    .prepare('UPDATE risk_alerts SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(alertId, user.id);

  return result.changes > 0;
}

/**
 * Mark all risk alerts as read
 */
export async function markAllRiskAlertsRead(): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return;
  }

  db.prepare('UPDATE risk_alerts SET is_read = 1 WHERE user_id = ?').run(user.id);
}

/**
 * Get risk dashboard summary
 */
export async function getRiskDashboard(): Promise<{
  total_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  critical_risks: number;
  alerts_unread: number;
  risk_by_type: Array<{ type: string; count: number }>;
  top_risks: RiskAnalysis[];
}> {
  const risks = await analyzeAllTaskRisks();

  return {
    total_risks: risks.length,
    high_risks: risks.filter(r => r.risk_level === 'high').length,
    medium_risks: risks.filter(r => r.risk_level === 'medium').length,
    low_risks: risks.filter(r => r.risk_level === 'low').length,
    critical_risks: risks.filter(r => r.risk_level === 'critical').length,
    alerts_unread: await getRiskAlertCount(),
    risk_by_type: getRiskByType(risks),
    top_risks: risks.slice(0, 5),
  };
}

/**
 * Get risk alerts count
 */
export async function getRiskAlertCount(): Promise<number> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return 0;
  }

  const result = db
    .prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE user_id = ? AND is_read = 0')
    .get(user.id) as { count: number };

  return result.count;
}

/**
 * Calculate risk factors for a task
 */
function calculateRiskFactors(task: Task): RiskFactors {
  const today = new Date();
  const taskDate = task.date ? new Date(task.date) : today;
  const daysUntilDue = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const factors: string[] = [];

  // Urgency factor
  if (daysUntilDue < 0) factors.push('overdue');
  else if (daysUntilDue <= 1) factors.push('due_today');
  else if (daysUntilDue <= 3) factors.push('due_soon');
  else if (daysUntilDue <= 7) factors.push('due_this_week');

  // Task complexity factors
  if (task.description && task.description.length > 100) factors.push('long_description');
  if (task.date) factors.push('has_deadline');
  if (task.recurring !== 'none') factors.push('recurring');
  if (task.priority === 'critical' || task.priority === 'high') factors.push('high_priority');

  const hasEstimate = task.estimate;
  if (!hasEstimate) factors.push('no_estimate');

  return {
    daysUntilDue,
    isRecurring: task.recurring !== 'none',
    hasDescription: !!(task.description && task.description.trim()),
    hasEstimate: !!hasEstimate,
    hasDependencies: 0, // Would need to query task_dependencies table
    urgencyScore: calculateUrgencyScore(daysUntilDue, task.priority),
    complexityScore: calculateComplexityScore(factors),
    factors,
  };
}

/**
 * Calculate overall risk score
 */
function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  // Urgency component (40% weight)
  score += factors.urgencyScore * 0.4;

  // Complexity component (30% weight)
  score += factors.complexityScore * 0.3;

  // Overdue bonus (critical)
  if (factors.daysUntilDue < 0) {
    score += 30;
  }

  // Estimate missing penalty
  if (!factors.hasEstimate) {
    score += 15;
  }

  // Recurring task complexity
  if (factors.isRecurring) {
    score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Determine risk level from score
 */
function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Determine primary risk type
 */
function determineRiskType(task: Task, factors: RiskFactors): 'schedule' | 'resource' | 'quality' | 'dependency' | 'complexity' | 'external' {
  if (factors.daysUntilDue < 0) return 'schedule';
  if (task.deadline && factors.daysUntilDue > 0) return 'schedule';
  if (factors.isRecurring) return 'quality';
  if (!factors.hasEstimate) return 'resource';
  if (factors.complexityScore > 70) return 'complexity';

  return 'schedule';
}

/**
 * Calculate urgency score (0-100)
 */
function calculateUrgencyScore(daysUntilDue: number, priority: string): number {
  let score = 0;

  if (daysUntilDue < 0) {
    score = 100;
  } else if (daysUntilDue <= 1) {
    score = 90;
  } else if (daysUntilDue <= 3) {
    score = 75;
  } else if (daysUntilDue <= 7) {
    score = 60;
  } else if (daysUntilDue <= 14) {
    score = 40;
  } else if (daysUntilDue <= 30) {
    score = 20;
  } else {
    score = 10;
  }

  // Priority modifier
  if (priority === 'critical') score += 20;
  else if (priority === 'high') score += 10;

  return Math.min(100, score);
}

/**
 * Calculate complexity score (0-100)
 */
function calculateComplexityScore(factors: string[]): number {
  let score = 0;

  if (factors.length > 0) {
    score += factors.length * 15;
  }

  const complexityKeywords = ['integration', 'api', 'database', 'security', 'review', 'deploy'];
  // Would check description for keywords in real implementation

  return Math.min(100, score);
}

/**
 * Generate mitigation suggestions
 */
function generateMitigation(riskLevel: 'low' | 'medium' | 'high' | 'critical', factors: RiskFactors): string {
  const suggestions: string[] = [];

  if (factors.daysUntilDue < 0) {
    suggestions.push('Break task into smaller subtasks');
  }

  if (factors.daysUntilDue <= 3 && factors.daysUntilDue >= 0) {
    suggestions.push('Prioritize this task immediately');
  }

  if (!factors.hasEstimate) {
    suggestions.push('Add time estimate to improve planning');
  }

  if (factors.isRecurring) {
    suggestions.push('Review recurrence pattern and adjust schedule');
  }

  if (riskLevel === 'critical') {
    suggestions.push('Consider delegating or requesting deadline extension');
  }

  return suggestions.length > 0 ? suggestions.join('. ') + '.' : 'Continue monitoring.';
}

/**
 * Generate recommendation
 */
function generateRecommendation(riskLevel: 'low' | 'medium' | 'high' | 'critical', task: Task, factors: RiskFactors): string {
  if (riskLevel === 'critical') {
    return 'Critical risk detected. Take immediate action to prevent delay.';
  }

  if (riskLevel === 'high') {
    return 'High risk of delay. Consider breaking this into smaller tasks.';
  }

  if (riskLevel === 'medium') {
    return 'Medium risk. Monitor progress and add time estimates.';
  }

  if (riskLevel === 'low') {
    return 'Low risk. Keep tracking progress.';
  }

  return 'Risk level normal.';
}

/**
 * Generate alert message
 */
function generateAlertMessage(riskLevel: 'low' | 'medium' | 'high' | 'critical', task: Task, factors: RiskFactors): string {
  if (riskLevel === 'critical') {
    return `🚨 Critical risk: "${task.name}" is overdue or severely delayed. Immediate action required.`;
  }

  if (riskLevel === 'high') {
    return `⚠️ High risk: "${task.name}" is due in ${Math.abs(factors.daysUntilDue)} days. Consider reprioritizing.`;
  }

  return `Risk alert: "${task.name}" has elevated risk level. Review task details.`;
}

/**
 * Upsert risk assessment
 */
async function upsertRiskAssessment(data: {
  task_id: number;
  risk_type: string;
  risk_score: number;
  risk_level: string;
  probability: number;
  impact: number;
  factors: string;
  mitigation: string;
}): Promise<number> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return 0;
  }

  // Check if assessment exists for this task
  const existing = db
    .prepare('SELECT id FROM risk_assessments WHERE user_id = ? AND task_id = ?')
    .get(user.id, data.task_id) as { id: number } | undefined;

  try {
    if (existing) {
      db.prepare(
        `UPDATE risk_assessments
         SET risk_score = ?, risk_level = ?, probability = ?, impact = ?, factors = ?, mitigation = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(
        data.risk_score,
        data.risk_level,
        data.probability,
        data.impact,
        data.factors,
        data.mitigation,
        existing.id
      );
      return existing.id;
    } else {
      const result = db.prepare(
        `INSERT INTO risk_assessments
         (user_id, task_id, risk_type, risk_score, risk_level, probability, impact, factors, mitigation, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(
        user.id,
        data.task_id,
        data.risk_type,
        data.risk_score,
        data.risk_level,
        data.probability,
        data.impact,
        data.factors,
        data.mitigation
      );
      return Number(result.lastInsertRowid);
    }
  } catch (error) {
    logError('Failed to upsert risk assessment', undefined, error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Create risk alert
 */
async function createRiskAlert(assessmentId: number, message: string): Promise<number> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return 0;
  }

  try {
    const result = db.prepare(
      `INSERT INTO risk_alerts (user_id, risk_assessment_id, message, is_read, triggered_at)
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)`
    ).run(user.id, assessmentId, message);

    return Number(result.lastInsertRowid);
  } catch (error) {
    logError('Failed to create risk alert', undefined, error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Get risk by type distribution
 */
function getRiskByType(risks: RiskAnalysis[]): Array<{ type: string; count: number }> {
  const typeMap: Record<string, number> = {};

  for (const risk of risks) {
    // Extract type from factors or use task priority as proxy
    const type = risk.factors.includes('overdue') ? 'schedule'
      : risk.factors.includes('recurring') ? 'quality'
      : 'schedule';

    typeMap[type] = (typeMap[type] || 0) + 1;
  }

  return Object.entries(typeMap).map(([type, count]) => ({ type, count }));
}

/**
 * Generate weekly risk report
 */
export async function generateWeeklyRiskReport(): Promise<{
  period_start: string;
  period_end: string;
  total_assessments: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  improvements: string[];
  recommendations: string[];
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return {
      period_start: '',
      period_end: '',
      total_assessments: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      improvements: [],
      recommendations: [],
    };
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const assessments = db
    .prepare(
      `SELECT * FROM risk_assessments
       WHERE user_id = ? AND created_at >= date('now', 'weekday 0') ORDER BY risk_score DESC`
    )
    .all(user.id) as RiskAssessment[];

  const criticalCount = assessments.filter(a => a.risk_level === 'critical').length;
  const highCount = assessments.filter(a => a.risk_level === 'high').length;
  const mediumCount = assessments.filter(a => a.risk_level === 'medium').length;

  const recommendations: string[] = [];

  // Analyze trends
  const avgScore = assessments.reduce((sum, a) => sum + a.risk_score, 0) / (assessments.length || 1);

  if (avgScore > 60) {
    recommendations.push('Overall risk level is elevated. Consider reprioritizing tasks.');
  }

  if (criticalCount > 2) {
    recommendations.push('Multiple critical risks detected. Review and address immediately.');
  }

  if (assessments.length === 0) {
    recommendations.push('No active tasks with significant risk detected. Good planning!');
  }

  return {
    period_start: weekStart.toISOString().split('T')[0],
    period_end: weekEnd.toISOString().split('T')[0],
    total_assessments: assessments.length,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    improvements: [],
    recommendations,
  };
}