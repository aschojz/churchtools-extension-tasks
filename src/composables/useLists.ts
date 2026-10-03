import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useCustomModuleDataValuesMutations, useCustomModuleDataValuesQuery } from '../data/ccm';
import { usePlugin } from './usePlugin';

export function useLists(projectId: MaybeRefOrGetter<number>) {
    const { moduleId } = usePlugin();
    const pId = computed(() => toValue(projectId));

    const { data } = useCustomModuleDataValuesQuery<TaskList>(moduleId, pId);
    const { createCustomDataValue, updateCustomDataValue, deleteCustomDataValue } =
        useCustomModuleDataValuesMutations<TaskList>(moduleId, pId);

    const lists = computed(() => (data.value ?? []).filter(v => v.type === 'list' && v.dataCategoryId === pId.value));

    const createList = (list: TaskList) => {
        return createCustomDataValue({
            ...list,
            dataCategoryId: pId.value,
            type: 'list',
        });
    };

    const updateList = (list: TransformedList) =>
        updateCustomDataValue({ ...list, dataCategoryId: pId.value, type: 'list' });
    const deleteList = (listId: number) =>
        deleteCustomDataValue({ id: listId, dataCategoryId: pId.value, revision: getListById(listId)?.revision });

    const getListById = (id: number) => lists.value.find(l => l.id === id);

    return { lists, createList, updateList, getListById, deleteList };
}
