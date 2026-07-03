import { NextRequest } from 'next/server';
import {
  getReminders,
  createReminder,
  getUpcomingReminders,
} from '@/lib/actions/reminders';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

// GET /api/reminders - Get reminders for a task or upcoming reminders
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (taskId) {
      const reminders = await getReminders(parseInt(taskId));
      return jsonResponse(reminders, 200, middlewareResult.headers);
    }

    if (upcoming) {
      const limit = parseInt(searchParams.get('limit') || '10');
      const reminderList = await getUpcomingReminders(limit);
      return jsonResponse(reminderList, 200, middlewareResult.headers);
    }

    return errorResponse('Missing parameters', 400);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return errorResponse('Failed to fetch reminders', 500);
  }
}

// POST /api/reminders - Create a reminder
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const reminder = await createReminder(body);
    return jsonResponse(reminder, 201, middlewareResult.headers);
  } catch (error) {
    console.error('Error creating reminder:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to create reminder', 400);
  }
}