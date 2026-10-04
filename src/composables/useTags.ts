import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useCustomModuleDataValuesMutations, useCustomModuleDataValuesQuery } from '../data/ccm';
import type { Tag, TransformedTag } from '../domain/types';
import { requireCurrentUser } from '../platform';
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

    const createTag = (tag: Tag) => {
        requireCurrentUser();
        return createCustomDataValue({ ...tag, dataCategoryId: pId.value, type: 'tag' });
    };

    const updateTag = (tag: TransformedTag) => {
        requireCurrentUser();
        return updateCustomDataValue({ ...tag, dataCategoryId: pId.value, type: 'tag' });
    };
    const deleteTag = (id: number) => {
        requireCurrentUser();
        return deleteCustomDataValue({ id, dataCategoryId: pId.value, revision: tags.value[id]?.revision });
    };

    return { tags, tagsArray, createTag, updateTag, deleteTag };
}
