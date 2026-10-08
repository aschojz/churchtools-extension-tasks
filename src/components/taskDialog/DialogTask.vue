<script setup lang="ts">
import type { Task } from '../../domain/types';
import { useToast } from '@nuxt/ui/composables';
import { computed, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { reportOperationalError } from '../../application/operationalErrors';
import { notifyTaskAssignees } from '../../application/taskNotifications';
import { useTask } from '../../composables/useTask';
import { useTasks } from '../../composables/useTasks';
import { useProject } from '../../project/useProject';
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

const dialogTitle = computed(() =>
    isCreate.value
        ? 'Aufgabe erstellen'
        : isEdit.value
          ? 'Aufgabe bearbeiten'
          : (task.value?.name ?? 'Aufgabe anzeigen'),
);

const cancelButton = computed(() => (isCreate.value || isEdit.value ? 'Abbrechen' : 'Schließen'));
const primaryLabel = computed(() =>
    isCreate.value
        ? 'Erstellen'
        : isEdit.value
          ? 'Speichern'
          : task.value?.fullfilled
            ? 'Als unerledigt markieren'
            : 'Als erledigt markieren',
);

const internTask = ref<Task>();
const notifyAssignees = ref(false);
const toast = useToast();
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
            const draft = internTask.value;
            const created = await createTask(draft);
            if (notifyAssignees.value && draft.assignedTo?.length) {
                try {
                    const taskUrl = new URL(
                        router.resolve({
                            name: 'project-board',
                            params: { projectId: props.projectId, taskId: created.id },
                        }).href,
                        window.location.origin,
                    ).href;
                    await notifyTaskAssignees(draft, project.value?.name ?? 'Aufgaben', taskUrl);
                    toast.add({ title: 'E-Mail-Benachrichtigung an ChurchTools übergeben.', color: 'success' });
                } catch (error) {
                    toast.add({
                        title: 'Aufgabe erstellt, E-Mail-Benachrichtigung fehlgeschlagen.',
                        description: reportOperationalError(
                            'Aufgabenbenachrichtigung',
                            error,
                            'E-Mail konnte nicht versendet werden.',
                        ),
                        color: 'warning',
                        duration: 0,
                    });
                }
            }
            resetRoute();
        } else if (isEdit.value && internTask.value && task.value) {
            const diff = getObjectDiff(internTask.value, task.value);
            await updateTask(
                {
                    ...internTask.value,
                    id: task.value.id,
                    dataCategoryId: props.projectId,
                    revision: task.value.revision,
                    updatedAt: task.value.updatedAt,
                },
                diff,
            );
            isEdit.value = false;
        } else if (!showEditor.value) {
            await toggleTask();
        }
    } catch (error) {
        saveError.value = reportOperationalError(
            'Aufgabe speichern',
            error,
            'Speichern fehlgeschlagen. Bitte erneut versuchen.',
        );
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
        :title="dialogTitle"
        :ui="{
            body: 'tasks-modal-body',
            content: showEditor ? 'tasks-modal-content tasks-modal-editor' : 'tasks-modal-content',
            footer: 'tasks-modal-footer',
            header: 'tasks-modal-header',
            overlay: 'tasks-modal-overlay',
        }"
        @update:open="(value: boolean) => !value && resetRoute()"
    >
        <template #header>
            <div class="task-dialog-header">
                <div class="min-w-0">
                    <h2>{{ dialogTitle }}</h2>
                    <p v-if="project?.name">{{ project.name }}</p>
                </div>
                <div class="task-dialog-header-actions">
                    <UButton
                        v-if="!isCreate && !isEdit"
                        aria-label="Aufgabe bearbeiten"
                        color="neutral"
                        icon="i-lucide-pencil"
                        square
                        title="Aufgabe bearbeiten"
                        variant="ghost"
                        @click="isEdit = true"
                    />
                    <UButton
                        aria-label="Dialog schließen"
                        color="neutral"
                        icon="i-lucide-x"
                        square
                        title="Dialog schließen"
                        variant="ghost"
                        @click="resetRoute"
                    />
                </div>
            </div>
        </template>
        <template #body
            ><UAlert v-if="saveError" class="mb-3" color="error" :title="saveError" /><TaskEditor
                v-if="showEditor"
                :project-id="projectId"
                :task-id="taskId"
                @change="onTaskChange"
                @notify="notifyAssignees = $event" /><TaskDisplay
                v-else-if="taskId"
                :project-id="projectId"
                :task-id="taskId"
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
