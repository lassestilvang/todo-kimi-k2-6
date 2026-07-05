import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

/**
 * Result of request body validation
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string[];
  details?: unknown;
}

/**
 * Validates a request body against a Zod schema.
 * Parses the JSON body and validates it against the provided schema.
 *
 * @template T - The expected output type from the schema
 * @param request - The Request object to validate
 * @param schema - Zod schema to validate against
 * @returns ValidationResult with success status, parsed data, or error details
 *
 * @example
 * const result = await validateBody(request, taskSchema);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * // Use result.data safely
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        details: parsed.error.issues,
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: ["Invalid JSON body"] };
  }
}

/**
 * Creates a JSON error response with consistent formatting.
 *
 * @param message - Error message to display
 * @param status - HTTP status code (default: 400)
 * @param details - Additional error details
 * @returns NextResponse with error JSON
 *
 * @example
 * return jsonError("Task not found", 404);
 */
export function jsonError(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

/**
 * Creates a JSON success response with consistent formatting.
 *
 * @template T - The type of data being returned
 * @param data - The data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with JSON data
 *
 * @example
 * return jsonSuccess({ task: newTask });
 */
export function jsonSuccess<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Parses and validates a numeric ID from URL parameters.
 * Returns null for invalid or missing IDs.
 *
 * @param id - The ID string from URL params
 * @returns The parsed positive number, or null if invalid
 *
 * @example
 * const taskId = parseNumericId(searchParams.get("id"));
 * if (!taskId) return jsonError("Invalid task ID", 400);
 */
export function parseNumericId(id: string | null): number | null {
  if (!id) return null;
  const parsed = Number(id);
  if (isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}