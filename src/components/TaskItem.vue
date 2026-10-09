<script setup lang="ts">
import type { TransformedTag, TransformedTask } from '../domain/types';
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { failWithCompensation } from '../application/compensation';
import { reportOperationalError } from '../application/operationalErrors';
import { taskAssignees, useProjectTaskContext } from '../composables/useProjectTaskContext';
import { useTaskSelection } from '../composables/useTaskSelection';
import { incompleteTaskBlockers, recurrenceLabel, taskPriority, taskStartDate } from '../domain/tasks';
import { uiColor } from '../platform';
import ProgressRing from './ProgressRing.vue';
import MarkdownPreview from './MarkdownPreview';

const props = defineProps<{
    item: TransformedTask;
    showTask?: boolean;
    projectId: number;
    density?: 'card' | 'row' | 'timeline';
}>();

const id = computed(() => props.item.id);
const {
    tasksMap,
    parentByChild,
    tags,
    people,
    calculateDueDate,
    createTask,
    deleteTask,
    archiveTaskTree,
    archiveCompletedTaskTree,
    toggleTask,
    getSuperParent,
    getProgress,
    dueColor,
} = useProjectTaskContext();
const task = computed(() => tasksMap.value[id.value] ?? props.item);
const parent = computed(() => parentByChild.value[id.value]);
const superParent = computed(() => (parent.value ? getSuperParent(task.value) : undefined));
const hasSubTasks = computed(() =>
    (Array.isArray(task.value.subTasks) ? task.value.subTasks : []).some(childId => !!tasksMap.value[childId]),
);
const percentFullfilled = computed(() => getProgress(task.value));
const assignees = computed(() => taskAssignees(task.value, people.value));
const dueDate = computed(() => calculateDueDate(task.value));
const startDate = computed(() => taskStartDate(task.value));
const priority = computed(() => taskPriority(task.value.priority));
const openBlockers = computed(() => incompleteTaskBlockers(task.value, tasksMap.value));
const selection = useTaskSelection();
const comments = computed(() =>
    (Array.isArray(task.value.activity) ? task.value.activity : []).filter(entry => entry.type === 'comment'),
);
const sortedTags = computed(() =>
    (Array.isArray(task.value.tags) ? task.value.tags : [])
        .map(tagId => tags.value[tagId])
        .filter((tag): tag is TransformedTag => !!tag)
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
);
const toDayMonth = (date: string | Date) =>
    new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });

const router = useRouter();
const openTask = () => {
    const currentRoute = router.currentRoute.value;
    const name = currentRoute.params.projectId ? currentRoute.name! : 'my-tasks';
    router.push({ name, params: { projectId: props.projectId, taskId: props.item.id } });
};
const activateTask = () => {
    if (selection?.enabled.value) {
        if (!selection.saving.value)
            selection.toggleTask(task.value.id, !selection.selectedIds.value.has(task.value.id));
        return;
    }
    openTask();
};
const onCardClick = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, [role="menu"], [role="checkbox"]')) return;
    activateTask();
};

const showMetadata = computed(
    () =>
        dueDate.value ||
        startDate.value ||
        priority.value.id !== 'none' ||
        comments.value.length ||
        task.value.url ||
        task.value.recurrence ||
        openBlockers.value.length,
);

const createTaskOrSubtask = async ({ id: taskId, ...data }: TransformedTask) => {
    void taskId; // ensure we don't pass an id when creating a new task
    return await createTask(data);
};

async function duplicateTask() {
    const createdIds: number[] = [];
    try {
        const originalTask = task.value;
        const newSubtaskIds = await duplicateSubtasks(
            Array.isArray(originalTask.subTasks) ? originalTask.subTasks : undefined,
            new Set<number>(),
            createdIds,
        );
        const newTask = await createTaskOrSubtask({ ...originalTask, subTasks: newSubtaskIds });
        createdIds.push(newTask.id);
        return newTask;
    } catch (error) {
        await failWithCompensation(
            'Aufgabe duplizieren',
            error,
            createdIds.map(createdId => () => deleteTask(createdId, props.projectId, 1)),
        );
    }
}
async function duplicateSubtasks(subtaskIds?: number[], visited = new Set<number>(), createdIds: number[] = []) {
    const newSubtaskIds = [];

    if (subtaskIds?.length) {
        for (const subtaskId of subtaskIds) {
            const originalSubtask = tasksMap.value[subtaskId];
            if (!originalSubtask) continue;
            if (visited.has(subtaskId)) throw new Error('Zyklische Unteraufgaben können nicht dupliziert werden.');
            visited.add(subtaskId);
            const nestedSubtaskIds = await duplicateSubtasks(
                Array.isArray(originalSubtask.subTasks) ? originalSubtask.subTasks : undefined,
                visited,
            );
            const newSubtask = await createTaskOrSubtask({ ...originalSubtask, subTasks: nestedSubtaskIds });
            if (newSubtask) {
                newSubtaskIds.push(newSubtask.id);
                createdIds.push(newSubtask.id);
            }
        }
    }

    return newSubtaskIds;
}

const actionError = ref('');
const runAction = async (action: () => Promise<unknown>) => {
    actionError.value = '';
    try {
        await action();
    } catch (caught) {
        actionError.value = reportOperationalError(
            'Aufgabenaktion',
            caught,
            'Aktion fehlgeschlagen. Bitte den aktuellen Aufgabenstand prüfen.',
        );
    }
};
const deleteRecursive = async (task: TransformedTask) => {
    if (!window.confirm('Die Aufgabe und ihre Unteraufgaben werden in den Papierkorb verschoben.')) return;
    await archiveTaskTree(task);
};

const contextMenu = computed<DropdownMenuItem[][]>(() => [
    [
        {
            label: task.value.fullfilled ? 'Als nicht erfüllt markieren' : 'Abhaken',
            icon: task.value.fullfilled ? 'i-lucide-square' : 'i-lucide-square-check-big',
            onSelect: () => runAction(() => toggleTask(task.value)),
        },
    ],
    [
        { label: 'Bearbeiten', icon: 'i-lucide-pencil', onSelect: () => openTask() },
        {
            label: 'Duplizieren',
            icon: 'i-lucide-copy',
            onSelect: () => runAction(duplicateTask),
        },
        {
            label: 'Archivieren',
            icon: 'i-lucide-archive',
            disabled: !task.value.fullfilled,
            onSelect: () => runAction(() => archiveCompletedTaskTree(task.value)),
        },
        {
            label: 'In Papierkorb',
            icon: 'i-lucide-trash-2',
            color: 'error',
            onSelect: () => runAction(() => deleteRecursive(task.value)),
        },
    ],
]);

const breadcrumbs = computed(() => {
    const bc = [];
    if (superParent.value) {
        bc.push(superParent.value.name);
    }
    if (parent.value && parent.value.id !== superParent.value?.id) {
        bc.push(parent.value.name);
    }
    return bc;
});
</script>
<template>
    <div
        class="task-item group relative flex cursor-pointer flex-col justify-between gap-2 p-3"
        :class="{ 'task-item-row': density === 'row', 'task-item-timeline': density === 'timeline' }"
        @click="onCardClick"
    >
        <div
            v-if="superParent && !showTask"
            class="task-item-breadcrumbs -mb-1 flex items-center gap-2 text-xs text-gray-400"
        >
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
                <span>{{ crumb }}</span>
                <UIcon
                    v-if="index === breadcrumbs.length - 1"
                    class="size-3 rotate-90"
                    name="i-lucide-corner-up-left"
                />
                <UIcon v-else class="size-3" name="i-lucide-arrow-left" />
            </template>
        </div>
        <div class="task-item-heading flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
                <button
                    :aria-pressed="selection?.enabled.value ? selection.selectedIds.value.has(task.id) : undefined"
                    class="task-title-button appearance-none border-0 bg-transparent p-0 text-left font-bold"
                    type="button"
                    @click.stop="activateTask"
                >
                    {{ task.name }}
                </button>
            </div>
            <div class="task-item-controls flex shrink-0 items-center gap-1">
                <UCheckbox
                    v-if="selection?.enabled.value"
                    :aria-label="`${task.name} auswählen`"
                    class="task-selection-checkbox mt-1 shrink-0"
                    :model-value="selection.selectedIds.value.has(task.id)"
                    :ui="{ base: 'rounded-full' }"
                    @click.stop
                    @update:model-value="(value: boolean | 'indeterminate') => selection?.toggleTask(task.id, value)"
                />
                <UDropdownMenu v-if="!selection?.enabled.value" :items="contextMenu"
                    ><UButton
                        aria-label="Aufgabenaktionen"
                        class="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                        color="neutral"
                        icon="i-lucide-ellipsis"
                        size="xs"
                        square
                        variant="ghost"
                        @click.stop
                        @pointerdown.stop
                /></UDropdownMenu>
            </div>
        </div>
        <p v-if="actionError" class="text-red-600" role="alert">{{ actionError }}</p>
        <MarkdownPreview v-if="task.description && density !== 'timeline'" :source="task.description" />
        <div v-if="sortedTags.length" class="task-item-tags flex flex-wrap gap-1.5">
            <UBadge
                v-for="tag in sortedTags"
                :key="tag.id"
                class="task-item-tag"
                :color="uiColor(tag.color)"
                :label="tag.name"
                size="sm"
                variant="outline"
            />
        </div>
        <div
            v-if="showMetadata || assignees.length || hasSubTasks"
            class="task-item-footer flex items-end justify-between gap-2"
        >
            <div v-if="showMetadata" class="task-item-metadata flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <UBadge
                    v-if="startDate"
                    color="neutral"
                    icon="i-lucide-calendar-range"
                    :label="`Start ${toDayMonth(startDate)}`"
                    size="sm"
                    variant="soft"
                />
                <UBadge
                    v-if="task.recurrence"
                    color="neutral"
                    icon="i-lucide-repeat-2"
                    :label="recurrenceLabel(task.recurrence)"
                    size="sm"
                    variant="soft"
                />
                <UBadge
                    v-if="openBlockers.length"
                    color="neutral"
                    icon="i-lucide-ban"
                    :label="String(openBlockers.length)"
                    size="sm"
                    title="Offene Blocker"
                    variant="subtle"
                />
                <UBadge
                    v-if="priority.id !== 'none'"
                    color="neutral"
                    :icon="priority.icon"
                    :label="priority.label"
                    size="sm"
                    variant="soft"
                />
                <UBadge
                    v-if="dueDate"
                    class="task-item-due"
                    :class="{ 'task-item-overdue': !task.fullfilled && uiColor(dueColor(dueDate)) === 'error' }"
                    color="neutral"
                    icon="i-lucide-clock"
                    :label="
                        task.dueDateRelative ? `${toDayMonth(dueDate)} (${task.dueDateRelative})` : toDayMonth(dueDate)
                    "
                    size="sm"
                    variant="soft"
                />
                <UBadge
                    v-if="comments?.length"
                    color="neutral"
                    icon="i-lucide-messages-square"
                    :label="String(comments.length)"
                    size="sm"
                    variant="soft"
                />
                <UButton
                    v-if="task.url"
                    aria-label="Verknüpfung in neuem Fenster öffnen"
                    color="neutral"
                    :href="task.url"
                    icon="i-lucide-link"
                    rel="noopener noreferrer"
                    size="sm"
                    target="_blank"
                    variant="ghost"
                    @click.stop
                />
            </div>
            <div
                v-if="assignees.length || hasSubTasks"
                class="task-item-people ml-auto flex shrink-0 items-center gap-1.5"
            >
                <div v-if="assignees.length" class="flex -space-x-1">
                    <UAvatar
                        v-for="assignee in assignees"
                        :key="assignee.domainIdentifier"
                        :alt="assignee.title"
                        size="xs"
                        :src="assignee.imageUrl"
                    />
                </div>
                <ProgressRing v-if="hasSubTasks" :percent="percentFullfilled" />
            </div>
        </div>
    </div>
</template>
