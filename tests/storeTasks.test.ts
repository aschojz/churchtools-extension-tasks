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
});
