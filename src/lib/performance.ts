import { logger } from "./logger";

/**
 * Represents a single performance measurement.
 */
export interface PerformanceMetric {
  /** Name of the operation being measured */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Unix timestamp when the measurement was recorded */
  timestamp: number;
  /** API endpoint path (for API routes) */
  endpoint?: string;
  /** User ID if available */
  userId?: number;
}

/**
 * In-memory performance monitoring utility.
 * Tracks operation durations and provides basic analytics.
 * For production, consider integrating with APM solutions like New Relic or Datadog.
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxSize = 1000;

  /**
   * Record a performance metric. Logs a warning for operations exceeding 1 second.
   *
   * @param metric - The performance metric to record
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }

    // Log slow operations
    if (metric.duration > 1000) {
      logger.warn(`Slow operation detected: ${metric.name}`, {
        duration: metric.duration,
        endpoint: metric.endpoint,
        userId: metric.userId,
      });
    }
  }

  /**
   * Get all metrics for a specific operation name.
   *
   * @param name - The operation name to filter by
   * @returns Array of matching performance metrics
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Calculate the average duration for a specific operation.
   *
   * @param name - The operation name
   * @returns Average duration in milliseconds, or 0 if no metrics exist
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  }

  /**
   * Clear all stored metrics.
   */
  clear(): void {
    this.metrics = [];
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Wrapper to measure the performance of an async function.
 * Records the duration and logs warnings for slow operations.
 *
 * @template T - Return type of the function
 * @param name - Operation name for identification
 * @param fn - The async function to measure
 * @param context - Optional context (endpoint, userId)
 * @returns The result of the function, with performance recorded
 *
 * @example
 * const tasks = await measurePerformance("getTasks", () => getTasks(), { endpoint: "/api/tasks" });
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  context?: { endpoint?: string; userId?: number }
): Promise<T> {
  const start = Date.now();

  return fn().then((result) => {
    const duration = Date.now() - start;
    perfMonitor.record({
      name,
      duration,
      endpoint: context?.endpoint,
      userId: context?.userId,
    });
    return result;
  });
}

/**
 * Higher-order function to add performance monitoring to API route handlers.
 * Wraps the handler and records performance metrics for both success and error cases.
 *
 * @param handler - The API route handler function
 * @param operationName - Name for the operation (e.g., "getTasks", "createTask")
 * @returns Wrapped handler with performance monitoring
 *
 * @example
 * export const GET = withPerformanceMonitoring(async (request) => {
 *   const tasks = await getTasks();
 *   return NextResponse.json({ tasks });
 * }, "getTasks");
 */
export function withPerformanceMonitoring(
  handler: (request: Request) => Promise<Response>,
  operationName: string
) {
  return async (request: Request) => {
    const start = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;

    try {
      const response = await handler(request);
      const duration = Date.now() - start;

      perfMonitor.record({
        name: operationName,
        duration,
        endpoint,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      perfMonitor.record({
        name: `${operationName}_error`,
        duration,
        endpoint,
      });

      throw error;
    }
  };
}