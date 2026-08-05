import { NextRequest, NextResponse } from "next/server";
import { processEmail, EmailToTaskResult } from "@/lib/actions/email-to-task";
import { checkRateLimit, getClientKey, rateLimits } from "@/lib/rate-limiter";

// Webhook handler for email-to-task integration
export async function POST(req: NextRequest) {
  // Rate limiting using the existing rate limiter
  const clientKey = getClientKey(req);
  const rateLimitResult = await checkRateLimit(clientKey, rateLimits.api);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // Verify webhook signature (if supported by email provider)
    const signature = req.headers.get("x-email-signature");
    if (process.env.EMAIL_WEBHOOK_SECRET && signature !== undefined) {
      // TODO: Add signature verification
      // This is a placeholder for actual signature verification
    }

    // Process the email
    const result = await processEmail(body);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email processed successfully",
        task_id: result.task?.id,
        confidence: result.confidence,
      });
    }

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: "Email skipped",
        reason: result.reason,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      error: result.reason || "Failed to process email",
    }, { status: 400 });

  } catch (error) {
    console.error("Email processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "email-to-task",
    timestamp: new Date().toISOString(),
  });
}

// Optional: Validate webhook payload
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Email-Signature",
    },
  });
}