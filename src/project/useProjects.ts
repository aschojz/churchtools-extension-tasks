import { useToast } from '@nuxt/ui/composables';
import { computed } from 'vue';
import { failWithCompensation } from '../application/compensation';
import { usePlugin } from '../composables/usePlugin';
import {
    useCustomModuleDataCategoriesQuery,
    useCustomModuleDataCategoryMutations,
    useCustomModuleDataValuesMutations,
} from '../data/ccm';
import { CURRENT_SCHEMA_VERSION } from '../domain/storedData';
import type { Project, TaskList } from '../domain/types';
import { CtColor, requireCurrentUser } from '../platform';
import { createProjectShorty, ICONS } from '../utils/utils';

export default function useProjects() {
    const { moduleId } = usePlugin();
    const toast = useToast();
    const { data: categories, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
    const { createDataCategory, updateDataCategory, deleteDataCategory } =
        useCustomModuleDataCategoryMutations<Project>(moduleId);

    const { createCustomDataValue } = useCustomModuleDataValuesMutations<TaskList>(moduleId, undefined);
    const projects = computed(() => (categories.value ?? []).filter(cat => cat.shorty?.startsWith('project')));

    const createProject = async (project: Project) => {
        requireCurrentUser();
        const id = moduleId.value;
        if (!id) throw new Error('Modul ist noch nicht geladen.');
        const created = await createDataCategory({
            schemaVersion: CURRENT_SCHEMA_VERSION,
            color: CtColor.BASIC,
            icon: ICONS.DEFAULT_PROJECT,
            ...project,
            description: project.description ?? '',
            shorty: createProjectShorty(),
            securityLevelId: 1,
            customModuleId: id,
        });
        try {
            await createCustomDataValue({
                type: 'list',
                name: 'Unsortiert',
                sortKey: 0,
                isDefault: true,
                dataCategoryId: created.id,
            });
        } catch (error) {
            await failWithCompensation('Projekt anlegen', error, [() => deleteDataCategory(created.id)]);
        }
        toast.add({ title: 'Projekt wurde erstellt.', color: 'success' });
    };
    const updateProject = async (project: Project) => {
        requireCurrentUser();
        await updateDataCategory({
            ...project,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            description: project.description ?? '',
        });
        toast.add({ title: 'Projekt wurde gespeichert.', color: 'success' });
    };

    const deleteProject = async (id: number) => {
        requireCurrentUser();
        const confirmed = window.confirm('Das Projekt und alle seine Aufgaben werden gelöscht.');
        if (confirmed) {
            const result = await deleteDataCategory(id);
            toast.add({ title: 'Projekt wurde gelöscht.', color: 'success' });
            void result;
            return true;
        }
        return false;
    };
    return {
        projects,
        isLoading,
        isError,
        refetch,
        createProject,
        updateProject,
        deleteProject,
    };
}
