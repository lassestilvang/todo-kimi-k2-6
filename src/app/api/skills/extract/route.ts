import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { applyMiddleware, jsonResponse, errorResponse } from '@/lib/api-middleware';
import { z } from 'zod';

const ExtractSkillsSchema = z.object({
  task_id: z.number().optional(),
  task_names: z.array(z.string()).optional(),
  auto_update: z.boolean().optional(),
});

const SKILL_KEYWORDS: Record<string, { keywords: string[]; proficiency_weight: number }> = {
  'project management': {
    keywords: ['plan', 'schedule', 'coordinate', 'timeline', 'deadline', 'organize', 'manage'],
    proficiency_weight: 1.0,
  },
  'technical writing': {
    keywords: ['write', 'document', 'report', 'create', 'draft', 'review', 'edit', 'compose'],
    proficiency_weight: 0.8,
  },
  'research': {
    keywords: ['research', 'investigate', 'analyze', 'study', 'examine', 'explore', 'survey'],
    proficiency_weight: 1.0,
  },
  'data analysis': {
    keywords: ['analyze', 'data', 'metrics', 'report', 'insight', 'pattern', 'statistic'],
    proficiency_weight: 1.2,
  },
  'design': {
    keywords: ['design', 'ui', 'ux', 'prototype', 'mockup', 'wireframe', 'layout', 'visual'],
    proficiency_weight: 1.0,
  },
  'development': {
    keywords: ['code', 'develop', 'implement', 'server', 'api', 'frontend', 'backend', 'debug', 'program'],
    proficiency_weight: 1.2,
  },
  'testing': {
    keywords: ['test', 'qa', 'review', 'fix', 'validate', 'verify', 'debug', 'assurance'],
    proficiency_weight: 0.8,
  },
  'communication': {
    keywords: ['present', 'meeting', 'discuss', 'communicate', 'email', 'pitch', 'speech'],
    proficiency_weight: 0.6,
  },
  'leadership': {
    keywords: ['lead', 'manage', 'team', 'mentor', 'coach', 'guide', 'direct', 'supervise'],
    proficiency_weight: 1.0,
  },
  'problem-solving': {
    keywords: ['solve', 'fix', 'troubleshoot', 'debug', 'optimize', 'improve', 'resolve'],
    proficiency_weight: 1.1,
  },
  'time management': {
    keywords: ['schedule', 'time', 'deadline', 'estimate', 'track', 'budget', 'allocate', 'prioritize'],
    proficiency_weight: 0.7,
  },
  'decision-making': {
    keywords: ['decide', 'choose', 'evaluate', 'assess', 'prioritize', 'select', 'pick'],
    proficiency_weight: 0.9,
  },
  'content creation': {
    keywords: ['create', 'write', 'produce', 'develop', 'generate', 'compose', 'produce'],
    proficiency_weight: 0.8,
  },
  'workflow optimization': {
    keywords: ['optimize', 'improve', 'streamline', 'automate', 'efficiency', 'process', 'reduce'],
    proficiency_weight: 1.1,
  },
  'system administration': {
    keywords: ['deploy', 'configure', 'server', 'infrastructure', 'ops', 'admin'],
    proficiency_weight: 1.0,
  },
  'marketing': {
    keywords: ['launch', 'campaign', 'promote', 'advertise', 'brand', 'growth', 'acquire'],
    proficiency_weight: 0.9,
  },
  'sales': {
    keywords: ['sell', 'pitch', 'negotiate', 'close', 'deal', 'revenue', 'conversion'],
    proficiency_weight: 0.8,
  },
  'finance': {
    keywords: ['budget', 'cost', 'invoice', 'financial', 'revenue', 'expense', 'profit'],
    proficiency_weight: 0.7,
  },
  'customer service': {
    keywords: ['support', 'help', 'serve', 'customer', 'user', 'feedback', 'assist'],
    proficiency_weight: 0.6,
  },
  'strategy': {
    keywords: ['strategy', 'plan', 'vision', 'goal', 'objective', 'roadmap', 'direction'],
    proficiency_weight: 1.0,
  },
};

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('User not authenticated', 401);
  }

  try {
    const body = await request.json();
    const parsed = ExtractSkillsSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Invalid input: ' + parsed.error.issues[0].message, 400);
    }

    const db = getDb();
    const extractedSkills: Array<{
      skill_name: string;
      proficiency_gain: number;
      confidence: number;
      evidence_task_ids: number[];
    }> = [];

    // Get task names to analyze
    let taskNames: string[] = [];
    let taskIds: number[] = [];

    if (parsed.data.task_id) {
      // Single task
      const task = db
        .prepare('SELECT name FROM tasks WHERE id = ? AND completed = 1 AND user_id = ?')
        .get(parsed.data.task_id, userId) as { name: string } | undefined;

      if (task) {
        taskNames = [task.name];
        taskIds = [parsed.data.task_id];
      }
    } else if (parsed.data.task_names) {
      // Multiple task names
      taskNames = parsed.data.task_names;

      // Get corresponding task IDs
      if (taskNames.length > 0) {
        const placeholders = taskNames.map(() => '?').join(',');
        const tasks = db
          .prepare(`SELECT id, name FROM tasks WHERE name IN (${placeholders}) AND completed = 1 AND user_id = ?`)
          .all(...taskNames, userId) as Array<{ id: number; name: string }>;

        taskIds = tasks.map(t => t.id);
      }
    } else {
      // Extract from all recently completed tasks
      const recentCompleted = db
        .prepare(
          `SELECT id, name FROM tasks
           WHERE completed = 1 AND completed_at >= datetime('now', '-30 days') AND user_id = ?
           ORDER BY completed_at DESC LIMIT 20`
        )
        .all(userId) as Array<{ id: number; name: string }>;

      taskNames = recentCompleted.map(t => t.name);
      taskIds = recentCompleted.map(t => t.id);
    }

    if (taskNames.length === 0) {
      return jsonResponse({ skills: [], message: 'No completed tasks found to extract skills from' });
    }

    // Analyze each task name for skills
    const allText = taskNames.join(' ').toLowerCase();

    for (const [skillName, config] of Object.entries(SKILL_KEYWORDS)) {
      const foundKeywords = config.keywords.filter(kw => allText.includes(kw));

      if (foundKeywords.length > 0) {
        const proficiencyGain = foundKeywords.length * config.proficiency_weight * 0.1;

        // Get existing skill level
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

        // Get existing skill level
        let evidenceTaskIds: number[] = [];

        if (existingSkill) {
          evidenceTaskIds = existingSkill.evidence_task_ids
            ? JSON.parse(existingSkill.evidence_task_ids)
            : [];
        }

        // Add completed tasks as evidence
        for (const taskId of taskIds) {
          if (!evidenceTaskIds.includes(taskId)) {
            evidenceTaskIds.push(taskId);
          }
        }

        // Update or create skill
        if (existingSkill) {
          db.prepare(
            `UPDATE user_skills
             SET proficiency_level = MIN(5, proficiency_level + ?),
                 evidence_task_ids = ?,
                 last_used_at = datetime('now')
             WHERE id = ?`
          ).run(proficiencyGain, JSON.stringify(evidenceTaskIds), existingSkill.id);
        } else {
          const result = db
            .prepare(
              `INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, last_used_at, created_at)
               VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
            )
            .run(userId, skillName, Math.min(5, 1 + proficiencyGain), JSON.stringify(evidenceTaskIds));

          // Store the new skill ID in evidenceTaskIds
          evidenceTaskIds[0] = result.lastInsertRowid as number;
        }

        extractedSkills.push({
          skill_name: skillName,
          proficiency_gain: proficiencyGain,
          confidence: foundKeywords.length / config.keywords.length,
          evidence_task_ids: evidenceTaskIds,
        });
      }
    }

    // Auto-update completion rate calculation if requested
    if (parsed.data.auto_update !== false) {
      // This could trigger other analytics updates
    }

    return jsonResponse({
      skills: extractedSkills,
      extracted_from_tasks: taskNames.length,
      message: extractedSkills.length > 0
        ? `Extracted ${extractedSkills.length} skills from ${taskNames.length} completed tasks`
        : 'No new skills identified from completed tasks',
    });
  } catch (error: unknown) {
    console.error('Failed to extract skills:', error);
    return errorResponse('Failed to extract skills: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
}

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('User not authenticated', 401);
  }

  try {
    const db = getDb();

    // Get detailed skill analysis
    const skillsQuery = `
      SELECT
        s.skill_name,
        s.proficiency_level,
        s.last_used_at,
        s.created_at,
        (SELECT COUNT(*) FROM json_each(s.evidence_task_ids) e JOIN tasks t ON t.id = e.value WHERE t.user_id = s.user_id AND t.completed = 1) as completed_evidence_count,
        (SELECT AVG(t.confidence_score) FROM json_each(s.evidence_task_ids) e JOIN tasks t ON t.id = e.value WHERE t.user_id = s.user_id) as avg_task_confidence
      FROM user_skills s
      WHERE s.user_id = ?
      ORDER BY s.proficiency_level DESC, s.last_used_at DESC
    `;

    const skills = db.prepare(skillsQuery).all(userId);

    // Calculate skill growth rate (last 30 days vs previous 30 days)
    const growthAnalysis = db
      .prepare(`
        SELECT skill_name, proficiency_level, last_used_at
        FROM user_skills
        WHERE user_id = ? AND last_used_at >= datetime('now', '-30 days')
      `)
      .all(userId);

    const recentSkills = growthAnalysis as Array<{ skill_name: string; proficiency_level: number; last_used_at: string }>;

    const growthRate = recentSkills.length > 0 ? recentSkills.length / 5 : 0;

    return jsonResponse({
      skills,
      growth_rate: growthRate,
      analysis: {
        total_skills: skills.length,
        average_proficiency: skills.length > 0 ? skills.reduce((sum: number, s: { proficiency_level: number }) => sum + s.proficiency_level, 0) / skills.length : 0,
        most_recent_skill: recentSkills[0]?.skill_name || null,
        recommendations: generateSkillRecommendations(skills, growthRate),
      },
    });
  } catch (error: unknown) {
    console.error('Failed to get skill analysis:', error);
    return errorResponse('Failed to get skill analysis: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
}

function generateSkillRecommendations(
  skills: Array<{
    skill_name: string;
    proficiency_level: number;
    last_used_at: string | null;
    completed_evidence_count: number;
    avg_task_confidence: number;
  }>,
  growthRate: number
): Array<{ skill_name: string; reason: string; priority: 'high' | 'medium' | 'low' }> {
  const recommendations: Array<{ skill_name: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [];

  // Find skills with high completion counts that could be developed further
  const highUseSkills = skills.filter(s => s.proficiency_level < 5 && s.completed_evidence_count > 3);

  for (const skill of highUseSkills) {
    const gap = 5 - skill.proficiency_level;
    const reason = `High usage (${skill.completed_evidence_count} tasks) but proficiency can grow by ${gap} levels more`;

    recommendations.push({
      skill_name: skill.skill_name,
      reason,
      priority: gap >= 3 ? 'high' : gap >= 2 ? 'medium' : 'low',
    });
  }

  // Find skills that haven't been used in a while
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const staleSkills = skills.filter(s => {
    if (!s.last_used_at) return s.proficiency_level > 2;
    const lastUsed = new Date(s.last_used_at);
    return lastUsed < thirtyDaysAgo && s.proficiency_level > 1;
  });

  for (const skill of staleSkills) {
    recommendations.push({
      skill_name: skill.skill_name,
      reason: 'Skill hasn\'t been used recently - consider applying it to upcoming tasks',
      priority: 'medium',
    });
  }

  // Find gaps in skill coverage
  const skillKeywordsMap: Record<string, string[]> = {
    'research': ['research', 'investigate', 'analyze'],
    'development': ['code', 'develop', 'build'],
    'design': ['design', 'ui', 'ux', 'prototype'],
    'communication': ['present', 'meet', 'discuss'],
    'project management': ['manage', 'plan', 'coordinate'],
  };

  const skillNames = new Set(skills.map(s => s.skill_name.toLowerCase()));

  for (const [category, keywords] of Object.entries(skillKeywordsMap)) {
    const isCovered = keywords.some(kw => skillNames.has(category) || skillNames.has(kw[0].toUpperCase() + kw.slice(1)));

    if (!isCovered && growthRate > 0.5) {
      recommendations.push({
        skill_name: category,
        reason: 'High task volume suggests opportunity to develop this foundational skill',
        priority: growthRate > 0.7 ? 'high' : 'medium',
      });
    }
  }

  return recommendations.slice(0, 5);
}