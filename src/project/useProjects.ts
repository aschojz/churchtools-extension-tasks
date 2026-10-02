import { computed } from 'vue';
import { usePlugin } from '../composables/usePlugin';
import {
    useCustomModuleDataCategoriesQuery,
    useCustomModuleDataCategoryMutations,
    useCustomModuleDataValuesMutations,
} from '../data/ccm';
import { CtColor } from '../platform';
import { confirmDelete, showToast } from '../ui/state';
import { createProjectShorty, ICONS, txx } from '../utils/utils';

export default function useProjects() {
    const { moduleId } = usePlugin();
    const { data: categories, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
    const { createDataCategory, updateDataCategory, deleteDataCategory } =
        useCustomModuleDataCategoryMutations<Project>(moduleId);

    const { createCustomDataValue } = useCustomModuleDataValuesMutations<TaskList>(moduleId, undefined);
    const projects = computed(() => (categories.value ?? []).filter(cat => cat.shorty?.startsWith('project')));

    const createProject = async (project: Project) => {
        const id = moduleId.value;
        if (!id) throw new Error('Modul ist noch nicht geladen.');
        const created = await createDataCategory({
            color: CtColor.BASIC,
            icon: ICONS.DEFAULT_PROJECT,
            ...project,
            description: project.description ?? '',
            shorty: createProjectShorty(),
            securityLevelId: 1,
            customModuleId: id,
        });
        await createCustomDataValue({
            type: 'list',
            name: 'Unsortiert',
            sortKey: 0,
            isDefault: true,
            dataCategoryId: created.id,
        });
        showToast('Projekt wurde erstellt.');
    };
    const updateProject = async (project: Project) => {
        await updateDataCategory({ ...project, description: project.description ?? '' });
        showToast('Projekt wurde gespeichert.');
    };

    const deleteProject = async (id: number) => {
        const confirmed = await confirmDelete(txx('Das Projekt und alle seine Aufgaben werden gelöscht.'));
        if (confirmed) {
            const result = await deleteDataCategory(id);
            showToast('Projekt wurde gelöscht.');
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
