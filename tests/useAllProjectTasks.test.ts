import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useAllProjectTasks } from '../src/composables/useAllProjectTasks';

const mocks = vi.hoisted(() => ({
    config: undefined as undefined | { queries: () => Array<Record<string, unknown>> },
    refetchFirst: vi.fn(),
    refetchSecond: vi.fn(),
    refetchProjects: vi.fn(),
}));

vi.mock('../src/composables/usePlugin', () => ({ usePlugin: () => ({ moduleId: ref(7) }) }));
vi.mock('../src/project/useProjects', () => ({
    default: () => ({
        projects: ref([
            { id: 3, name: 'Alpha' },
            { id: 4, name: 'Beta' },
        ]),
        isLoading: ref(false),
        isError: ref(false),
        refetch: mocks.refetchProjects,
    }),
}));
vi.mock('@tanstack/vue-query', async importOriginal => ({
    ...(await importOriginal<typeof import('@tanstack/vue-query')>()),
    useQueries: (config: { queries: () => Array<Record<string, unknown>> }) => {
        mocks.config = config;
        return ref([
            {
                data: [
                    {
                        id: 30,
                        dataCategoryId: 3,
                        type: 'task',
                        name: 'Erste Aufgabe',
                        fullfilled: false,
                        priority: 'none',
                        sortKey: 1,
                    },
                ],
                isPending: true,
                isError: false,
                refetch: mocks.refetchFirst,
            },
            { data: [], isPending: false, isError: false, refetch: mocks.refetchSecond },
        ]);
    },
}));

beforeEach(() => vi.clearAllMocks());

describe('global project task search', () => {
    it('keeps all project queries disabled until search is opened', () => {
        const enabled = ref(false);
        const result = useAllProjectTasks({ enabled });

        expect(mocks.config?.queries().map(query => query.enabled)).toEqual([false, false]);
        expect(result.isLoading.value).toBe(false);

        enabled.value = true;
        expect(mocks.config?.queries().map(query => query.enabled)).toEqual([true, true]);
        expect(result.isLoading.value).toBe(true);
        expect(result.tasks.value).toEqual([
            expect.objectContaining({
                project: expect.objectContaining({ id: 3, name: 'Alpha' }),
                task: expect.objectContaining({ id: 30, name: 'Erste Aufgabe' }),
            }),
        ]);
    });

    it('refreshes the projects and every active task query explicitly', async () => {
        mocks.refetchProjects.mockResolvedValue(undefined);
        mocks.refetchFirst.mockResolvedValue(undefined);
        mocks.refetchSecond.mockResolvedValue(undefined);
        const result = useAllProjectTasks({ enabled: ref(true) });

        await result.refetch();

        expect(mocks.refetchProjects).toHaveBeenCalledOnce();
        expect(mocks.refetchFirst).toHaveBeenCalledOnce();
        expect(mocks.refetchSecond).toHaveBeenCalledOnce();
    });
});
