import { cloneDeep, isEqual, omit } from 'lodash-es';
import type { TaskSort } from '../composables/storeTasks';
import type {
    ActivityEntry,
    Task,
    TaskPriority,
    TaskRecurrence,
    TaskRecurrenceFrequency,
    TransformedTask,
} from './types';

export const TASK_PRIORITIES: Array<{
    id: TaskPriority;
    label: string;
    icon: string;
    color: 'neutral' | 'info' | 'warning' | 'error';
    weight: number;
}> = [
    { id: 'none', label: 'Keine Priorität', icon: 'i-lucide-minus', color: 'neutral', weight: 0 },
    { id: 'low', label: 'Niedrig', icon: 'i-lucide-chevrons-down', color: 'info', weight: 1 },
    { id: 'medium', label: 'Mittel', icon: 'i-lucide-equal', color: 'warning', weight: 2 },
    { id: 'high', label: 'Hoch', icon: 'i-lucide-chevrons-up', color: 'warning', weight: 3 },
    { id: 'urgent', label: 'Dringend', icon: 'i-lucide-siren', color: 'error', weight: 4 },
];

export const taskPriority = (priority: TaskPriority | undefined) =>
    TASK_PRIORITIES.find(option => option.id === priority) ?? TASK_PRIORITIES[0];

export const TASK_RECURRENCES: Array<{ id: TaskRecurrenceFrequency; label: string }> = [
    { id: 'daily', label: 'Täglich' },
    { id: 'weekly', label: 'Wöchentlich' },
    { id: 'monthly', label: 'Monatlich' },
];

export function recurrenceLabel(recurrence: TaskRecurrence | undefined) {
    if (!recurrence) return '';
    if (recurrence.interval === 1)
        return TASK_RECURRENCES.find(option => option.id === recurrence.frequency)?.label ?? 'Wiederkehrend';
    const unit = { daily: 'Tage', weekly: 'Wochen', monthly: 'Monate' }[recurrence.frequency];
    return `Alle ${recurrence.interval} ${unit}`;
}

export function sortTasks(
    tasks: TransformedTask[],
    sort: TaskSort,
    dueDate: (task: TransformedTask) => Date | undefined = () => undefined,
) {
    return [...tasks].sort((left, right) => {
        if (sort === 'manual') return left.sortKey - right.sortKey;
        if (sort === 'name') return left.name.localeCompare(right.name, 'de');
        if (sort === 'priority') return taskPriority(right.priority).weight - taskPriority(left.priority).weight;
        if (sort === 'updatedAt') return Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '');
        const leftDate = dueDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate = dueDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
    });
}

export function normalizeTaskUrl(value: string | undefined): string | undefined {
    const input = value?.trim();
    if (!input) return undefined;
    let url: URL;
    try {
        url = new URL(input);
    } catch {
        throw new Error('Der Link ist ungültig. Bitte eine vollständige http- oder https-Adresse eingeben.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
        throw new Error('Der Link muss mit http:// oder https:// beginnen.');
    return url.toString();
}

export function appendComment(
    activities: ActivityEntry[],
    value: string,
    personId: number,
    date = new Date(),
): ActivityEntry[] {
    const comment = value.trim();
    if (!comment) throw new Error('Bitte einen Kommentar eingeben.');
    if (!Number.isSafeInteger(personId) || personId <= 0) throw new Error('Der aktuelle Benutzer ist nicht verfügbar.');
    return [...activities, { personId, date: date.toISOString(), type: 'comment', value: comment }];
}

export function taskDraft(task: Partial<Task> = {}): Task {
    const draft: Task = cloneDeep({
        type: 'task',
        name: '',
        fullfilled: false,
        priority: 'none',
        sortKey: Date.now(),
        ...omit(task, ['id', 'dataCategoryId', 'schemaVersion', 'revision', 'updatedAt', 'parent', 'score']),
    });
    if (!Array.isArray(draft.activity)) draft.activity = undefined;
    if (!Array.isArray(draft.assignedTo)) draft.assignedTo = undefined;
    if (!Array.isArray(draft.subTasks)) draft.subTasks = undefined;
    if (!Array.isArray(draft.blockedBy)) draft.blockedBy = undefined;
    if (!Array.isArray(draft.tags)) draft.tags = undefined;
    return draft;
}

const shiftDate = (value: string | undefined, recurrence: TaskRecurrence) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    const date = new Date(year, month - 1, day);
    if (recurrence.frequency === 'daily') date.setDate(date.getDate() + recurrence.interval);
    if (recurrence.frequency === 'weekly') date.setDate(date.getDate() + recurrence.interval * 7);
    if (recurrence.frequency === 'monthly') {
        const target = new Date(year, month - 1 + recurrence.interval, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(day, lastDay));
        date.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function nextRecurringTask(task: TransformedTask): Task | undefined {
    if (!task.recurrence) return undefined;
    return taskDraft({
        ...task,
        fullfilled: false,
        dueDate: shiftDate(task.dueDate, task.recurrence),
        startDate: shiftDate(task.startDate, task.recurrence),
        activity: undefined,
        subTasks: undefined,
        blockedBy: undefined,
        deletedAt: undefined,
        deletedBy: undefined,
        archivedAt: undefined,
        archivedBy: undefined,
        sortKey: Date.now(),
    });
}

export function incompleteTaskBlockers(task: TransformedTask, tasks: Record<number, TransformedTask>) {
    return (Array.isArray(task.blockedBy) ? task.blockedBy : [])
        .map(id => tasks[id])
        .filter((blocker): blocker is TransformedTask => !!blocker && !blocker.fullfilled);
}

export function assertTaskCanComplete(task: TransformedTask, tasks: Record<number, TransformedTask>) {
    const blockers = incompleteTaskBlockers(task, tasks);
    if (blockers.length)
        throw new Error(
            `Diese Aufgabe ist noch durch ${blockers.length} offene ${blockers.length === 1 ? 'Aufgabe' : 'Aufgaben'} blockiert.`,
        );
}

export function assertTaskDependenciesValid(task: TransformedTask, tasks: Record<number, TransformedTask>) {
    const reachesTask = (taskId: number, visited = new Set<number>()): boolean => {
        if (taskId === task.id) return true;
        if (visited.has(taskId)) return false;
        visited.add(taskId);
        const candidate = tasks[taskId];
        return (Array.isArray(candidate?.blockedBy) ? candidate.blockedBy : []).some(id => reachesTask(id, visited));
    };
    if ((Array.isArray(task.blockedBy) ? task.blockedBy : []).some(id => reachesTask(id)))
        throw new Error('Aufgabenabhängigkeiten dürfen keinen Kreis bilden.');
}
export const TASK_TECHNICAL_FIELDS = new Set([
    'activity',
    'id',
    'dataCategoryId',
    'schemaVersion',
    'revision',
    'updatedAt',
]);

export function taskDiff(next: Partial<Task>, previous: Partial<Task>) {
    const result: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of new Set([...Object.keys(next), ...Object.keys(previous)])) {
        if (TASK_TECHNICAL_FIELDS.has(key)) continue;
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
export function taskStartDate(task: TransformedTask | undefined): Date | undefined {
    const date = task?.startDate ? new Date(`${task.startDate.slice(0, 10)}T00:00:00`) : undefined;
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

export function isDueWithinDays(dueDate: Date | undefined, days: number, now = new Date()) {
    if (!dueDate || !Number.isFinite(dueDate.getTime())) return false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).getTime();
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    return due >= today && due <= limit;
}
