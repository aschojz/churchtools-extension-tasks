const FIELD_LABELS: Record<string, string> = {
    name: 'Titel',
    description: 'Beschreibung',
    fullfilled: 'Erledigt',
    url: 'Link',
    dueDate: 'Fällig am',
    dueDateRelative: 'Tage vor der übergeordneten Aufgabe',
    list: 'Liste',
    tags: 'Tags',
    assignedTo: 'Verantwortliche',
    subTasks: 'Unteraufgaben',
    sortKey: 'Reihenfolge',
};

const displayValue = (value: unknown): string => {
    if (value === undefined || value === null || value === '') return 'leer';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.length ? value.map(displayValue).join(', ') : 'leer';
    return String(value);
};

export function formatActivityChanges(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return displayValue(value);
    return Object.entries(value)
        .map(([key, change]) => {
            const label = FIELD_LABELS[key] ?? key;
            if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
                return `${label}: ${displayValue(change.from)} → ${displayValue(change.to)}`;
            }
            return `${label}: ${displayValue(change)}`;
        })
        .join(', ');
}
