import { NextRequest, NextResponse } from 'next/server';
import {
  enableOutlookCalendarSync,
  getOutlookUserProfile,
} from '@/lib/integrations/outlook-calendar';
import { getCurrentUser } from '@/lib/session';

/**
 * Outlook OAuth2 callback handler
 * Exchanges authorization code for tokens and stores them
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth error
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=oauth_error&provider=outlook`,
        request.url
      )
    );
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=no_code&provider=outlook`,
        request.url
      )
    );
  }

  // Get current user
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=auth_required&provider=outlook`,
        request.url
      )
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile (for logging/auditing purposes)
    await getOutlookUserProfile(tokens.access_token);

    // Store tokens in database
    const userId = user.id;
    if (!userId) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=user_not_found&provider=outlook`,
          request.url
        )
      );
    }

    // Enable calendar sync
    enableOutlookCalendarSync(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      Date.now() + tokens.expires_in * 1000
    );

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?success=outlook_connected&provider=outlook`,
        request.url
      )
    );
  } catch (err) {
    console.error('Outlook OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=token_exchange_failed&provider=outlook`,
        request.url
      )
    );
  }
}

/**
 * Exchange authorization code for access tokens
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID || '',
        client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
        grant_type: 'authorization_code',
        code,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed: ${error.error_description || response.statusText}`
    );
  }

  return response.json();
}
