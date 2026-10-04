import { ref } from 'vue';
import { colorKey, CtColor } from '../platform';
import { normalizeTaskUrl } from './tasks';

export const CURRENT_SCHEMA_VERSION = 2;

export type DataIssue = {
    entity: 'project' | 'value';
    id: number;
    categoryId?: number;
    message: string;
};

export const dataIssues = ref<DataIssue[]>([]);

const asRecord = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Gespeicherte Daten sind kein Objekt.');
    return value as Record<string, unknown>;
};
const requiredString = (value: unknown, field: string) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} fehlt oder ist ungültig.`);
    return value;
};
const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const optionalDate = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
};
const optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const optionalNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const storedRevision = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
const storedUpdatedAt = (value: unknown) =>
    typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
const positiveInteger = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
const numberArray = (value: unknown) =>
    Array.isArray(value)
        ? [...new Set(value.map(positiveInteger).filter((entry): entry is number => entry !== undefined))]
        : undefined;
const readSchemaVersion = (value: Record<string, unknown>) => {
    const version = value.schemaVersion ?? 0;
    if (!Number.isSafeInteger(version) || Number(version) < 0) throw new Error('Die Schemaversion ist ungültig.');
    if (Number(version) > CURRENT_SCHEMA_VERSION)
        throw new Error(`Schemaversion ${version} wird von dieser Extension noch nicht unterstützt.`);
    return Number(version);
};

export function migrateStoredData(value: unknown): Record<string, unknown> {
    let data = { ...asRecord(value) };
    let version = readSchemaVersion(data);
    while (version < CURRENT_SCHEMA_VERSION) {
        if (version === 0) {
            data = {
                ...data,
                ...(data.type === 'task' && typeof data.fullfilled !== 'boolean' && typeof data.fulfilled === 'boolean'
                    ? { fullfilled: data.fulfilled }
                    : {}),
                schemaVersion: 1,
            };
            version = 1;
            continue;
        }
        if (version === 1) {
            data = {
                ...data,
                ...(data.type === 'task' && !['none', 'low', 'medium', 'high', 'urgent'].includes(String(data.priority))
                    ? { priority: 'none' }
                    : {}),
                schemaVersion: 2,
            };
            version = 2;
            continue;
        }
        throw new Error(`Für Schemaversion ${version} ist keine Migration vorhanden.`);
    }
    return data;
}
const sortKey = (value: unknown, id: number) => optionalNumber(value) ?? id * 10_000;
const activityEntries = (value: unknown): ActivityEntry[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const allowedTypes = new Set<ActivityEntry['type']>(['create', 'fullfilled', 'comment', 'update']);
    return value.flatMap(entry => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        if (typeof item.type !== 'string' || !allowedTypes.has(item.type as ActivityEntry['type'])) return [];
        if (typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) return [];
        return [
            {
                personId: positiveInteger(item.personId) ?? 0,
                date: item.date,
                type: item.type as ActivityEntry['type'],
                ...(item.value === undefined ? {} : { value: item.value }),
            },
        ];
    });
};
const validColor = (value: unknown) => {
    const key = colorKey(value);
    return (Object.values(CtColor) as string[]).includes(key) ? (key as CtColor) : CtColor.BASIC;
};
const persistenceMetadata = (data: Record<string, unknown>) => ({
    revision: storedRevision(data.revision),
    ...(storedUpdatedAt(data.updatedAt) ? { updatedAt: storedUpdatedAt(data.updatedAt) } : {}),
});

export function parseStoredValue(value: unknown): TransformedTask | TransformedList | TransformedTag {
    const data = migrateStoredData(value);
    const id = positiveInteger(data.id);
    const dataCategoryId = positiveInteger(data.dataCategoryId);
    if (!id || !dataCategoryId) throw new Error('ID oder Projektzuordnung fehlt.');

    if (data.type === 'task') {
        const fullfilled = data.fullfilled === true;
        const priority = ['low', 'medium', 'high', 'urgent'].includes(String(data.priority))
            ? (data.priority as TaskPriority)
            : 'none';
        const description = optionalString(data.description);
        let url: string | undefined;
        try {
            url = normalizeTaskUrl(optionalString(data.url));
        } catch {
            url = undefined;
        }
        const dueDate = optionalDate(data.dueDate);
        const dueDateRelative = optionalNumber(data.dueDateRelative);
        const allDay = optionalBoolean(data.allDay);
        const activity = activityEntries(data.activity);
        const list = positiveInteger(data.list);
        const tags = numberArray(data.tags);
        const assignedTo = numberArray(data.assignedTo);
        const subTasks = numberArray(data.subTasks);
        const deletedAt = storedUpdatedAt(data.deletedAt);
        const deletedBy = positiveInteger(data.deletedBy);
        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            ...persistenceMetadata(data),
            type: 'task',
            id,
            dataCategoryId,
            name: requiredString(data.name, 'Aufgabentitel'),
            fullfilled,
            priority,
            sortKey: sortKey(data.sortKey, id),
            ...(description === undefined ? {} : { description }),
            ...(url === undefined ? {} : { url }),
            ...(dueDate === undefined ? {} : { dueDate }),
            ...(dueDateRelative === undefined ? {} : { dueDateRelative }),
            ...(allDay === undefined ? {} : { allDay }),
            ...(activity === undefined ? {} : { activity }),
            ...(list === undefined ? {} : { list }),
            ...(tags === undefined ? {} : { tags }),
            ...(assignedTo === undefined ? {} : { assignedTo }),
            ...(subTasks === undefined ? {} : { subTasks }),
            ...(deletedAt === undefined ? {} : { deletedAt }),
            ...(deletedBy === undefined ? {} : { deletedBy }),
        };
    }
    if (data.type === 'list') {
        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            ...persistenceMetadata(data),
            type: 'list',
            id,
            dataCategoryId,
            name: requiredString(data.name, 'Listenname'),
            sortKey: sortKey(data.sortKey, id),
            ...(optionalBoolean(data.isCollapsed) === undefined
                ? {}
                : { isCollapsed: optionalBoolean(data.isCollapsed) }),
            ...(optionalBoolean(data.showSubTasks) === undefined
                ? {}
                : { showSubTasks: optionalBoolean(data.showSubTasks) }),
            ...(optionalBoolean(data.showCompleted) === undefined
                ? {}
                : { showCompleted: optionalBoolean(data.showCompleted) }),
            ...(optionalBoolean(data.isDefault) === undefined ? {} : { isDefault: optionalBoolean(data.isDefault) }),
        };
    }
    if (data.type === 'tag') {
        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            ...persistenceMetadata(data),
            type: 'tag',
            id,
            dataCategoryId,
            name: requiredString(data.name, 'Tagname'),
            color: validColor(data.color),
            sortKey: sortKey(data.sortKey, id),
        };
    }
    throw new Error('Unbekannter Datentyp.');
}

export function parseStoredProject(value: unknown): Project {
    const data = migrateStoredData(value);
    const id = positiveInteger(data.id);
    const customModuleId = positiveInteger(data.customModuleId);
    if (!id || !customModuleId) throw new Error('Projekt-ID oder Modulzuordnung fehlt.');
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        ...persistenceMetadata(data),
        id,
        customModuleId,
        name: requiredString(data.name, 'Projektname'),
        shorty: requiredString(data.shorty, 'Projektkennung'),
        description: optionalString(data.description) ?? '',
        color: validColor(data.color),
        icon: optionalString(data.icon),
        securityLevelId: positiveInteger(data.securityLevelId) ?? 1,
    };
}

export function withCurrentSchemaVersion<T extends object>(value: T): T {
    const record = value as Record<string, unknown>;
    return record.type === 'task' || record.type === 'list' || record.type === 'tag'
        ? ({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION } as T)
        : value;
}

export function revisionOf(value: object): number {
    return storedRevision((value as Record<string, unknown>).revision);
}

export function withCreateMetadata<T extends object>(
    value: T,
): T & { schemaVersion: number; revision: number; updatedAt: string } {
    return {
        ...withCurrentSchemaVersion(value),
        schemaVersion: CURRENT_SCHEMA_VERSION,
        revision: 1,
        updatedAt: new Date().toISOString(),
    };
}

export function withUpdateMetadata<T extends object>(
    value: T,
    expectedRevision: number,
): T & { schemaVersion: number; revision: number; updatedAt: string } {
    return {
        ...withCurrentSchemaVersion(value),
        schemaVersion: CURRENT_SCHEMA_VERSION,
        revision: expectedRevision + 1,
        updatedAt: new Date().toISOString(),
    };
}

export function clearDataIssue(entity: DataIssue['entity'], id: number) {
    dataIssues.value = dataIssues.value.filter(issue => issue.entity !== entity || issue.id !== id);
}

export function clearDataIssuesForCategory(categoryId: number) {
    dataIssues.value = dataIssues.value.filter(issue => issue.entity !== 'value' || issue.categoryId !== categoryId);
}

export function clearProjectDataIssues() {
    dataIssues.value = dataIssues.value.filter(issue => issue.entity !== 'project');
}

export function recordDataIssue(issue: DataIssue) {
    clearDataIssue(issue.entity, issue.id);
    dataIssues.value = [...dataIssues.value, issue];
}
