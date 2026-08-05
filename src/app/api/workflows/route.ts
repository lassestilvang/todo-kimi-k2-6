import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/config";
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
  checkTriggers,
  evaluateConditions,
} from "@/lib/actions/workflows";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) {
    return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;

  const id = searchParams.get("id");
  const includeExecutions = searchParams.get("include_executions") === "true";
  const executionLimit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10;

  if (id) {
    // Get single workflow
    const workflow = await getWorkflow(Number(id), userId);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    let executions = null;
    if (includeExecutions) {
      executions = await getWorkflowExecutions(Number(id), { limit: executionLimit });
    }

    return NextResponse.json({ workflow, executions });
  }

  // Get all workflows
  const workflows = await getWorkflows(userId);
  return NextResponse.json({ workflows });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) {
    return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
  }
  const body = await request.json();

  // Check if this is an execution request
  if (body.action === "execute") {
    try {
      const result = await executeWorkflow(
        body.workflow_id,
        body.input_data,
        userId
      );
      return NextResponse.json({ success: true, result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Execution failed" },
        { status: 500 }
      );
    }
  }

  // Regular workflow creation
  const workflow = await createWorkflow(userId, body);
  return NextResponse.json(workflow, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) {
    return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  const body = await request.json();

  try {
    const workflow = await updateWorkflow(userId, Number(id), body);
    return NextResponse.json(workflow);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) {
    return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  try {
    const deleted = await deleteWorkflow(Number(id), userId);
    if (!deleted) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}

// PATCH endpoint for toggle
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number((session.user as { id?: string }).id);
  if (!userId) {
    return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  try {
    const enabled = await toggleWorkflow(Number(id), userId);
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Toggle failed" },
      { status: 500 }
    );
  }
}