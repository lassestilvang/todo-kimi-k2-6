import { NextRequest } from "next/server";
import { addTaskAttachment, getTaskAttachments, deleteTaskAttachment } from "@/lib/actions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for security (whitelist)
const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/json",
  // Archives (use with caution)
  "application/zip",
  // Other safe types
  "application/octet-stream",
];

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".jar", ".php", ".asp", ".aspx", ".jsp", ".py", ".rb",
];

/**
 * Validates file for security (type, size, name)
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "") {
    return { valid: false, error: `File type "${file.type}" is not allowed` };
  }

  // Check filename for dangerous extensions
  const filename = file.name.toLowerCase();
  if (DANGEROUS_EXTENSIONS.some(ext => filename.endsWith(ext))) {
    return { valid: false, error: "File type not allowed for security reasons" };
  }

  return { valid: true };
}

// GET /api/attachments - Get attachments for a task
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return errorResponse("Task ID required", 400);
    }
    const attachments = await getTaskAttachments(Number(taskId));
    return jsonResponse({ attachments }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch attachments";
    return errorResponse(message, 500);
  }
}

// POST /api/attachments - Upload a new attachment
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    // Check content length before processing
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return errorResponse("Request body too large", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string;

    if (!file || !taskId) {
      return errorResponse("File and task ID required", 400);
    }

    // Validate file for security
    const validation = validateFile(file);
    if (!validation.valid) {
      return errorResponse(validation.error || "Invalid file", 400);
    }

    // Validate task ID
    const taskIdNum = Number(taskId);
    if (isNaN(taskIdNum) || taskIdNum <= 0) {
      return errorResponse("Invalid task ID", 400);
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename (sanitize to prevent path traversal)
    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${uuidv4()}-${safeOriginalName}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Create attachment record
    const attachment = await addTaskAttachment({
      task_id: taskIdNum,
      filename: file.name,
      file_size: buffer.length,
      mime_type: file.type,
      url: `/uploads/${filename}`,
    });

    return jsonResponse({ attachment }, 201, middlewareResult.headers);
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return errorResponse("Failed to upload attachment", 500);
  }
}

// DELETE /api/attachments - Delete an attachment
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return errorResponse("Attachment ID required", 400);
    }

    // Validate ID
    const attachmentId = Number(id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return errorResponse("Invalid attachment ID", 400);
    }

    await deleteTaskAttachment(attachmentId);
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment";
    return errorResponse(message, 500);
  }
}
