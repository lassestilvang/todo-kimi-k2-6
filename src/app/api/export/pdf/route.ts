"use server";

import { getDb } from "@/lib/db";
import { logError } from "@/lib/logger";
import type { TaskWithRelations } from "@/types";

/**
 * Generate a text-based export of tasks
 * For PDF export, use the client-side Export component with jsPDF
 */
export async function GET() {
  try {
    const db = getDb();
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as TaskWithRelations[];

    // Create simple text-based export
    const lines: string[] = [];
    lines.push("TaskFlow Export");
    lines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
    lines.push(`Total Tasks: ${tasks.length}`);
    lines.push(`Completed: ${tasks.filter(t => t.completed).length}`);
    lines.push("");
    lines.push("Tasks:");
    lines.push("-".repeat(50));

    tasks.forEach(task => {
      const status = task.completed ? "[✓]" : "[○]";
      lines.push(`${status} ${task.name}`);
      if (task.description) lines.push(`  Description: ${task.description}`);
      if (task.date) lines.push(`  Date: ${task.date}`);
      if (task.priority !== "none") lines.push(`  Priority: ${task.priority}`);
    });

    const content = lines.join("\n");
    return new Response(content, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="taskflow-export-${new Date().toISOString().split("T")[0]}.txt"`,
      },
    });
  } catch (error) {
    logError("Export error", undefined, error instanceof Error ? error : new Error(String(error)));
    return new Response("Export failed", { status: 500 });
  }
}