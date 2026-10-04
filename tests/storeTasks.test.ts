import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseListPreferences, parseProjectViewStorage, taskStore } from '../src/composables/storeTasks';

const list: TransformedList = {
    id: 7,
    dataCategoryId: 3,
    type: 'list',
    name: 'Offen',
    sortKey: 0,
    isCollapsed: true,
    showCompleted: true,
};

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
});

describe('personal task view state', () => {
    it('keeps search terms separate per project', () => {
        const store = taskStore();
        store.setSearchForProject(3, 'Website');
        expect(store.searchForProject(3)).toBe('Website');
        expect(store.searchForProject(4)).toBe('');
    });

    it('uses stored list preferences without changing shared list data', () => {
        const store = taskStore();
        expect(store.preferencesForList(3, list)).toMatchObject({ isCollapsed: true, showCompleted: true });
        store.updateListPreferences(3, list.id, { isCollapsed: false, showCompleted: false });
        expect(store.preferencesForList(3, list)).toMatchObject({ isCollapsed: false, showCompleted: false });
        expect(list).toMatchObject({ isCollapsed: true, showCompleted: true });

        setActivePinia(createPinia());
        expect(taskStore().preferencesForList(3, list)).toMatchObject({ isCollapsed: false, showCompleted: false });
    });

    it('persists project filters and keeps sorting separate per view', () => {
        const store = taskStore();
        expect(store.filtersForProject(3)).toEqual({
            status: 'default',
            priority: 'all',
            due: 'all',
            assignee: 'all',
            list: 'all',
            tag: 'all',
        });
        expect(store.sortForView(3, 'project-board')).toBe('manual');
        expect(store.sortForView(3, 'project-list')).toBe('dueDate');

        store.updateProjectFilters(3, {
            status: 'completed',
            priority: 'urgent',
            due: 'overdue',
            assignee: 'mine',
            list: 7,
            tag: 'none',
        });
        store.setSortForView(3, 'project-board', 'priority');

        setActivePinia(createPinia());
        const restored = taskStore();
        expect(restored.filtersForProject(3)).toEqual({
            status: 'completed',
            priority: 'urgent',
            due: 'overdue',
            assignee: 'mine',
            list: 7,
            tag: 'none',
        });
        expect(restored.filtersForProject(4)).toEqual({
            status: 'default',
            priority: 'all',
            due: 'all',
            assignee: 'all',
            list: 'all',
            tag: 'all',
        });
        expect(restored.sortForView(3, 'project-board')).toBe('priority');
        expect(restored.sortForView(3, 'project-list')).toBe('dueDate');

        restored.resetProjectFilters(3);
        expect(restored.filtersForProject(3)).toEqual(restored.filtersForProject(4));
    });

    it('persists a concrete assignee per project', () => {
        const store = taskStore();
        store.updateProjectFilters(3, { assignee: 42 });

        setActivePinia(createPinia());
        expect(taskStore().filtersForProject(3).assignee).toBe(42);
    });

    it('saves and reapplies named personal views', () => {
        const store = taskStore();
        const saved = store.saveProjectView(
            3,
            'Dringend',
            { ...store.filtersForProject(3), priority: 'urgent', due: 'overdue' },
            'priority',
        );
        expect(saved?.name).toBe('Dringend');

        store.resetProjectFilters(3);
        store.applySavedView(3, 'project-list', saved!);
        expect(store.filtersForProject(3)).toMatchObject({ priority: 'urgent', due: 'overdue' });
        expect(store.sortForView(3, 'project-list')).toBe('priority');

        setActivePinia(createPinia());
        expect(taskStore().savedViewsForProject(3)).toHaveLength(1);
    });

    it('sanitizes malformed persisted filters and views', () => {
        expect(
            parseProjectViewStorage({
                filters: { 3: { status: 'broken', assignee: -2, list: 8 } },
                sorting: { '3:project-list': 'priority', invalid: 'broken' },
                savedViews: {
                    3: [
                        {
                            id: 'safe',
                            name: ' Sicher ',
                            filters: { status: 'open', tag: 'none' },
                            sort: 'name',
                        },
                        { id: 4, name: 'Broken', filters: {}, sort: 'name' },
                    ],
                },
            }),
        ).toEqual({
            filters: {
                3: {
                    status: 'default',
                    priority: 'all',
                    due: 'all',
                    assignee: 'all',
                    list: 8,
                    tag: 'all',
                },
            },
            sorting: { '3:project-list': 'priority' },
            savedViews: {
                3: [
                    {
                        id: 'safe',
                        name: 'Sicher',
                        filters: {
                            status: 'open',
                            priority: 'all',
                            due: 'all',
                            assignee: 'all',
                            list: 'all',
                            tag: 'none',
                        },
                        sort: 'name',
                    },
                ],
            },
        });
    });

    it('sanitizes malformed list preferences', () => {
        expect(
            parseListPreferences({
                '3:7': { isCollapsed: true, showCompleted: 'yes', showSubTasks: false },
                invalid: { isCollapsed: false },
                '3:8': 'broken',
            }),
        ).toEqual({ '3:7': { isCollapsed: true, showSubTasks: false } });
        expect(parseListPreferences([])).toEqual({});
    });
});
