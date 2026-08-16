'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { isApiError } from '../api/errors';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets one client, and so it is
  // never shared across requests during server rendering.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Retrying a 404 or a 403 just delays the empty state the user
              // needs to see — the owner may have deleted or revoked the item.
              if (isApiError(error) && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
