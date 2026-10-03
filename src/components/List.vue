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
const { deleteList } = useLists(pId);

const newTaskIsOpen = ref(false);
const preferences = computed(() => store.preferencesForList(props.projectId, props.list));
const updatePreferences = (update: Parameters<typeof store.updateListPreferences>[2]) =>
    store.updateListPreferences(props.projectId, props.list.id, update);
const projectSearch = computed(() => store.searchForProject(props.projectId));

const initItems = (items: TransformedTask[]) => {
    internItems.value = sortBy(items, projectSearch.value ? 'score' : 'sortKey');
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
const deleteSelectedList = async (list: TransformedList) => {
    if (!window.confirm(`Die Liste „${list.name}“ wird gelöscht. Die enthaltenen Aufgaben bleiben erhalten.`)) return;
    saveError.value = '';
    try {
        await deleteList(list.id);
    } catch (caught) {
        saveError.value = caught instanceof Error ? caught.message : 'Liste konnte nicht gelöscht werden.';
    }
};
const onDragChange = async (event: { added?: unknown; moved?: unknown }) => {
    if (!props.isDraggable || props.list.type !== 'list' || isSaving.value || (!event.added && !event.moved)) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        for (const task of reorderTasks(internItems.value, props.list.id)) await updateTask(task);
    } catch (caught) {
        saveError.value =
            caught instanceof Error ? `Verschieben fehlgeschlagen: ${caught.message}` : 'Verschieben fehlgeschlagen.';
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
                icon: preferences.value.showSubTasks ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left',
                onSelect: () => {
                    updatePreferences({ showSubTasks: !preferences.value.showSubTasks });
                },
            },
            {
                label: 'Erledigte Aufgaben anzeigen',
                icon: preferences.value.showCompleted ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left',
                onSelect: () => {
                    updatePreferences({ showCompleted: !preferences.value.showCompleted });
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
                onSelect: () => deleteSelectedList(list),
            },
        ],
    ];
    return menu;
});
const listIsOpen = ref<TransformedList>();
</script>
<template>
    <div
        class="board-column flex h-full min-h-0 flex-shrink-0 flex-col"
        :class="preferences.isCollapsed ? 'min-h-[300px] w-12' : 'w-96'"
    >
        <div
            class="px-2 pt-2"
            :class="{
                'mb-3 flex items-center justify-between gap-2': !preferences.isCollapsed,
                'flex min-h-96 flex-col items-center gap-2': preferences.isCollapsed,
            }"
        >
            <UButton
                v-if="$route.name === 'project-board'"
                :aria-label="preferences.isCollapsed ? 'Spalte ausklappen' : 'Spalte einklappen'"
                class="board-column-collapse my-auto shrink-0"
                :class="{ 'm-2': preferences.isCollapsed }"
                color="neutral"
                :icon="preferences.isCollapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
                size="sm"
                square
                variant="ghost"
                @click="updatePreferences({ isCollapsed: !preferences.isCollapsed })"
            />
            <div class="inline-flex flex-grow items-center overflow-hidden">
                <span
                    class="flex items-center gap-2 overflow-hidden text-xl font-bold text-ellipsis whitespace-nowrap"
                    :style="preferences.isCollapsed ? 'margin: calc(50% - 8px) 0; transform: rotate(90deg)' : ''"
                    :title="list.name"
                >
                    <slot :list="list" name="header">{{ list.name }}</slot>
                </span>
            </div>
            <div class="inline-flex">
                <span
                    class="flex gap-1 whitespace-nowrap"
                    :class="{ 'items-center': !preferences.isCollapsed }"
                    :style="preferences.isCollapsed ? 'margin: calc(50% - 8px) 0; transform: rotate(90deg)' : ''"
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
                        v-if="!preferences.isCollapsed && list.type === 'list'"
                        aria-label="Aufgabe in dieser Liste erstellen"
                        icon="i-lucide-plus"
                        size="sm"
                        square
                        variant="ghost"
                        @click="newTaskIsOpen = !newTaskIsOpen"
                    />
                    <UDropdownMenu v-if="$route.name === 'project-board'" :items="listContextMenu">
                        <UButton
                            v-if="!preferences.isCollapsed"
                            aria-label="Listenaktionen"
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
        <div v-if="!preferences.isCollapsed" class="flex flex-grow flex-col gap-2 overflow-y-auto px-2 pb-2">
            <draggable
                v-if="isDraggable && list.type === 'list'"
                v-model="internItems"
                animation="200"
                class="flex min-h-full flex-col gap-2"
                :disabled="isSaving || !!projectSearch"
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
