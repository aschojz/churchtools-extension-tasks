<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useLists } from '../composables/useLists';
import { useProjectTaskContext } from '../composables/useProjectTaskContext';
import { searchPersons } from '../composables/usePersons';
import { changeTaskValues, type BulkValuesMode } from '../domain/bulkTasks';
import { useTaskSelection } from '../composables/useTaskSelection';

const selection = useTaskSelection();
const onOpenChange = (open: boolean) => {
    if (!open && selection && !selection.saving.value) selection.editField.value = undefined;
};
const { tags, people } = useProjectTaskContext();
const projectId = computed(() => selection?.selectedTasks.value[0]?.dataCategoryId ?? 0);
const { lists } = useLists(projectId);
const field = computed(() => selection?.editField.value);
const labels = {
    list: 'Liste ändern',
    assignedTo: 'Verantwortliche ändern',
    tags: 'Tags ändern',
    dueDate: 'Fälligkeit ändern',
    startDate: 'Startdatum ändern',
};
const title = computed(() => (field.value ? labels[field.value] : 'Sammelaktion'));
const listId = ref<number>();
const values = ref<number[]>([]);
const mode = ref<BulkValuesMode>('add');
const date = ref('');
const clearDate = ref(false);
const search = ref('');
const personResults = ref<Array<{ id: number; label: string }>>([]);
const searchError = ref('');
const searching = ref(false);
const personOptions = computed(() => [
    ...new Map(
        [
            ...Object.entries(people.value).map(([id, person]) => ({ id: Number(id), label: person.title })),
            ...personResults.value,
        ].map(person => [person.id, person]),
    ).values(),
]);
const options = computed(() =>
    field.value === 'tags'
        ? Object.values(tags.value).map(tag => ({ id: tag.id, label: tag.name }))
        : personOptions.value,
);
watch(field, () => {
    listId.value = undefined;
    values.value = [];
    mode.value = 'add';
    date.value = '';
    clearDate.value = false;
    search.value = '';
    personResults.value = [];
    searchError.value = '';
});
watch(search, async (query, _previous, onCleanup) => {
    let active = true;
    onCleanup(() => {
        active = false;
    });
    searchError.value = '';
    if (query.trim().length < 2) {
        searching.value = false;
        return;
    }
    searching.value = true;
    try {
        const results = await searchPersons(query);
        if (active)
            personResults.value = [
                ...new Map([...personResults.value, ...results].map(person => [person.id, person])).values(),
            ];
    } catch {
        if (active) searchError.value = 'Personensuche fehlgeschlagen.';
    } finally {
        if (active) searching.value = false;
    }
});
const canApply = computed(() =>
    field.value === 'list'
        ? !!listId.value
        : field.value === 'dueDate' || field.value === 'startDate'
          ? clearDate.value || !!date.value
          : values.value.length > 0 || mode.value === 'replace',
);
const apply = async () => {
    if (!selection || !field.value || !canApply.value) return;
    const edit = field.value;
    const chosenList = listId.value;
    const chosenValues = [...values.value];
    const chosenMode = mode.value;
    const chosenDate = clearDate.value ? undefined : date.value;
    await selection.batchUpdate(task => {
        if (edit === 'list') return { ...task, list: chosenList };
        if (edit === 'tags' || edit === 'assignedTo') return changeTaskValues(task, edit, chosenValues, chosenMode);
        return { ...task, [edit]: chosenDate, ...(edit === 'dueDate' ? { dueDateRelative: undefined } : {}) };
    });
    if (!selection.error.value) selection.editField.value = undefined;
};
</script>

<template>
    <template v-if="selection">
        <UButton
            color="neutral"
            :icon="selection.enabled.value ? 'i-lucide-x' : 'i-lucide-list-checks'"
            :label="selection.enabled.value ? 'Fertig' : 'Auswählen'"
            :variant="selection.enabled.value ? 'soft' : 'outline'"
            @click="selection.toggleMode"
        />
        <UButton
            v-if="selection.enabled.value"
            color="neutral"
            :icon="selection.allSelected.value ? 'i-lucide-square-minus' : 'i-lucide-square-check-big'"
            :label="selection.allSelected.value ? 'Leeren' : 'Alle'"
            variant="outline"
            @click="selection.selectAll"
        />
        <UDropdownMenu
            v-if="selection.enabled.value && selection.selectedTasks.value.length"
            :items="selection.bulkMenu.value"
        >
            <UButton
                icon="i-lucide-layers-3"
                :label="`Sammelaktion (${selection.selectedTasks.value.length})`"
                :loading="selection.saving.value"
            />
        </UDropdownMenu>
        <UModal
            :close="{ 'aria-label': 'Dialog schließen' }"
            :description="`${selection.selectedTasks.value.length} ausgewählte Aufgaben`"
            :open="!!field"
            :title="title"
            @update:open="onOpenChange"
        >
            <template #body>
                <div class="grid gap-4">
                    <UAlert v-if="selection.error.value" color="error" :title="selection.error.value" />
                    <UFormField v-if="field === 'list'" label="Liste">
                        <USelect
                            v-model="listId"
                            class="w-full"
                            :items="lists.map(list => ({ id: list.id, label: list.name }))"
                            placeholder="Liste auswählen …"
                            value-key="id"
                        />
                    </UFormField>
                    <template v-else-if="field === 'tags' || field === 'assignedTo'">
                        <UFormField label="Änderung">
                            <USelect
                                v-model="mode"
                                class="w-full"
                                :items="[
                                    { id: 'add', label: 'Hinzufügen' },
                                    { id: 'remove', label: 'Entfernen' },
                                    { id: 'replace', label: 'Ersetzen' },
                                ]"
                                value-key="id"
                            />
                        </UFormField>
                        <UInput
                            v-if="field === 'assignedTo'"
                            v-model="search"
                            aria-label="Personen suchen"
                            class="w-full"
                            :loading="searching"
                            placeholder="Weitere Personen suchen …"
                        />
                        <p v-if="searchError" class="text-error text-sm">{{ searchError }}</p>
                        <UFormField :label="field === 'tags' ? 'Tags' : 'Verantwortliche'">
                            <USelectMenu
                                v-model="values"
                                class="w-full"
                                :items="options"
                                multiple
                                placeholder="Auswählen …"
                                :search-input="{ placeholder: 'Suchen …' }"
                                value-key="id"
                            />
                        </UFormField>
                        <p v-if="mode === 'replace'" class="text-muted text-sm">
                            Die bestehende Auswahl wird ersetzt. Eine leere Auswahl entfernt alle Einträge.
                        </p>
                    </template>
                    <template v-else>
                        <UFormField :label="field === 'dueDate' ? 'Fällig am' : 'Startet am'">
                            <UInput v-model="date" class="w-full" :disabled="clearDate" type="date" />
                        </UFormField>
                        <UCheckbox v-model="clearDate" class="task-editor-checkbox" label="Datum entfernen" />
                        <p v-if="field === 'dueDate'" class="text-muted text-sm">
                            Eine relative Fälligkeit wird dabei ebenfalls entfernt.
                        </p>
                    </template>
                </div>
            </template>
            <template #footer>
                <div class="flex w-full justify-end gap-2">
                    <UButton
                        color="neutral"
                        :disabled="selection.saving.value"
                        label="Abbrechen"
                        variant="outline"
                        @click="selection.editField.value = undefined"
                    />
                    <UButton
                        :disabled="!canApply || !selection.selectedTasks.value.length"
                        label="Anwenden"
                        :loading="selection.saving.value"
                        @click="apply"
                    />
                </div>
            </template>
        </UModal>
    </template>
</template>
