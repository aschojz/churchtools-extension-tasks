<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import DialogList from '../../components/DialogList.vue';
import TaskSelectionActions from '../../components/TaskSelectionActions.vue';
import { useTaskSelection } from '../../composables/useTaskSelection';
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
import { useProject } from '../../project/useProject';
import { projectIcon } from '../../utils/utils';
import { authState, firstOrSelf } from '../../platform';

const props = defineProps<{ projectId: number; columns?: boolean; viewActions?: DropdownMenuItem[] }>();
const { project } = useProject(() => props.projectId);
const DialogTask = defineAsyncComponent(() => import('../../components/taskDialog/DialogTask.vue'));

const selection = useTaskSelection();
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
const workspaceMenu = computed<DropdownMenuItem[][]>(() => [
    [
        ...(selection && !selection.enabled.value
            ? [{ label: 'Aufgaben auswählen', icon: 'i-lucide-list-checks', onSelect: selection.toggleMode }]
            : []),
        ...(!['project-timeline', 'project-insights', 'project-archive', 'project-trash'].includes(viewId.value)
            ? [
                  {
                      label: 'Liste erstellen',
                      icon: 'i-lucide-list-plus',
                      onSelect: () => {
                          listIsOpen.value = true;
                      },
                  },
              ]
            : []),
        ...(props.viewActions ?? []),
    ],
    [
        {
            label: fullscreen.value ? 'Vollbild verlassen' : 'Vollbild öffnen',
            icon: fullscreen.value ? 'i-lucide-minimize' : 'i-lucide-maximize',
            onSelect: onFullscreen,
        },
    ],
]);
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
    { id: 'default', label: 'Je Liste' },
    { id: 'open', label: 'Offen' },
    { id: 'completed', label: 'Erledigt' },
    { id: 'all', label: 'Alle' },
];
const priorityOptions = [
    { id: 'all', label: 'Alle' },
    { id: 'urgent', label: 'Dringend' },
    { id: 'high', label: 'Hoch' },
    { id: 'medium', label: 'Mittel' },
    { id: 'low', label: 'Niedrig' },
];
const dueOptions = [
    { id: 'all', label: 'Alle' },
    { id: 'overdue', label: 'Überfällig' },
    { id: 'today', label: 'Heute' },
    { id: 'week', label: 'Nächste 7 Tage' },
    { id: 'upcoming', label: 'Demnächst' },
    { id: 'none', label: 'Ohne Termin' },
];
const assigneeOptions = computed(() => [
    { id: 'all', label: 'Alle' },
    { id: 'mine', label: 'Mir zugewiesen' },
    { id: 'unassigned', label: 'Nicht zugewiesen' },
    ...Object.entries(people.value)
        .map(([id, person]) => ({ id: Number(id), label: person.title }))
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
const sortOptions: { id: TaskSort; label: string }[] = [
    { id: 'manual', label: 'Manuell' },
    { id: 'dueDate', label: 'Fälligkeit' },
    { id: 'priority', label: 'Priorität' },
    { id: 'name', label: 'Titel' },
    { id: 'updatedAt', label: 'Zuletzt geändert' },
];
const sortMenu = computed<DropdownMenuItem[]>(() =>
    sortOptions.map(option => ({
        label: option.label,
        checked: sortMode.value === option.id,
        onSelect: () => {
            sortMode.value = option.id;
        },
    })),
);
const sortLabel = computed(
    () => `Sortierung: ${sortOptions.find(option => option.id === sortMode.value)?.label ?? 'Manuell'}`,
);
const taskIsOpen = computed(() => !!firstOrSelf(route.params.taskId));
const newTaskRoute = computed(() => ({
    name: typeof route.name === 'string' ? route.name : 'project-board',
    params: { projectId: props.projectId, taskId: 'new' },
}));
const viewNavigation: NavigationMenuItem[] = [
    { label: 'Meine Aufgaben', icon: 'i-lucide-user-check', to: { name: 'my-tasks' } },
    { label: 'Board', icon: 'i-lucide-columns-3', to: { name: 'project-board' } },
    { label: 'Liste', icon: 'i-lucide-list', to: { name: 'project-list' } },
    { label: 'Kalender', icon: 'i-lucide-calendar-days', to: { name: 'project-calendar' } },
    { label: 'Timeline', icon: 'i-lucide-gantt-chart', to: { name: 'project-timeline' } },
    { label: 'Tags', icon: 'i-lucide-tags', to: { name: 'project-tags' } },
    { label: 'Unteraufgaben', icon: 'i-lucide-git-branch', to: { name: 'project-tasks' } },
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
const tabLayout = computed(() => {
    const items = viewNavigation;
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
    const visible = items.slice(0, count);
    const active = items.find(item => routeNameOf(item) === route.name);
    if (active && !visible.includes(active)) visible.splice(Math.max(0, visible.length - 1), 1, active);
    return { visible, overflow: items.filter(item => !visible.includes(item)) };
});
const overflowMenu = computed<DropdownMenuItem[][]>(() => [
    tabLayout.value.overflow.map(item => ({ label: String(item.label), icon: item.icon, to: item.to })),
]);
</script>
<template>
    <div
        class="project-view flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
        :class="{ 'bg-muted fixed top-0 left-0 z-[2000] h-screen w-screen': fullscreen }"
    >
        <div class="project-view-header shrink-0 border-b">
            <div v-if="project" class="project-heading">
                <span class="project-heading-icon"><UIcon :name="projectIcon(project.icon)" /></span>
                <div class="project-heading-copy">
                    <h1 :title="project.name">{{ project.name }}</h1>
                    <p v-if="project.description" :title="project.description">{{ project.description }}</p>
                </div>
                <div class="project-primary-actions">
                    <UButton
                        v-if="taskControlsVisible"
                        aria-keyshortcuts="N"
                        :disabled="authState.status !== 'authenticated' || selection?.saving.value"
                        icon="i-lucide-plus"
                        label="Neu"
                        :to="newTaskRoute"
                    />
                    <UDropdownMenu :items="workspaceMenu"
                        ><UButton
                            aria-label="Weitere Projektaktionen"
                            color="neutral"
                            :disabled="selection?.saving.value"
                            icon="i-lucide-ellipsis"
                            square
                            variant="ghost"
                    /></UDropdownMenu>
                </div>
            </div>
            <div
                v-if="taskControlsVisible"
                aria-label="Aufgaben suchen und filtern"
                class="project-toolbar"
                role="search"
            >
                <div class="project-search-tools">
                    <UInput
                        v-model="projectSearch"
                        class="project-search-input"
                        icon="i-lucide-search"
                        placeholder="Aufgaben filtern …"
                    />
                    <UPopover>
                        <UButton
                            :aria-label="activeFilterCount ? `Filter (${activeFilterCount})` : 'Filter'"
                            :color="activeFilterCount ? 'primary' : 'neutral'"
                            icon="i-lucide-list-filter"
                            :label="activeFilterCount ? `Filter (${activeFilterCount})` : 'Filter'"
                            :ui="{ label: 'hidden sm:inline' }"
                            :variant="activeFilterCount ? 'soft' : 'ghost'"
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
                    <UDropdownMenu :items="sortMenu">
                        <template #item-trailing="{ item }">
                            <UIcon v-if="item.checked" class="task-menu-option-active size-4" name="i-lucide-check" />
                        </template>
                        <UButton
                            :aria-label="sortLabel"
                            color="neutral"
                            icon="i-lucide-arrow-down-wide-narrow"
                            square
                            :title="sortLabel"
                            variant="outline"
                        />
                    </UDropdownMenu>
                </div>
            </div>
            <div ref="tabBar" class="project-tabs flex min-w-0 items-center px-4 sm:px-6">
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
        <div v-if="selection?.enabled.value" aria-label="Sammelauswahl" class="project-selection-bar">
            <span class="selection-count">{{ selection.selectedTasks.value.length }} ausgewählt</span>
            <div class="selection-actions"><TaskSelectionActions /></div>
        </div>
        <div
            :aria-label="columns ? 'Aufgabenspalten' : 'Aufgabenansicht'"
            class="task-board-scroll min-h-0 max-w-full flex-1 overflow-auto p-4 lg:p-6"
            :class="{ 'task-board-columns': columns }"
            tabindex="0"
        >
            <div class="task-view-content flex min-h-full gap-4">
                <slot></slot>
            </div>
        </div>
        <DialogTask v-if="taskIsOpen" :project-id="projectId" :task-id="firstOrSelf(route.params.taskId)!" />
        <DialogList v-if="listIsOpen" :project-id="projectId" @close="listIsOpen = false" />
    </div>
</template>
