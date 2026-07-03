import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Health check API endpoint.
 * Returns the status of the application and its dependencies.
 *
 * GET /api/health
 *
 * Response:
 * {
 *   status: "healthy" | "unhealthy",
 *   timestamp: string,
 *   checks: {
 *     database: "ok" | "error",
 *     ai_providers: "ok" | "degraded" | "error"
 *   }
 * }
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: {
    database: "ok" | "error";
    ai_providers?: "ok" | "degraded" | "error";
  } = {
    database: "ok",
  };

  let status: "healthy" | "unhealthy" = "healthy";

  // Check database connectivity
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
  } catch (error) {
    checks.database = "error";
    status = "unhealthy";
  }

  // Check AI providers (optional)
  try {
    const hasAiConfig = !!(process.env['OPENAI_API_KEY'] || process.env['ANTHROPIC_API_KEY']);
    checks.ai_providers = hasAiConfig ? "ok" : "degraded";
  } catch (error) {
    checks.ai_providers = "error";
  }

  return NextResponse.json(
    {
      status,
      timestamp,
      checks,
    },
    { status: status === "healthy" ? 200 : 503 }
  );
}