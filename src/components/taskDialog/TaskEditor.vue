<script setup lang="ts">
import type { Task } from '../../domain/types';
import { computed, ref, watch } from 'vue';
import { reportOperationalError } from '../../application/operationalErrors';
import { useLists } from '../../composables/useLists';
import { searchPersons, usePersonsQueryAllPages } from '../../composables/usePersons';
import { useTags } from '../../composables/useTags';
import { useTaskTemplates } from '../../composables/useTaskTemplates';
import { useTasks } from '../../composables/useTasks';
import { TASK_PRIORITIES, TASK_RECURRENCES, taskDraft } from '../../domain/tasks';
import type { TaskRecurrenceFrequency } from '../../domain/types';
import { personDisplay } from '../../platform';
import DialogTag from '../DialogTag.vue';

const props = defineProps<{ taskId?: number; projectId: number }>();
const emit = defineEmits<{
    (event: 'change', payload: Task): void;
    (event: 'notify', value: boolean): void;
}>();
const notifyAssignees = ref(false);
watch(notifyAssignees, value => emit('notify', value));
const projectId = computed(() => props.projectId);
const { tasksMap, isLoading, findParent } = useTasks(projectId);
const blockerOptions = computed(() =>
    Object.values(tasksMap.value)
        .filter(task => task.id !== props.taskId)
        .sort((left, right) => left.name.localeCompare(right.name, 'de'))
        .map(task => ({ id: task.id, label: task.name })),
);
const { lists } = useLists(projectId);
const listOptions = computed(() =>
    [...lists.value].sort((a, b) => a.sortKey - b.sortKey).map(list => ({ id: list.id, label: list.name })),
);
const { tagsArray } = useTags(projectId);
const tagOptions = computed(() =>
    tagsArray.value.map(tag => ({
        id: tag.id,
        nameTranslated: tag.name,
        color: tag.color.key,
        icon: 'i-lucide-circle' as const,
    })),
);
const internTask = ref<Task>(taskDraft());
const recurrenceOptions = [{ id: 'none', label: 'Keine Wiederholung' }, ...TASK_RECURRENCES];
const recurrenceFrequency = computed({
    get: () => internTask.value.recurrence?.frequency ?? 'none',
    set: (frequency: TaskRecurrenceFrequency | 'none') => {
        if (frequency === 'none') {
            internTask.value.recurrence = undefined;
            return;
        }
        internTask.value.recurrence = {
            frequency,
            interval: internTask.value.recurrence?.interval ?? 1,
        };
    },
});
const { templates, saveTemplate, removeTemplate } = useTaskTemplates(props.projectId);
const templateOptions = computed(() => templates().map(template => ({ id: template.id, label: template.name })));
const selectedTemplateId = ref<string>();
const templateName = ref('');
const applyTemplate = () => {
    const template = templates().find(item => item.id === selectedTemplateId.value);
    if (template) internTask.value = taskDraft({ ...internTask.value, ...template.task });
};
const saveCurrentTemplate = () => {
    const saved = saveTemplate(templateName.value, internTask.value);
    if (!saved) return;
    selectedTemplateId.value = saved.id;
    templateName.value = '';
};
const removeSelectedTemplate = () => {
    if (!selectedTemplateId.value) return;
    if (!window.confirm('Die persönliche Aufgabenvorlage wird gelöscht.')) return;
    removeTemplate(selectedTemplateId.value);
    selectedTemplateId.value = undefined;
};
const createTagIsOpen = ref(false);
const missing = ref(false);
watch(
    [() => props.taskId, () => props.projectId, isLoading, () => lists.value.length],
    () => {
        if (isLoading.value) return;
        const task = props.taskId ? tasksMap.value[props.taskId] : undefined;
        missing.value = !!props.taskId && !task;
        const draft = taskDraft(task);
        if (!draft.list) draft.list = lists.value.find(list => list.isDefault)?.id ?? lists.value[0]?.id;
        internTask.value = draft;
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
const filter = computed(() => ({
    ids: [
        ...new Set([
            ...(internTask.value.assignedTo ?? []),
            ...Object.values(tasksMap.value).flatMap(task => task.assignedTo ?? []),
        ]),
    ],
}));
const { data } = usePersonsQueryAllPages(filter);
const assignees = computed(() =>
    (data.value ?? []).map(p => ({
        domainObject: personDisplay(p),
        id: p.id,
        nameTranslated: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
    })),
);
const personSearch = ref('');
const personOptions = ref<Array<{ id: number; label: string }>>([]);
const personSearchLoading = ref(false);
const personSearchError = ref('');
const projectPersonOptions = () => assignees.value.map(person => ({ id: person.id, label: person.nameTranslated }));
const selectedPersonOptions = () =>
    projectPersonOptions().filter(person => internTask.value.assignedTo?.includes(person.id));
watch(
    assignees,
    value => {
        if (personSearch.value.trim().length < 2) {
            personOptions.value = value.map(person => ({ id: person.id, label: person.nameTranslated }));
        }
    },
    { immediate: true },
);
let personSearchSequence = 0;
watch(personSearch, (query, _previous, onCleanup) => {
    const sequence = ++personSearchSequence;
    const normalizedQuery = query.trim();
    personSearchError.value = '';
    if (normalizedQuery.length < 2) {
        personSearchLoading.value = false;
        personOptions.value = projectPersonOptions();
        return;
    }
    personSearchLoading.value = true;
    const timer = window.setTimeout(async () => {
        try {
            const results = await searchPersons(normalizedQuery);
            if (sequence !== personSearchSequence) return;
            const merged = new Map(selectedPersonOptions().map(person => [person.id, person]));
            for (const person of results) merged.set(person.id, person);
            personOptions.value = [...merged.values()];
        } catch (caught) {
            if (sequence === personSearchSequence) {
                personSearchError.value = reportOperationalError(
                    'Personen suchen',
                    caught,
                    'Personen konnten nicht geladen werden.',
                );
                personOptions.value = selectedPersonOptions();
            }
        } finally {
            if (sequence === personSearchSequence) personSearchLoading.value = false;
        }
    }, 250);
    onCleanup(() => {
        window.clearTimeout(timer);
        if (sequence === personSearchSequence) personSearchLoading.value = false;
    });
});
</script>
<template>
    <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
    <UAlert v-else-if="missing" color="warning" title="Diese Aufgabe wurde nicht gefunden." />
    <div v-else class="task-editor-layout">
        <section class="task-editor-main">
            <UCard v-if="!taskId" variant="subtle">
                <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <USelect
                        v-model="selectedTemplateId"
                        :items="templateOptions"
                        label-key="label"
                        placeholder="Vorlage auswählen …"
                        value-key="id"
                    />
                    <UButton
                        :disabled="!selectedTemplateId"
                        icon="i-lucide-wand-sparkles"
                        label="Anwenden"
                        variant="outline"
                        @click="applyTemplate"
                    />
                    <UButton
                        aria-label="Vorlage löschen"
                        color="error"
                        :disabled="!selectedTemplateId"
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        @click="removeSelectedTemplate"
                    />
                </div>
                <div class="mt-3 flex gap-2">
                    <UInput
                        v-model="templateName"
                        class="min-w-0 flex-1"
                        placeholder="Aktuelle Werte als Vorlage speichern"
                        @keydown.enter="saveCurrentTemplate"
                    />
                    <UButton
                        :disabled="!templateName.trim()"
                        icon="i-lucide-save"
                        label="Vorlage speichern"
                        @click="saveCurrentTemplate"
                    />
                </div>
            </UCard>
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
            <UFormField label="Liste">
                <USelect
                    v-model="internTask.list"
                    class="w-full"
                    :items="listOptions"
                    label-key="label"
                    placeholder="Liste auswählen …"
                    value-key="id"
                />
            </UFormField>
            <UFormField label="Fällig am">
                <UInput v-model="internTask.dueDate" class="w-full" type="date" />
            </UFormField>
            <UFormField label="Startet am">
                <UInput v-model="internTask.startDate" class="w-full" type="date" />
            </UFormField>
            <UFormField label="Wiederholung">
                <USelect
                    v-model="recurrenceFrequency"
                    class="w-full"
                    :items="recurrenceOptions"
                    label-key="label"
                    value-key="id"
                />
            </UFormField>
            <UFormField v-if="internTask.recurrence" label="Intervall">
                <UInput
                    v-model.number="internTask.recurrence.interval"
                    class="w-full"
                    max="365"
                    min="1"
                    type="number"
                />
            </UFormField>
            <UFormField label="Priorität">
                <USelect
                    v-model="internTask.priority"
                    class="w-full"
                    :items="TASK_PRIORITIES"
                    label-key="label"
                    value-key="id"
                />
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
            <UFormField
                :error="personSearchError || undefined"
                hint="Personen aus diesem Projekt oder weitere Personen suchen"
                label="Verantwortliche"
            >
                <USelectMenu
                    v-model="internTask.assignedTo"
                    v-model:search-term="personSearch"
                    class="w-full"
                    ignore-filter
                    :items="personOptions"
                    label-key="label"
                    :loading="personSearchLoading"
                    multiple
                    placeholder="Person suchen …"
                    value-key="id"
                />
            </UFormField>
            <UCheckbox
                v-if="!taskId"
                v-model="notifyAssignees"
                :disabled="!internTask.assignedTo?.length"
                label="Verantwortliche per E-Mail benachrichtigen"
            />
            <UFormField hint="Optional" label="Blockiert durch">
                <USelectMenu
                    v-model="internTask.blockedBy"
                    class="w-full"
                    :items="blockerOptions"
                    label-key="label"
                    multiple
                    placeholder="Blockierende Aufgaben …"
                    value-key="id"
                />
            </UFormField>
        </aside>
        <DialogTag v-if="createTagIsOpen" :project-id="projectId" @close="createTagIsOpen = false" />
    </div>
</template>
