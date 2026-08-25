'use server';

import { getDb } from '@/lib/db';

const SKILL_KEYWORDS: Record<string, string[]> = {
  'project management': ['plan', 'schedule', 'coordinate', 'timeline', 'deadline', 'organize', 'manage', 'coordinate'],
  'technical writing': ['write', 'document', 'report', 'create', 'draft', 'review', 'edit', 'compose'],
  'research': ['research', 'investigate', 'analyze', 'study', 'examine', 'explore', 'survey', 'investigat'],
  'data analysis': ['analyze', 'data', 'metrics', 'report', 'insight', 'pattern', 'statistic'],
  'design': ['design', 'ui', 'ux', 'prototype', 'mockup', 'wireframe', 'layout', 'visual'],
  'development': ['code', 'develop', 'implement', 'server', 'api', 'frontend', 'backend', 'debug', 'program'],
  'testing': ['test', 'qa', 'review', 'fix', 'validate', 'verify', 'debug', 'assurance'],
  'communication': ['present', 'meeting', 'discuss', 'communicate', 'email', 'pitch', 'speech'],
  'leadership': ['lead', 'manage', 'team', 'mentor', 'coach', 'guide', 'direct', 'supervise'],
  'problem-solving': ['solve', 'fix', 'troubleshoot', 'debug', 'optimize', 'improve', 'resolve'],
  'time management': ['schedule', 'time', 'deadline', 'estimate', 'track', 'budget', 'allocate', 'prioritize'],
  'decision-making': ['decide', 'choose', 'evaluate', 'assess', 'prioritize', 'select', 'pick'],
  'content creation': ['create', 'write', 'produce', 'develop', 'generate', 'compose', 'produce'],
  'workflow optimization': ['optimize', 'improve', 'streamline', 'automate', 'efficiency', 'process', 'reduce'],
  'system administration': ['deploy', 'configure', 'server', 'infrastructure', 'ops', 'administ'],
  'marketing': ['launch', 'campaign', 'promote', 'advertise', 'brand', 'growth', 'acquire'],
  'sales': ['sell', 'pitch', 'negotiate', 'close', 'deal', 'revenue', 'conversion'],
  'finance': ['budget', 'cost', 'invoice', 'financial', 'revenue', 'expense', 'profit'],
  'customer service': ['support', 'help', 'serve', 'customer', 'user', 'feedback', 'assist'],
  'strategy': ['strategy', 'plan', 'vision', 'goal', 'objective', 'roadmap', 'direction'],
};

interface SkillExtractionResult {
  skill_name: string;
  proficiency_gain: number;
  confidence: number;
  evidence_task_ids: number[];
}

/**
 * Extract and update skills based on a completed task
 */
export async function extractSkillsFromTask(
  taskId: number,
  userId: number
): Promise<SkillExtractionResult[]> {
  const db = getDb();

  // Get task details
  const task = db
    .prepare('SELECT name, description FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId) as { name: string; description: string | null } | undefined;

  if (!task) {
    return [];
  }

  const taskText = `${task.name} ${task.description || ''}`.toLowerCase();
  const extractedSkills: SkillExtractionResult[] = [];

  for (const [skillName, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const foundKeywords = keywords.filter(kw => taskText.includes(kw));

    if (foundKeywords.length > 0) {
      const proficiencyGain = foundKeywords.length * 0.2;

      // Get existing skill
      const existingSkill = db
        .prepare('SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?')
        .get(userId, skillName) as
        | {
            id: number;
            user_id: number;
            skill_name: string;
            proficiency_level: number;
            evidence_task_ids: string | null;
            last_used_at: string | null;
            created_at: string;
          }
        | undefined;

      let newProficiency = 1;
      let evidenceTaskIds: number[] = [];

      if (existingSkill) {
        newProficiency = Math.min(5, existingSkill.proficiency_level + proficiencyGain);
        evidenceTaskIds = existingSkill.evidence_task_ids
          ? JSON.parse(existingSkill.evidence_task_ids)
          : [];
      }

      // Add completed task as evidence
      if (!evidenceTaskIds.includes(taskId)) {
        evidenceTaskIds.push(taskId);
      }

      // Update or create skill
      if (existingSkill) {
        db.prepare(
          `UPDATE user_skills
             SET proficiency_level = ?,
                 evidence_task_ids = ?,
                 last_used_at = datetime('now')
             WHERE id = ?`
        ).run(Math.min(5, newProficiency), JSON.stringify(evidenceTaskIds), existingSkill.id);
      } else {
        db.prepare(
          `INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, last_used_at, created_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(userId, skillName, Math.min(5, 1 + proficiencyGain), JSON.stringify(evidenceTaskIds));
      }

      extractedSkills.push({
        skill_name: skillName,
        proficiency_gain: proficiencyGain,
        confidence: foundKeywords.length / keywords.length,
        evidence_task_ids: evidenceTaskIds,
      });
    }
  }

  return extractedSkills;
}

/**
 * Get skills that should be developed based on completed tasks analysis
 */
export async function getSkillDevelopmentRecommendations(
  userId: number
): Promise<{
  skills_to_develop: Array<{ skill_name: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
  skills_with_gaps: Array<{ skill_name: string; current_level: number; recommended_level: number }>;
}> {
  const db = getDb();

  // Get user's skills
  const skills = db
    .prepare('SELECT * FROM user_skills WHERE user_id = ? ORDER BY proficiency_level DESC')
    .all(userId) as Array<{
      id: number;
      user_id: number;
      skill_name: string;
      proficiency_level: number;
      evidence_task_ids: string | null;
      last_used_at: string | null;
      created_at: string;
    }>;

  const skillsToDevelop: Array<{ skill_name: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
  const skillsWithGaps: Array<{ skill_name: string; current_level: number; recommended_level: number }> = [];

  // Check for skills with gaps
  const recentCompletedTasks = db
    .prepare(
      `SELECT name FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-60 days') ORDER BY completed_at DESC LIMIT 100`
    )
    .all(userId);

  const taskText = recentCompletedTasks.map(t => t.name).join(' ').toLowerCase();

  for (const [skillName, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const isCovered = keywords.some(kw => taskText.includes(kw));
    const existingSkill = skills.find(s => s.skill_name === skillName);

    if (isCovered && !existingSkill) {
      skillsToDevelop.push({
        skill_name: skillName,
        reason: 'Frequent task mentions suggest this skill should be developed',
        priority: 'medium',
      });
    } else if (existingSkill && existingSkill.proficiency_level < 4) {
      const evidenceCount = existingSkill.evidence_task_ids
        ? JSON.parse(existingSkill.evidence_task_ids).length
        : 0;

      if (evidenceCount > 5) {
        skillsWithGaps.push({
          skill_name: skillName,
          current_level: existingSkill.proficiency_level,
          recommended_level: Math.min(5, existingSkill.proficiency_level + 1),
        });
      }
    }
  }

  return { skills_to_develop: skillsToDevelop, skills_with_gaps: skillsWithGaps };
}

/**
 * Link a decision to an actual task outcome for learning correlation
 */
export async function linkDecisionToTaskOutcome(
  decisionId: number,
  taskId: number,
  userId: number
): Promise<boolean> {
  const db = getDb();

  // Verify both decision and task exist and belong to user
  const decision = db
    .prepare('SELECT id FROM decisions WHERE id = ?')
    .get(decisionId) as { id: number } | undefined;

  const task = db
    .prepare('SELECT id FROM decisions d JOIN task_decisions td ON d.id = td.decision_id WHERE td.task_id = ? AND d.user_id = ?')
    .get(taskId, userId);

  if (!decision || !task) {
    return false;
  }

  // Get task details
  const completedTask = db
    .prepare('SELECT id, completed, completed_at FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId, userId) as { id: number; completed: number; completed_at: string | null } | undefined;

  if (!completedTask || !completedTask.completed) {
    return false;
  }

  // Record correlation (simplified - actual implementation would have a correlation table)
  // This could be expanded to create a learn_connection record
  db.exec(`
    CREATE TABLE IF NOT EXISTS learn_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id INTEGER REFERENCES decisions(id),
      task_id INTEGER REFERENCES tasks(id),
      user_id INTEGER,
      outcome_rating REAL,
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.prepare(
    `INSERT INTO learn_connections (decision_id, task_id, user_id, outcome_rating)
     SELECT d.id, ?, d.user_id, t.confidence_score
     FROM decisions d
     JOIN tasks t ON t.id = ?
     WHERE d.id = ? AND d.user_id = ?`
  ).run(taskId, taskId, decisionId, userId);

  return true;
}

/**
 * Get decision outcome recommendations based on skill gaps
 */
export async function getDecisionOutcomeRecommendations(
  userId: number
): Promise<Array<{ decision_type: string; skill_needed: string; recommendation: string }>> {
  const db = getDb();

  // Get poorly rated decisions of each type
  const poorDecisions = db
    .prepare(
      `SELECT decision_type, COUNT(*) as count, AVG(outcome_rating) as avg_rating
       FROM decisions
       WHERE user_id = ? AND outcome_rating < 0
       GROUP BY decision_type`
    )
    .all(userId) as Array<{ decision_type: string; count: number; avg_rating: number }>;

  // Get user's skills
  const skills = db
    .prepare('SELECT skill_name FROM user_skills WHERE user_id = ?')
    .all(userId) as Array<{ skill_name: string }>;

  const skillNames = new Set(skills.map(s => s.skill_name.toLowerCase()));

  const recommendations = poorDecisions.map(d => {
    const skillMapping: Record<string, string> = {
      priority: 'decision-making',
      timeline: 'time management',
      tool: 'development',
      approach: 'problem-solving',
      allocation: 'project management',
    };

    const suggestedSkill = skillMapping[d.decision_type] || d.decision_type;
    const hasSkill = skillNames.has(suggestedSkill.toLowerCase());

    return {
      decision_type: d.decision_type,
      skill_needed: suggestedSkill,
      recommendation: hasSkill
        ? `Review ${d.decision_type} decisions and apply your ${suggestedSkill} skills more effectively`
        : `Consider developing ${suggestedSkill} to improve ${d.decision_type} decisions`,
    };
  });

  return recommendations;
}