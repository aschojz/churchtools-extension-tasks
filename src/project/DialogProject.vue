<script setup lang="ts">
import { DialogLarge, Input, SelectDropdown, Textarea } from '@churchtools/styleguide';
import { useColors } from '@churchtools/utils';
import { useLazyQuery } from '@vue/apollo-composable';
import gql from 'graphql-tag';
import { computed, ref } from 'vue';
import { txx } from '../utils/utils';
import useProjects from './useProjects';

const props = defineProps<{ project?: Project }>();
const emit = defineEmits<{ (event: 'close'): void }>();

const proj = ref({ ...(props.project ?? ({} as Project)) });

const { ctColors } = useColors();
const colors = computed(() =>
    ctColors.map(c => ({ id: c.key, nameTranslated: c.key, color: c.key, icon: 'fas fa-circle' as const })),
);

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

const CHARACTERS_QUERY = gql`
    query getIcons($query: String!) {
        search(version: "7.x", query: $query) {
            id
            label
            familyStylesByLicense {
                free {
                    family
                    style
                }
            }
        }
    }
`;
type FASearchResult = {
    id: string;
    label: string;
    familyStylesByLicense: { free: { family: string; style: string }[] };
};
const { load, variables, result } = useLazyQuery<{
    search: FASearchResult[];
}>(CHARACTERS_QUERY, { query: '' });
const onSearchForIcon = (query: string) => {
    variables.value = { query };
    load();
    return Promise.resolve([]);
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
            <SelectDropdown
                v-model="proj.icon"
                emit-id
                label="Icon"
                note="Nach englischen Bezeichnungen suchen"
                :options="
                    (result?.search ?? [])
                        .filter(s => s.familyStylesByLicense.free.filter(i => i.style === 'solid').length)
                        .map(s => ({
                            id: `fas fa-${s.id}` as const,
                            nameTranslated: s.label,
                            icon: `fas fa-${s.id}` as const,
                        }))
                "
                :search-function="onSearchForIcon"
            />
            <SelectDropdown v-model="proj.color" emit-id label="Farbe" :options="colors" />
        </div>
    </DialogLarge>
</template>
