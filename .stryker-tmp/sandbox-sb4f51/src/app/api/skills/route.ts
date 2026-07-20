// @ts-nocheck
import { NextRequest } from "next/server";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import { getDb } from "@/lib/db";
import { z } from "zod";

const CreateSkillSchema = z.object({
  user_id: z.number(),
  skill_name: z.string().min(1).max(100),
  proficiency_level: z.number().min(1).max(5).optional(),
  evidence_task_ids: z.array(z.number()).optional(),
});

const UpdateSkillSchema = z.object({
  skill_name: z.string().min(1).max(100).optional(),
  proficiency_level: z.number().min(1).max(5).optional(),
  evidence_task_ids: z.array(z.number()).optional(),
});

const IncrementSkillSchema = z.object({
  skill_name: z.string().min(1).max(100),
  task_id: z.number(),
  experience: z.number().min(1).optional(),
});

// GET /api/skills - Get all skills for user
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const db = getDb();
    const skills = db.prepare(`
      SELECT * FROM user_skills
      WHERE user_id = ?
      ORDER BY proficiency_level DESC, skill_name ASC
    `).all(userId) as Array<{
      id: number;
      user_id: number;
      skill_name: string;
      proficiency_level: number;
      evidence_task_ids: string | null;
      last_used_at: string | null;
      created_at: string;
    }>;

    return jsonResponse({ skills });
  } catch (error: any) {
    console.error("Failed to get skills:", error);
    return errorResponse("Failed to get skills", 500);
  }
}

// POST /api/skills - Create a new skill
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();
    const parsed = CreateSkillSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      parsed.data.user_id,
      parsed.data.skill_name,
      parsed.data.proficiency_level || 1,
      parsed.data.evidence_task_ids ? JSON.stringify(parsed.data.evidence_task_ids) : null
    );

    const skill = db.prepare(`
      SELECT * FROM user_skills WHERE id = ?
    `).get(result.lastInsertRowid as number);

    return jsonResponse({ skill }, 201);
  } catch (error: any) {
    console.error("Failed to create skill:", error);
    return errorResponse("Failed to create skill: " + error.message, 400);
  }
}

// PATCH /api/skills - Increment skill experience or get recommendations
export async function PATCH(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();

    // Handle increment
    if (body.action === "increment") {
      const parsed = IncrementSkillSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
      }

      const db = getDb();

      // Get existing skill or create new one
      let skill = db.prepare(`
        SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?
      `).get(userId, parsed.data.skill_name) as any | undefined;

      if (!skill) {
        // Create new skill
        const result = db.prepare(`
          INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, last_used_at)
          VALUES (?, ?, 1, ?, datetime('now'))
        `).run(
          userId,
          parsed.data.skill_name,
          JSON.stringify([parsed.data.task_id])
        );

        skill = db.prepare(`
          SELECT * FROM user_skills WHERE id = ?
        `).get(result.lastInsertRowid as number);
      } else {
        // Update existing skill
        const evidence = skill.evidence_task_ids
          ? JSON.parse(skill.evidence_task_ids)
          : [];

        if (!evidence.includes(parsed.data.task_id)) {
          evidence.push(parsed.data.task_id);

          db.prepare(`
            UPDATE user_skills
            SET evidence_task_ids = ?, last_used_at = datetime('now')
            WHERE id = ?
          `).run(
            JSON.stringify(evidence),
            skill.id
          );
        }
      }

      return jsonResponse({ skill });
    }

    // Handle recommendations
    if (body.action === "recommendations") {
      const currentTasks = body.currentTasks || 10;
      const skills = db.prepare(`
        SELECT * FROM user_skills WHERE user_id = ?
      `).all(userId);

      const skillKeywords: Record<string, string[]> = {
        "design": ["design", "ui", "ux", "interface", "prototype"],
        "development": ["code", "develop", "server", "api", "backend", "frontend"],
        "research": ["research", "analyze", "study", "investigate"],
        "writing": ["write", "document", "content", "report"],
        "leadership": ["lead", "manage", "team", "coordinate"],
        "planning": ["plan", "schedule", "strategy", "timeline"],
        "communication": ["email", "present", "meeting", "discuss"],
        "problem-solving": ["debug", "fix", "solve", "troubleshoot"],
      };

      const skillNames = new Set(skills.map((s: any) => s.skill_name.toLowerCase()));
      const recommendations = Object.entries(skillKeywords).map(([skill, keywords]) => {
        const isCovered = skillNames.has(skill);
        if (isCovered) {
          return { skill_name: skill, recommended: false, reason: "Already developing this skill" };
        }

        const score = currentTasks > 3;
        return {
          skill_name: skill,
          recommended: score,
          reason: score
            ? "High demand skill with good opportunity for growth"
            : "Consider after mastering current skills"
        };
      }).filter((r: any) => r.recommended);

      return jsonResponse({ recommendations });
    }

    return errorResponse("Invalid action", 400);
  } catch (error: any) {
    console.error("Failed to increment/get recommendations:", error);
    return errorResponse("Operation failed: " + error.message, 500);
  }
}

// PUT /api/skills/[id] - Update a skill
export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Skill ID required", 400);
  }

  try {
    const body = await request.json();
    const parsed = UpdateSkillSchema.partial().safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();

    // Check if skill exists and belongs to user
    const existing = db.prepare(`
      SELECT user_id FROM user_skills WHERE id = ?
    `).get(id) as { user_id: number } | undefined;

    if (!existing || existing.user_id !== userId) {
      return errorResponse("Skill not found or access denied", 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (parsed.data.skill_name !== undefined) {
      setClauses.push("skill_name = ?");
      values.push(parsed.data.skill_name);
    }
    if (parsed.data.proficiency_level !== undefined) {
      setClauses.push("proficiency_level = ?");
      values.push(parsed.data.proficiency_level);
    }
    if (parsed.data.evidence_task_ids !== undefined) {
      setClauses.push("evidence_task_ids = ?");
      values.push(JSON.stringify(parsed.data.evidence_task_ids));
    }

    if (setClauses.length === 0) {
      return errorResponse("No updates provided", 400);
    }

    setClauses.push("last_used_at = datetime('now')");
    values.push(id, userId);

    db.prepare(`
      UPDATE user_skills
      SET ${setClauses.join(", ")}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    const skill = db.prepare(`
      SELECT * FROM user_skills WHERE id = ?
    `).get(id);

    return jsonResponse({ skill });
  } catch (error: any) {
    console.error("Failed to update skill:", error);
    return errorResponse("Failed to update skill: " + error.message, 500);
  }
}

// DELETE /api/skills/[id] - Delete a skill
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Skill ID required", 400);
  }

  try {
    const db = getDb();

    const result = db.prepare(`
      DELETE FROM user_skills WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return errorResponse("Skill not found or access denied", 404);
    }

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("Failed to delete skill:", error);
    return errorResponse("Failed to delete skill: " + error.message, 500);
  }
}