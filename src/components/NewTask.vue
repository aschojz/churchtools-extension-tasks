<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue';
import { useTasks } from '../composables/useTasks';
import { taskDraft } from '../domain/tasks';
import { CtColor } from '../platform';
import { Button, Input } from '../ui';

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
    } catch {
        error.value = 'Aufgabe konnte nicht gespeichert werden.';
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
        class="flex cursor-pointer flex-col justify-between gap-2 rounded border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-gray-200"
        @keydown.escape="resetTask"
    >
        <p v-if="error" role="alert">{{ error }}</p>
        <Input ref="inputRef" v-model="task.name" label="Titel" @enter="onCreateTask" @input="task.name = $event" />
        <div class="flex justify-between">
            <Button :color="CtColor.BASIC" outlined size="S" @click="resetTask"> Abbrechen </Button>
            <Button :disabled="saving || !task.name.trim()" size="S" @click="onCreateTask"> Erstellen </Button>
        </div>
    </div>
</template>
