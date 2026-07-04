import { createMockDatabase } from "./mock-driver";
import type { Database } from "./driver";

/**
 * Creates a test database for unit testing.
 * Uses a mock database to avoid native module dependencies in test environment.
 */
export function createTestDb(): Database {
  const mockDb = createMockDatabase();
  // Expose reset for test cleanup
  const originalReset = mockDb._reset;
  (mockDb as Database & { _reset: () => void })._reset = () => {
    if (originalReset) originalReset();
  };
  return mockDb as unknown as Database;
}