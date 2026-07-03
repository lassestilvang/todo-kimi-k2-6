import { NextRequest } from 'next/server';
import {
  getTaskById,
  updateTask,
  deleteTask,
} from '@/lib/actions/tasks';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

// GET /api/tasks/[id] - Get a single task
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  const { id } = await params;
  try {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return errorResponse('Task not found', 404);
    }

    return jsonResponse(task, 200, middlewareResult.headers);
  } catch (error) {
    console.error('Error fetching task:', error);
    return errorResponse('Failed to fetch task', 500);
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  const { id } = await params;
  try {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const body = await request.json();
    const task = await updateTask(taskId, body);
    return jsonResponse(task, 200, middlewareResult.headers);
  } catch (error) {
    console.error('Error updating task:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to update task', 400);
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  const { id } = await params;
  try {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    await deleteTask(taskId);
    return jsonResponse({ message: 'Task deleted' }, 204, middlewareResult.headers);
  } catch (error) {
    console.error('Error deleting task:', error);
    return errorResponse('Failed to delete task', 500);
  }
}