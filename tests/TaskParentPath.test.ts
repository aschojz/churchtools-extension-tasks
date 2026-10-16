import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import TaskParentPath from '../src/components/TaskParentPath.vue';
import { taskDraft } from '../src/domain/tasks';

const mocks = vi.hoisted(() => ({ push: vi.fn(), bulk: false }));
vi.mock('vue-router', () => ({
    useRouter: () => ({ currentRoute: ref({ name: 'my-tasks', params: { projectId: '17' } }), push: mocks.push }),
}));
vi.mock('../src/composables/useTaskSelection', () => ({
    useTaskSelection: () => ({ enabled: ref(mocks.bulk) }),
}));
const parent = (id: number, name: string): TransformedTask => ({
    ...taskDraft({ name }),
    id,
    dataCategoryId: 17,
});
const props = {
    taskId: 3,
    projectId: 17,
    parentByChild: { 3: parent(2, 'Direkte Oberaufgabe'), 2: parent(1, 'Projektziel') },
};
beforeEach(() => {
    mocks.push.mockReset();
    mocks.bulk = false;
});

describe('parent task navigation', () => {
    it('keeps the card path compact while retaining accessible parent navigation', () => {
        const wrapper = mount(TaskParentPath, { props: { ...props, compact: true } });
        expect(wrapper.classes()).toContain('task-parent-compact');
        expect(wrapper.get('.task-parent-label').text()).toBe('');
        expect(wrapper.get('button').attributes('aria-label')).toBe('Oberaufgabe öffnen: Projektziel');
    });
    it('opens each ancestor in the same project and view, without activating the child card', async () => {
        const cardClick = vi.fn();
        const wrapper = mount(TaskParentPath, { props, attrs: { onClick: cardClick } });
        expect(wrapper.text()).toContain('Oberaufgabe');
        const buttons = wrapper.findAll('button');
        expect(buttons.map(button => button.text())).toEqual(['Projektziel', 'Direkte Oberaufgabe']);
        await buttons[1].trigger('click');
        expect(mocks.push).toHaveBeenLastCalledWith({ name: 'my-tasks', params: { projectId: 17, taskId: 2 } });
        await buttons[0].trigger('click');
        expect(mocks.push).toHaveBeenLastCalledWith({ name: 'my-tasks', params: { projectId: 17, taskId: 1 } });
        expect(cardClick).not.toHaveBeenCalled();
    });
    it('keeps the context readable but lets the card select in bulk mode', async () => {
        mocks.bulk = true;
        const cardClick = vi.fn();
        const wrapper = mount(TaskParentPath, { props, attrs: { onClick: cardClick } });
        expect(wrapper.findAll('button')).toHaveLength(0);
        await wrapper.get('.task-parent-name').trigger('click');
        expect(cardClick).toHaveBeenCalledOnce();
        expect(mocks.push).not.toHaveBeenCalled();
    });
    it('does not show a parent section for a top-level task', () => {
        const wrapper = mount(TaskParentPath, { props: { ...props, taskId: 1 } });
        expect(wrapper.find('.task-parent-path').exists()).toBe(false);
    });
});
