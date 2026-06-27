import { NextRequest, NextResponse } from "next/server";
import { addTaskAttachment, getTaskAttachments, deleteTaskAttachment } from "@/lib/actions/tasks";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = join(process.cwd(), "uploads");

// GET /api/attachments - Get attachments for a task
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }
    const attachments = await getTaskAttachments(Number(taskId));
    return NextResponse.json({ attachments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch attachments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/attachments - Upload a new attachment
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string;

    if (!file || !taskId) {
      return NextResponse.json({ error: "File and task ID required" }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Create attachment record
    const attachment = await addTaskAttachment({
      task_id: Number(taskId),
      filename: file.name,
      file_size: buffer.length,
      mime_type: file.type,
      url: `/uploads/${filename}`,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}

// DELETE /api/attachments - Delete an attachment
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });
    }
    await deleteTaskAttachment(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
