import { QueryClient } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import {
    ccmKeys,
    DataConflictError,
    decodeData,
    fetchCustomModuleDataValues,
    useCustomModuleDataCategoryMutations,
    useCustomModuleDataValuesMutations,
    useCustomModuleDataValuesQuery,
} from '../src/data/ccm';
import { queryClient } from '../src/data/queryClient';
import { CURRENT_SCHEMA_VERSION, dataIssues } from '../src/domain/storedData';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), deleteApi: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: api }));

beforeEach(() => {
    (queryClient as QueryClient).clear();
    vi.resetAllMocks();
    dataIssues.value = [];
});
describe('CCM repository', () => {
    it('rejects malformed JSON and gives API metadata precedence', () => {
        expect(decodeData('{"id":999,"name":"Task"}', { id: 1 })).toEqual({ id: 1, name: 'Task' });
        expect(() => decodeData('broken', {})).toThrow();
        expect(() => decodeData('[]', {})).toThrow();
    });
    it('waits for valid IDs and reads a new project reactively without writing', async () => {
        const module = ref<number>();
        const category = ref(1);
        api.get.mockResolvedValue([]);
        const wrapper = mount(
            defineComponent({
                setup() {
                    useCustomModuleDataValuesQuery(module, category);
                    return () => null;
                },
            }),
        );
        await flushPromises();
        expect(api.get).not.toHaveBeenCalled();
        module.value = 7;
        await flushPromises();
        expect(api.get).toHaveBeenLastCalledWith('/custommodules/7/customdatacategories/1/customdatavalues');
        category.value = 2;
        await flushPromises();
        expect(api.get).toHaveBeenLastCalledWith('/custommodules/7/customdatacategories/2/customdatavalues');
        expect(api.post).not.toHaveBeenCalled();
        expect(api.put).not.toHaveBeenCalled();
        wrapper.unmount();
    });
    it('isolates malformed values while keeping valid migrated entries', async () => {
        api.get.mockResolvedValue([
            { id: 1, dataCategoryId: 3, value: '{broken' },
            {
                id: 2,
                dataCategoryId: 3,
                value: JSON.stringify({ type: 'task', name: 'Valid', fullfilled: false, sortKey: 1 }),
            },
        ]);
        await expect(fetchCustomModuleDataValues<Task>(7, 3)).resolves.toEqual([
            expect.objectContaining({ id: 2, schemaVersion: CURRENT_SCHEMA_VERSION, type: 'task', name: 'Valid' }),
        ]);
        expect(dataIssues.value).toEqual([expect.objectContaining({ entity: 'value', id: 1, categoryId: 3 })]);
        api.get.mockResolvedValue([
            {
                id: 2,
                dataCategoryId: 3,
                value: JSON.stringify({ type: 'task', name: 'Valid', fullfilled: false, sortKey: 1 }),
            },
        ]);
        await fetchCustomModuleDataValues<Task>(7, 3);
        expect(dataIssues.value).toEqual([]);
    });
    it('serializes a value and invalidates the original category even after navigation', async () => {
        const module = ref(7),
            category = ref(1);
        let finish!: (v: object) => void;
        api.get.mockResolvedValue([
            { id: 11, dataCategoryId: 1, value: JSON.stringify({ name: 'Before', revision: 0 }) },
        ]);
        api.put.mockImplementation(
            () =>
                new Promise(resolve => {
                    finish = resolve;
                }),
        );
        let commands!: ReturnType<typeof useCustomModuleDataValuesMutations<{ name: string }>>;
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const wrapper = mount(
            defineComponent({
                setup() {
                    commands = useCustomModuleDataValuesMutations<{ name: string }>(module, category);
                    return () => null;
                },
            }),
        );
        const pending = commands.updateCustomDataValue({ id: 11, dataCategoryId: 1, name: 'Edited' });
        await flushPromises();
        category.value = 2;
        finish({ id: 11, dataCategoryId: 1, value: '{"name":"Edited"}' });
        await pending;
        expect(api.put).toHaveBeenCalledWith('/custommodules/7/customdatacategories/1/customdatavalues/11', {
            id: 11,
            dataCategoryId: 1,
            value: expect.any(String),
        });
        expect(JSON.parse(api.put.mock.calls[0][1].value)).toMatchObject({
            name: 'Edited',
            revision: 1,
            schemaVersion: CURRENT_SCHEMA_VERSION,
        });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ccmKeys.values(7, 1) });
        wrapper.unmount();
    });
    it('adds the current schema version to task writes', async () => {
        api.post.mockResolvedValue({ id: 9, dataCategoryId: 1 });
        let commands!: ReturnType<typeof useCustomModuleDataValuesMutations<Task>>;
        const wrapper = mount(
            defineComponent({
                setup() {
                    commands = useCustomModuleDataValuesMutations<Task>(7, 1);
                    return () => null;
                },
            }),
        );
        await commands.createCustomDataValue({
            dataCategoryId: 1,
            type: 'task',
            name: 'Versioned',
            fullfilled: false,
            priority: 'none',
            sortKey: 1,
        });
        const body = api.post.mock.calls[0][1] as { value: string };
        expect(JSON.parse(body.value)).toMatchObject({
            schemaVersion: CURRENT_SCHEMA_VERSION,
            revision: 1,
            type: 'task',
            name: 'Versioned',
        });
        expect(JSON.parse(body.value).updatedAt).toEqual(expect.any(String));
        wrapper.unmount();
    });
    it('rejects a stale update, refreshes the cache and does not overwrite server data', async () => {
        api.get.mockResolvedValue([
            {
                id: 11,
                dataCategoryId: 1,
                value: JSON.stringify({ name: 'Changed elsewhere', revision: 3 }),
            },
        ]);
        let commands!: ReturnType<typeof useCustomModuleDataValuesMutations<{ name: string; revision?: number }>>;
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const wrapper = mount(
            defineComponent({
                setup() {
                    commands = useCustomModuleDataValuesMutations<{ name: string; revision?: number }>(7, 1);
                    return () => null;
                },
            }),
        );
        await expect(
            commands.updateCustomDataValue({ id: 11, dataCategoryId: 1, name: 'My edit', revision: 2 }),
        ).rejects.toBeInstanceOf(DataConflictError);
        expect(api.put).not.toHaveBeenCalled();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ccmKeys.values(7, 1) });
        wrapper.unmount();
    });
    it('rejects mutations before module loading and explicitly deletes categories', async () => {
        const module = ref<number>();
        let values!: ReturnType<typeof useCustomModuleDataValuesMutations<{ name: string }>>;
        let categories!: ReturnType<typeof useCustomModuleDataCategoryMutations<{ name: string }>>;
        const wrapper = mount(
            defineComponent({
                setup() {
                    values = useCustomModuleDataValuesMutations<{ name: string }>(module, 1);
                    categories = useCustomModuleDataCategoryMutations(module);
                    return () => null;
                },
            }),
        );
        await expect(values.createCustomDataValue({ dataCategoryId: 1, name: 'Task' })).rejects.toThrow('Ungültiges');
        expect(api.post).not.toHaveBeenCalled();
        module.value = 7;
        api.deleteApi.mockResolvedValue(undefined);
        await categories.deleteDataCategory(1);
        expect(api.deleteApi).toHaveBeenCalledWith('/custommodules/7/customdatacategories/1?dry_run=false');
        wrapper.unmount();
    });
});
