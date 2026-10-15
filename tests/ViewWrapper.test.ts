import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import ViewWrapper from '../src/project/views/ViewWrapper.vue';

const mocks = vi.hoisted(() => ({ route: 'project-board', select: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => ({ name: mocks.route, params: { projectId: '17' } }) }));
vi.mock('../src/project/useProject', () => ({
    useProject: () => ({ project: ref({ name: 'Projekt', icon: 'i-lucide-folder' }) }),
}));
vi.mock('../src/composables/useLists', () => ({ useLists: () => ({ lists: ref([]) }) }));
vi.mock('../src/composables/useTags', () => ({ useTags: () => ({ tagsArray: ref([]) }) }));
vi.mock('../src/composables/useProjectTaskContext', () => ({ useProjectTaskContext: () => ({ people: ref({}) }) }));
vi.mock('../src/composables/useTaskSelection', () => ({
    useTaskSelection: () => ({ enabled: ref(false), saving: ref(false), toggleMode: mocks.select }),
}));

type MenuAction = { label: string; onSelect?: () => void; children?: unknown[] };
type WrapperModel = { workspaceMenu: MenuAction[][]; listIsOpen: boolean; fullscreen: boolean };

beforeEach(() => {
    setActivePinia(createPinia());
    mocks.route = 'project-board';
    mocks.select.mockReset();
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
        },
    );
});

describe('project action menu', () => {
    it('keeps selection, list creation and fullscreen available after grouping the controls', () => {
        const wrapper = shallowMount(ViewWrapper, { props: { projectId: 17 } });
        const model = wrapper.vm as unknown as WrapperModel;
        const actions = model.workspaceMenu.flat();
        actions.find(action => action.label === 'Aufgaben auswählen')!.onSelect!();
        expect(mocks.select).toHaveBeenCalledOnce();
        actions.find(action => action.label === 'Liste erstellen')!.onSelect!();
        expect(model.listIsOpen).toBe(true);
        actions.find(action => action.label === 'Vollbild öffnen')!.onSelect!();
        expect(model.fullscreen).toBe(true);
        expect(model.workspaceMenu.flat().some(action => action.label === 'Vollbild verlassen')).toBe(true);
        wrapper.unmount();
    });
    it('keeps view-specific CSV actions and avoids unrelated list creation in insights', () => {
        mocks.route = 'project-insights';
        const csv = [{ label: 'CSV importieren' }, { label: 'CSV exportieren' }];
        const wrapper = shallowMount(ViewWrapper, {
            props: { projectId: 17, viewActions: [{ label: 'CSV', children: csv }] },
        });
        const model = wrapper.vm as unknown as WrapperModel;
        expect(model.workspaceMenu.flat().find(action => action.label === 'CSV')?.children).toEqual(csv);
        expect(model.workspaceMenu.flat().some(action => action.label === 'Liste erstellen')).toBe(false);
        wrapper.unmount();
    });
});
