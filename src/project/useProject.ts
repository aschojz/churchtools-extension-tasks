import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import useProjects from './useProjects';

export function useProject(projectId: MaybeRefOrGetter<number>) {
    const { projects, isLoading, isError, refetch, deleteProject: deleteP } = useProjects();

    const project = computed(() => projects.value.find(p => p.id === toValue(projectId)) ?? null);
    const deleteProject = () => deleteP(toValue(projectId));

    return { project, deleteProject, isLoading, isError, refetch };
}
