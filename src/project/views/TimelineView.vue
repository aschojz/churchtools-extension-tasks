<script setup lang="ts">
import { computed } from 'vue';
import { useTasks } from '../../composables/useTasks';
import { sortTasks, taskPriority } from '../../domain/tasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);

const groups = computed(() => {
    const dated = sortTasks(
        tasks.value.filter(task => showTask(task) && calculateDueDate(task)),
        'dueDate',
        calculateDueDate,
    );
    const result = new Map<string, { label: string; tasks: TransformedTask[] }>();
    for (const task of dated) {
        const date = calculateDueDate(task)!;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const group = result.get(key) ?? {
            label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            tasks: [],
        };
        group.tasks.push(task);
        result.set(key, group);
    }
    const withoutDate = tasks.value
        .filter(task => showTask(task) && !calculateDueDate(task))
        .sort((left, right) => left.name.localeCompare(right.name, 'de'));
    return [
        ...[...result.entries()].map(([key, group]) => ({ key, ...group })),
        ...(withoutDate.length ? [{ key: 'none', label: 'Ohne Termin', tasks: withoutDate }] : []),
    ];
});

const dateLabel = (task: TransformedTask) => {
    const date = calculateDueDate(task);
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
                <div class="relative ml-7 border-l border-gray-200 pl-7">
                    <RouterLink
                        v-for="task in group.tasks"
                        :key="task.id"
                        class="group relative mb-3 flex min-h-16 items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm"
                        :to="{ name: 'project-timeline', params: { projectId, taskId: task.id } }"
                    >
                        <span
                            class="absolute top-1/2 -left-[2.05rem] size-3 -translate-y-1/2 rounded-full border-2 border-white bg-gray-400 ring-1 ring-gray-300"
                        ></span>
                        <time class="w-16 shrink-0 text-sm font-medium text-gray-500">
                            {{ dateLabel(task) }}
                        </time>
                        <span class="group-hover:text-primary-700 min-w-0 flex-1 font-medium text-gray-900">
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
                        <UIcon class="shrink-0 text-gray-400" name="i-lucide-chevron-right" />
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
