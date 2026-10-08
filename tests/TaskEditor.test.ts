import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import TaskEditor from '../src/components/taskDialog/TaskEditor.vue';

vi.mock('../src/composables/useTasks', () => ({
    useTasks: () => ({
        tasksMap: ref({ 42: { id: 42, name: 'Bestehende Aufgabe', assignedTo: [1, 2] } }),
        isLoading: ref(false),
        findParent: () => undefined,
    }),
}));
vi.mock('../src/composables/useLists', () => ({
    useLists: () => ({ lists: ref([{ id: 10, name: 'Eingang', isDefault: true }]) }),
}));
vi.mock('../src/composables/useTags', () => ({ useTags: () => ({ tagsArray: ref([]) }) }));
vi.mock('../src/composables/useTaskTemplates', () => ({
    useTaskTemplates: () => ({ templates: () => [], saveTemplate: vi.fn(), removeTemplate: vi.fn() }),
}));
vi.mock('../src/composables/usePersons', () => ({
    searchPersons: vi.fn(),
    usePersonsQueryAllPages: (filter: { value: { ids: number[] } }) => ({
        data: computed(() =>
            filter.value.ids.map(id => ({ id, firstName: id === 1 ? 'Armin' : 'Birte', lastName: 'Test' })),
        ),
    }),
}));

describe('project assignee suggestions', () => {
    it('offers previously assigned project members before typing a search', () => {
        const wrapper = shallowMount(TaskEditor, { props: { projectId: 17 }, global: { stubs: { UEditor: true } } });
        expect((wrapper.vm as unknown as { personOptions: unknown[] }).personOptions).toEqual([
            { id: 1, label: 'Armin Test' },
            { id: 2, label: 'Birte Test' },
        ]);
    });
});
