<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { downloadTextFile } from '../../application/download';
import { useLists } from '../../composables/useLists';
import { useProjectTaskContext } from '../../composables/useProjectTaskContext';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import { taskStore, type ProjectFilters } from '../../composables/storeTasks';
import TaskImportDialog from '../../components/TaskImportDialog.vue';
import { dueDateBucket, isDueWithinDays } from '../../domain/tasks';
import { tasksToCsv } from '../../domain/taskExport';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const importOpen = ref(false);
const projectId = computed(() => Number(props.projectId));
const { tasks, calculateDueDate } = useTasks(projectId);
const { people } = useProjectTaskContext();
const { getListById } = useLists(projectId);
const { tags } = useTags(projectId);
const visibleTasks = computed(() => tasks.value);
const openTasks = computed(() => visibleTasks.value.filter(task => !task.fullfilled));
const completedTasks = computed(() => visibleTasks.value.filter(task => task.fullfilled));
const overdueTasks = computed(() =>
    openTasks.value.filter(task => dueDateBucket(calculateDueDate(task)) === 'overdue'),
);
const dueSoonTasks = computed(() => {
    return openTasks.value.filter(task => isDueWithinDays(calculateDueDate(task), 7));
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
const exportTasks = () => {
    const csv = tasksToCsv(visibleTasks.value, {
        dueDate: calculateDueDate,
        listName: id => (id ? (getListById(id)?.name ?? `Liste ${id}`) : ''),
        personName: id => people.value[id]?.title ?? `Person ${id}`,
        tagName: id => tags.value[id]?.name ?? `Tag ${id}`,
    });
    downloadTextFile(
        `aufgaben-projekt-${projectId.value}-${new Date().toISOString().slice(0, 10)}.csv`,
        `\uFEFF${csv}`,
        'text/csv;charset=utf-8',
    );
};
const router = useRouter();
const store = taskStore();
const openTaskList = async (filters: Partial<ProjectFilters>) => {
    store.resetProjectFilters(projectId.value);
    store.updateProjectFilters(projectId.value, filters);
    await router.push({ name: 'project-list', params: { projectId: projectId.value } });
};
const metrics = computed(() => [
    {
        label: 'Offen',
        value: openTasks.value.length,
        icon: 'i-lucide-circle',
        colorClass: 'text-gray-500',
        filters: { status: 'open' } as Partial<ProjectFilters>,
    },
    {
        label: 'Erledigt',
        value: completedTasks.value.length,
        icon: 'i-lucide-circle-check',
        colorClass: 'text-green-600',
        filters: { status: 'completed' } as Partial<ProjectFilters>,
    },
    {
        label: 'Überfällig',
        value: overdueTasks.value.length,
        icon: 'i-lucide-triangle-alert',
        colorClass: 'text-red-600',
        filters: { status: 'open', due: 'overdue' } as Partial<ProjectFilters>,
    },
    {
        label: 'Nächste 7 Tage',
        value: dueSoonTasks.value.length,
        icon: 'i-lucide-calendar-clock',
        colorClass: 'text-orange-600',
        filters: { status: 'open', due: 'week' } as Partial<ProjectFilters>,
    },
    {
        label: 'Ohne Person',
        value: unassignedTasks.value.length,
        icon: 'i-lucide-user-round-x',
        colorClass: 'text-amber-600',
        filters: { status: 'open', assignee: 'unassigned' } as Partial<ProjectFilters>,
    },
]);
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #actions>
            <UButton
                color="neutral"
                icon="i-lucide-upload"
                label="CSV importieren"
                variant="outline"
                @click="importOpen = true"
            />
            <UButton
                color="neutral"
                :disabled="!visibleTasks.length"
                icon="i-lucide-download"
                label="CSV exportieren"
                variant="outline"
                @click="exportTasks"
            />
        </template>
        <div class="flex w-full flex-col gap-6 pb-6">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <button
                    v-for="metric in metrics"
                    :key="metric.label"
                    class="insight-metric text-left"
                    type="button"
                    @click="openTaskList(metric.filters)"
                >
                    <UCard variant="subtle">
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <p class="text-sm text-gray-500">{{ metric.label }}</p>
                                <strong class="insight-value text-2xl">{{ metric.value }}</strong>
                            </div>
                            <UIcon class="size-6" :class="metric.colorClass" :name="metric.icon" />
                        </div>
                    </UCard>
                </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <UCard>
                    <template #header>
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <h2 class="font-semibold">Fortschritt</h2>
                                <p class="text-sm text-gray-500">Anteil erledigter sichtbarer Aufgaben</p>
                            </div>
                            <strong class="insight-value text-2xl">{{ completionRate }} %</strong>
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
        <TaskImportDialog v-if="importOpen" :project-id="projectId" @close="importOpen = false" />
    </ViewWrapper>
</template>
