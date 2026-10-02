<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTask } from '../composables/useTask.ts';
import { useTasks } from '../composables/useTasks.ts';
import { descendantIds } from '../domain/tasks';
import { uiColor } from '../platform';
import ProgressRing from './ProgressRing.vue';

const props = defineProps<{
    item: TransformedTask;
    showTask?: boolean;
    projectId: number;
}>();

const id = computed(() => props.item.id);
const pId = computed(() => props.projectId);
const {
    superParent,
    parent,
    hasSubTasks,
    percentFullfilled,
    assignees,
    dueColor,
    dueDate,
    toggleTask,
    comments,
    task,
    sortedTags,
    toDayMonth,
} = useTask(pId, id);

const router = useRouter();
const openTask = () => {
    const currentRoute = router.currentRoute.value;
    const name = currentRoute.params.projectId ? currentRoute.name! : 'my-tasks';
    router.push({ name, params: { projectId: props.projectId, taskId: props.item.id } });
};

const showLastRow = computed(() => dueDate.value || comments.value.length || props.item.tags?.length || props.item.url);

const { tasksMap, createTask, deleteTask, updateTask } = useTasks(pId);

const createTaskOrSubtask = async ({ id, ...data }: TransformedTask) => {
    void id; // ensure we don't pass an id when creating a new task
    return await createTask(data);
};

async function duplicateTask() {
    const originalTask = props.item;
    const newSubtaskIds = await duplicateSubtasks(originalTask.subTasks);
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
            const nestedSubtaskIds = await duplicateSubtasks(originalSubtask.subTasks, visited);
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
        if (!removed.has(parent.id) && parent.subTasks?.some(id => removed.has(id))) {
            await updateTask({ ...parent, subTasks: parent.subTasks.filter(id => !removed.has(id)) });
        }
    }
    for (const id of ids) await deleteTask(id, task.dataCategoryId);
};

const contextMenu = computed<DropdownMenuItem[][]>(() => [
    [
        {
            label: props.item.fullfilled ? 'Als nicht erfüllt markieren' : 'Abhaken',
            icon: props.item.fullfilled ? 'i-lucide-square' : 'i-lucide-square-check-big',
            onSelect: () => runAction(toggleTask),
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
            onSelect: () => runAction(() => deleteRecursive(props.item)),
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
        class="task-item group relative flex cursor-pointer flex-col justify-between gap-2 rounded border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-gray-200"
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
                <template v-else>
                    <i
                        v-if="item.fullfilled"
                        class="far fa-check-square text-[20px] text-green-500"
                        @click.stop="runAction(toggleTask)"
                    ></i>
                    <i v-else class="far fa-square text-[20px] text-gray-500" @click.stop="runAction(toggleTask)"></i>
                </template>
                <span class="font-bold"> {{ item.name }} </span>
            </div>
            <div v-if="item.assignedTo?.length" class="flex flex-shrink-0 gap-1">
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
                    class="absolute top-1 right-1 hidden group-hover:inline-flex"
                    color="neutral"
                    icon="i-lucide-ellipsis"
                    size="sm"
                    square
                    variant="outline"
            /></UDropdownMenu>
        </div>
        <p v-if="actionError" class="text-red-600" role="alert">{{ actionError }}</p>
        <div v-if="item.description" class="l line-clamp-1">
            {{ item.description }}
        </div>
        <div v-if="showLastRow" class="flex flex-wrap justify-end gap-2">
            <div class="flex flex-grow items-center gap-3 text-gray-400">
                <UBadge
                    v-if="dueDate"
                    :color="uiColor(dueColor)"
                    icon="i-lucide-clock"
                    :label="
                        task?.dueDateRelative
                            ? `${toDayMonth(dueDate)} (${task?.dueDateRelative})`
                            : toDayMonth(dueDate)
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
                    v-if="item.url"
                    color="neutral"
                    :href="item.url"
                    icon="i-lucide-link"
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
