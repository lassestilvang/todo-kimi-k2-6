import { QueryClient, type Query } from "@tanstack/react-query";

const PERSISTED_QUERIES_KEY = "react-query-persisted";

interface PersistedQuery {
  queryKey: string;
  data: unknown;
  timestamp: number;
}

/**
 * Handles persistence of React Query client state to localStorage.
 * Provides offline support by preserving cached data across page reloads.
 */
export const persistQueryClient = {
  /**
   * Restore persisted queries from localStorage into the query client
   */
  restoreClient(queryClient: QueryClient): void {
    if (typeof window === "undefined") return;

    try {
      const persisted = localStorage.getItem(PERSISTED_QUERIES_KEY);
      if (!persisted) return;

      const queries: PersistedQuery[] = JSON.parse(persisted);
      const now = Date.now();
      const STALE_TIME = 1000 * 60 * 60; // 1 hour

      queries.forEach((q) => {
        // Only restore non-stale data
        if (now - q.timestamp < STALE_TIME) {
          // Parse queryKey back from string to array
          queryClient.setQueryData(JSON.parse(q.queryKey) as unknown[], q.data);
        }
      });
    } catch (error) {
      console.warn("Failed to restore persisted queries:", error);
    }
  },

  /**
   * Persist current query state to localStorage
   */
  persistClient(queryClient: QueryClient): void {
    if (typeof window === "undefined") return;

    try {
      const cache = queryClient.getQueryCache();
      const queries: PersistedQuery[] = [];

      cache.findAll().forEach((query: Query) => {
        // Only persist successful queries with data
        if (query.state.data !== undefined && query.state.status === "success") {
          queries.push({
            queryKey: JSON.stringify(query.queryKey),
            data: query.state.data as unknown,
            timestamp: Date.now(),
          });
        }
      });

      // Limit stored queries to prevent localStorage overflow
      const limitedQueries = queries.slice(0, 100);

      localStorage.setItem(PERSISTED_QUERIES_KEY, JSON.stringify(limitedQueries));
    } catch (error) {
      console.warn("Failed to persist queries:", error);
    }
  },

  /**
   * Clear all persisted queries
   */
  clearClient(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PERSISTED_QUERIES_KEY);
  },
};