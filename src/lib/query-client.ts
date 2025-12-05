import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure the QueryClient for TanStack Query
 * Optimized for mobile PWA chat/social application
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,

            // Consider data fresh for 1 minute
            staleTime: 60 * 1000,

            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch on window focus to keep data fresh
            refetchOnWindowFocus: true,

            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,

            // Refetch on reconnect to sync after offline period
            refetchOnReconnect: true,

            // Network mode for offline support
            networkMode: 'online',
        },
        mutations: {
            // Retry mutations once on failure
            retry: 1,

            // Network mode for offline support
            networkMode: 'online',
        },
    },
});

/**
 * Query keys for type-safe query management
 */
export const queryKeys = {
    sessions: ['sessions'] as const,
    session: (id: string) => ['session', id] as const,
    moments: ['moments'] as const,
    moment: (id: string) => ['moment', id] as const,
    notifications: ['notifications'] as const,
    personas: ['personas'] as const,
    persona: (id: string) => ['persona', id] as const,
    messages: (sessionId: string) => ['messages', sessionId] as const,
} as const;
