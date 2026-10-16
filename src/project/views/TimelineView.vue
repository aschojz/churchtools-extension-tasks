<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { computed } from 'vue';
import { useLists } from '../../composables/useLists';
import { useTasks } from '../../composables/useTasks';
import { sortTasks, taskStartDate } from '../../domain/tasks';
import TaskItem from '../../components/TaskItem.vue';
import { provideTaskSelection } from '../../composables/useTaskSelection';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);
const { lists } = useLists(projectId);
const listName = (id: number | undefined) => lists.value.find(list => list.id === id)?.name;
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
        <UAlert
            v-if="selection.error.value"
            class="mb-3"
            color="error"
            :title="selection.error.value"
            variant="subtle"
        />
        <div v-if="groups.length" class="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-6">
            <section v-for="group in groups" :key="group.key" :aria-labelledby="`timeline-${group.key}`">
                <h2 :id="`timeline-${group.key}`" class="timeline-month-heading mb-3 text-lg font-semibold capitalize">
                    {{ group.label
                    }}<span>{{ group.tasks.length }} {{ group.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben' }}</span>
                </h2>
                <div class="timeline-track relative flex flex-col gap-3">
                    <div v-for="task in group.tasks" :key="task.id" class="timeline-item relative">
                        <div class="timeline-date">
                            <template v-if="planningDate(task)">
                                <strong>{{ planningDate(task)!.getDate().toString().padStart(2, '0') }}</strong>
                                <span>{{ planningDate(task)!.toLocaleDateString('de-DE', { weekday: 'short' }) }}</span>
                            </template>
                            <UIcon v-else name="i-lucide-calendar-minus" />
                            <span v-if="listName(task.list)" class="timeline-list">{{ listName(task.list) }}</span>
                        </div>
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
.timeline-item {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 32px;
    align-items: center;
}
.timeline-track::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 80px;
    width: 1px;
    background: var(--line, #e1ddd7);
    content: '';
}
.timeline-dot {
    position: absolute;
    top: 50%;
    left: 80.5px;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border: 2px solid var(--surface, #fff);
    border-radius: 50%;
    background: var(--dimmed);
    box-shadow: 0 0 0 1px var(--line);
}
</style>

<style scoped>
@media (max-width: 720px) {
    .timeline-item {
        grid-template-columns: 40px minmax(0, 1fr);
        gap: 22px;
    }
    .timeline-track::before {
        left: 50px;
    }
    .timeline-dot {
        left: 50.5px;
    }
}
</style>
