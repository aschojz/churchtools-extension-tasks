import { shallowMount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import DialogTask from '../src/components/taskDialog/DialogTask.vue';

const mocks = vi.hoisted(() => ({ toggle: vi.fn(), push: vi.fn(), update: vi.fn() }));
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mocks.push, currentRoute: ref({ name: 'project-board' }) }),
}));
vi.mock('@nuxt/ui/composables', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('../src/composables/useTask', () => ({
    useTask: () => ({ task: ref({ name: 'Task', fullfilled: false }), toggleTask: mocks.toggle }),
}));
vi.mock('../src/composables/useTasks', () => ({
    useTasks: () => ({ updateTask: mocks.update, getObjectDiff: () => ({}) }),
}));
vi.mock('../src/project/useProject', () => ({ useProject: () => ({ project: ref({ name: 'Project' }) }) }));
vi.mock('../src/application/operationalErrors', () => ({ reportOperationalError: () => 'Speichern fehlgeschlagen' }));

beforeEach(() => vi.resetAllMocks());

describe('task dialog completion', () => {
    it.each(['metaKey', 'ctrlKey'])('saves edits with %s+Enter without completing the task', async modifier => {
        const wrapper = shallowMount(DialogTask, { props: { projectId: 17, taskId: '125' } });
        const dialog = wrapper.vm as unknown as {
            isEdit: boolean;
            internTask: { type: string; name: string };
            onEditorShortcut: (event: KeyboardEvent) => void;
        };
        dialog.isEdit = true;
        dialog.internTask = { type: 'task', name: 'Edited' };
        const event = new KeyboardEvent('keydown', { key: 'Enter', [modifier]: true, cancelable: true });
        dialog.onEditorShortcut(event);
        expect(event.defaultPrevented).toBe(true);
        expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Edited' }), {});
        expect(mocks.toggle).not.toHaveBeenCalled();
        wrapper.unmount();
    });
    it('does not complete a task via the editor shortcut in display mode', () => {
        const wrapper = shallowMount(DialogTask, { props: { projectId: 17, taskId: '125' } });
        const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, cancelable: true });
        (wrapper.vm as unknown as { onEditorShortcut: (event: KeyboardEvent) => void }).onEditorShortcut(event);
        expect(event.defaultPrevented).toBe(false);
        expect(mocks.toggle).not.toHaveBeenCalled();
        wrapper.unmount();
    });
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
