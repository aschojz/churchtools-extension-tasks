import { churchtoolsClient } from '@churchtools/churchtools-client';
import { type Person } from '@churchtools/utils';
import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { queryClient } from '../data/queryClient';

export function usePersonsQueryAllPages(
    filter: MaybeRefOrGetter<{ ids: number[] }>,
    options?: { enabled?: () => boolean },
) {
    const ids = computed(() => [...new Set(toValue(filter).ids)].sort((a, b) => a - b));
    return useQuery(
        {
            queryKey: computed(() => ['tasks-persons', ids.value]),
            enabled: () => ids.value.length > 0 && (options?.enabled?.() ?? true),
            queryFn: () => churchtoolsClient.getAllPages<Person>('/persons', { ids: ids.value }),
        },
        queryClient,
    );
}
