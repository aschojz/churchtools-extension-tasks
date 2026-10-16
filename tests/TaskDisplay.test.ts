import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import TaskDisplay from '../src/components/taskDialog/TaskDisplay.vue';
import { taskDraft } from '../src/domain/tasks';

vi.mock('../src/composables/useTask', () => ({
    useTask: () => ({
        task: ref({ subTasks: [2, 3] }),
        sortedTags: ref([]),
        assignees: ref([]),
        dueDate: ref(undefined),
        dueColor: ref('neutral'),
        toDayMonth: vi.fn(),
    }),
}));
vi.mock('../src/composables/useTasks', () => ({
    useTasks: () => ({
        tasksMap: ref({
            2: { ...taskDraft({ name: 'Erledigte Unteraufgabe', fullfilled: true }), id: 2, dataCategoryId: 17 },
            3: { ...taskDraft({ name: 'Offene Unteraufgabe' }), id: 3, dataCategoryId: 17 },
        }),
        parentByChild: ref({}),
    }),
}));

describe('subtasks in the parent dialog', () => {
    it('omits redundant parent paths and toggles completed children without hiding open ones', async () => {
        const wrapper = mount(TaskDisplay, {
            props: { projectId: 17, taskId: 1 },
            global: {
                stubs: {
                    TaskParentPath: true,
                    Activities: true,
                    TaskItem: {
                        name: 'TaskItem',
                        props: { item: Object, showTask: Boolean },
                        template: '<div class="child">{{ item.name }}</div>',
                    },
                    UButton: { props: ['label'], template: '<button>{{ label }}</button>' },
                    UBadge: { props: ['label'], template: '<span>{{ label }}</span>' },
                    UInput: true,
                },
            },
        });
        const children = () => wrapper.findAllComponents({ name: 'TaskItem' });
        expect(children()).toHaveLength(2);
        expect(children().every(child => child.props('showTask') === true)).toBe(true);
        expect(wrapper.text()).toContain('1 / 2 erledigt');
        await wrapper.get('button').trigger('click');
        expect(wrapper.findAll('.child').map(child => child.text())).toEqual(['Offene Unteraufgabe']);
        expect(wrapper.get('button').text()).toBe('Erledigte anzeigen (1)');
        await wrapper.get('button').trigger('click');
        expect(wrapper.findAll('.child')).toHaveLength(2);
    });
});
