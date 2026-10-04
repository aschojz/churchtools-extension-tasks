<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { computed, ref } from 'vue';
import { reportOperationalError } from '../../application/operationalErrors';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { archivedTasks, allTasksMap, restoreArchivedTaskTree } = useTasks(projectId);
const archivedIds = computed(() => new Set(archivedTasks.value.map(task => task.id)));
const topLevelArchivedTasks = computed(() =>
    archivedTasks.value.filter(
        task =>
            !Object.values(allTasksMap.value).some(parent =>
                (Array.isArray(parent.subTasks) ? parent.subTasks : []).some(
                    childId => childId === task.id && archivedIds.value.has(parent.id),
                ),
            ),
    ),
);
const restoringId = ref<number>();
const error = ref('');
const restore = async (task: TransformedTask) => {
    restoringId.value = task.id;
    error.value = '';
    try {
        await restoreArchivedTaskTree(task);
    } catch (caught) {
        error.value = reportOperationalError(
            'Archivierte Aufgabe wiederherstellen',
            caught,
            'Aufgabe konnte nicht wiederhergestellt werden.',
        );
    } finally {
        restoringId.value = undefined;
    }
};
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #actions><span /></template>
        <div class="flex w-full flex-col gap-4">
            <UAlert v-if="error" color="error" :title="error" variant="subtle" />
            <UAlert
                color="neutral"
                description="Archivierte Aufgaben bleiben mit Unteraufgaben, Kommentaren und Beziehungen erhalten."
                icon="i-lucide-archive"
                title="Archiv"
                variant="subtle"
            />
            <UCard v-for="task in topLevelArchivedTasks" :key="task.id">
                <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0">
                        <h3 class="truncate font-semibold">{{ task.name }}</h3>
                        <p class="text-muted text-sm">
                            Archiviert {{ task.archivedAt ? new Date(task.archivedAt).toLocaleString('de-DE') : '' }}
                        </p>
                    </div>
                    <UButton
                        color="neutral"
                        icon="i-lucide-rotate-ccw"
                        label="Wiederherstellen"
                        :loading="restoringId === task.id"
                        variant="outline"
                        @click="restore(task)"
                    />
                </div>
            </UCard>
            <UEmpty
                v-if="!topLevelArchivedTasks.length"
                description="Erledigte Aufgaben lassen sich über ihr Aktionsmenü archivieren."
                icon="i-lucide-archive"
                title="Das Archiv ist leer"
            />
        </div>
    </ViewWrapper>
</template>
