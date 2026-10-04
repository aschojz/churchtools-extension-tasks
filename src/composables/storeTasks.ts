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
export type ProjectFilters = {
    status: TaskStatusFilter;
    priority: TaskPriorityFilter;
    due: TaskDueFilter;
    assignee: TaskAssigneeFilter;
    list: TaskListFilter;
    tag: TaskTagFilter;
};
export type SavedProjectView = {
    id: string;
    name: string;
    filters: ProjectFilters;
    sort: TaskSort;
};

const STORAGE_KEY = 'extension-tasks:view-preferences';
const PROJECT_VIEW_STORAGE_KEY = 'extension-tasks:project-views';
type StoredProjectViews = {
    filters?: Record<number, Partial<ProjectFilters>>;
    sorting?: Record<string, TaskSort>;
    savedViews?: Record<number, SavedProjectView[]>;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const statusFilters: TaskStatusFilter[] = ['default', 'open', 'completed', 'all'];
const priorityFilters: TaskPriorityFilter[] = ['all', 'low', 'medium', 'high', 'urgent'];
const dueFilters: TaskDueFilter[] = ['all', 'overdue', 'today', 'upcoming', 'none'];
const assigneeFilters = ['all', 'mine', 'unassigned'] as const;
const taskSorts: TaskSort[] = ['manual', 'dueDate', 'priority', 'name', 'updatedAt'];
const positiveIdOr = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T | number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : allowed.includes(value as T)
          ? (value as T)
          : fallback;
const parseFilters = (value: unknown): ProjectFilters => {
    const record = isRecord(value) ? value : {};
    return {
        status: statusFilters.includes(record.status as TaskStatusFilter)
            ? (record.status as TaskStatusFilter)
            : 'default',
        priority: priorityFilters.includes(record.priority as TaskPriorityFilter)
            ? (record.priority as TaskPriorityFilter)
            : 'all',
        due: dueFilters.includes(record.due as TaskDueFilter) ? (record.due as TaskDueFilter) : 'all',
        assignee: positiveIdOr(record.assignee, assigneeFilters, 'all') as TaskAssigneeFilter,
        list: positiveIdOr(record.list, ['all'], 'all') as TaskListFilter,
        tag: positiveIdOr(record.tag, ['all', 'none'], 'all') as TaskTagFilter,
    };
};
export const parseProjectViewStorage = (value: unknown): StoredProjectViews => {
    if (!isRecord(value)) return {};
    const filters = isRecord(value.filters)
        ? Object.fromEntries(
              Object.entries(value.filters).flatMap(([projectId, filter]) =>
                  Number.isSafeInteger(Number(projectId)) && Number(projectId) > 0
                      ? [[Number(projectId), parseFilters(filter)]]
                      : [],
              ),
          )
        : {};
    const sorting = isRecord(value.sorting)
        ? Object.fromEntries(
              Object.entries(value.sorting).filter((entry): entry is [string, TaskSort] =>
                  taskSorts.includes(entry[1] as TaskSort),
              ),
          )
        : {};
    const savedViews = isRecord(value.savedViews)
        ? Object.fromEntries(
              Object.entries(value.savedViews).flatMap(([projectId, entries]) => {
                  if (!Number.isSafeInteger(Number(projectId)) || Number(projectId) <= 0 || !Array.isArray(entries))
                      return [];
                  const views = entries.flatMap<SavedProjectView>(entry => {
                      if (
                          !isRecord(entry) ||
                          typeof entry.id !== 'string' ||
                          typeof entry.name !== 'string' ||
                          !taskSorts.includes(entry.sort as TaskSort)
                      )
                          return [];
                      const name = entry.name.trim();
                      return name
                          ? [{ id: entry.id, name, filters: parseFilters(entry.filters), sort: entry.sort as TaskSort }]
                          : [];
                  });
                  return views.length ? [[Number(projectId), views]] : [];
              }),
          )
        : {};
    return { filters, sorting, savedViews };
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
        return value ? parseProjectViewStorage(JSON.parse(value)) : {};
    } catch {
        return {};
    }
};

export const taskStore = defineStore('tasks', () => {
    const storedProjectViews = loadProjectViews();
    const searchByProject = ref<Record<number, string>>({}),
        listPreferences = ref<Record<string, ListPreferences>>(loadPreferences()),
        filtersByProject = ref<Record<number, Partial<ProjectFilters>>>(storedProjectViews.filters ?? {}),
        sortingByView = ref<Record<string, TaskSort>>(storedProjectViews.sorting ?? {}),
        savedViewsByProject = ref<Record<number, SavedProjectView[]>>(storedProjectViews.savedViews ?? {});

    const persistProjectViews = () => {
        try {
            localStorage.setItem(
                PROJECT_VIEW_STORAGE_KEY,
                JSON.stringify({
                    filters: filtersByProject.value,
                    sorting: sortingByView.value,
                    savedViews: savedViewsByProject.value,
                }),
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
    const savedViewsForProject = (projectId: number) => savedViewsByProject.value[projectId] ?? [];
    const saveProjectView = (projectId: number, name: string, filters: ProjectFilters, sort: TaskSort) => {
        const normalizedName = name.trim();
        if (!normalizedName) return;
        const existing = savedViewsForProject(projectId).find(view => view.name === normalizedName);
        const saved: SavedProjectView = {
            id: existing?.id ?? `view-${Date.now().toString(36)}`,
            name: normalizedName,
            filters: { ...filters },
            sort,
        };
        savedViewsByProject.value = {
            ...savedViewsByProject.value,
            [projectId]: [...savedViewsForProject(projectId).filter(view => view.id !== saved.id), saved],
        };
        persistProjectViews();
        return saved;
    };
    const applySavedView = (projectId: number, viewId: string, saved: SavedProjectView) => {
        filtersByProject.value = { ...filtersByProject.value, [projectId]: { ...saved.filters } };
        sortingByView.value = { ...sortingByView.value, [sortingKey(projectId, viewId)]: saved.sort };
        persistProjectViews();
    };
    const removeSavedView = (projectId: number, savedViewId: string) => {
        savedViewsByProject.value = {
            ...savedViewsByProject.value,
            [projectId]: savedViewsForProject(projectId).filter(view => view.id !== savedViewId),
        };
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
        savedViewsForProject,
        saveProjectView,
        applySavedView,
        removeSavedView,
        searchForProject,
        setSearchForProject,
        preferencesForList,
        updateListPreferences,
    };
});
