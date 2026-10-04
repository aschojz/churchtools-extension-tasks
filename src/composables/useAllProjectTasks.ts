import { useQueries } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { ccmKeys, fetchCustomModuleDataValues } from '../data/ccm';
import { queryClient } from '../data/queryClient';
import { taskDueDate } from '../domain/tasks';
import type { Project, Task, TransformedTask } from '../domain/types';
import useProjects from '../project/useProjects';
import { usePlugin } from './usePlugin';

export type ProjectTask = {
    project: Project;
    task: TransformedTask;
    dueDate?: Date;
};

export function useAllProjectTasks(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
    const { moduleId } = usePlugin();
    const { projects, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
    const taskQueries = useQueries(
        {
            queries: () =>
                projects.value.map(project => ({
                    queryKey: ccmKeys.values(moduleId.value, project.id),
                    enabled: !!moduleId.value && (options.enabled === undefined || toValue(options.enabled)),
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
                Object.values(taskMap).find(
                    candidate => Array.isArray(candidate.subTasks) && candidate.subTasks.includes(task.id),
                );
            return projectTasks.map(task => ({ project, task, dueDate: taskDueDate(task, findParent) }));
        }),
    );
    const isEnabled = computed(() => options.enabled === undefined || toValue(options.enabled));
    const isLoading = computed(
        () => projectsLoading.value || (isEnabled.value && taskQueries.value.some(query => query.isPending)),
    );
    const isError = computed(() => projectsError.value || taskQueries.value.some(query => query.isError));
    const refetch = async () => {
        await refetchProjects();
        await Promise.all(taskQueries.value.map(query => query.refetch()));
    };

    return { tasks, isLoading, isError, refetch };
}
