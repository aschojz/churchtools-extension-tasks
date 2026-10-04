<script setup lang="ts">
import { computed, ref } from 'vue';
import { reportOperationalError } from '../../application/operationalErrors';
import { useTasks } from '../../composables/useTasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { deletedTasks, allTasksMap, restoreTaskTree } = useTasks(projectId);
const deletedTaskIds = computed(() => new Set(deletedTasks.value.map(task => task.id)));
const topLevelDeletedTasks = computed(() =>
    deletedTasks.value.filter(
        task =>
            !Object.values(allTasksMap.value).some(parent =>
                (Array.isArray(parent.subTasks) ? parent.subTasks : []).some(
                    childId => childId === task.id && deletedTaskIds.value.has(parent.id),
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
        await restoreTaskTree(task);
    } catch (caught) {
        error.value = reportOperationalError(
            'Gelöschte Aufgabe wiederherstellen',
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
                description="Gelöschte Aufgaben bleiben mit ihren Unteraufgaben und Beziehungen erhalten."
                icon="i-lucide-trash-2"
                title="Papierkorb"
                variant="subtle"
            />
            <UCard v-for="task in topLevelDeletedTasks" :key="task.id">
                <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0">
                        <h3 class="truncate font-semibold">{{ task.name }}</h3>
                        <p class="text-muted text-sm">
                            Gelöscht {{ task.deletedAt ? new Date(task.deletedAt).toLocaleString('de-DE') : '' }}
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
                v-if="!topLevelDeletedTasks.length"
                description="Hier erscheinen gelöschte Aufgaben."
                icon="i-lucide-trash-2"
                title="Der Papierkorb ist leer"
            />
        </div>
    </ViewWrapper>
</template>
