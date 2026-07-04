import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a new QueryClient with optimized settings for offline support.
 * Persistence is handled in the QueryProvider via the persistQueryClient option.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true, // Re-sync when connection returns
        // Offline support: keep data fresh longer when offline
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Default export for backwards compatibility
export const queryClient = createQueryClient();