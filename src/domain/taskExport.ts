import { recurrenceLabel, taskDraft, taskPriority, taskStartDate } from './tasks';

type TaskExportContext = {
    dueDate: (task: TransformedTask) => Date | undefined;
    listName: (id: number | undefined) => string;
    personName: (id: number) => string;
    tagName: (id: number) => string;
};

const spreadsheetSafe = (value: unknown) => {
    const text = String(value ?? '');
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};
const cell = (value: unknown) => `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;

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
        recurrenceLabel(task.recurrence),
    ]);
    return ['Titel', 'Status', 'Priorität', 'Start', 'Fällig', 'Liste', 'Verantwortliche', 'Tags', 'Wiederholung']
        .map(cell)
        .join(';')
        .concat('\n', rows.map(row => row.map(cell).join(';')).join('\n'));
}

export type TaskImportContext = {
    listId: (name: string) => number | undefined;
    personId: (name: string) => number | undefined;
    tagId: (name: string) => number | undefined;
};

export type TaskImportIssue = { row: number; message: string };

const parseCsvRows = (source: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    const input = source.replace(/^\uFEFF/, '');
    for (let index = 0; index < input.length; index += 1) {
        const character = input[index];
        if (character === '"') {
            if (quoted && input[index + 1] === '"') {
                field += '"';
                index += 1;
            } else quoted = !quoted;
        } else if (character === ';' && !quoted) {
            row.push(field);
            field = '';
        } else if (character === '\n' && !quoted) {
            row.push(field.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            field = '';
        } else field += character;
    }
    if (quoted) throw new Error('Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.');
    if (field || row.length) {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
    }
    return rows;
};

const importedDate = (value: string) => {
    if (!value.trim()) return undefined;
    const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day))
        return undefined;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const importedRecurrence = (value: string): TaskRecurrence | undefined => {
    const normalized = value.trim().toLocaleLowerCase('de');
    if (!normalized) return undefined;
    if (normalized === 'täglich') return { frequency: 'daily', interval: 1 };
    if (normalized === 'wöchentlich') return { frequency: 'weekly', interval: 1 };
    if (normalized === 'monatlich') return { frequency: 'monthly', interval: 1 };
    const match = normalized.match(/^alle (\d+) (tage|wochen|monate)$/);
    if (!match) return undefined;
    const frequency = { tage: 'daily', wochen: 'weekly', monate: 'monthly' }[match[2]] as TaskRecurrence['frequency'];
    const interval = Number(match[1]);
    return interval >= 1 && interval <= 365 ? { frequency, interval } : undefined;
};

const splitNames = (value: string) =>
    value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);

export function tasksFromCsv(source: string, context: TaskImportContext) {
    const rows = parseCsvRows(source);
    if (!rows.length) throw new Error('Die CSV-Datei ist leer.');
    const headers = rows[0].map(header => header.trim());
    const column = (name: string) => headers.indexOf(name);
    if (column('Titel') < 0) throw new Error('Die Pflichtspalte „Titel“ fehlt.');
    const value = (row: string[], name: string) => (column(name) < 0 ? '' : (row[column(name)] ?? '').trim());
    const issues: TaskImportIssue[] = [];
    const tasks: Task[] = [];
    const priorityByLabel: Record<string, TaskPriority> = {
        keine: 'none',
        niedrig: 'low',
        mittel: 'medium',
        hoch: 'high',
        dringend: 'urgent',
    };
    rows.slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        const name = value(row, 'Titel');
        if (!name && row.every(entry => !entry.trim())) return;
        if (!name) {
            issues.push({ row: rowNumber, message: 'Zeile ohne Titel wurde übersprungen.' });
            return;
        }
        const status = value(row, 'Status').toLocaleLowerCase('de');
        const priorityText = value(row, 'Priorität').toLocaleLowerCase('de');
        const priority = priorityByLabel[priorityText] ?? 'none';
        if (priorityText && !priorityByLabel[priorityText])
            issues.push({
                row: rowNumber,
                message: `Unbekannte Priorität „${value(row, 'Priorität')}“ wurde ignoriert.`,
            });
        const startDate = importedDate(value(row, 'Start'));
        const dueDate = importedDate(value(row, 'Fällig'));
        if (value(row, 'Start') && !startDate)
            issues.push({ row: rowNumber, message: `Ungültiges Startdatum „${value(row, 'Start')}“ wurde ignoriert.` });
        if (value(row, 'Fällig') && !dueDate)
            issues.push({
                row: rowNumber,
                message: `Ungültiges Fälligkeitsdatum „${value(row, 'Fällig')}“ wurde ignoriert.`,
            });
        const listName = value(row, 'Liste');
        const list = listName ? context.listId(listName) : undefined;
        if (listName && !list) issues.push({ row: rowNumber, message: `Liste „${listName}“ wurde nicht gefunden.` });
        const assignedTo = splitNames(value(row, 'Verantwortliche'))
            .map(context.personId)
            .filter((id): id is number => id !== undefined);
        for (const person of splitNames(value(row, 'Verantwortliche')))
            if (!context.personId(person))
                issues.push({ row: rowNumber, message: `Person „${person}“ wurde nicht gefunden.` });
        const tags = splitNames(value(row, 'Tags'))
            .map(context.tagId)
            .filter((id): id is number => id !== undefined);
        for (const tag of splitNames(value(row, 'Tags')))
            if (!context.tagId(tag)) issues.push({ row: rowNumber, message: `Tag „${tag}“ wurde nicht gefunden.` });
        const recurrenceText = value(row, 'Wiederholung');
        const recurrence = importedRecurrence(recurrenceText);
        if (recurrenceText && !recurrence)
            issues.push({ row: rowNumber, message: `Wiederholung „${recurrenceText}“ wurde nicht erkannt.` });
        tasks.push(
            taskDraft({
                name,
                fullfilled: status === 'erledigt',
                priority,
                startDate,
                dueDate,
                list,
                assignedTo: assignedTo.length ? assignedTo : undefined,
                tags: tags.length ? tags : undefined,
                recurrence,
                sortKey: Date.now() + index,
            }),
        );
    });
    return { tasks, issues };
}
