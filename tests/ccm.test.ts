import { QueryClient } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import {
    ccmKeys,
    decodeData,
    useCustomModuleDataCategoryMutations,
    useCustomModuleDataValuesMutations,
    useCustomModuleDataValuesQuery,
} from '../src/data/ccm';
import { queryClient } from '../src/data/queryClient';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), deleteApi: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: api }));

beforeEach(() => {
    (queryClient as QueryClient).clear();
    vi.resetAllMocks();
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
    it('serializes a value and invalidates the original category even after navigation', async () => {
        const module = ref(7),
            category = ref(1);
        let finish!: (v: object) => void;
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
            value: '{"name":"Edited"}',
        });
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
