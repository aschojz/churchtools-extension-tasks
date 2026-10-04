import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { taskStore } from '../src/composables/storeTasks';

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
});
