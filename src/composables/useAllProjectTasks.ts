import { useQueries } from '@tanstack/vue-query';
import { computed } from 'vue';
import { ccmKeys, fetchCustomModuleDataValues } from '../data/ccm';
import { queryClient } from '../data/queryClient';
import { taskDueDate } from '../domain/tasks';
import useProjects from '../project/useProjects';
import { usePlugin } from './usePlugin';

export type ProjectTask = {
    project: Project;
    task: TransformedTask;
    dueDate?: Date;
};

export function useAllProjectTasks() {
    const { moduleId } = usePlugin();
    const { projects, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
    const taskQueries = useQueries(
        {
            queries: () =>
                projects.value.map(project => ({
                    queryKey: ccmKeys.values(moduleId.value, project.id),
                    enabled: !!moduleId.value,
                    queryFn: () => fetchCustomModuleDataValues<Task>(moduleId.value!, project.id),
                })),
        },
        queryClient,
    );

    const tasks = computed<ProjectTask[]>(() =>
        projects.value.flatMap((project, index) => {
            const projectTasks = (taskQueries.value[index]?.data ?? []).filter(
                (value): value is TransformedTask => value.type === 'task',
            );
            const taskMap = Object.fromEntries(projectTasks.map(task => [task.id, task]));
            const findParent = (task: TransformedTask) =>
                Object.values(taskMap).find(candidate => candidate.subTasks?.includes(task.id));
            return projectTasks.map(task => ({ project, task, dueDate: taskDueDate(task, findParent) }));
        }),
    );
    const isLoading = computed(() => projectsLoading.value || taskQueries.value.some(query => query.isPending));
    const isError = computed(() => projectsError.value || taskQueries.value.some(query => query.isError));
    const refetch = async () => {
        await refetchProjects();
        await Promise.all(taskQueries.value.map(query => query.refetch()));
    };

    return { tasks, isLoading, isError, refetch };
}
