import { cloneDeep, isEqual, pick } from 'lodash-es';

export function taskDraft(task: Partial<Task> = {}): Task {
    const draft: Task = cloneDeep({
        type: 'task',
        name: '',
        fullfilled: false,
        sortKey: Date.now(),
        ...pick(task, [
            'name',
            'description',
            'fullfilled',
            'sortKey',
            'url',
            'dueDate',
            'dueDateRelative',
            'allDay',
            'activity',
            'list',
            'tags',
            'assignedTo',
            'subTasks',
            'deletedAt',
            'deletedBy',
        ]),
    });
    if (!Array.isArray(draft.activity)) draft.activity = undefined;
    if (!Array.isArray(draft.assignedTo)) draft.assignedTo = undefined;
    if (!Array.isArray(draft.subTasks)) draft.subTasks = undefined;
    if (!Array.isArray(draft.tags)) draft.tags = undefined;
    return draft;
}
export function taskDiff(next: Partial<Task>, previous: Partial<Task>) {
    const result: Record<string, { from: unknown; to: unknown }> = {};
    const technicalFields = new Set(['activity', 'id', 'dataCategoryId']);
    for (const key of new Set([...Object.keys(next), ...Object.keys(previous)])) {
        if (technicalFields.has(key)) continue;
        const field = key as keyof Task;
        if (!isEqual(next[field], previous[field])) result[key] = { from: previous[field], to: next[field] };
    }
    return result;
}
export function taskProgress(task: TransformedTask | undefined, tasks: Record<number, TransformedTask>) {
    const childIds = Array.isArray(task?.subTasks) ? task.subTasks : [];
    const children = childIds.map(id => tasks[id]).filter(Boolean);
    return children.length ? Math.floor((100 * children.filter(t => t.fullfilled).length) / children.length) : 0;
}
export function taskDueDate(
    task: TransformedTask | undefined,
    findParent: (task: TransformedTask) => TransformedTask | undefined,
    visited = new Set<number>(),
): Date | undefined {
    if (!task || visited.has(task.id)) return;
    visited.add(task.id);
    if (task.dueDateRelative !== undefined && Number.isFinite(task.dueDateRelative)) {
        const parent = findParent(task);
        const parentDate = taskDueDate(parent, findParent, visited);
        if (parentDate) {
            const date = new Date(parentDate);
            date.setDate(date.getDate() - task.dueDateRelative);
            return date;
        }
    }
    const date = task.dueDate ? new Date(`${task.dueDate.slice(0, 10)}T00:00:00`) : undefined;
    return date && Number.isFinite(date.getTime()) ? date : undefined;
}
export function reorderTasks(items: TransformedTask[], listId: number) {
    return items
        .map((task, index) => ({ ...task, list: listId, sortKey: (index + 1) * 10000 }))
        .filter((task, index) => task.list !== items[index].list || task.sortKey !== items[index].sortKey);
}
export function descendantIds(
    task: TransformedTask,
    tasks: Record<number, TransformedTask>,
    visited = new Set<number>(),
): number[] {
    if (visited.has(task.id)) return [];
    visited.add(task.id);
    return [
        ...(Array.isArray(task.subTasks) ? task.subTasks : []).flatMap(id =>
            tasks[id] ? descendantIds(tasks[id], tasks, visited) : [],
        ),
        task.id,
    ];
}

export type DueDateBucket = 'overdue' | 'today' | 'upcoming' | 'none';

export function dueDateBucket(dueDate: Date | undefined, now = new Date()): DueDateBucket {
    if (!dueDate || !Number.isFinite(dueDate.getTime())) return 'none';
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    if (due < today) return 'overdue';
    if (due === today) return 'today';
    return 'upcoming';
}
