import { QueryClient } from '@tanstack/vue-query';

// The published ChurchTools utils bundle embeds its own older query-core runtime.
// Never pass that client to our current TanStack observers.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        mutations: { retry: false },
    },
});
