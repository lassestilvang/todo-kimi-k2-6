import { NextRequest } from 'next/server';
import {
  applyMiddleware,
  errorResponse,
  jsonResponse,
} from '@/lib/api-middleware';
import {
  calculateOptimalSchedule,
  getUserEnergyProfile,
} from '@/lib/ai/scheduler';

export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, {
    requireAuth: true,
  });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  if (
    !middlewareResult.auth?.isAuthenticated ||
    !middlewareResult.auth.userId
  ) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { userId, taskIds, date, durationPreference } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return jsonResponse(
        {
          analysis: null,
          energyProfile: null,
        },
        200
      );
    }

    // Calculate optimal schedule
    const analysis = await calculateOptimalSchedule(
      userId || middlewareResult.auth.userId,
      taskIds,
      {
        date: date,
        durationPreference: durationPreference || 'balanced',
      }
    );

    // Get energy profile
    const energyProfile = await getUserEnergyProfile(
      userId || middlewareResult.auth.userId
    );

    return jsonResponse(
      {
        analysis,
        energyProfile: energyProfile.energyLevels,
      },
      200,
      middlewareResult.headers
    );
  } catch (error) {
    console.error('Scheduler API error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to calculate schedule';
    return errorResponse(message, 500);
  }
}

export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, {
    requireAuth: true,
  });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const userId = middlewareResult.auth?.userId;
  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const energyProfile = await getUserEnergyProfile(userId);
    return jsonResponse({ energyProfile }, 200, middlewareResult.headers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch energy profile';
    return errorResponse(message, 500);
  }
}
