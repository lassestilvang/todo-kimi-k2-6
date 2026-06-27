import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/calendar";
import { saveCalendarSync } from "@/lib/actions/tasks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    // OAuth error
    console.error("OAuth error:", error);
    return NextResponse.redirect(new URL("/?calendar=error", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?calendar=no_code", request.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens("google", code);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store tokens in database (using default user ID 1 for now)
    // In a production app with authentication, use the actual user's ID
    const userId = 1;

    await saveCalendarSync(userId, {
      provider: "google",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      enabled: true,
    });

    console.log("Calendar sync successful:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt,
    });

    return NextResponse.redirect(new URL("/?calendar=success", request.url));
  } catch (err) {
    console.error("Token exchange failed:", err);
    return NextResponse.redirect(new URL("/?calendar=token_error", request.url));
  }
}