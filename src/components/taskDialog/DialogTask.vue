<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useTask } from '../../composables/useTask';
import { useTasks } from '../../composables/useTasks';
import { useProject } from '../../project/useProject';
import { txx } from '../../utils/utils';
import TaskDisplay from './TaskDisplay.vue';
import TaskEditor from './TaskEditor.vue';

const props = defineProps<{ taskId: string; projectId: number }>();
const projectId = computed(() => props.projectId);
const taskId = computed(() => (isCreate.value ? undefined : parseInt(props.taskId)));

const isCreate = computed(() => props.taskId === 'new');
const isEdit = ref(false);
const showEditor = computed(() => isCreate.value || isEdit.value);

const { project } = useProject(toRef(() => props.projectId));

const router = useRouter();
const resetRoute = () => {
    router.push({ name: router.currentRoute.value.name!, params: { projectId: props.projectId } });
};

const { task, toggleTask } = useTask(projectId, taskId);
const { updateTask, getObjectDiff, createTask } = useTasks(projectId);

const cancelButton = computed(() => (isCreate.value || isEdit.value ? txx('Abbrechen') : txx('Schließen')));
const primaryLabel = computed(() =>
    isCreate.value
        ? txx('Erstellen')
        : isEdit.value
          ? txx('Speichern')
          : task.value?.fullfilled
            ? txx('Als unerledigt markieren')
            : txx('Als erledigt markieren'),
);

const internTask = ref<Task>();
const isSaving = ref(false);
const saveError = ref('');
const onTaskChange = (updatedTask: Task) => {
    internTask.value = updatedTask;
};
const onSave = async () => {
    if (isSaving.value) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        if (isCreate.value && internTask.value) {
            await createTask(internTask.value);
            resetRoute();
        } else if (isEdit.value && internTask.value && task.value) {
            const diff = getObjectDiff(internTask.value, task.value);
            await updateTask({ ...internTask.value, id: task.value.id, dataCategoryId: props.projectId }, diff);
            isEdit.value = false;
        } else if (!showEditor.value) {
            await toggleTask();
        }
    } catch (error) {
        saveError.value = error instanceof Error ? error.message : 'Speichern fehlgeschlagen. Bitte erneut versuchen.';
    } finally {
        isSaving.value = false;
    }
};
</script>
<template>
    <UModal
        :description="project?.name"
        :open="true"
        scrollable
        :title="
            isCreate
                ? txx('Aufgabe erstellen')
                : isEdit
                  ? txx('Aufgabe bearbeiten')
                  : (task?.name ?? txx('Aufgabe anzeigen'))
        "
        :ui="{
            body: 'tasks-modal-body',
            content: 'tasks-modal-content',
            footer: 'tasks-modal-footer',
            header: 'tasks-modal-header',
            overlay: 'tasks-modal-overlay',
        }"
        @update:open="(value: boolean) => !value && resetRoute()"
    >
        <template #actions
            ><UButton
                v-if="!isCreate && !isEdit"
                color="neutral"
                icon="i-lucide-pencil"
                label="Bearbeiten"
                variant="outline"
                @click="isEdit = true"
        /></template>
        <template #body
            ><UAlert v-if="saveError" class="mb-3" color="error" :title="saveError" /><TaskEditor
                v-if="showEditor"
                :project-id="projectId"
                :task-id="taskId"
                @change="onTaskChange" /><TaskDisplay v-else-if="taskId" :project-id="projectId" :task-id="taskId"
        /></template>
        <template #footer
            ><div class="flex w-full justify-end gap-2">
                <UButton color="neutral" :label="cancelButton" variant="outline" @click="resetRoute" /><UButton
                    :color="task?.fullfilled && !showEditor ? 'error' : 'primary'"
                    :icon="!showEditor ? (task?.fullfilled ? 'i-lucide-undo-2' : 'i-lucide-check') : undefined"
                    :label="primaryLabel"
                    :loading="isSaving"
                    :variant="task?.fullfilled && !showEditor ? 'outline' : 'solid'"
                    @click="onSave"
                /></div
        ></template>
    </UModal>
</template>
