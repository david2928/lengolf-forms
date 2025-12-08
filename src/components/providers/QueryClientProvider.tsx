'use client';

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * React Query Provider for the application
 * Provides caching and automatic refetching for all API calls
 */
export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long data is considered fresh (5 minutes)
            staleTime: 5 * 60 * 1000,
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Retry failed queries
            retry: 1,
          },
        },
      })
  );

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}
