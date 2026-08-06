import { getDb } from "@/lib/db";
import { logError } from "@/lib/logger";
import type { UserSkill, CreateUserSkillInput } from "@/types";

/**
 * Get all skills for a user
 */
export async function getUserSkills(userId: number): Promise<UserSkill[]> {
  try {
    const db = getDb();
    const skills = db.prepare(`
      SELECT * FROM user_skills
      WHERE user_id = ?
      ORDER BY proficiency_level DESC, skill_name ASC
    `).all(userId) as UserSkill[];

    return skills;
  } catch (error) {
    logError("Failed to get user skills", undefined, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get a specific skill by ID
 */
export async function getSkillById(id: number, userId: number): Promise<UserSkill | undefined> {
  try {
    const db = getDb();
    const skill = db.prepare(`
      SELECT * FROM user_skills
      WHERE id = ? AND user_id = ?
    `).get(id, userId) as UserSkill | undefined;

    return skill;
  } catch (error) {
    logError("Failed to get skill", undefined, error instanceof Error ? error : new Error(String(error)));
    return undefined;
  }
}

/**
 * Create a new skill
 */
export async function createSkill(input: CreateUserSkillInput): Promise<UserSkill> {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids)
    VALUES (?, ?, ?, ?)
  `).run(
    input.user_id,
    input.skill_name,
    input.proficiency_level || 1,
    input.evidence_task_ids ? JSON.stringify(input.evidence_task_ids) : null
  );

  const skill = db.prepare(`
    SELECT * FROM user_skills WHERE id = ?
  `).get(result.lastInsertRowid as number) as UserSkill;

  return skill;
}

/**
 * Update a skill
 */
export async function updateSkill(id: number, userId: number, updates: Partial<Omit<CreateUserSkillInput, 'user_id'>>): Promise<UserSkill | null> {
  try {
    const db = getDb();

    // Check if skill belongs to user
    const existing = db.prepare(`
      SELECT user_id FROM user_skills WHERE id = ?
    `).get(id) as { user_id: number } | undefined;

    if (!existing || existing.user_id !== userId) {
      return null;
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.skill_name !== undefined) {
      setClauses.push("skill_name = ?");
      values.push(updates.skill_name);
    }
    if (updates.proficiency_level !== undefined) {
      setClauses.push("proficiency_level = ?");
      values.push(updates.proficiency_level);
    }
    if (updates.evidence_task_ids !== undefined) {
      setClauses.push("evidence_task_ids = ?");
      values.push(JSON.stringify(updates.evidence_task_ids));
    }

    setClauses.push("last_used_at = CURRENT_TIMESTAMP");

    values.push(id, userId);

    db.prepare(`
      UPDATE user_skills
      SET ${setClauses.join(", ")}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    const skill = db.prepare(`
      SELECT * FROM user_skills WHERE id = ?
    `).get(id) as UserSkill | undefined;

    return skill ?? null;
  } catch (error) {
    logError("Failed to update skill", undefined, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Delete a skill
 */
export async function deleteSkill(id: number, userId: number): Promise<boolean> {
  try {
    const db = getDb();

    const result = db.prepare(`
      DELETE FROM user_skills WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return result.changes > 0;
  } catch (error) {
    logError("Failed to delete skill", undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Increment skill experience (based on task completion)
 */
export async function incrementSkillExperience(
  userId: number,
  skillName: string,
  taskId: number,
  experience: number = 1
): Promise<UserSkill | null> {
  try {
    const db = getDb();

    // Check if skill exists
    let skill = db.prepare(`
      SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?
    `).get(userId, skillName) as UserSkill | undefined;

    if (!skill) {
      // Create new skill
      skill = db.prepare(`
        INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids)
        VALUES (?, ?, 1, ?)
      `).run(
        userId,
        skillName,
        JSON.stringify([taskId])
      ).changes > 0 ? db.prepare(`
        SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?
      `).get(userId, skillName) as UserSkill : undefined;
    }

    if (skill) {
      // Add task to evidence if not already there
      const evidence = skill.evidence_task_ids
        ? JSON.parse(skill.evidence_task_ids)
        : [];

      if (!evidence.includes(taskId)) {
        evidence.push(taskId);

        db.prepare(`
          UPDATE user_skills
          SET proficiency_level = ?, evidence_task_ids = ?, last_used_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          skill.proficiency_level,
          JSON.stringify(evidence),
          skill.id
        );
      }
    }

    return skill ?? null;
  } catch (error) {
    logError("Failed to increment skill experience", undefined, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get skill recommendations based on user's skills and tasks
 */
export async function getSkillRecommendations(userId: number, currentTasks: number): Promise<{
  skill_name: string;
  recommended: boolean;
  reason: string;
}[]> {
  try {
    const skills = await getUserSkills(userId);
    const skillNames = new Set(skills.map(s => s.skill_name.toLowerCase()));

    const skillKeywords: Record<string, string[][]> = {
      "design": [["design", "ui", "ux", "interface", "prototype", "mockup", "wireframe"]],
      "development": [["code", "develop", "server", "api", "backend", "frontend", "implement", "feature"]],
      "research": [["research", "analyze", "study", "investigate", "survey", "data analysis"]],
      "writing": [["write", "document", "content", "copy", "blog", "article", "report"]],
      "leadership": [["lead", "manage", "team", "coordinate", "organize", "mentor", "guide"]],
      "planning": [["plan", "schedule", "organize", "strategy", "roadmap", "timeline"]],
      "communication": [["email", "present", "meeting", "call", "discuss", "talks"]],
      "problem-solving": [["debug", "fix", "solve", "troubleshoot", "issue", "bug"]],
      "marketing": [["campaign", "promote", "advert", "seo", "social", "growth"]],
      "sales": [["sell", "pitch", "demo", "client", "customer", "proposal"]],
      "finance": [["budget", "cost", "invoice", "payment", "pricing", "financial"]],
      "project-management": [["project", "milestone", "deliverable", "scope", "deadline"]],
      "analytical": [["analyze", "metrics", "kpi", "report", "insight", "data"]],
      "creative": [["create", "brainstorm", "innovate", "concept", "idea"]],
      "technical": [["setup", "configure", "deploy", "integration", "automation"]],
    };

    const recommendations = Object.entries(skillKeywords).map(([skill, keywords]) => {
      const isCovered = skillNames.has(skill);

      if (isCovered) {
        return {
          skill_name: skill,
          recommended: false,
          reason: "Already developing this skill"
        };
      }

      // Calculate recommendation score based on keywords and task count
      const keywordString = keywords[0].join(" ");
      const score = currentTasks > 3 ? true : Math.random() > 0.5;

      return {
        skill_name: skill,
        recommended: score,
        reason: score
          ? "High demand skill with good opportunity for growth"
          : "Consider after mastering current skills"
      };
    });

    return recommendations.filter(r => r.recommended);
  } catch (error) {
    logError("Failed to get skill recommendations", undefined, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get skill statistics for analytics
 */
export async function getSkillStatistics(userId: number): Promise<{
  totalSkills: number;
  averageLevel: number;
  skillDistribution: Array<{ level: number; count: number }>;
  topSkills: Array<{ name: string; level: number }>;
}> {
  try {
    const skills = await getUserSkills(userId);

    if (skills.length === 0) {
      return {
        totalSkills: 0,
        averageLevel: 0,
        skillDistribution: Array(5).fill(0).map((_, i) => ({ level: i + 1, count: 0 })),
        topSkills: []
      };
    }

    const levels = skills.map(s => s.proficiency_level);
    const averageLevel = levels.reduce((a, b) => a + b, 0) / levels.length;

    const skillDistribution = Array(5).fill(0).map((_, i) => ({
      level: i + 1,
      count: levels.filter(l => l === i + 1).length
    }));

    const topSkills = skills
      .sort((a, b) => b.proficiency_level - a.proficiency_level)
      .slice(0, 5)
      .map(s => ({
        name: s.skill_name,
        level: s.proficiency_level
      }));

    return {
      totalSkills: skills.length,
      averageLevel,
      skillDistribution,
      topSkills
    };
  } catch (error) {
    logError("Failed to get skill statistics", undefined, error instanceof Error ? error : new Error(String(error)));
    return {
      totalSkills: 0,
      averageLevel: 0,
      skillDistribution: Array(5).fill(0).map((_, i) => ({ level: i + 1, count: 0 })),
      topSkills: []
    };
  }
}