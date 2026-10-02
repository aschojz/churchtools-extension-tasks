<script setup lang="ts">
import { sortBy } from 'lodash-es';
import { computed } from 'vue';
import TaskItem from '../../components/TaskItem.vue';
import { taskStore } from '../../composables/storeTasks';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{
    projectId: string;
}>();
const projectId = computed(() => parseInt(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);

const store = taskStore();

const filteredTasks = computed(() => {
    const filtered = tasks.value.filter(task => showTask(task));
    return sortBy(
        filtered.map(t => ({ ...t, calculatedDueDate: calculateDueDate(t) })),
        store.sortBy === 'dueDate' ? 'calculatedDueDate' : store.sortBy,
    );
});
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <div v-if="filteredTasks.length" class="flex w-full flex-col">
            <TaskItem
                v-for="task in filteredTasks"
                :key="task.id"
                class="w-full"
                :item="task"
                :project-id="projectId"
            />
        </div>
        <UEmpty v-else class="w-full" icon="i-lucide-list-checks" title="Keine Aufgaben gefunden" />
    </ViewWrapper>
</template>
