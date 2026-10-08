const FIELD_LABELS: Record<string, string> = {
    name: 'Titel',
    description: 'Beschreibung',
    fullfilled: 'Erledigt',
    priority: 'Priorität',
    url: 'Link',
    dueDate: 'Fällig am',
    startDate: 'Startet am',
    dueDateRelative: 'Tage vor der übergeordneten Aufgabe',
    recurrence: 'Wiederholung',
    list: 'Liste',
    tags: 'Tags',
    assignedTo: 'Verantwortliche',
    subTasks: 'Unteraufgaben',
    sortKey: 'Reihenfolge',
};

const displayValue = (value: unknown, field?: string): string => {
    if (value === undefined || value === null || value === '') return 'leer';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.length ? value.map(item => displayValue(item)).join(', ') : 'leer';
    if (field === 'priority' && typeof value === 'string') {
        const priority = taskPriority(value as Parameters<typeof taskPriority>[0]);
        if (priority.id === value) return priority.label;
    }
    if (typeof value === 'object') {
        if (field === 'recurrence' && 'frequency' in value && 'interval' in value) {
            const { frequency, interval } = value;
            if (
                (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') &&
                typeof interval === 'number'
            )
                return recurrenceLabel({ frequency, interval });
        }
        return (
            Object.entries(value)
                .map(([key, entry]) => `${FIELD_LABELS[key] ?? key}: ${displayValue(entry, key)}`)
                .join(', ') || 'leer'
        );
    }
    return String(value);
};

export function formatActivityChanges(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return displayValue(value);
    return Object.entries(value)
        .filter(([key]) => !TASK_TECHNICAL_FIELDS.has(key))
        .map(([key, change]) => {
            const label = FIELD_LABELS[key] ?? key;
            if (change && typeof change === 'object' && ('from' in change || 'to' in change)) {
                const diff = change as { from?: unknown; to?: unknown };
                return `${label}: ${displayValue(diff.from, key)} → ${displayValue(diff.to, key)}`;
            }
            return `${label}: ${displayValue(change, key)}`;
        })
        .join(', ');
}
import { recurrenceLabel, TASK_TECHNICAL_FIELDS, taskPriority } from './tasks';
