import { NextRequest } from 'next/server';
import { getTasks } from '@/lib/actions';
import { getCalendarSync } from '@/lib/actions/calendar';
import { syncTasksToCalendar, getAuthUrl } from '@/lib/calendar';
import type { Task } from '@/types';
import {
  applyMiddleware,
  errorResponse,
  jsonResponse,
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  // Use middleware for auth if needed
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const provider = searchParams.get('provider') || 'google';

  if (action === 'auth') {
    // Generate OAuth URL for the specified provider
    const state = generateState();
    const authUrl = getAuthUrl(provider as 'google' | 'outlook', state);
    return Response.json({ authUrl, state, provider });
  }

  // Get sync status for all providers
  const googleSync = await getCalendarSyncByProvider(userId, 'google');
  const outlookSync = await getCalendarSyncByProvider(userId, 'outlook');

  return jsonResponse({
    providers: {
      google: {
        enabled: !!googleSync?.enabled,
        expiresAt: googleSync?.expires_at
          ? new Date(googleSync.expires_at).toISOString()
          : null,
      },
      outlook: {
        enabled: !!outlookSync?.enabled,
        expiresAt: outlookSync?.expires_at
          ? new Date(outlookSync.expires_at).toISOString()
          : null,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  try {
    const body = await request.json();
    const { provider = 'google', taskId } = body;

    // Get stored calendar config for the specific provider
    const calendarConfig = await getCalendarSyncByProvider(
      userId,
      provider as 'google' | 'outlook'
    );

    if (!calendarConfig) {
      return errorResponse(
        'Calendar not configured. Please connect your calendar first.',
        400
      );
    }

    // Get tasks to sync
    const tasks = await getTasks({ includeCompleted: true });
    const tasksToSync = taskId
      ? tasks.filter(t => t.id === taskId)
      : tasks.filter(t => t.deadline);

    if (tasksToSync.length === 0) {
      return jsonResponse({ created: 0, updated: 0, errors: [] });
    }

    const result = await syncTasksToCalendar(
      {
        provider: calendarConfig.provider,
        accessToken: calendarConfig.access_token,
        refreshToken: calendarConfig.refresh_token || undefined,
        expiresAt: calendarConfig.expires_at || undefined,
      },
      tasksToSync as Task[]
    );

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return errorResponse(message, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider') || 'google';

  try {
    await disconnectCalendarSync(userId, provider as 'google' | 'outlook');
    return jsonResponse({ message: 'Calendar sync disconnected' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Disconnect failed';
    return errorResponse(message, 500);
  }
}

/**
 * Generate a random state string for OAuth
 */
function generateState(): string {
  return Buffer.from(Math.random().toString(36).substring(2)).toString('hex');
}

/**
 * Get calendar sync by provider
 */
async function getCalendarSyncByProvider(
  userId: number,
  provider: 'google' | 'outlook'
): Promise<ReturnType<typeof getCalendarSync> | null> {
  const db = (await import('@/lib/db')).getDb();
  const result = db
    .prepare('SELECT * FROM calendar_sync WHERE user_id = ? AND provider = ?')
    .get(userId, provider);
  return result
    ? {
        id: result.id,
        user_id: result.user_id,
        provider: result.provider,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: result.expires_at,
        enabled: result.enabled,
        created_at: result.created_at,
      }
    : null;
}

/**
 * Disconnect calendar sync for a provider
 */
async function disconnectCalendarSync(
  userId: number,
  provider: 'google' | 'outlook'
): Promise<void> {
  const db = (await import('@/lib/db')).getDb();
  db.prepare(
    'UPDATE calendar_sync SET enabled = 0 WHERE user_id = ? AND provider = ?'
  ).run(userId, provider);
}
