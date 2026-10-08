<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { computed } from 'vue';
import { useTasks } from '../../composables/useTasks';
import { sortTasks, taskStartDate } from '../../domain/tasks';
import TaskItem from '../../components/TaskItem.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);
const planningDate = (task: TransformedTask) => calculateDueDate(task) ?? taskStartDate(task);

const groups = computed(() => {
    const dated = sortTasks(
        tasks.value.filter(task => showTask(task) && planningDate(task)),
        'dueDate',
        planningDate,
    );
    const result = new Map<string, { label: string; tasks: TransformedTask[] }>();
    for (const task of dated) {
        const date = planningDate(task)!;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const group = result.get(key) ?? {
            label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            tasks: [],
        };
        group.tasks.push(task);
        result.set(key, group);
    }
    const withoutDate = tasks.value
        .filter(task => showTask(task) && !planningDate(task))
        .sort((left, right) => left.name.localeCompare(right.name, 'de'));
    return [
        ...[...result.entries()].map(([key, group]) => ({ key, ...group })),
        ...(withoutDate.length ? [{ key: 'none', label: 'Ohne Termin', tasks: withoutDate }] : []),
    ];
});

const selection = provideTaskSelection(computed(() => groups.value.flatMap(group => group.tasks)));
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #actions><span /></template>
        <template #extra-actions><TaskSelectionActions /></template>
        <UAlert
            v-if="selection.error.value"
            class="mb-3"
            color="error"
            :title="selection.error.value"
            variant="subtle"
        />
        <div v-if="groups.length" class="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-6">
            <section v-for="group in groups" :key="group.key" :aria-labelledby="`timeline-${group.key}`">
                <h2 :id="`timeline-${group.key}`" class="mb-3 text-lg font-semibold capitalize">
                    {{ group.label }}
                </h2>
                <div class="timeline-track relative ml-7 flex flex-col gap-3">
                    <div v-for="task in group.tasks" :key="task.id" class="timeline-item relative pl-7">
                        <span aria-hidden="true" class="timeline-dot"></span>
                        <TaskItem density="timeline" :item="task" :project-id="projectId" />
                    </div>
                </div>
            </section>
        </div>
        <UEmpty
            v-else
            class="m-auto"
            description="Passe die Filter an oder erstelle eine neue Aufgabe."
            icon="i-lucide-gantt-chart"
            title="Keine Aufgaben in der Timeline"
        />
    </ViewWrapper>
</template>
<style scoped>
.timeline-track::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
    background: var(--line, #e1ddd7);
    content: '';
}
.timeline-dot {
    position: absolute;
    top: 50%;
    left: 0.5px;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border: 2px solid var(--surface, #fff);
    border-radius: 50%;
    background: #8b8781;
    box-shadow: 0 0 0 1px #d9d4cd;
}
</style>
