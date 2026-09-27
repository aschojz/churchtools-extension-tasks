<script setup lang="ts">
import { Tag } from '@churchtools/styleguide';
import { CtColor } from '@churchtools/utils';
import { computed } from 'vue';
import List from '../../components/List.vue';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => parseInt(props.projectId));

const { tasks, showTask } = useTasks(projectId);
const { tagsArray } = useTags(projectId);

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
        <template v-for="list in boardlists" :key="list.id">
            <List
                v-if="tasksByTag[list.id]"
                :is-draggable="false"
                :items="tasksByTag[list.id]"
                :list="list"
                :project-id="projectId"
            >
                <template #header>
                    <Tag :color="list.color?.key ?? CtColor.BASIC" :label="list.name" />
                </template>
            </List>
        </template>
    </ViewWrapper>
</template>
