import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  handleApiError,
} from '@/lib/middleware/error-handler';

describe('Error Handler - Uncovered Functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classes', () => {
    describe('ValidationError', () => {
      it('should create validation error with message', () => {
        const error = new ValidationError('Invalid input');
        expect(error.message).toBe('Invalid input');
        expect(error.status).toBe(400);
        expect(error.name).toBe('ValidationError');
      });

      it('should create validation error with code', () => {
        const error = new ValidationError('Invalid input', 'VALIDATION_ERROR');
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      it('should be an instance of Error', () => {
        const error = new ValidationError('Test');
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('UnauthorizedError', () => {
      it('should create unauthorized error with default message', () => {
        const error = new UnauthorizedError();
        expect(error.message).toBe('Unauthorized');
        expect(error.status).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
      });

      it('should create unauthorized error with custom message', () => {
        const error = new UnauthorizedError('Token expired');
        expect(error.message).toBe('Token expired');
        expect(error.status).toBe(401);
      });

      it('should be an instance of Error', () => {
        const error = new UnauthorizedError();
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('ForbiddenError', () => {
      it('should create forbidden error with default message', () => {
        const error = new ForbiddenError();
        expect(error.message).toBe('Forbidden');
        expect(error.status).toBe(403);
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should create forbidden error with custom message', () => {
        const error = new ForbiddenError('Access denied to resource');
        expect(error.message).toBe('Access denied to resource');
        expect(error.status).toBe(403);
      });

      it('should be an instance of Error', () => {
        const error = new ForbiddenError();
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with default message', () => {
        const error = new NotFoundError();
        expect(error.message).toBe('Not Found');
        expect(error.status).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should create not found error with custom message', () => {
        const error = new NotFoundError('User not found');
        expect(error.message).toBe('User not found');
        expect(error.status).toBe(404);
      });

      it('should be an instance of Error', () => {
        const error = new NotFoundError();
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('ConflictError', () => {
      it('should create conflict error with default message', () => {
        const error = new ConflictError();
        expect(error.message).toBe('Conflict');
        expect(error.status).toBe(409);
        expect(error.code).toBe('CONFLICT');
      });

      it('should create conflict error with custom message', () => {
        const error = new ConflictError('Resource already exists');
        expect(error.message).toBe('Resource already exists');
        expect(error.status).toBe(409);
      });

      it('should be an instance of Error', () => {
        const error = new ConflictError();
        expect(error).toBeInstanceOf(Error);
      });
    });
  });

  describe('handleApiError', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input', 'VALIDATION_ERROR');
      const result = handleApiError(error);

      expect(result.message).toBe('Invalid input');
      expect(result.status).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Token expired');
      const result = handleApiError(error);

      expect(result.message).toBe('Token expired');
      expect(result.status).toBe(401);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should handle ForbiddenError', () => {
      const error = new ForbiddenError('Access denied');
      const result = handleApiError(error);

      expect(result.message).toBe('Access denied');
      expect(result.status).toBe(403);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User not found');
      const result = handleApiError(error);

      expect(result.message).toBe('User not found');
      expect(result.status).toBe(404);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = handleApiError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.status).toBe(500);
      expect(result.code).toBeUndefined();
    });

    it('should handle null error', () => {
      const result = handleApiError(null);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.status).toBe(500);
    });

    it('should handle undefined error', () => {
      const result = handleApiError(undefined);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.status).toBe(500);
    });
  });

  describe('Error hierarchy', () => {
    it('all error classes should be instances of Error', () => {
      const errors = [
        new ValidationError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new NotFoundError('test'),
        new ConflictError('test'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('each error should have correct status code', () => {
      expect(new ValidationError('test').status).toBe(400);
      expect(new UnauthorizedError('test').status).toBe(401);
      expect(new ForbiddenError('test').status).toBe(403);
      expect(new NotFoundError('test').status).toBe(404);
      expect(new ConflictError('test').status).toBe(409);
    });

    it('each error should have correct code', () => {
      expect(new ValidationError('test', 'CODE').code).toBe('CODE');
      expect(new UnauthorizedError('test').code).toBe('UNAUTHORIZED');
      expect(new ForbiddenError('test').code).toBe('FORBIDDEN');
      expect(new NotFoundError('test').code).toBe('NOT_FOUND');
      expect(new ConflictError('test').code).toBe('CONFLICT');
    });
  });
});
