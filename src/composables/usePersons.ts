import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { queryClient } from '../data/queryClient';
import { type Person, type PersonDisplay } from '../platform';

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

export async function searchPersons(query: string) {
    const normalized = query.trim();
    if (normalized.length < 2) return [];
    const result = await churchtoolsClient.get<PersonDisplay[]>(
        `/search?query=${encodeURIComponent(normalized)}&domainTypes[]=person`,
    );
    return result.flatMap(person => {
        const id = Number(person.domainIdentifier);
        return Number.isSafeInteger(id) && id > 0 ? [{ id, label: person.title }] : [];
    });
}
