<script setup lang="ts">
import { DialogLarge } from '@churchtools/styleguide';
import { CtColor, CtIcon } from '@churchtools/utils';
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

const actions = computed(() => {
    if (isCreate.value || isEdit.value) {
        return [];
    }
    return [
        {
            icon: CtIcon.EDIT,
            label: txx('Bearbeiten'),
            outlined: true,
            onClick: () => (isEdit.value = true),
        },
    ];
});
const cancelButton = computed(() => (isCreate.value || isEdit.value ? txx('Abbrechen') : txx('Schließen')));
const primaryButton = computed(() =>
    isCreate.value
        ? txx('Erstellen')
        : isEdit.value
          ? txx('Speichern')
          : task.value?.fullfilled
            ? {
                  label: txx('Als unerledigt markieren'),
                  color: CtColor.RED,
                  icon: 'fas fa-undo' as const,
                  outlined: true,
              }
            : { label: txx('Als erledigt markieren'), color: CtColor.GREEN, icon: 'fas fa-check' as const },
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
    <DialogLarge
        :button="isSaving ? false : primaryButton"
        :cancel-button="cancelButton"
        :context="project?.name"
        :header="{
            icon: task?.fullfilled ? 'fas fa-square-check' : 'far fa-square',
            color: task?.fullfilled ? CtColor.GREEN : CtColor.BASIC,
            title: isCreate
                ? txx('Aufgabe erstellen')
                : isEdit
                  ? txx('Aufgabe bearbeiten')
                  : (task?.name ?? txx('Aufgabe anzeigen')),
            actions,
        }"
        @close="resetRoute"
        @save="onSave"
    >
        <p v-if="saveError" class="mb-3 text-red-600" role="alert">{{ saveError }}</p>
        <TaskEditor v-if="showEditor" :project-id="projectId" :task-id="taskId" @change="onTaskChange" />
        <TaskDisplay v-else-if="taskId" :projectId="projectId" :taskId="taskId" />
    </DialogLarge>
</template>
