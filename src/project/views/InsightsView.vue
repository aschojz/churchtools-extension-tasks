<script setup lang="ts">
import { computed } from 'vue';
import { useProjectTaskContext } from '../../composables/useProjectTaskContext';
import { useTasks } from '../../composables/useTasks';
import { dueDateBucket } from '../../domain/tasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);
const { people } = useProjectTaskContext();
const visibleTasks = computed(() => tasks.value.filter(showTask));
const openTasks = computed(() => visibleTasks.value.filter(task => !task.fullfilled));
const completedTasks = computed(() => visibleTasks.value.filter(task => task.fullfilled));
const overdueTasks = computed(() =>
    openTasks.value.filter(task => dueDateBucket(calculateDueDate(task)) === 'overdue'),
);
const dueSoonTasks = computed(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const inSevenDays = today + 7 * 24 * 60 * 60 * 1000;
    return openTasks.value.filter(task => {
        const due = calculateDueDate(task)?.getTime();
        return due !== undefined && due >= today && due <= inSevenDays;
    });
});
const unassignedTasks = computed(() =>
    openTasks.value.filter(task => !Array.isArray(task.assignedTo) || task.assignedTo.length === 0),
);
const completionRate = computed(() =>
    visibleTasks.value.length ? Math.round((completedTasks.value.length / visibleTasks.value.length) * 100) : 0,
);
const workload = computed(() => {
    const counts = new Map<number, number>();
    for (const task of openTasks.value) {
        for (const personId of Array.isArray(task.assignedTo) ? task.assignedTo : []) {
            counts.set(personId, (counts.get(personId) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([personId, count]) => ({ personId, count, name: people.value[personId]?.title ?? `Person ${personId}` }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'de'));
});
const maxWorkload = computed(() => Math.max(1, ...workload.value.map(person => person.count)));
const metrics = computed(() => [
    { label: 'Offen', value: openTasks.value.length, icon: 'i-lucide-circle', colorClass: 'text-gray-500' },
    {
        label: 'Erledigt',
        value: completedTasks.value.length,
        icon: 'i-lucide-circle-check',
        colorClass: 'text-green-600',
    },
    {
        label: 'Überfällig',
        value: overdueTasks.value.length,
        icon: 'i-lucide-triangle-alert',
        colorClass: 'text-red-600',
    },
    {
        label: 'Nächste 7 Tage',
        value: dueSoonTasks.value.length,
        icon: 'i-lucide-calendar-clock',
        colorClass: 'text-blue-600',
    },
    {
        label: 'Ohne Person',
        value: unassignedTasks.value.length,
        icon: 'i-lucide-user-round-x',
        colorClass: 'text-amber-600',
    },
]);
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #actions><span /></template>
        <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-6">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <UCard v-for="metric in metrics" :key="metric.label" variant="subtle">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-sm text-gray-500">{{ metric.label }}</p>
                            <strong class="text-2xl">{{ metric.value }}</strong>
                        </div>
                        <UIcon class="size-6" :class="metric.colorClass" :name="metric.icon" />
                    </div>
                </UCard>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <UCard>
                    <template #header>
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <h2 class="font-semibold">Fortschritt</h2>
                                <p class="text-sm text-gray-500">Anteil erledigter sichtbarer Aufgaben</p>
                            </div>
                            <strong class="text-2xl">{{ completionRate }} %</strong>
                        </div>
                    </template>
                    <UProgress :model-value="completionRate" />
                    <p class="mt-3 text-sm text-gray-500">
                        {{ completedTasks.length }} von {{ visibleTasks.length }} Aufgaben erledigt
                    </p>
                </UCard>

                <UCard>
                    <template #header>
                        <div>
                            <h2 class="font-semibold">Auslastung</h2>
                            <p class="text-sm text-gray-500">Offene Aufgaben je verantwortlicher Person</p>
                        </div>
                    </template>
                    <div v-if="workload.length" class="space-y-4">
                        <div v-for="person in workload" :key="person.personId" class="grid gap-1">
                            <div class="flex items-center justify-between gap-3 text-sm">
                                <span class="truncate font-medium">{{ person.name }}</span>
                                <span class="text-gray-500">{{ person.count }}</span>
                            </div>
                            <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                    class="bg-primary-500 h-full rounded-full"
                                    :style="{ width: `${(person.count / maxWorkload) * 100}%` }"
                                ></div>
                            </div>
                        </div>
                    </div>
                    <p v-else class="text-sm text-gray-500">Noch keine offenen Aufgaben zugewiesen.</p>
                </UCard>
            </div>

            <UAlert
                v-if="overdueTasks.length || unassignedTasks.length"
                color="warning"
                :description="`${overdueTasks.length} überfällige und ${unassignedTasks.length} unbesetzte offene Aufgaben brauchen Aufmerksamkeit.`"
                icon="i-lucide-sparkles"
                title="Nächste sinnvolle Schritte"
                variant="subtle"
            />
        </div>
    </ViewWrapper>
</template>
