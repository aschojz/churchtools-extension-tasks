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
    <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
    <UAlert v-else-if="missing" color="warning" title="Diese Aufgabe wurde nicht gefunden." />
    <div v-else class="task-editor-layout">
        <section class="task-editor-main">
            <UFormField label="Titel" required>
                <UInput
                    v-model="internTask.name"
                    autofocus
                    class="w-full"
                    icon="i-lucide-type"
                    placeholder="Was soll erledigt werden?"
                    size="lg"
                />
            </UFormField>
            <UFormField hint="Optional" label="Beschreibung">
                <UTextarea
                    v-model="internTask.description"
                    autoresize
                    class="w-full"
                    :maxrows="14"
                    placeholder="Notizen, Details oder nächste Schritte …"
                    :rows="9"
                />
            </UFormField>
            <UFormField hint="Optional" label="Link">
                <UInput
                    v-model="internTask.url"
                    class="w-full"
                    icon="i-lucide-link"
                    placeholder="https://…"
                    type="url"
                />
            </UFormField>
        </section>

        <aside class="task-editor-meta">
            <div class="task-editor-meta-heading">
                <UIcon name="i-lucide-settings-2" />
                <span>Details</span>
            </div>
            <UFormField label="Fällig am">
                <UInput v-model="internTask.dueDate" class="w-full" type="date" />
            </UFormField>
            <UFormField v-if="parent" label="Tage vor der übergeordneten Aufgabe">
                <UInput v-model.number="internTask.dueDateRelative" class="w-full" min="0" type="number" />
            </UFormField>
            <UFormField label="Tags">
                <USelectMenu
                    v-model="internTask.tags"
                    class="w-full"
                    :items="tagOptions"
                    label-key="nameTranslated"
                    multiple
                    placeholder="Tags auswählen …"
                    value-key="id"
                />
            </UFormField>
            <UButton
                block
                color="neutral"
                icon="i-lucide-plus"
                label="Neuen Tag anlegen"
                size="sm"
                variant="outline"
                @click="createTagIsOpen = true"
            />
            <UFormField label="Verantwortliche">
                <USelectMenu
                    v-model="internTask.assignedTo"
                    v-model:search-term="personSearch"
                    class="w-full"
                    ignore-filter
                    :items="personOptions"
                    label-key="label"
                    multiple
                    placeholder="Person suchen …"
                    value-key="id"
                />
            </UFormField>
        </aside>
        <DialogTag v-if="createTagIsOpen" :project-id="projectId" @close="createTagIsOpen = false" />
    </div>
</template>
