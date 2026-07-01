import { describe, it, expect } from "vitest";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/middleware/error-handler";

describe("error handling middleware", () => {
  describe("handleApiError", () => {
    it("should handle ApiError with status", () => {
      const error = new ValidationError("Invalid input", "INVALID_INPUT");
      const result = handleApiError(error);

      expect(result.status).toBe(400);
      expect(result.message).toBe("Invalid input");
      expect(result.code).toBe("INVALID_INPUT");
    });

    it("should handle generic Error", () => {
      const error = new Error("Something went wrong");
      const result = handleApiError(error);

      expect(result.status).toBe(500);
      expect(result.message).toBe("Something went wrong");
    });

    it("should handle unknown errors", () => {
      const result = handleApiError("string error");

      expect(result.status).toBe(500);
      expect(result.message).toBe("An unexpected error occurred");
    });
  });

  describe("error classes", () => {
    it("should create ValidationError", () => {
      const error = new ValidationError("Test error", "TEST_CODE");
      expect(error.status).toBe(400);
      expect(error.code).toBe("TEST_CODE");
      expect(error.name).toBe("ValidationError");
    });

    it("should create UnauthorizedError", () => {
      const error = new UnauthorizedError("Not logged in");
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("should create NotFoundError", () => {
      const error = new NotFoundError("Resource not found");
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should create ForbiddenError", () => {
      const error = new ForbiddenError("Access denied");
      expect(error.status).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });
  });
});