<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { failWithCompensation } from '../../application/compensation';
import DialogTag from '../../components/DialogTag.vue';
import List from '../../components/List.vue';
import { taskStore } from '../../composables/storeTasks';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import { CtColor, uiColor } from '../../platform';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => parseInt(props.projectId));

const { tasks, showTask, updateTask } = useTasks(projectId);
const { tags, tagsArray, deleteTag } = useTags(projectId);
const store = taskStore();
const sortMode = computed(() => store.sortForView(projectId.value, 'project-tags'));
const tagDialog = ref<TransformedTag | true>();
const actionError = ref('');

const deleteSelectedTag = async (tag: TransformedTag) => {
    const confirmed = window.confirm(`Der Tag „${tag.name}“ wird von allen Aufgaben entfernt.`);
    if (!confirmed) return;
    actionError.value = '';
    const changedTasks: TransformedTask[] = [];
    try {
        for (const task of tasks.value.filter(task => Array.isArray(task.tags) && task.tags.includes(tag.id))) {
            await updateTask({ ...task, tags: task.tags?.filter(id => id !== tag.id) });
            changedTasks.push(task);
        }
        await deleteTag(tag.id);
    } catch (error) {
        await failWithCompensation(
            'Tag löschen',
            error,
            changedTasks.map(original => () => updateTask({ ...original, revision: (original.revision ?? 0) + 1 })),
        ).catch(compensationError => {
            actionError.value =
                compensationError instanceof Error ? compensationError.message : 'Tag konnte nicht gelöscht werden.';
        });
    }
};

const tagMenu = (tagId: number): DropdownMenuItem[][] => {
    const tag = tags.value[tagId];
    if (!tag) return [];
    return [
        [
            {
                label: 'Bearbeiten',
                icon: 'i-lucide-pencil',
                onSelect: () => {
                    tagDialog.value = tag;
                },
            },
            {
                label: 'Löschen',
                icon: 'i-lucide-trash-2',
                color: 'error',
                onSelect: () => deleteSelectedTag(tag),
            },
        ],
    ];
};

const tasksByTag = computed(() => {
    const tagLists: Record<number, TransformedTask[]> = { 0: [] };
    tasks.value.forEach(task => {
        if (showTask(task)) {
            if (Array.isArray(task.tags) && task.tags.length) {
                task.tags.forEach(tag => {
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
            <UButton
                color="neutral"
                icon="i-lucide-tag"
                label="Tag erstellen"
                variant="outline"
                @click="tagDialog = true"
            />
        </template>
        <p v-if="actionError" class="text-red-600" role="alert">{{ actionError }}</p>
        <template v-for="list in boardlists" :key="list.id">
            <List
                :is-draggable="false"
                :items="tasksByTag[list.id] ?? []"
                :list="list"
                :project-id="projectId"
                :sort="sortMode"
            >
                <template #header>
                    <UBadge :color="uiColor(list.color?.key ?? CtColor.BASIC)" :label="list.name" variant="soft" />
                    <UDropdownMenu v-if="list.id" :items="tagMenu(list.id)"
                        ><UButton
                            :aria-label="`Aktionen für Tag ${list.name}`"
                            color="neutral"
                            icon="i-lucide-ellipsis"
                            size="sm"
                            square
                            variant="ghost"
                    /></UDropdownMenu>
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
