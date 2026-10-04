<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue';
import { reportOperationalError } from '../application/operationalErrors';
import { useTasks } from '../composables/useTasks';
import { taskDraft } from '../domain/tasks';

const props = defineProps<{
    list: TransformedList;
    projectId: number;
}>();
const emit = defineEmits<{
    (event: 'close'): void;
    (event: 'created', value: { id: number }): void;
}>();

const { createTask } = useTasks(toRef(() => props.projectId));

const inputRef = ref();
onMounted(() => {
    inputRef.value.focus();
});

const task = ref(taskDraft({ list: props.list.id }));
const error = ref('');
const saving = ref(false);
const onCreateTask = async () => {
    if (!task.value.name.trim() || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        const newTask = await createTask({ ...task.value });
        emit('created', newTask);
        resetTask();
    } catch (caught) {
        error.value = reportOperationalError(
            'Schnellerfassung speichern',
            caught,
            'Aufgabe konnte nicht gespeichert werden.',
        );
    } finally {
        saving.value = false;
    }
};
const resetTask = () => {
    task.value = taskDraft({ list: props.list.id });
    emit('close');
};
</script>
<template>
    <div
        class="flex flex-col justify-between gap-2 rounded border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-gray-200"
        @keydown.escape="resetTask"
    >
        <UAlert v-if="error" color="error" :title="error" />
        <UFormField label="Titel"
            ><UInput ref="inputRef" v-model="task.name" class="w-full" @keydown.enter="onCreateTask"
        /></UFormField>
        <div class="flex justify-between">
            <UButton color="neutral" label="Abbrechen" size="sm" variant="outline" @click="resetTask" />
            <UButton
                :disabled="saving || !task.name.trim()"
                label="Erstellen"
                :loading="saving"
                size="sm"
                @click="onCreateTask"
            />
        </div>
    </div>
</template>
