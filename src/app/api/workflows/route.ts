import { NextRequest } from 'next/server';
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
  type ExecutionStatus,
} from '@/lib/actions/workflows';
import {
  applyMiddleware,
  jsonResponse,
  errorResponse,
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const executions = searchParams.get('executions') === 'true';
  const statusParam = searchParams.get('status');
  const validStatus: ExecutionStatus | undefined = statusParam && ['running', 'completed', 'failed', 'skipped'].includes(statusParam) ? statusParam as ExecutionStatus : undefined;

  try {
    // Get single workflow
    if (id) {
      const workflowId = Number(id);
      if (isNaN(workflowId)) {
        return errorResponse('Invalid workflow ID', 400);
      }

      if (executions) {
        const execs = await getWorkflowExecutions(workflowId, {
          limit: 50,
          status: validStatus,
        });
        return jsonResponse({ workflow_id: workflowId, executions: execs });
      }

      const workflow = await getWorkflow(workflowId, userId);
      if (!workflow) {
        return errorResponse('Workflow not found', 404);
      }
      return jsonResponse({ workflow });
    }

    // Get all workflows for user
    const workflows = await getWorkflows(userId);

    // Filter by type if specified
    let filteredWorkflows = workflows;
    if (type) {
      filteredWorkflows = workflows.filter(
        (w: { trigger_type: string }) => w.trigger_type === type
      );
    }

    return jsonResponse({ workflows: filteredWorkflows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch workflows';
    return errorResponse(message, 500);
  }
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
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const workflow = await createWorkflow(userId, data);
        return jsonResponse({ success: true, workflow }, 201);

      case 'execute':
        if (!data.workflowId) {
          return errorResponse('Workflow ID required for execution', 400);
        }
        const { result, executionId } = await executeWorkflow(
          data.workflowId,
          data.input || {},
          userId
        );
        return jsonResponse({ success: true, result, executionId });

      case 'toggle':
        if (!data.workflowId) {
          return errorResponse('Workflow ID required', 400);
        }
        const enabled = await toggleWorkflow(data.workflowId, userId);
        return jsonResponse({ success: true, enabled });

      default:
        // If no action specified, create workflow
        const newWorkflow = await createWorkflow(userId, data);
        return jsonResponse({ success: true, workflow: newWorkflow }, 201);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to process workflow request';
    return errorResponse(message, 500);
  }
}

export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Workflow ID required', 400);
    }

    const body = await request.json();
    const updated = await updateWorkflow(userId, Number(id), body);

    return jsonResponse({ success: true, workflow: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update workflow';
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

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Workflow ID required', 400);
    }

    const deleted = await deleteWorkflow(Number(id), userId);
    if (!deleted) {
      return errorResponse('Workflow not found or not deleted', 404);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete workflow';
    return errorResponse(message, 500);
  }
}
