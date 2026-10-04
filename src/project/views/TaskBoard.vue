<script setup lang="ts">
import { computed } from 'vue';
import List from '../../components/List.vue';
import ProgressRing from '../../components/ProgressRing.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { taskStore } from '../../composables/storeTasks';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{
    projectId: string;
}>();
const projectId = computed(() => parseInt(props.projectId));

const { tasks, tasksMap, getPercentFullfilled, showTask } = useTasks(projectId);
const store = taskStore();
const sortMode = computed(() => store.sortForView(projectId.value, 'project-tasks'));

const tasksByParent = computed(() => {
    const tasksWithSub = tasks.value.filter(task => Array.isArray(task.subTasks) && task.subTasks.length);
    return Object.fromEntries(
        tasksWithSub.map(parent => [
            parent.id,
            parent.subTasks?.map(st => tasksMap.value[st]).filter(st => !!st && showTask(st)),
        ]),
    );
});

const boardlists = computed(() => {
    const li = tasks.value
        .filter(task => Array.isArray(task.subTasks) && task.subTasks.filter(st => tasksMap.value[st]).length)
        .map(task => ({
            id: task.id,
            name: task.name,
            percentage: getPercentFullfilled(task),
            type: 'parent' as const,
        }));
    return li;
});
const visibleTasks = computed<TransformedTask[]>(() => [
    ...new Map(
        Object.values(tasksByParent.value)
            .flat()
            .filter((task): task is TransformedTask => !!task)
            .map(task => [task.id, task]),
    ).values(),
]);
provideTaskSelection(visibleTasks);
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions><TaskSelectionActions /></template>
        <template v-for="list in boardlists" :key="list.id">
            <List
                :is-draggable="false"
                :items="tasksByParent[list.id] ?? []"
                :list="list"
                :project-id="projectId"
                :show-task="true"
                :sort="sortMode"
            >
                <template #header>
                    <ProgressRing class="progress-icon relative text-[20px] text-gray-500" :percent="list.percentage" />
                    <span>{{ list.name }}</span>
                </template>
            </List>
        </template>
        <UEmpty
            v-if="!boardlists.length"
            class="w-full"
            icon="i-lucide-git-branch"
            title="Noch keine Unteraufgaben vorhanden"
        />
    </ViewWrapper>
</template>
