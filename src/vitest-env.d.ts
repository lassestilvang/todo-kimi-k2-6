// Vitest environment declarations
/// <reference types="vitest/globals" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock types for tests
type Mock<T extends (...args: any[]) => any> = {
  mockResolvedValue(
    value: ReturnType<T> extends Promise<infer U> ? U : never
  ): void;
  mockImplementation(fn: (...args: Parameters<T>) => ReturnType<T>): void;
  mockImplementationOnce(fn: (...args: Parameters<T>) => ReturnType<T>): void;
  mockReturnValue(value: ReturnType<T>): void;
};