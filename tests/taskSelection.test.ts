import { mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { provideTaskSelection } from '../src/composables/useTaskSelection';
import { taskDraft } from '../src/domain/tasks';
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('../src/composables/useProjectTaskContext', () => ({
    useProjectTaskContext: () => ({ updateTask: mocks.update }),
}));
vi.mock('../src/application/operationalErrors', () => ({
    reportOperationalError: (_context: string, error: Error) => error.message,
}));
beforeEach(() => vi.resetAllMocks());
it('rolls back completed changes when a later bulk update fails and keeps selection', async () => {
    const tasks = ref(
        [1, 2].map(id => ({
            ...taskDraft({ name: `Task ${id}`, tags: [3] }),
            id,
            dataCategoryId: 17,
            revision: 4,
            extra: 'keep',
        })),
    );
    let selection!: ReturnType<typeof provideTaskSelection>;
    const wrapper = mount(
        defineComponent({
            setup() {
                selection = provideTaskSelection(tasks);
                return () => null;
            },
        }),
    );
    selection.selectAll();
    mocks.update
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(undefined);
    await selection.batchUpdate(task => ({ ...task, tags: [9] }));
    expect(mocks.update).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ id: 1, tags: [3], revision: 5, extra: 'keep' }),
    );
    expect(selection.error.value).toContain('zurückgenommen');
    expect(selection.selectedTasks.value).toHaveLength(2);
    expect(selection.saving.value).toBe(false);
    wrapper.unmount();
});
