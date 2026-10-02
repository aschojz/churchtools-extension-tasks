<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { sortBy } from 'lodash-es';
import { computed, onMounted, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { taskStore } from '../composables/storeTasks';
import { useLists } from '../composables/useLists';
import { useTasks } from '../composables/useTasks.ts';
import { reorderTasks } from '../domain/tasks';
import DialogList from './DialogList.vue';
import NewTask from './NewTask.vue';
import Task from './TaskItem.vue';

const store = taskStore();

const props = withDefaults(
    defineProps<{
        list: BoardColumn;
        items: TransformedTask[];
        showTask?: boolean;
        isDraggable?: boolean;
        projectId: number;
    }>(),
    { items: () => [], isDraggable: true },
);

const pId = computed(() => props.projectId);
const { updateList, deleteList } = useLists(pId);
const onUpdateList = (list: Partial<TaskList>) => {
    if (props.list.type === 'list') return updateList({ ...props.list, ...list });
};

const newTaskIsOpen = ref(false);

const initItems = (items: TransformedTask[]) => {
    internItems.value = sortBy(items, store.search ? 'score' : 'sortKey');
};
onMounted(() => initItems(props.items));
watch(
    () => props.items,
    () => {
        initItems(props.items);
    },
);
const internItems = ref<TransformedTask[]>([]);
const { updateTask } = useTasks(pId);
const saveError = ref('');
const isSaving = ref(false);
const onDragChange = async (event: { added?: unknown; moved?: unknown }) => {
    if (!props.isDraggable || props.list.type !== 'list' || isSaving.value || (!event.added && !event.moved)) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        for (const task of reorderTasks(internItems.value, props.list.id)) await updateTask(task);
    } catch {
        saveError.value = 'Verschieben fehlgeschlagen. Bitte erneut versuchen.';
        initItems(props.items);
    } finally {
        isSaving.value = false;
    }
};

const listContextMenu = computed<DropdownMenuItem[][]>(() => {
    if (props.list.type !== 'list') return [];
    const list = props.list;
    const menu: DropdownMenuItem[][] = [
        [
            {
                label: 'Unteraufgaben anzeigen',
                icon: list.showSubTasks ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left',
                onSelect: () => {
                    onUpdateList({ showSubTasks: !list.showSubTasks });
                },
            },
            {
                label: 'Erledigte Aufgaben anzeigen',
                icon: list.showCompleted ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left',
                onSelect: () => {
                    onUpdateList({ showCompleted: !list.showCompleted });
                },
            },
        ],
        [
            {
                label: 'Bearbeiten',
                icon: 'i-lucide-pencil',
                onSelect: () => {
                    if (props.list.type === 'list') listIsOpen.value = props.list;
                },
            },
            {
                label: 'Löschen',
                disabled: list.isDefault,
                icon: 'i-lucide-trash-2',
                color: 'error',
                onSelect: async () => {
                    await deleteList(props.list.id);
                },
            },
        ],
    ];
    return menu;
});
const listIsOpen = ref<TransformedList>();
</script>
<template>
    <div
        class="board-column flex max-h-[700px] flex-shrink-0 flex-col"
        :class="list.isCollapsed ? 'min-h-[300px] w-12' : 'w-96'"
    >
        <div
            class="px-2 pt-2"
            :class="{
                'mb-3 flex items-center justify-between gap-2': !list.isCollapsed,
                'flex min-h-96 flex-col items-center gap-2': list.isCollapsed,
            }"
        >
            <button
                v-if="$route.name === 'project-board'"
                class="my-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-50 text-gray-400"
                :class="{ 'm-2': list.isCollapsed }"
                @click="onUpdateList({ isCollapsed: !list.isCollapsed })"
            >
                <i v-if="list.isCollapsed" class="fas fa-angle-down relative left-px"></i>
                <i v-else class="fas fa-angle-right relative top-px"></i>
            </button>
            <div class="inline-flex flex-grow items-center overflow-hidden">
                <span
                    class="flex items-center gap-2 overflow-hidden text-xl font-bold text-ellipsis whitespace-nowrap"
                    :style="list.isCollapsed ? 'margin: calc(50% - 8px) 0; transform: rotate(90deg)' : ''"
                    :title="list.name"
                >
                    <slot :list="list" name="header">{{ list.name }}</slot>
                </span>
            </div>
            <div class="inline-flex">
                <span
                    class="flex gap-1 whitespace-nowrap"
                    :class="{ 'items-center': !list.isCollapsed }"
                    :style="list.isCollapsed ? 'margin: calc(50% - 8px) 0; transform: rotate(90deg)' : ''"
                >
                    <UBadge
                        v-if="internItems?.length"
                        color="neutral"
                        icon="i-lucide-list-checks"
                        :label="String(internItems?.length)"
                        size="sm"
                        variant="soft"
                    />
                    <UButton
                        v-if="!list.isCollapsed && list.type === 'list'"
                        icon="i-lucide-plus"
                        size="sm"
                        square
                        variant="ghost"
                        @click="newTaskIsOpen = !newTaskIsOpen"
                    />
                    <UDropdownMenu v-if="$route.name === 'project-board'" :items="listContextMenu">
                        <UButton
                            v-if="!list.isCollapsed"
                            color="neutral"
                            icon="i-lucide-ellipsis"
                            size="sm"
                            square
                            variant="ghost"
                        />
                    </UDropdownMenu>
                </span>
            </div>
        </div>
        <p v-if="saveError" class="px-2 text-red-600" role="alert">{{ saveError }}</p>
        <div v-if="!list.isCollapsed" class="flex flex-grow flex-col gap-2 overflow-y-auto px-2 pb-2">
            <draggable
                v-if="isDraggable && list.type === 'list'"
                v-model="internItems"
                animation="200"
                class="flex min-h-full flex-col gap-2"
                :disabled="isSaving || !!store.search"
                group="tasks"
                item-key="id"
                @change="onDragChange"
            >
                <template #header>
                    <NewTask
                        v-if="newTaskIsOpen"
                        :list="list as TransformedList"
                        :project-id="projectId"
                        @close="newTaskIsOpen = false"
                    />
                </template>
                <template #item="{ element }">
                    <Task :item="element" :project-id="projectId" :show-task="showTask" />
                </template>
                <template #footer><div class="pt-px"></div></template>
            </draggable>
            <template v-else>
                <NewTask
                    v-if="newTaskIsOpen"
                    :list="list as TransformedList"
                    :project-id="projectId"
                    @close="newTaskIsOpen = false"
                />
                <Task
                    v-for="item in internItems"
                    :key="item.id"
                    :item="item"
                    :project-id="projectId"
                    :show-task="showTask"
                />
            </template>
        </div>
        <DialogList v-if="listIsOpen" :list="listIsOpen" :project-id="projectId" @close="listIsOpen = undefined" />
    </div>
</template>
<style>
.sortable-ghost {
    border: 2px dashed var(--color-basic-bright);
}
.sortable-ghost > * {
    opacity: 0;
}
</style>
