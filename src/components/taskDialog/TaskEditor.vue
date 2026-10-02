<script setup lang="ts">
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { computed, ref, watch } from 'vue';
import { usePersonsQueryAllPages } from '../../composables/usePersons';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import { taskDraft } from '../../domain/tasks';
import { type PersonDisplay, personDisplay } from '../../platform';
import DialogTag from '../DialogTag.vue';

const props = defineProps<{ taskId?: number; projectId: number }>();
const emit = defineEmits<{ (event: 'change', payload: Task): void }>();
const projectId = computed(() => props.projectId);
const { tasksMap, isLoading, findParent } = useTasks(projectId);
const { tagsArray } = useTags(projectId);
const tagOptions = computed(() =>
    tagsArray.value.map(tag => ({
        id: tag.id,
        nameTranslated: tag.name,
        color: tag.color.key,
        icon: 'fas fa-circle' as const,
    })),
);
const internTask = ref<Task>(taskDraft());
const createTagIsOpen = ref(false);
const missing = ref(false);
watch(
    [() => props.taskId, () => props.projectId, isLoading],
    () => {
        if (isLoading.value) return;
        const task = props.taskId ? tasksMap.value[props.taskId] : undefined;
        missing.value = !!props.taskId && !task;
        internTask.value = taskDraft(task);
    },
    { immediate: true },
);
watch(internTask, () => emit('change', internTask.value), {
    deep: true,
    immediate: true,
    // The footer button lives in the parent dialog. Keep its draft synchronous
    // so a quick input followed by Save cannot submit the previous value.
    flush: 'sync',
});
const parent = computed(() => (props.taskId ? findParent(tasksMap.value[props.taskId]) : undefined));
const filter = computed(() => ({ ids: internTask.value.assignedTo ?? [] }));
const { data } = usePersonsQueryAllPages(filter);
const assignees = computed(() =>
    (data.value ?? []).map(p => ({
        domainObject: personDisplay(p),
        id: p.id,
        nameTranslated: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
    })),
);
const onSearchForPerson = async (query: string) => {
    const result = await churchtoolsClient.get<PersonDisplay[]>(
        `/search?query=${encodeURIComponent(query)}&domainTypes[]=person`,
    );
    return result.map(r => ({ ...r, id: Number(r.domainIdentifier), nameTranslated: r.title }));
};
const personSearch = ref('');
const personOptions = ref<Array<{ id: number; label: string }>>([]);
watch(
    assignees,
    value => {
        personOptions.value = value.map(person => ({ id: person.id, label: person.nameTranslated }));
    },
    { immediate: true },
);
watch(personSearch, async query => {
    if (query.trim().length < 2) return;
    const results = await onSearchForPerson(query);
    personOptions.value = results.map(person => ({ id: person.id, label: person.nameTranslated }));
});
</script>
<template>
    <p v-if="isLoading">Aufgabe wird geladen …</p>
    <p v-else-if="missing" role="alert">Diese Aufgabe wurde nicht gefunden.</p>
    <div v-else class="flex flex-col gap-2">
        <UFormField label="Titel" required><UInput v-model="internTask.name" class="w-full" /></UFormField>
        <UFormField label="Beschreibung"
            ><UTextarea v-model="internTask.description" class="w-full" :rows="8"
        /></UFormField>
        <UFormField label="Fällig am"><UInput v-model="internTask.dueDate" class="w-full" type="date" /></UFormField>
        <label v-if="parent" class="flex items-center gap-2">
            Tage vor der übergeordneten Aufgabe
            <input v-model.number="internTask.dueDateRelative" class="rounded border p-2" min="0" type="number" />
        </label>
        <UFormField label="Link"><UInput v-model="internTask.url" class="w-full" type="url" /></UFormField>
        <div class="flex items-end gap-2">
            <UFormField class="flex-grow" label="Tags"
                ><USelectMenu
                    v-model="internTask.tags"
                    class="w-full"
                    :items="tagOptions"
                    label-key="nameTranslated"
                    multiple
                    value-key="id"
            /></UFormField>
            <UButton
                color="neutral"
                icon="i-lucide-plus"
                label="Tag erstellen"
                variant="outline"
                @click="createTagIsOpen = true"
            />
        </div>
        <UFormField label="Verantwortliche"
            ><USelectMenu
                v-model="internTask.assignedTo"
                v-model:search-term="personSearch"
                class="w-full"
                ignore-filter
                :items="personOptions"
                label-key="label"
                multiple
                placeholder="Person suchen …"
                value-key="id"
        /></UFormField>
        <DialogTag v-if="createTagIsOpen" :project-id="projectId" @close="createTagIsOpen = false" />
    </div>
</template>
