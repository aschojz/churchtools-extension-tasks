import { useQueries } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { ccmKeys, fetchCustomModuleDataValues } from '../data/ccm';
import { queryClient } from '../data/queryClient';
import { taskDueDate } from '../domain/tasks';
import type { Project, Tag, Task, TransformedTag, TransformedTask } from '../domain/types';
import useProjects from '../project/useProjects';
import { usePlugin } from './usePlugin';

export type ProjectTask = {
    project: Project;
    task: TransformedTask;
    dueDate?: Date;
    tags: TransformedTag[];
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
                    queryFn: () => fetchCustomModuleDataValues<Task | Tag>(moduleId.value!, project.id),
                })),
        },
        queryClient,
    );

    const tasks = computed<ProjectTask[]>(() =>
        projects.value.flatMap((project, index) => {
            const values = taskQueries.value[index]?.data ?? [];
            const tags = Object.fromEntries(
                values.filter((value): value is TransformedTag => value.type === 'tag').map(tag => [tag.id, tag]),
            );
            const projectTasks = values.filter((value): value is TransformedTask => value.type === 'task');
            const taskMap = Object.fromEntries(projectTasks.map(task => [task.id, task]));
            const findParent = (task: TransformedTask) =>
                Object.values(taskMap).find(
                    candidate => Array.isArray(candidate.subTasks) && candidate.subTasks.includes(task.id),
                );
            return projectTasks.map(task => ({
                project,
                task,
                dueDate: taskDueDate(task, findParent),
                tags: (Array.isArray(task.tags) ? task.tags : [])
                    .map(id => tags[id])
                    .filter((tag): tag is TransformedTag => !!tag)
                    .sort((a, b) => a.name.localeCompare(b.name, 'de')),
            }));
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
