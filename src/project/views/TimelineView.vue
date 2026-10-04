<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { computed } from 'vue';
import { useTasks } from '../../composables/useTasks';
import { sortTasks, taskPriority, taskStartDate } from '../../domain/tasks';
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

const dateLabel = (task: TransformedTask) => {
    const date = planningDate(task);
    return date ? date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '–';
};
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #actions><span /></template>
        <div v-if="groups.length" class="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-6">
            <section v-for="group in groups" :key="group.key" :aria-labelledby="`timeline-${group.key}`">
                <h2 :id="`timeline-${group.key}`" class="mb-3 text-lg font-semibold capitalize">
                    {{ group.label }}
                </h2>
                <div class="timeline-track relative ml-7 border-l pl-7">
                    <RouterLink
                        v-for="task in group.tasks"
                        :key="task.id"
                        class="timeline-item group relative mb-3 flex min-h-16 items-center gap-4 rounded-xl border px-4 py-3 transition hover:shadow-sm"
                        :to="{ name: 'project-timeline', params: { projectId, taskId: task.id } }"
                    >
                        <span
                            class="timeline-dot absolute top-1/2 -left-[2.05rem] size-3 -translate-y-1/2 rounded-full border-2 ring-1"
                        ></span>
                        <time class="timeline-date w-16 shrink-0 text-sm font-medium">
                            {{ dateLabel(task) }}
                        </time>
                        <span class="timeline-title min-w-0 flex-1 font-medium">
                            {{ task.name }}
                        </span>
                        <UBadge
                            v-if="task.priority !== 'none'"
                            :color="taskPriority(task.priority).color"
                            :icon="taskPriority(task.priority).icon"
                            :label="taskPriority(task.priority).label"
                            size="sm"
                            variant="subtle"
                        />
                        <UIcon class="timeline-chevron shrink-0" name="i-lucide-chevron-right" />
                    </RouterLink>
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
.timeline-track {
    border-color: var(--line);
}
.timeline-item {
    border-color: var(--line);
    background: var(--surface);
}
.timeline-item:hover {
    border-color: #cbc5bd;
}
.timeline-dot {
    border-color: var(--surface);
    background: #8b8781;
    --tw-ring-color: #d9d4cd;
}
.timeline-date,
.timeline-chevron {
    color: var(--muted);
}
.timeline-title {
    color: var(--ink);
}
.timeline-item:hover .timeline-title {
    color: #9d4919;
}
</style>
