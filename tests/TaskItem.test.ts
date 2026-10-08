import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import TaskItem from '../src/components/TaskItem.vue';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({
    useRouter: () => ({ currentRoute: ref({ name: 'project-board', params: { projectId: '3' } }), push: mocks.push }),
}));
vi.mock('../src/composables/useProjectTaskContext', () => ({
    taskAssignees: () => [],
    useProjectTaskContext: () => ({
        tasksMap: ref({}),
        parentByChild: ref({}),
        tags: ref({}),
        people: ref([]),
        calculateDueDate: () => undefined,
        createTask: vi.fn(),
        deleteTask: vi.fn(),
        archiveTaskTree: vi.fn(),
        toggleTask: vi.fn(),
        getSuperParent: vi.fn(),
        getProgress: () => 0,
        dueColor: () => 'neutral',
    }),
}));

const ButtonStub = defineComponent({
    inheritAttrs: false,
    props: ['ariaLabel', 'label'],
    emits: ['click'],
    template:
        '<button v-bind="$attrs" :aria-label="ariaLabel" type="button" @click="$emit(\'click\', $event)">{{ label }}</button>',
});

const render = () =>
    mount(TaskItem, {
        props: {
            item: {
                id: 42,
                dataCategoryId: 3,
                type: 'task',
                name: 'Tastaturtest',
                fullfilled: false,
                sortKey: 100,
            } as TransformedTask,
            projectId: 3,
        },
        global: {
            stubs: {
                ProgressRing: true,
                UAvatar: true,
                UBadge: true,
                UButton: ButtonStub,
                UDropdownMenu: { template: '<div><slot /></div>' },
            },
        },
    });

beforeEach(() => mocks.push.mockReset());

describe('task card semantics', () => {
    it('opens through the card surface and the semantic title button', async () => {
        const wrapper = render();
        const card = wrapper.get('.task-item');
        expect(card.element.tagName).toBe('DIV');
        expect(card.classes()).toContain('cursor-pointer');

        await card.trigger('click');
        expect(mocks.push).toHaveBeenCalledOnce();
        mocks.push.mockReset();

        const title = wrapper.get('button.task-title-button');
        expect(title.text()).toBe('Tastaturtest');
        await title.trigger('click');
        expect(mocks.push).toHaveBeenCalledWith({
            name: 'project-board',
            params: { projectId: 3, taskId: 42 },
        });
    });

    it('does not open the task when its action controls are clicked', async () => {
        const wrapper = render();
        await wrapper.get('[aria-label="Aufgabenaktionen"]').trigger('click');
        await wrapper.get('[aria-label="Als erledigt markieren"]').trigger('click');
        expect(mocks.push).not.toHaveBeenCalled();
        expect(wrapper.get('[aria-label="Aufgabenaktionen"]').classes()).not.toContain('absolute');
    });

    it('gives status and action controls accessible names', () => {
        const wrapper = render();
        expect(wrapper.get('[aria-label="Als erledigt markieren"]').element.tagName).toBe('BUTTON');
        expect(wrapper.get('[aria-label="Aufgabenaktionen"]').element.tagName).toBe('BUTTON');
    });
});
