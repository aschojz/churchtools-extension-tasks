<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref, watch } from 'vue';
import { failWithCompensation } from '../../application/compensation';
import { reportOperationalError } from '../../application/operationalErrors';
import TaskItem from '../../components/TaskItem.vue';
import { taskStore } from '../../composables/storeTasks';
import { useTasks } from '../../composables/useTasks';
import { TASK_PRIORITIES, sortTasks, taskDiff } from '../../domain/tasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{
    projectId: string;
}>();
const projectId = computed(() => parseInt(props.projectId));
const { tasks, showTask, calculateDueDate, updateTask } = useTasks(projectId);

const store = taskStore();

const filteredTasks = computed(() => {
    const filtered = tasks.value.filter(task => showTask(task));
    return sortTasks(filtered, store.sortForView(projectId.value, 'project-list'), calculateDueDate);
});
const selectedIds = ref<number[]>([]);
const selectedTasks = computed(() => filteredTasks.value.filter(task => selectedIds.value.includes(task.id)));
const allSelected = computed(
    () => filteredTasks.value.length > 0 && selectedTasks.value.length === filteredTasks.value.length,
);
const batchSaving = ref(false);
const batchError = ref('');
const toggleSelection = (taskId: number, selected: boolean | 'indeterminate') => {
    selectedIds.value = selected
        ? [...new Set([...selectedIds.value, taskId])]
        : selectedIds.value.filter(id => id !== taskId);
};
const selectAll = () => {
    selectedIds.value =
        selectedTasks.value.length === filteredTasks.value.length ? [] : filteredTasks.value.map(task => task.id);
};
watch(filteredTasks, current => {
    const visibleIds = new Set(current.map(task => task.id));
    selectedIds.value = selectedIds.value.filter(id => visibleIds.has(id));
});
const batchUpdate = async (transform: (task: TransformedTask) => TransformedTask) => {
    if (!selectedTasks.value.length || batchSaving.value) return;
    batchSaving.value = true;
    batchError.value = '';
    const changed: TransformedTask[] = [];
    try {
        for (const original of selectedTasks.value) {
            const next = transform(original);
            const diff = taskDiff(next, original);
            if (!Object.keys(diff).length) continue;
            await updateTask(next, diff);
            changed.push(original);
        }
        selectedIds.value = [];
    } catch (error) {
        await failWithCompensation(
            'Sammelaktion',
            error,
            changed.map(original => () => updateTask({ ...original, revision: (original.revision ?? 0) + 1 })),
        ).catch(compensationError => {
            batchError.value = reportOperationalError(
                'Sammelaktion',
                compensationError,
                'Die Sammelaktion konnte nicht abgeschlossen werden.',
            );
        });
    } finally {
        batchSaving.value = false;
    }
};
const bulkMenu = computed<DropdownMenuItem[][]>(() => [
    [
        {
            label: 'Als erledigt markieren',
            icon: 'i-lucide-circle-check',
            onSelect: () => batchUpdate(task => ({ ...task, fullfilled: true })),
        },
        {
            label: 'Als offen markieren',
            icon: 'i-lucide-circle',
            onSelect: () => batchUpdate(task => ({ ...task, fullfilled: false })),
        },
    ],
    TASK_PRIORITIES.map(priority => ({
        label: `Priorität: ${priority.label}`,
        icon: priority.icon,
        onSelect: () => batchUpdate(task => ({ ...task, priority: priority.id })),
    })),
]);
</script>
<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions>
            <UButton
                color="neutral"
                :icon="allSelected ? 'i-lucide-square-check-big' : 'i-lucide-list-checks'"
                :label="selectedTasks.length ? `${selectedTasks.length} ausgewählt` : 'Auswählen'"
                variant="outline"
                @click="selectAll"
            />
            <UDropdownMenu v-if="selectedTasks.length" :items="bulkMenu">
                <UButton icon="i-lucide-layers-3" label="Sammelaktion" :loading="batchSaving" />
            </UDropdownMenu>
        </template>
        <div v-if="filteredTasks.length" class="flex w-full flex-col">
            <UAlert v-if="batchError" class="mb-3" color="error" :title="batchError" variant="subtle" />
            <div v-for="task in filteredTasks" :key="task.id" class="flex items-center gap-2">
                <UCheckbox
                    :aria-label="`${task.name} auswählen`"
                    :model-value="selectedIds.includes(task.id)"
                    @update:model-value="(value: boolean | 'indeterminate') => toggleSelection(task.id, value)"
                />
                <TaskItem class="min-w-0 flex-1" density="row" :item="task" :project-id="projectId" />
            </div>
        </div>
        <UEmpty v-else class="w-full" icon="i-lucide-list-checks" title="Keine Aufgaben gefunden" />
    </ViewWrapper>
</template>
