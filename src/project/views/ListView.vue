<script setup lang="ts">
import { computed } from 'vue';
import TaskItem from '../../components/TaskItem.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { taskStore } from '../../composables/storeTasks';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import { useTasks } from '../../composables/useTasks';
import { sortTasks } from '../../domain/tasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{
    projectId: string;
}>();
const projectId = computed(() => parseInt(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);

const store = taskStore();

const filteredTasks = computed(() => {
    const filtered = tasks.value.filter(task => showTask(task));
    return sortTasks(filtered, store.sortForView(projectId.value, 'project-list'), calculateDueDate);
});
const selection = provideTaskSelection(filteredTasks);
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions>
            <TaskSelectionActions />
        </template>
        <div v-if="filteredTasks.length" class="flex w-full flex-col">
            <UAlert
                v-if="selection.error.value"
                class="mb-3"
                color="error"
                :title="selection.error.value"
                variant="subtle"
            />
            <div v-for="task in filteredTasks" :key="task.id">
                <TaskItem class="min-w-0 flex-1" density="row" :item="task" :project-id="projectId" />
            </div>
        </div>
        <UEmpty v-else class="w-full" icon="i-lucide-list-checks" title="Keine Aufgaben gefunden" />
    </ViewWrapper>
</template>
