// Vitest environment declarations
/// <reference types="vitest/globals" />
/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "vitest/globals" {
  export interface Vi {
    fn: <T extends (...args: any[]) => any>(impl?: T) => Mock<T>;
  }
  export const describe: (name: string, fn: () => void) => void;
  export const test: (name: string, fn?: () => void | Promise<void>) => void;
  export const it: (name: string, fn?: () => void | Promise<void>) => void;
  export const expect: Expect;
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
}

// Mock types
type Mock<T extends (...args: any[]) => any> = {
  mockResolvedValue(value: ReturnType<T> extends Promise<infer U> ? U : never): void;
  mockImplementation(fn: (...args: Parameters<T>) => ReturnType<T>): void;
  mockImplementationOnce(fn: (...args: Parameters<T>) => ReturnType<T>): void;
  mockReturnValue(value: ReturnType<T>): void;
};

type Expect = {
  (value: any): Expectation;
  extend: (matcher: any) => void;
};

type Expectation = {
  toBe(value: any): void;
  toEqual(value: any): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toHaveLength(length: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toBeGreaterThan(value: number): void;
  toBeLessThan(value: number): void;
};