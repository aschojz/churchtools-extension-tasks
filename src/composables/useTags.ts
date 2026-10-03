import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useCustomModuleDataValuesMutations, useCustomModuleDataValuesQuery } from '../data/ccm';
import { usePlugin } from './usePlugin';

export function useTags(projectId: MaybeRefOrGetter<number>) {
    const { moduleId } = usePlugin();
    const pId = computed(() => toValue(projectId));

    const { data } = useCustomModuleDataValuesQuery<Tag>(moduleId, pId);
    const { createCustomDataValue, updateCustomDataValue, deleteCustomDataValue } =
        useCustomModuleDataValuesMutations<Tag>(moduleId, pId);

    const tags = computed(() => {
        const tags = (data.value ?? []).filter(v => v.type === 'tag' && v.dataCategoryId === pId.value);
        return Object.fromEntries(tags.map(tag => [tag.id, tag]));
    });
    const tagsArray = computed(() =>
        Object.values(tags.value).map(tag => ({
            ...tag,
            nameTranslated: tag.name,
            icon: 'fas fa-circle' as const,
            color: { key: tag.color },
        })),
    );

    const createTag = (tag: Tag) => createCustomDataValue({ ...tag, dataCategoryId: pId.value, type: 'tag' });

    const updateTag = (tag: TransformedTag) =>
        updateCustomDataValue({ ...tag, dataCategoryId: pId.value, type: 'tag' });
    const deleteTag = (id: number) =>
        deleteCustomDataValue({ id, dataCategoryId: pId.value, revision: tags.value[id]?.revision });

    return { tags, tagsArray, createTag, updateTag, deleteTag };
}
