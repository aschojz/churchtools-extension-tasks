<script setup lang="ts">
import type { Task } from '../domain/types';
import { computed, ref, toRef } from 'vue';
import { failWithCompensation } from '../application/compensation';
import { reportOperationalError } from '../application/operationalErrors';
import { useLists } from '../composables/useLists';
import { useProjectTaskContext } from '../composables/useProjectTaskContext';
import { useTags } from '../composables/useTags';
import { tasksFromCsv, type TaskImportIssue } from '../domain/taskExport';

const props = defineProps<{ projectId: number }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const { lists } = useLists(toRef(() => props.projectId));
const { tags } = useTags(toRef(() => props.projectId));
const { createTask, deleteTask, people } = useProjectTaskContext();
const filename = ref('');
const source = ref('');
const error = ref('');
const importing = ref(false);
const importedCount = ref(0);

const normalized = (value: string) => value.trim().toLocaleLowerCase('de');
const personIdsByName = computed(() =>
    Object.fromEntries(Object.entries(people.value).map(([id, person]) => [normalized(person.title), Number(id)])),
);
const importContext = computed(() => ({
    listId: (name: string) => lists.value.find(list => normalized(list.name) === normalized(name))?.id,
    personId: (name: string) => personIdsByName.value[normalized(name)],
    tagId: (name: string) => Object.values(tags.value).find(tag => normalized(tag.name) === normalized(name))?.id,
}));
const preview = computed<{ tasks: Task[]; issues: TaskImportIssue[]; parseError?: string } | undefined>(() => {
    if (!source.value) return undefined;
    try {
        const result = tasksFromCsv(source.value, importContext.value);
        if (result.tasks.length > 1000) throw new Error('Pro Import sind höchstens 1.000 Aufgaben erlaubt.');
        return result;
    } catch (caught) {
        return {
            tasks: [],
            issues: [],
            parseError: caught instanceof Error ? caught.message : 'CSV konnte nicht gelesen werden.',
        };
    }
});

const selectFile = async (event: Event) => {
    error.value = '';
    importedCount.value = 0;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    filename.value = file.name;
    if (file.size > 2_000_000) {
        source.value = '';
        error.value = 'Die CSV-Datei darf höchstens 2 MB groß sein.';
        return;
    }
    source.value = await file.text();
};

const importTasks = async () => {
    if (!preview.value?.tasks.length || importing.value) return;
    importing.value = true;
    error.value = '';
    const created: Array<{ id: number; dataCategoryId: number }> = [];
    try {
        for (const task of preview.value.tasks) {
            const result = await createTask(task);
            created.push(result);
        }
        importedCount.value = created.length;
        source.value = '';
    } catch (caught) {
        await failWithCompensation(
            'CSV-Import',
            caught,
            created.map(task => () => deleteTask(task.id, task.dataCategoryId, 1)),
        ).catch(compensationError => {
            error.value = reportOperationalError(
                'CSV-Import',
                compensationError,
                'Die Aufgaben konnten nicht importiert werden.',
            );
        });
    } finally {
        importing.value = false;
    }
};
</script>

<template>
    <UModal
        :open="true"
        title="Aufgaben aus CSV importieren"
        :ui="{
            content: 'tasks-modal-content max-w-3xl',
            footer: 'tasks-modal-footer',
            header: 'tasks-modal-header',
            overlay: 'tasks-modal-overlay',
        }"
        @update:open="(value: boolean) => !value && emit('close')"
    >
        <template #body>
            <div class="space-y-4">
                <UAlert
                    color="info"
                    description="Am zuverlässigsten funktioniert eine zuvor aus dieser Auswertung exportierte CSV-Datei. Listen, Tags und Personen werden über ihren Namen zugeordnet."
                    icon="i-lucide-file-spreadsheet"
                    title="Import mit Vorschau"
                    variant="subtle"
                />
                <label class="block cursor-pointer rounded-lg border border-dashed p-5 text-center hover:bg-gray-50">
                    <input accept=".csv,text/csv" class="sr-only" type="file" @change="selectFile" />
                    <UIcon class="mx-auto mb-2 size-6 text-gray-500" name="i-lucide-upload" />
                    <span class="block text-sm font-medium">CSV-Datei auswählen</span>
                    <span class="mt-1 block text-xs text-gray-500">{{
                        filename || 'Maximal 2 MB und 1.000 Aufgaben'
                    }}</span>
                </label>
                <UAlert v-if="error" color="error" :title="error" />
                <UAlert
                    v-if="importedCount"
                    color="success"
                    :title="`${importedCount} Aufgaben wurden importiert.`"
                    variant="subtle"
                />
                <UAlert v-if="preview?.parseError" color="error" :title="preview.parseError" />
                <div v-if="preview?.tasks.length" class="space-y-3">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="font-semibold">Vorschau</h3>
                        <UBadge color="neutral" :label="`${preview.tasks.length} Aufgaben`" variant="subtle" />
                    </div>
                    <div class="max-h-64 overflow-auto rounded-lg border">
                        <div
                            v-for="(task, index) in preview.tasks"
                            :key="`${task.name}:${index}`"
                            class="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                        >
                            <span class="min-w-0 truncate text-sm font-medium">{{ task.name }}</span>
                            <div class="flex shrink-0 gap-2">
                                <UBadge :label="task.fullfilled ? 'Erledigt' : 'Offen'" variant="subtle" />
                                <UBadge v-if="task.dueDate" color="neutral" :label="task.dueDate" variant="outline" />
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="preview?.issues.length" class="space-y-2">
                    <h3 class="font-semibold">Hinweise zur Zuordnung</h3>
                    <UAlert
                        color="warning"
                        :description="preview.issues.map(issue => `Zeile ${issue.row}: ${issue.message}`).join('\n')"
                        :title="`${preview.issues.length} Hinweise`"
                        variant="subtle"
                    />
                </div>
            </div>
        </template>
        <template #footer>
            <div class="flex w-full justify-end gap-2">
                <UButton color="neutral" label="Schließen" variant="outline" @click="emit('close')" />
                <UButton
                    :disabled="!preview?.tasks.length || !!preview?.parseError || !!importedCount"
                    icon="i-lucide-upload"
                    :label="preview?.tasks.length ? `${preview.tasks.length} importieren` : 'Importieren'"
                    :loading="importing"
                    @click="importTasks"
                />
            </div>
        </template>
    </UModal>
</template>
