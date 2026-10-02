<script setup lang="ts">
import { ref } from 'vue';
import { colorOptions } from '../platform';
import { DialogLarge, Input, SelectDropdown, Textarea } from '../ui';
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
const onSave = async (close: () => void) => {
    if (saving.value) return;
    saving.value = true;
    saveError.value = '';
    try {
        await (props.project?.id ? updateProject : createProject)(proj.value);
        close();
    } catch (error) {
        saveError.value = error instanceof Error ? error.message : 'Projekt konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
</script>
<template>
    <DialogLarge
        :context="txx('Aufgabenverwaltung')"
        :title="project ? txx('Projekt bearbeiten') : txx('Neues Projekt erstellen')"
        @close="emit('close')"
        @save="onSave"
    >
        <p v-if="saveError" role="alert">{{ saveError }}</p>
        <div class="flex flex-col gap-4">
            <Input v-model="proj.name" label="Name" :max-length="100" @input="proj.name = $event" />
            <Textarea
                v-model="proj.description"
                label="Beschreibung"
                :max-length="300"
                @input="proj.description = $event"
            />
            <SelectDropdown v-model="proj.icon" emit-id label="Icon" :options="icons" />
            <SelectDropdown v-model="proj.color" emit-id label="Farbe" :options="colorOptions" />
        </div>
    </DialogLarge>
</template>
