import { taskPriority, taskStartDate } from './tasks';

type TaskExportContext = {
    dueDate: (task: TransformedTask) => Date | undefined;
    listName: (id: number | undefined) => string;
    personName: (id: number) => string;
    tagName: (id: number) => string;
};

const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function tasksToCsv(tasks: TransformedTask[], context: TaskExportContext) {
    const rows = tasks.map(task => [
        task.name,
        task.fullfilled ? 'Erledigt' : 'Offen',
        taskPriority(task.priority).label,
        taskStartDate(task)?.toLocaleDateString('de-DE') ?? '',
        context.dueDate(task)?.toLocaleDateString('de-DE') ?? '',
        context.listName(task.list),
        (Array.isArray(task.assignedTo) ? task.assignedTo : []).map(context.personName).join(', '),
        (Array.isArray(task.tags) ? task.tags : []).map(context.tagName).join(', '),
    ]);
    return ['Titel', 'Status', 'Priorität', 'Start', 'Fällig', 'Liste', 'Verantwortliche', 'Tags']
        .map(cell)
        .join(';')
        .concat('\n', rows.map(row => row.map(cell).join(';')).join('\n'));
}
