'use client';

import { useState } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '@/lib/api/client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      // Cheque Flow reads cheques live from Payments, Credits and Refunds, so
      // any successful change anywhere refreshes it (only if it's on screen).
      mutationCache: new MutationCache({
        onSuccess: () => client.invalidateQueries({ queryKey: ['cheque-flow'] }),
      }),
      defaultOptions: {
        queries: {
          staleTime: 0,
          refetchOnMount: 'always',
          retry: (failureCount, error) => {
            if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
              return false;
            }
            return failureCount < 2;
          },
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
