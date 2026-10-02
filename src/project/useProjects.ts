import { deleteConfirm } from '@churchtools/styleguide';
import { CtColor, t, useToasts } from '@churchtools/utils';
import { computed } from 'vue';
import { usePlugin } from '../composables/usePlugin';
import {
    useCustomModuleDataCategoriesQuery,
    useCustomModuleDataCategoryMutations,
    useCustomModuleDataValuesMutations,
} from '../data/ccm';
import { createProjectShorty, ICONS, txx } from '../utils/utils';

export default function useProjects() {
    const { moduleId } = usePlugin();
    const { successToast } = useToasts();
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
        successToast(t('actions.create.success'));
    };
    const updateProject = async (project: Project) => {
        await updateDataCategory({ ...project, description: project.description ?? '' });
        successToast(t('actions.save.success'));
    };

    const deleteProject = async (id: number) => {
        const confirmed = await deleteConfirm(txx('Das Projekt und alle seine Aufgaben werden gelöscht.'), {
            rejectOnCancel: false,
        });
        if (confirmed === 'ok') {
            const result = await deleteDataCategory(id);
            successToast(t('actions.delete.success'));
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
