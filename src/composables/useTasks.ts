import Fuse from 'fuse.js';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useCustomModuleDataValuesMutations, useCustomModuleDataValuesQuery } from '../data/ccm';
import { taskDiff, taskDraft, taskDueDate, taskProgress } from '../domain/tasks';
import { useCurrentUser } from '../platform';
import { taskStore } from './storeTasks';
import { useLists } from './useLists';
import { usePlugin } from './usePlugin';

export function useTasks(projectId: MaybeRefOrGetter<number>) {
    const { moduleId } = usePlugin();
    const pId = computed(() => toValue(projectId));

    const currentUser = useCurrentUser();
    const { data, isLoading } = useCustomModuleDataValuesQuery<Task>(moduleId, pId);
    const { createCustomDataValue, updateCustomDataValue, deleteCustomDataValue } =
        useCustomModuleDataValuesMutations<Task>(moduleId, pId);

    const createTask = async (newTask: Task) => {
        if (!newTask.name?.trim()) throw new Error('Bitte einen Titel eingeben.');
        return await createCustomDataValue({
            ...taskDraft(newTask),
            name: newTask.name.trim(),
            activity: [{ personId: currentUser.id, date: new Date().toISOString(), type: 'create' }],
            dataCategoryId: pId.value,
            type: 'task',
        });
    };
    const updateTask = async (task: TransformedTask, diff?: ReturnType<typeof taskDiff>) => {
        if (!task.name?.trim()) throw new Error('Bitte einen Titel eingeben.');
        const activity = [...(Array.isArray(task.activity) ? task.activity : [])];
        if (diff && Object.keys(diff).length) {
            activity.push({ personId: currentUser.id, date: new Date().toISOString(), type: 'update', value: diff });
        }
        const payload = {
            ...taskDraft(task),
            id: task.id,
            revision: task.revision,
            updatedAt: task.updatedAt,
            activity,
            name: task.name.trim(),
            type: 'task' as const,
            dataCategoryId: task.dataCategoryId,
        };
        await updateCustomDataValue(payload);
    };
    const deleteTask = async (taskId: number, categoryId = pId.value) => {
        return await deleteCustomDataValue({
            id: taskId,
            dataCategoryId: categoryId,
            revision: tasksMap.value[taskId]?.revision,
        });
    };

    const store = taskStore();

    const getPercentFullfilled = (task: TransformedTask | undefined) => taskProgress(task, tasksMap.value);

    const tasks = computed<TransformedTask[]>(() => {
        const tasks: TransformedTask[] = (data.value ?? []).filter(
            (v: TransformedTask | TransformedList) => v.type === 'task',
        );
        return tasks;
    });
    const parentByChild = computed(() => {
        const result: Record<number, TransformedTask> = {};
        for (const parent of tasks.value) {
            for (const childId of Array.isArray(parent.subTasks) ? parent.subTasks : []) result[childId] ??= parent;
        }
        return result;
    });
    const transformedTasks = computed(() => {
        return tasks.value.map(task => ({
            ...task,
            parent: parentByChild.value[task.id]?.id,
            score: tasksInSearch.value[task.id]?.score,
        }));
    });
    const tasksMap = computed(() => Object.fromEntries(tasks.value.map(t => [t.id, t])));

    const getObjectDiff = taskDiff;

    const tasksInSearch = computed(() => {
        const search = store.searchForProject(pId.value);
        if (search) {
            const fuse = new Fuse(tasks.value, {
                includeScore: true,
                minMatchCharLength: 2,
                threshold: 0.4,
                keys: ['name', { name: 'description', weight: 0.5 }, { name: 'url', weight: 0.3 }],
            });
            return Object.fromEntries(
                fuse.search(search).map(task => [task.item.id, { ...task.item, score: task.score }]),
            );
        }
        return Object.fromEntries(tasks.value.map(task => [task.id, { ...task, score: undefined }]));
    });

    const { getListById, lists } = useLists(pId);
    const showTask = (task: TransformedTask) => {
        const defaultListId = lists.value.find(l => l.isDefault)?.id ?? 0;
        const listId = task.list && getListById(task.list) ? task.list : defaultListId;
        const list = getListById(listId);
        const preferences = list
            ? store.preferencesForList(pId.value, list)
            : { showCompleted: false, showSubTasks: false };
        const showCompleted = preferences.showCompleted;
        const showSubTasks = preferences.showSubTasks;
        const parent = findParent(task);
        return (
            tasksInSearch.value[task.id] &&
            ((!showCompleted && !task.fullfilled) || showCompleted) &&
            ((!showSubTasks && !parent) || showSubTasks)
        );
    };

    const findParent = (t: TransformedTask | undefined) => (t ? parentByChild.value[t.id] : undefined);
    const calculateDueDate = (t: TransformedTask | undefined) => taskDueDate(t, findParent);
    const getSuperParent = (t: TransformedTask | undefined): TransformedTask | undefined => {
        const visited = new Set<number>();
        while (t && !visited.has(t.id)) {
            visited.add(t.id);
            const parent = findParent(t);
            if (!parent) return t;
            t = parent;
        }
        return undefined;
    };
    return {
        projectId,
        tasksMap,
        parentByChild,
        tasks,
        showTask,
        createTask,
        updateTask,
        getObjectDiff,
        calculateDueDate,
        deleteTask,
        isLoading,
        findParent,
        getSuperParent,
        getPercentFullfilled,
        transformedTasks,
    };
}
