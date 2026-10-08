<script setup lang="ts">
import { computed } from 'vue';
import TaskItem from '../../components/TaskItem.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { taskStore } from '../../composables/storeTasks';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import { useTasks } from '../../composables/useTasks';
import { sortTasks } from '../../domain/tasks';
import { useCurrentUser } from '../../platform';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => parseInt(props.projectId));

const { tasks, showTask, calculateDueDate } = useTasks(projectId);
const currentUser = useCurrentUser();

const store = taskStore();

const filteredTasks = computed(() => {
    const filtered = tasks.value.filter(
        task => showTask(task) && Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUser.id),
    );
    return sortTasks(filtered, store.sortForView(projectId.value, 'my-tasks'), calculateDueDate);
});
provideTaskSelection(filteredTasks);
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions><TaskSelectionActions /></template>
        <div v-if="filteredTasks.length" class="task-list flex w-full flex-col">
            <TaskItem
                v-for="task in filteredTasks"
                :key="task.id"
                class="w-full"
                density="row"
                :item="task"
                :project-id="projectId"
            />
        </div>
        <UEmpty
            v-else
            class="w-full"
            icon="i-lucide-user-check"
            title="Keine persönlichen Aufgaben in diesem Projekt"
        />
    </ViewWrapper>
</template>
