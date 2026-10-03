import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import List from '../src/components/List.vue';

const mocks = vi.hoisted(() => ({ updateTask: vi.fn(), updateList: vi.fn(), deleteList: vi.fn() }));
vi.mock('../src/composables/storeTasks', () => ({
    taskStore: () => ({
        searchForProject: () => '',
        preferencesForList: () => ({ isCollapsed: false, showCompleted: false, showSubTasks: false }),
        updateListPreferences: vi.fn(),
        sortBy: 'dueDate',
    }),
}));
vi.mock('../src/composables/useLists', () => ({ useLists: () => mocks }));
vi.mock('../src/composables/useTasks', () => ({ useTasks: () => mocks }));
vi.mock('../src/components/TaskItem.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../src/components/NewTask.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../src/components/DialogList.vue', () => ({ default: { template: '<div />' } }));
vi.mock('vuedraggable', () => ({
    default: defineComponent({
        name: 'Draggable',
        props: ['modelValue'],
        emits: ['update:modelValue', 'change'],
        template: '<div />',
    }),
}));

const item = {
    id: 11,
    dataCategoryId: 1,
    type: 'task' as const,
    name: 'Task',
    fullfilled: false,
    list: 100,
    sortKey: 10000,
};
const render = (list: object, isDraggable = true) =>
    mount(List, {
        props: { projectId: 1, items: [{ ...item }], list: list as TransformedList, isDraggable },
        global: { mocks: { $route: { name: 'project-board' } } },
    });
beforeEach(() => {
    mocks.updateTask.mockReset();
    mocks.updateTask.mockResolvedValue(undefined);
});
describe('board writes only on deliberate moves', () => {
    it.each(['tag', 'parent'])('does not write when mounting or refreshing a %s column', async type => {
        const wrapper = render({ id: 200, name: 'Virtual', type }, false);
        await flushPromises();
        await wrapper.setProps({ items: [{ ...item, name: 'Updated' }] });
        await flushPromises();
        expect(mocks.updateTask).not.toHaveBeenCalled();
        expect(wrapper.findComponent({ name: 'Draggable' }).exists()).toBe(false);
    });
    it('does not write when loading a real list, but writes on a drag into it', async () => {
        const wrapper = render({ id: 200, name: 'Real', type: 'list', sortKey: 0, dataCategoryId: 1 });
        await flushPromises();
        expect(mocks.updateTask).not.toHaveBeenCalled();
        const drag = wrapper.findComponent({ name: 'Draggable' });
        drag.vm.$emit('update:modelValue', [{ ...item }]);
        await nextTick();
        drag.vm.$emit('change', { added: { element: item, newIndex: 0 } });
        await flushPromises();
        expect(mocks.updateTask).toHaveBeenCalledTimes(1);
        expect(mocks.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 11, list: 200 }));
    });
    it('shows failures and leaves the original task unchanged', async () => {
        mocks.updateTask.mockRejectedValueOnce(new Error('offline'));
        const wrapper = render({ id: 200, name: 'Real', type: 'list', sortKey: 0, dataCategoryId: 1 });
        wrapper.findComponent({ name: 'Draggable' }).vm.$emit('change', { added: { element: item } });
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('fehlgeschlagen');
        expect(item.list).toBe(100);
    });
});
