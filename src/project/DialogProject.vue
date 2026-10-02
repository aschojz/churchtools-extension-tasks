<script setup lang="ts">
import { ref } from 'vue';
import { colorOptions } from '../platform';
import { txx } from '../utils/utils';
import useProjects from './useProjects';

const props = defineProps<{ project?: Project }>();
const emit = defineEmits<{ (event: 'close'): void }>();

const proj = ref({ ...(props.project ?? ({} as Project)) });

const icons = [
    ['fas fa-folder', 'Ordner'],
    ['fas fa-list-check', 'Aufgaben'],
    ['fas fa-users', 'Team'],
    ['fas fa-calendar', 'Kalender'],
    ['fas fa-church', 'Gemeinde'],
    ['fas fa-heart', 'Herz'],
    ['fas fa-lightbulb', 'Idee'],
    ['fas fa-music', 'Musik'],
    ['fas fa-house', 'Haus'],
].map(([id, nameTranslated]) => ({ id, nameTranslated }));

const { createProject, updateProject } = useProjects();
const saveError = ref('');
const saving = ref(false);
const onSave = async () => {
    if (saving.value) return;
    saving.value = true;
    saveError.value = '';
    try {
        await (props.project?.id ? updateProject : createProject)(proj.value);
        emit('close');
    } catch (error) {
        saveError.value = error instanceof Error ? error.message : 'Projekt konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
</script>
<template>
    <UModal
        :description="txx('Aufgabenverwaltung')"
        :open="true"
        :title="project ? txx('Projekt bearbeiten') : txx('Neues Projekt erstellen')"
        @update:open="(value: boolean) => !value && emit('close')"
    >
        <template #body
            ><UAlert v-if="saveError" color="error" :title="saveError" />
            <div class="flex flex-col gap-4">
                <UFormField label="Name"><UInput v-model="proj.name" class="w-full" :maxlength="100" /></UFormField
                ><UFormField label="Beschreibung"
                    ><UTextarea v-model="proj.description" class="w-full" :maxlength="300" /></UFormField
                ><UFormField label="Icon"
                    ><USelect
                        v-model="proj.icon"
                        class="w-full"
                        :items="icons"
                        label-key="nameTranslated"
                        value-key="id" /></UFormField
                ><UFormField label="Farbe"
                    ><USelect
                        v-model="proj.color"
                        class="w-full"
                        :items="colorOptions"
                        label-key="nameTranslated"
                        value-key="id"
                /></UFormField></div
        ></template>
        <template #footer
            ><div class="flex w-full justify-end gap-2">
                <UButton color="neutral" label="Abbrechen" variant="outline" @click="emit('close')" /><UButton
                    label="Speichern"
                    :loading="saving"
                    @click="onSave"
                /></div
        ></template>
    </UModal>
</template>
