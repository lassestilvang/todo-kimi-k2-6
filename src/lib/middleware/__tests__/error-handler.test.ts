import { describe, it, expect } from 'vitest';
import {
  handleApiError,
  withErrorHandling,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/middleware/error-handler';

describe('error handling middleware', () => {
  describe('handleApiError', () => {
    it('should handle ApiError with status', () => {
      const error = new ValidationError('Invalid input', 'INVALID_INPUT');
      const result = handleApiError(error);

      expect(result.status).toBe(400);
      expect(result.message).toBe('Invalid input');
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = handleApiError(error);

      expect(result.status).toBe(500);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle unknown errors', () => {
      const result = handleApiError('string error');

      expect(result.status).toBe(500);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should handle null errors', () => {
      const result = handleApiError(null);

      expect(result.status).toBe(500);
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('error classes', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Test error', 'TEST_CODE');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ValidationError');
    });

    it('should create UnauthorizedError', () => {
      const error = new UnauthorizedError('Not logged in');
      expect(error.status).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create ForbiddenError', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.status).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create ConflictError', () => {
      const error = new ConflictError('Resource conflict');
      expect(error.status).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap a handler and return Response on success', async () => {
      const handler = async () => new Response('OK', { status: 200 });
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(200);
    });

    it('should catch errors and return error response', async () => {
      const handler = async () => {
        throw new ValidationError('Invalid input', 'INVALID');
      };
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should handle AuthorizationError and return 401', async () => {
      const handler = async () => {
        throw new UnauthorizedError('Not authenticated');
      };
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(401);
    });

    it('should handle NotFoundError and return 404', async () => {
      const handler = async () => {
        throw new NotFoundError('Resource not found');
      };
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(404);
    });

    it('should return 500 for unknown errors', async () => {
      const handler = async () => {
        throw new Error('Unknown error');
      };
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
    });

    it('should handle empty parameters gracefully', async () => {
      const handler = async () => new Response('OK', { status: 200 });
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(Response);
    });
  });
});
