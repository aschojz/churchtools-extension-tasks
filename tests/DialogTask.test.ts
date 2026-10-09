import { shallowMount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import DialogTask from '../src/components/taskDialog/DialogTask.vue';

const mocks = vi.hoisted(() => ({ toggle: vi.fn(), push: vi.fn() }));
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mocks.push, currentRoute: ref({ name: 'project-board' }) }),
}));
vi.mock('@nuxt/ui/composables', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('../src/composables/useTask', () => ({
    useTask: () => ({ task: ref({ name: 'Task', fullfilled: false }), toggleTask: mocks.toggle }),
}));
vi.mock('../src/composables/useTasks', () => ({ useTasks: () => ({}) }));
vi.mock('../src/project/useProject', () => ({ useProject: () => ({ project: ref({ name: 'Project' }) }) }));
vi.mock('../src/application/operationalErrors', () => ({ reportOperationalError: () => 'Speichern fehlgeschlagen' }));

beforeEach(() => vi.resetAllMocks());

describe('task dialog completion', () => {
    it('closes only after completion succeeds', async () => {
        let finish!: () => void;
        mocks.toggle.mockImplementation(
            () =>
                new Promise<void>(resolve => {
                    finish = resolve;
                }),
        );
        const wrapper = shallowMount(DialogTask, { props: { projectId: 17, taskId: '125' } });
        const saving = (wrapper.vm as unknown as { onSave: () => Promise<void> }).onSave();
        expect(mocks.push).not.toHaveBeenCalled();
        finish();
        await saving;
        expect(mocks.push).toHaveBeenCalledWith({ name: 'project-board', params: { projectId: 17 } });
        wrapper.unmount();
    });
    it('keeps the dialog open when completion fails', async () => {
        mocks.toggle.mockRejectedValue(new Error('Blocked'));
        const wrapper = shallowMount(DialogTask, { props: { projectId: 17, taskId: '125' } });
        await (wrapper.vm as unknown as { onSave: () => Promise<void> }).onSave();
        expect(mocks.push).not.toHaveBeenCalled();
        expect((wrapper.vm as unknown as { saveError: string }).saveError).toBe('Speichern fehlgeschlagen');
        wrapper.unmount();
    });
});
