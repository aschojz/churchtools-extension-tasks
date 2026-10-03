<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { taskAssignees, useProjectTaskContext } from '../composables/useProjectTaskContext';
import { descendantIds } from '../domain/tasks';
import { uiColor } from '../platform';
import ProgressRing from './ProgressRing.vue';

const props = defineProps<{
    item: TransformedTask;
    showTask?: boolean;
    projectId: number;
    density?: 'card' | 'row';
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
    updateTask,
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

const showLastRow = computed(
    () =>
        dueDate.value ||
        comments.value.length ||
        (Array.isArray(task.value.tags) && task.value.tags.length) ||
        task.value.url,
);

const createTaskOrSubtask = async ({ id: taskId, ...data }: TransformedTask) => {
    void taskId; // ensure we don't pass an id when creating a new task
    return await createTask(data);
};

async function duplicateTask() {
    const originalTask = task.value;
    const newSubtaskIds = await duplicateSubtasks(
        Array.isArray(originalTask.subTasks) ? originalTask.subTasks : undefined,
    );
    const newTask = await createTaskOrSubtask({ ...originalTask, subTasks: newSubtaskIds });
    return newTask;
}
async function duplicateSubtasks(subtaskIds?: number[], visited = new Set<number>()) {
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
    } catch {
        actionError.value = 'Aktion fehlgeschlagen. Bitte den aktuellen Aufgabenstand prüfen.';
    }
};
const deleteRecursive = async (task: TransformedTask) => {
    if (!window.confirm('Die Aufgabe und ihre Unteraufgaben werden gelöscht.')) return;
    const ids = descendantIds(task, tasksMap.value);
    const removed = new Set(ids);
    // Detach only the subtree root. On a partial failure, remaining children stay accessible in their lists.
    for (const parent of Object.values(tasksMap.value)) {
        const childIds = Array.isArray(parent.subTasks) ? parent.subTasks : [];
        if (!removed.has(parent.id) && childIds.some(id => removed.has(id))) {
            await updateTask({ ...parent, subTasks: childIds.filter(id => !removed.has(id)) });
        }
    }
    for (const id of ids) await deleteTask(id, task.dataCategoryId);
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
            label: 'Löschen',
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
        :class="{ 'task-item-row': density === 'row' }"
        @click="openTask"
    >
        <div v-if="superParent && !showTask" class="-mb-1 flex items-center gap-2 text-xs text-gray-400">
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
                <span>{{ crumb }}</span>
                <i v-if="index === breadcrumbs.length - 1" class="fas fa-arrow-turn-up fa-rotate-270"></i>
                <i v-else class="fas fa-arrow-left-long"></i>
            </template>
        </div>
        <div class="flex items-start justify-end gap-4">
            <div class="flex flex-grow items-start gap-2">
                <ProgressRing
                    v-if="hasSubTasks"
                    class="progress-icon relative text-[20px] text-gray-500"
                    :percent="percentFullfilled"
                />
                <UButton
                    v-else
                    :aria-label="task.fullfilled ? 'Als unerledigt markieren' : 'Als erledigt markieren'"
                    color="neutral"
                    :icon="task.fullfilled ? 'i-lucide-square-check-big' : 'i-lucide-square'"
                    size="sm"
                    square
                    variant="ghost"
                    @click.stop="runAction(() => toggleTask(task))"
                />
                <button
                    class="task-title-button appearance-none border-0 bg-transparent p-0 text-left font-bold"
                    type="button"
                    @click.stop="openTask"
                >
                    {{ task.name }}
                </button>
            </div>
            <div v-if="Array.isArray(task.assignedTo) && task.assignedTo.length" class="flex flex-shrink-0 gap-1">
                <UAvatar
                    v-for="assignee in assignees"
                    :key="assignee.domainIdentifier"
                    :alt="assignee.title"
                    size="xs"
                    :src="assignee.imageUrl"
                />
            </div>
            <UDropdownMenu :items="contextMenu"
                ><UButton
                    aria-label="Aufgabenaktionen"
                    class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    color="neutral"
                    icon="i-lucide-ellipsis"
                    size="sm"
                    square
                    variant="outline"
                    @click.stop
                    @pointerdown.stop
            /></UDropdownMenu>
        </div>
        <p v-if="actionError" class="text-red-600" role="alert">{{ actionError }}</p>
        <div v-if="task.description" class="line-clamp-1 text-sm text-gray-600">
            {{ task.description }}
        </div>
        <div v-if="showLastRow" class="flex flex-wrap justify-end gap-2">
            <div class="flex flex-grow items-center gap-3 text-gray-400">
                <UBadge
                    v-if="dueDate"
                    :color="uiColor(dueColor(dueDate))"
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
            <div class="flex gap-2">
                <UBadge
                    v-for="tag in sortedTags"
                    :key="tag.id"
                    :color="uiColor(tag.color)"
                    :label="tag.name"
                    size="sm"
                    variant="soft"
                />
            </div>
        </div>
    </div>
</template>
