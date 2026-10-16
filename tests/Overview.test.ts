import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { taskDraft } from '../src/domain/tasks';
import Overview from '../src/views/Overview.vue';

vi.mock('../src/platform', async original => ({
    ...(await original<typeof import('../src/platform')>()),
    useCurrentUser: () => ({ id: 7 }),
}));
vi.mock('../src/composables/usePlugin', () => ({ usePlugin: () => ({ moduleId: ref(1) }) }));
vi.mock('../src/composables/useTaskSelection', () => ({ useTaskSelection: () => undefined }));
vi.mock('../src/data/ccm', () => ({
    useCustomModuleDataCategoriesQuery: () => ({
        data: ref([{ id: 17, name: 'Projekt', shorty: 'project17' }]),
        isLoading: ref(false),
        isError: ref(false),
    }),
}));
vi.mock('../src/composables/useAllProjectTasks', () => ({
    useAllProjectTasks: () => ({
        tasks: ref([
            {
                project: { id: 17, name: 'Projekt' },
                task: { ...taskDraft({ name: 'Unteraufgabe', assignedTo: [7] }), id: 2, dataCategoryId: 17 },
                tags: [],
                parentByChild: { 2: { ...taskDraft({ name: 'Elternaufgabe' }), id: 1, dataCategoryId: 17 } },
            },
        ]),
        isLoading: ref(false),
        isError: ref(false),
    }),
}));

describe('overview task context', () => {
    it('keeps task, parent and project navigation distinct while the card surface opens the child', async () => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/', name: 'overview', component: { template: '<div />' } },
                { path: '/:projectId/board/:taskId?', name: 'project-board', component: { template: '<div />' } },
                { path: '/:projectId/my-tasks/:taskId?', name: 'my-tasks', component: { template: '<div />' } },
                { path: '/:projectId', name: 'project', component: { template: '<div />' } },
            ],
        });
        await router.push('/');
        await router.isReady();
        const wrapper = mount(Overview, {
            global: {
                plugins: [router],
                stubs: {
                    UIcon: true,
                    UBadge: true,
                    USeparator: true,
                    UButton: true,
                    UCard: true,
                },
            },
        });
        const card = wrapper.get('.overview-task-item');
        expect(card.element.tagName).toBe('DIV');
        expect(card.find('a a').exists()).toBe(false);
        expect(card.get('.overview-task-metadata .overview-project-label').text()).toBe('Projekt');
        expect(card.get('.task-parent-name').text()).toBe('Elternaufgabe');
        await card.get('.task-parent-name').trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.params.taskId).toBe('1');
        await card.get('.overview-project-label').trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.name).toBe('my-tasks');
        expect(router.currentRoute.value.params.taskId).toBeUndefined();
        await card.trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.name).toBe('project-board');
        expect(router.currentRoute.value.params.taskId).toBe('2');
        wrapper.unmount();
    });
});
