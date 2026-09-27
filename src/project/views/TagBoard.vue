<script setup lang="ts">
import { Button, deleteConfirm, DropdownMenu, Tag, type DropdownSection } from '@churchtools/styleguide';
import { CtColor, CtIcon } from '@churchtools/utils';
import { computed, ref } from 'vue';
import DialogTag from '../../components/DialogTag.vue';
import List from '../../components/List.vue';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => parseInt(props.projectId));

const { tasks, showTask, updateTask } = useTasks(projectId);
const { tags, tagsArray, deleteTag } = useTags(projectId);
const tagDialog = ref<TransformedTag | true>();
const actionError = ref('');

const deleteSelectedTag = async (tag: TransformedTag) => {
    const confirmed = await deleteConfirm(`Der Tag „${tag.name}“ wird von allen Aufgaben entfernt.`, {
        rejectOnCancel: false,
    });
    if (confirmed !== 'ok') return;
    actionError.value = '';
    try {
        for (const task of tasks.value.filter(task => task.tags?.includes(tag.id))) {
            await updateTask({ ...task, tags: task.tags?.filter(id => id !== tag.id) });
        }
        await deleteTag(tag.id);
    } catch {
        actionError.value = 'Tag konnte nicht vollständig gelöscht werden. Bitte erneut versuchen.';
    }
};

const tagMenu = (tagId: number): DropdownSection[] => {
    const tag = tags.value[tagId];
    if (!tag) return [];
    return [
        {
            title: `Tag „${tag.name}“`,
            items: [
                {
                    id: 'edit',
                    nameTranslated: 'Bearbeiten',
                    icon: CtIcon.EDIT,
                    callback: () => {
                        tagDialog.value = tag;
                    },
                },
                {
                    id: 'delete',
                    nameTranslated: 'Löschen',
                    icon: { icon: CtIcon.DELETE, class: 'text-red-500' },
                    callback: () => deleteSelectedTag(tag),
                },
            ],
        },
    ];
};

const tasksByTag = computed(() => {
    const tagLists: Record<number, TransformedTask[]> = { 0: [] };
    tasks.value.forEach(task => {
        if (showTask(task)) {
            if (task.tags?.length) {
                task.tags?.forEach(tag => {
                    tagLists[tag] ??= [];
                    tagLists[tag].push(task);
                });
            } else {
                tagLists[0].push(task);
            }
        }
    });
    return tagLists;
});

const boardlists = computed(() => {
    const li = tagsArray.value.map(tag => ({ ...tag, type: 'tag' as const }));
    li.unshift({
        id: 0,
        name: 'Kein Tag',
        nameTranslated: 'Kein Tag',
        color: { key: CtColor.BASIC },
        icon: 'fas fa-circle',
        dataCategoryId: projectId.value,
        sortKey: 0,
        type: 'tag',
    });
    return li;
});
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions>
            <Button icon="fas fa-tag" label="Tag erstellen" outlined @click="tagDialog = true" />
        </template>
        <p v-if="actionError" class="text-red-600" role="alert">{{ actionError }}</p>
        <template v-for="list in boardlists" :key="list.id">
            <List :is-draggable="false" :items="tasksByTag[list.id] ?? []" :list="list" :project-id="projectId">
                <template #header>
                    <Tag :color="list.color?.key ?? CtColor.BASIC" :label="list.name" />
                    <DropdownMenu v-if="list.id" :menu-items="tagMenu(list.id)">
                        <Button :color="CtColor.BASIC" icon="fas fa-ellipsis" size="S" text />
                    </DropdownMenu>
                </template>
            </List>
        </template>
        <DialogTag
            v-if="tagDialog"
            :project-id="projectId"
            :tag="tagDialog === true ? undefined : tagDialog"
            @close="tagDialog = undefined"
        />
    </ViewWrapper>
</template>
