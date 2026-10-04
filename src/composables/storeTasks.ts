import { defineStore } from 'pinia';
import { ref } from 'vue';

type ListPreferences = {
    isCollapsed?: boolean;
    showCompleted?: boolean;
    showSubTasks?: boolean;
};
export type TaskStatusFilter = 'default' | 'open' | 'completed' | 'all';
export type TaskPriorityFilter = 'all' | Exclude<TaskPriority, 'none'>;
export type TaskDueFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none';
export type TaskAssigneeFilter = 'all' | 'mine' | 'unassigned' | number;
export type TaskListFilter = 'all' | number;
export type TaskTagFilter = 'all' | 'none' | number;
export type TaskSort = 'manual' | 'dueDate' | 'priority' | 'name' | 'updatedAt';
type ProjectFilters = {
    status: TaskStatusFilter;
    priority: TaskPriorityFilter;
    due: TaskDueFilter;
    assignee: TaskAssigneeFilter;
    list: TaskListFilter;
    tag: TaskTagFilter;
};

const STORAGE_KEY = 'extension-tasks:view-preferences';
const PROJECT_VIEW_STORAGE_KEY = 'extension-tasks:project-views';
type StoredProjectViews = {
    filters?: Record<number, Partial<ProjectFilters>>;
    sorting?: Record<string, TaskSort>;
};
const loadPreferences = (): Record<string, ListPreferences> => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value ? (JSON.parse(value) as Record<string, ListPreferences>) : {};
    } catch {
        return {};
    }
};
const loadProjectViews = (): StoredProjectViews => {
    try {
        const value = localStorage.getItem(PROJECT_VIEW_STORAGE_KEY);
        return value ? (JSON.parse(value) as StoredProjectViews) : {};
    } catch {
        return {};
    }
};

export const taskStore = defineStore('tasks', () => {
    const storedProjectViews = loadProjectViews();
    const searchByProject = ref<Record<number, string>>({}),
        listPreferences = ref<Record<string, ListPreferences>>(loadPreferences()),
        filtersByProject = ref<Record<number, Partial<ProjectFilters>>>(storedProjectViews.filters ?? {}),
        sortingByView = ref<Record<string, TaskSort>>(storedProjectViews.sorting ?? {});

    const persistProjectViews = () => {
        try {
            localStorage.setItem(
                PROJECT_VIEW_STORAGE_KEY,
                JSON.stringify({ filters: filtersByProject.value, sorting: sortingByView.value }),
            );
        } catch {
            // The view remains usable when storage is disabled or full.
        }
    };
    const filtersForProject = (projectId: number): ProjectFilters => ({
        status: 'default',
        priority: 'all',
        due: 'all',
        assignee: 'all',
        list: 'all',
        tag: 'all',
        ...filtersByProject.value[projectId],
    });
    const updateProjectFilters = (projectId: number, update: Partial<ProjectFilters>) => {
        filtersByProject.value = {
            ...filtersByProject.value,
            [projectId]: { ...filtersByProject.value[projectId], ...update },
        };
        persistProjectViews();
    };
    const resetProjectFilters = (projectId: number) => {
        const { [projectId]: _removed, ...remaining } = filtersByProject.value;
        void _removed;
        filtersByProject.value = remaining;
        persistProjectViews();
    };
    const sortingKey = (projectId: number, view: string) => `${projectId}:${view}`;
    const sortForView = (projectId: number, view: string): TaskSort =>
        sortingByView.value[sortingKey(projectId, view)] ?? (view === 'project-board' ? 'manual' : 'dueDate');
    const setSortForView = (projectId: number, view: string, sort: TaskSort) => {
        sortingByView.value = { ...sortingByView.value, [sortingKey(projectId, view)]: sort };
        persistProjectViews();
    };

    const searchForProject = (projectId: number) => searchByProject.value[projectId] ?? '';
    const setSearchForProject = (projectId: number, search: string) => {
        searchByProject.value = { ...searchByProject.value, [projectId]: search };
    };
    const preferenceKey = (projectId: number, listId: number) => `${projectId}:${listId}`;
    const preferencesForList = (projectId: number, list: BoardColumn): Required<ListPreferences> => ({
        isCollapsed: false,
        showCompleted: false,
        showSubTasks: false,
        ...(list.type === 'list'
            ? {
                  isCollapsed: list.isCollapsed,
                  showCompleted: list.showCompleted,
                  showSubTasks: list.showSubTasks,
              }
            : {}),
        ...listPreferences.value[preferenceKey(projectId, list.id)],
    });
    const updateListPreferences = (projectId: number, listId: number, update: ListPreferences) => {
        const key = preferenceKey(projectId, listId);
        listPreferences.value = {
            ...listPreferences.value,
            [key]: { ...listPreferences.value[key], ...update },
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(listPreferences.value));
        } catch {
            // The view remains usable when storage is disabled or full.
        }
    };

    return {
        filtersForProject,
        updateProjectFilters,
        resetProjectFilters,
        sortForView,
        setSortForView,
        searchForProject,
        setSearchForProject,
        preferencesForList,
        updateListPreferences,
    };
});
