/**
 * Error Handling Middleware
 * Provides consistent error responses across API routes
 */

export interface ApiError extends Error {
  status: number;
  code?: string;
}

export class ValidationError extends Error implements ApiError {
  status = 400;
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export class UnauthorizedError extends Error implements ApiError {
  status = 401;
  code = "UNAUTHORIZED";

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error implements ApiError {
  status = 403;
  code = "FORBIDDEN";

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error implements ApiError {
  status = 404;
  code = "NOT_FOUND";

  constructor(message = "Not Found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error implements ApiError {
  status = 409;
  code = "CONFLICT";

  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Handle errors in API route handlers
 */
export function handleApiError(error: unknown): {
  message: string;
  status: number;
  code?: string;
} {
  if (error instanceof Error) {
    if ("status" in error) {
      const apiError = error as ApiError;
      return {
        message: error.message,
        status: apiError.status,
        code: apiError.code,
      };
    }
    return {
      message: error.message,
      status: 500,
    };
  }
  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}

/**
 * Wrap async handlers with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const { message, status, code } = handleApiError(error);
      return new Response(JSON.stringify({ error: message, code }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}