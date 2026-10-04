<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import DialogList from '../../components/DialogList.vue';
import DialogTask from '../../components/taskDialog/DialogTask.vue';
import {
    taskStore,
    type TaskAssigneeFilter,
    type TaskDueFilter,
    type TaskListFilter,
    type TaskPriorityFilter,
    type TaskSort,
    type TaskStatusFilter,
    type TaskTagFilter,
} from '../../composables/storeTasks';
import { useLists } from '../../composables/useLists';
import { useProjectTaskContext } from '../../composables/useProjectTaskContext';
import { useTags } from '../../composables/useTags';
import { authState, firstOrSelf } from '../../platform';

const props = defineProps<{ projectId: number }>();

const fullscreen = ref(false);
const onFullscreen = () => {
    fullscreen.value = !fullscreen.value;
};

const store = taskStore();
const projectSearch = computed({
    get: () => store.searchForProject(props.projectId),
    set: value => store.setSearchForProject(props.projectId, value),
});
const listIsOpen = ref(false);
const savedViewName = ref('');
const selectedSavedViewId = ref<string>();

const route = useRoute();
const projectId = computed(() => props.projectId);
const { lists } = useLists(projectId);
const { tagsArray } = useTags(projectId);
const { people } = useProjectTaskContext();
const viewId = computed(() => String(route.name ?? 'project'));
const taskControlsVisible = computed(() => !['project-archive', 'project-trash'].includes(viewId.value));
const filters = computed(() => store.filtersForProject(props.projectId));
const statusFilter = computed({
    get: () => filters.value.status,
    set: (status: TaskStatusFilter) => store.updateProjectFilters(props.projectId, { status }),
});
const priorityFilter = computed({
    get: () => filters.value.priority,
    set: (priority: TaskPriorityFilter) => store.updateProjectFilters(props.projectId, { priority }),
});
const dueFilter = computed({
    get: () => filters.value.due,
    set: (due: TaskDueFilter) => store.updateProjectFilters(props.projectId, { due }),
});
const assigneeFilter = computed({
    get: () => filters.value.assignee,
    set: (assignee: TaskAssigneeFilter) => store.updateProjectFilters(props.projectId, { assignee }),
});
const listFilter = computed({
    get: () => filters.value.list,
    set: (list: TaskListFilter) => store.updateProjectFilters(props.projectId, { list }),
});
const tagFilter = computed({
    get: () => filters.value.tag,
    set: (tag: TaskTagFilter) => store.updateProjectFilters(props.projectId, { tag }),
});
const sortMode = computed({
    get: () => store.sortForView(props.projectId, viewId.value),
    set: (sort: TaskSort) => store.setSortForView(props.projectId, viewId.value, sort),
});
const savedViews = computed(() => store.savedViewsForProject(props.projectId));
const savedViewOptions = computed(() => savedViews.value.map(view => ({ id: view.id, label: view.name })));
const saveCurrentView = () => {
    const saved = store.saveProjectView(props.projectId, savedViewName.value, filters.value, sortMode.value);
    if (!saved) return;
    selectedSavedViewId.value = saved.id;
    savedViewName.value = '';
};
const applySelectedView = () => {
    const saved = savedViews.value.find(view => view.id === selectedSavedViewId.value);
    if (saved) store.applySavedView(props.projectId, viewId.value, saved);
};
const removeSelectedView = () => {
    if (!selectedSavedViewId.value) return;
    store.removeSavedView(props.projectId, selectedSavedViewId.value);
    selectedSavedViewId.value = undefined;
};
const statusOptions = [
    { id: 'default', label: 'Status: Je Liste' },
    { id: 'open', label: 'Status: Offen' },
    { id: 'completed', label: 'Status: Erledigt' },
    { id: 'all', label: 'Status: Alle' },
];
const priorityOptions = [
    { id: 'all', label: 'Priorität: Alle' },
    { id: 'urgent', label: 'Priorität: Dringend' },
    { id: 'high', label: 'Priorität: Hoch' },
    { id: 'medium', label: 'Priorität: Mittel' },
    { id: 'low', label: 'Priorität: Niedrig' },
];
const dueOptions = [
    { id: 'all', label: 'Fälligkeit: Alle' },
    { id: 'overdue', label: 'Fälligkeit: Überfällig' },
    { id: 'today', label: 'Fälligkeit: Heute' },
    { id: 'week', label: 'Fälligkeit: Nächste 7 Tage' },
    { id: 'upcoming', label: 'Fälligkeit: Demnächst' },
    { id: 'none', label: 'Fälligkeit: Ohne Termin' },
];
const assigneeOptions = computed(() => [
    { id: 'all', label: 'Person: Alle' },
    { id: 'mine', label: 'Person: Mir zugewiesen' },
    { id: 'unassigned', label: 'Person: Nicht zugewiesen' },
    ...Object.entries(people.value)
        .map(([id, person]) => ({ id: Number(id), label: `Person: ${person.title}` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de')),
]);
const listOptions = computed(() => [
    { id: 'all' as const, label: 'Alle Listen' },
    ...lists.value.map(list => ({ id: list.id, label: list.name })),
]);
const tagOptions = computed(() => [
    { id: 'all' as const, label: 'Alle Tags' },
    { id: 'none' as const, label: 'Ohne Tag' },
    ...tagsArray.value.map(tag => ({ id: tag.id, label: tag.name })),
]);
const activeFilterCount = computed(
    () =>
        [
            filters.value.status !== 'default',
            filters.value.priority !== 'all',
            filters.value.due !== 'all',
            filters.value.assignee !== 'all',
            filters.value.list !== 'all',
            filters.value.tag !== 'all',
        ].filter(Boolean).length,
);
const resetFilters = () => store.resetProjectFilters(props.projectId);
const sortOptions = [
    { id: 'manual', label: 'Sortierung: Manuell' },
    { id: 'dueDate', label: 'Sortierung: Fälligkeit' },
    { id: 'priority', label: 'Sortierung: Priorität' },
    { id: 'name', label: 'Sortierung: Titel' },
    { id: 'updatedAt', label: 'Sortierung: Zuletzt geändert' },
];
const taskIsOpen = computed(() => !!firstOrSelf(route.params.taskId));
const newTaskRoute = computed(() => ({
    name: typeof route.name === 'string' ? route.name : 'project-board',
    params: { projectId: props.projectId, taskId: 'new' },
}));
const viewNavigation: NavigationMenuItem[] = [
    { label: 'Meine Aufgaben', icon: 'i-lucide-user-check', to: { name: 'my-tasks' } },
    { label: 'Board', icon: 'i-lucide-columns-3', to: { name: 'project-board' } },
    { label: 'Liste', icon: 'i-lucide-list', to: { name: 'project-list' } },
    { label: 'Tags', icon: 'i-lucide-tags', to: { name: 'project-tags' } },
    { label: 'Unteraufgaben', icon: 'i-lucide-git-branch', to: { name: 'project-tasks' } },
    { label: 'Kalender', icon: 'i-lucide-calendar-days', to: { name: 'project-calendar' } },
    { label: 'Timeline', icon: 'i-lucide-gantt-chart', to: { name: 'project-timeline' } },
    { label: 'Auswertung', icon: 'i-lucide-chart-no-axes-column', to: { name: 'project-insights' } },
    { label: 'Archiv', icon: 'i-lucide-archive', to: { name: 'project-archive' } },
    { label: 'Papierkorb', icon: 'i-lucide-trash-2', to: { name: 'project-trash' } },
];
const tabBar = ref<HTMLElement>();
const tabBarWidth = ref(1200);
let tabResizeObserver: ResizeObserver | undefined;
onMounted(() => {
    if (!tabBar.value) return;
    const updateWidth = () => {
        tabBarWidth.value = tabBar.value?.clientWidth ?? 1200;
    };
    updateWidth();
    tabResizeObserver = new ResizeObserver(updateWidth);
    tabResizeObserver.observe(tabBar.value);
});
onBeforeUnmount(() => tabResizeObserver?.disconnect());
const routeNameOf = (item: NavigationMenuItem) =>
    typeof item.to === 'object' && item.to && 'name' in item.to ? String(item.to.name) : '';
const orderedNavigation = computed(() => {
    const active = viewNavigation.find(item => routeNameOf(item) === route.name);
    return active ? [active, ...viewNavigation.filter(item => item !== active)] : viewNavigation;
});
const tabLayout = computed(() => {
    const items = orderedNavigation.value;
    const widths = items.map(item => String(item.label ?? '').length * 8 + 64);
    if (widths.reduce((sum, width) => sum + width, 0) <= tabBarWidth.value) return { visible: items, overflow: [] };
    const available = Math.max(150, tabBarWidth.value - 96);
    let used = 0;
    let count = 0;
    for (const width of widths) {
        if (count > 0 && used + width > available) break;
        used += width;
        count += 1;
    }
    return { visible: items.slice(0, count), overflow: items.slice(count) };
});
const overflowMenu = computed<DropdownMenuItem[][]>(() => [
    tabLayout.value.overflow.map(item => ({ label: String(item.label), icon: item.icon, to: item.to })),
]);
</script>
<template>
    <div
        class="project-view flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
        :class="{ 'fixed top-0 left-0 z-[2000] h-screen w-screen bg-gray-100': fullscreen }"
    >
        <div class="project-view-header shrink-0 border-b">
            <UDashboardToolbar v-if="taskControlsVisible" :ui="{ left: 'min-w-0 flex-1' }">
                <template #left>
                    <div class="flex w-full flex-wrap items-center gap-2">
                        <UInput
                            v-model="projectSearch"
                            class="w-64 max-w-full"
                            icon="i-lucide-search"
                            placeholder="Aufgaben filtern …"
                        />
                        <UPopover class="ml-auto">
                            <UButton
                                color="neutral"
                                icon="i-lucide-list-filter"
                                :label="activeFilterCount ? `Filter (${activeFilterCount})` : 'Filter'"
                                variant="outline"
                            />
                            <template #content>
                                <div class="grid w-80 gap-3 p-4 sm:w-[34rem] sm:grid-cols-2">
                                    <UFormField label="Status">
                                        <USelect
                                            v-model="statusFilter"
                                            class="w-full"
                                            :items="statusOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <UFormField label="Priorität">
                                        <USelect
                                            v-model="priorityFilter"
                                            class="w-full"
                                            :items="priorityOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <UFormField label="Fälligkeit">
                                        <USelect
                                            v-model="dueFilter"
                                            class="w-full"
                                            :items="dueOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <UFormField label="Verantwortlichkeit">
                                        <USelect
                                            v-model="assigneeFilter"
                                            class="w-full"
                                            :items="assigneeOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <UFormField label="Liste">
                                        <USelect
                                            v-model="listFilter"
                                            class="w-full"
                                            :items="listOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <UFormField label="Tag">
                                        <USelect
                                            v-model="tagFilter"
                                            class="w-full"
                                            :items="tagOptions"
                                            label-key="label"
                                            value-key="id"
                                        />
                                    </UFormField>
                                    <div class="sm:col-span-2 sm:text-right">
                                        <UButton
                                            :disabled="!activeFilterCount"
                                            icon="i-lucide-rotate-ccw"
                                            label="Filter zurücksetzen"
                                            variant="ghost"
                                            @click="resetFilters"
                                        />
                                    </div>
                                    <USeparator class="sm:col-span-2" label="Gespeicherte Ansichten" />
                                    <div class="flex gap-2 sm:col-span-2">
                                        <USelect
                                            v-model="selectedSavedViewId"
                                            class="min-w-0 flex-1"
                                            :items="savedViewOptions"
                                            label-key="label"
                                            placeholder="Ansicht auswählen …"
                                            value-key="id"
                                        />
                                        <UButton
                                            :disabled="!selectedSavedViewId"
                                            icon="i-lucide-play"
                                            label="Anwenden"
                                            variant="outline"
                                            @click="applySelectedView"
                                        />
                                        <UButton
                                            aria-label="Gespeicherte Ansicht löschen"
                                            color="error"
                                            :disabled="!selectedSavedViewId"
                                            icon="i-lucide-trash-2"
                                            variant="ghost"
                                            @click="removeSelectedView"
                                        />
                                    </div>
                                    <div class="flex gap-2 sm:col-span-2">
                                        <UInput
                                            v-model="savedViewName"
                                            class="min-w-0 flex-1"
                                            placeholder="Name der neuen Ansicht"
                                            @keydown.enter="saveCurrentView"
                                        />
                                        <UButton
                                            :disabled="!savedViewName.trim()"
                                            icon="i-lucide-bookmark-plus"
                                            label="Speichern"
                                            @click="saveCurrentView"
                                        />
                                    </div>
                                </div>
                            </template>
                        </UPopover>
                        <USelect
                            v-model="sortMode"
                            class="w-52"
                            :items="sortOptions"
                            label-key="label"
                            value-key="id"
                        />
                    </div>
                </template>
                <template #right>
                    <slot name="extra-actions"></slot>
                    <slot name="actions">
                        <UButton
                            aria-label="Liste erstellen"
                            color="neutral"
                            icon="i-lucide-plus"
                            label="Liste"
                            variant="outline"
                            @click="listIsOpen = true"
                        />
                        <UButton
                            :aria-label="fullscreen ? 'Vollbild verlassen' : 'Vollbild öffnen'"
                            color="neutral"
                            :icon="fullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
                            variant="outline"
                            @click="onFullscreen"
                        />
                    </slot>
                    <UButton
                        aria-keyshortcuts="N"
                        :disabled="authState.status !== 'authenticated'"
                        icon="i-lucide-plus"
                        label="Neu"
                        :to="newTaskRoute"
                    />
                </template>
            </UDashboardToolbar>
            <div ref="tabBar" class="flex min-w-0 items-center px-4 sm:px-6">
                <UNavigationMenu
                    class="flex-none"
                    highlight
                    :items="tabLayout.visible"
                    orientation="horizontal"
                    :ui="{ item: 'shrink-0', link: 'whitespace-nowrap' }"
                    variant="link"
                />
                <UDropdownMenu v-if="tabLayout.overflow.length" :items="overflowMenu">
                    <UButton color="neutral" icon="i-lucide-ellipsis" label="Mehr" size="sm" variant="ghost" />
                </UDropdownMenu>
            </div>
        </div>
        <div class="task-board-scroll min-h-0 max-w-full flex-1 overflow-auto p-4 lg:p-6">
            <div class="flex min-h-full gap-4">
                <slot></slot>
            </div>
        </div>
        <DialogTask v-if="taskIsOpen" :project-id="projectId" :task-id="firstOrSelf(route.params.taskId)!" />
        <DialogList v-if="listIsOpen" :project-id="projectId" @close="listIsOpen = false" />
    </div>
</template>
