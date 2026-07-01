import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Integrations API routes.
 *
 * GET /api/integrations - List all integrations for the current user
 * POST /api/integrations - Create/update an integration
 */

interface IntegrationConfig {
  type: "slack" | "discord" | "email";
  webhookUrl?: string;
  channel?: string;
  enabled: boolean;
}

export async function GET() {
  try {
    const db = getDb();
    const integrations = db
      .prepare(
        "SELECT id, type, webhook_url, channel, enabled, created_at FROM integrations WHERE user_id = ?"
      )
      .all(1) as Array<{
        id: number;
        type: string;
        webhook_url: string;
        channel: string;
        enabled: number;
        created_at: string;
      }>;

    return NextResponse.json(
      integrations.map((i) => ({
        ...i,
        enabled: i.enabled === 1,
      }))
    );
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, webhookUrl, channel, enabled } = body as IntegrationConfig;

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO integrations (user_id, type, webhook_url, channel, enabled)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET
       webhook_url = excluded.webhook_url,
       channel = excluded.channel,
       enabled = excluded.enabled`
    ).run(1, type, webhookUrl || null, channel || null, enabled ? 1 : 0);

    const integration = db
      .prepare("SELECT * FROM integrations WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}