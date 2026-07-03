"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/query-client";
import { useEffect, useState } from "react";
import { persistQueryClient } from "@/lib/persist-query-client";

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new query client for each session to handle server-side rendering
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    // Restore persisted queries on mount
    persistQueryClient.restoreClient(queryClient);

    // Persist queries on change
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      persistQueryClient.persistClient(queryClient);
    });

    return () => (unsubscribe as () => void)();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}