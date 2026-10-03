import { defineStore } from 'pinia';
import { ref } from 'vue';

type ListPreferences = {
    isCollapsed?: boolean;
    showCompleted?: boolean;
    showSubTasks?: boolean;
};

const STORAGE_KEY = 'extension-tasks:view-preferences';
const loadPreferences = (): Record<string, ListPreferences> => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value ? (JSON.parse(value) as Record<string, ListPreferences>) : {};
    } catch {
        return {};
    }
};

export const taskStore = defineStore('tasks', () => {
    const showFullfilled = ref(true),
        sortBy = ref('dueDate'),
        searchByProject = ref<Record<number, string>>({}),
        listPreferences = ref<Record<string, ListPreferences>>(loadPreferences());

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
        showFullfilled,
        sortBy,
        searchForProject,
        setSearchForProject,
        preferencesForList,
        updateListPreferences,
    };
});
