import { computed, inject, provide, type ComputedRef, type InjectionKey, type MaybeRefOrGetter } from 'vue';
import { taskProgress } from '../domain/tasks';
import { CtColor, notNullish, personDisplay, type PersonDisplay } from '../platform';
import { usePersonsQueryAllPages } from './usePersons';
import { useTags } from './useTags';
import { useTasks } from './useTasks';

export type ProjectTaskContext = {
    tasksMap: ComputedRef<Record<number, TransformedTask>>;
    parentByChild: ComputedRef<Record<number, TransformedTask>>;
    tags: ComputedRef<Record<number, TransformedTag>>;
    people: ComputedRef<Record<number, PersonDisplay>>;
    calculateDueDate: (task: TransformedTask | undefined) => Date | undefined;
    createTask: ReturnType<typeof useTasks>['createTask'];
    updateTask: ReturnType<typeof useTasks>['updateTask'];
    deleteTask: ReturnType<typeof useTasks>['deleteTask'];
    archiveTaskTree: ReturnType<typeof useTasks>['archiveTaskTree'];
    archiveCompletedTaskTree: ReturnType<typeof useTasks>['archiveCompletedTaskTree'];
    toggleTask: ReturnType<typeof useTasks>['toggleTask'];
    getSuperParent: (task: TransformedTask | undefined) => TransformedTask | undefined;
    getProgress: (task: TransformedTask | undefined) => number;
    dueColor: (dueDate: Date | undefined) => CtColor;
};

const projectTaskContextKey: InjectionKey<ProjectTaskContext> = Symbol('project-task-context');

export function provideProjectTaskContext(projectId: MaybeRefOrGetter<number>) {
    const taskData = useTasks(projectId);
    const { tags } = useTags(projectId);
    const assignedPersonIds = computed(() => [
        ...new Set(taskData.tasks.value.flatMap(task => (Array.isArray(task.assignedTo) ? task.assignedTo : []))),
    ]);
    const { data: persons } = usePersonsQueryAllPages(computed(() => ({ ids: assignedPersonIds.value })));
    const people = computed(() =>
        Object.fromEntries((persons.value ?? []).map(person => [person.id, personDisplay(person)])),
    );
    const dueColor = (dueDate: Date | undefined) => {
        if (!dueDate) return CtColor.BASIC;
        const day = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (day < today) return CtColor.RED;
        return day.getTime() - today.getTime() < 24 * 60 * 60 * 1000 ? CtColor.GREEN : CtColor.BASIC;
    };
    const context: ProjectTaskContext = {
        tasksMap: taskData.tasksMap,
        parentByChild: taskData.parentByChild,
        tags,
        people,
        calculateDueDate: taskData.calculateDueDate,
        createTask: taskData.createTask,
        updateTask: taskData.updateTask,
        deleteTask: taskData.deleteTask,
        archiveTaskTree: taskData.archiveTaskTree,
        archiveCompletedTaskTree: taskData.archiveCompletedTaskTree,
        toggleTask: taskData.toggleTask,
        getSuperParent: taskData.getSuperParent,
        getProgress: task => taskProgress(task, taskData.tasksMap.value),
        dueColor,
    };
    provide(projectTaskContextKey, context);
    return context;
}

export function useProjectTaskContext() {
    const context = inject(projectTaskContextKey);
    if (!context) throw new Error('Aufgabenkarten benötigen einen Projektkontext.');
    return context;
}

export function taskAssignees(task: TransformedTask, people: Record<number, PersonDisplay>) {
    return (Array.isArray(task.assignedTo) ? task.assignedTo : []).map(id => people[id]).filter(notNullish);
}
