<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { sortBy } from 'lodash-es';
import { computed } from 'vue';
import List from '../../components/List.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { taskStore } from '../../composables/storeTasks';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import { useLists } from '../../composables/useLists';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();

const projectId = computed(() => parseInt(props.projectId));
const { transformedTasks, showTask } = useTasks(projectId);
const { lists } = useLists(projectId);
const store = taskStore();
const sortMode = computed(() => store.sortForView(projectId.value, 'project-board'));

const boardlists = computed(() => {
    const li = [...lists.value];
    return sortBy(li, 'sortKey');
});

const tasksByList = computed(() => {
    const items: Record<number, TransformedTask[]> = {};
    const existingLists = boardlists.value.map(l => l.id);
    const defaultListId = lists.value.find(l => l.isDefault)?.id ?? 0;
    transformedTasks.value.forEach(task => {
        if (showTask(task)) {
            const listId = task.list && existingLists.includes(task.list) ? task.list : defaultListId;
            items[listId] ??= [];
            items[listId].push(task);
        }
    });
    return items;
});
const visibleTasks = computed(() => transformedTasks.value.filter(showTask));
provideTaskSelection(visibleTasks);
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions><TaskSelectionActions /></template>
        <List
            v-for="list in boardlists"
            :key="list.id"
            :is-draggable="sortMode === 'manual'"
            :items="tasksByList[list.id] ?? []"
            :list="list"
            :project-id="projectId"
            :sort="sortMode"
        />
    </ViewWrapper>
</template>
