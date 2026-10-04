import { cloneDeep, pick } from 'lodash-es';
import { ref } from 'vue';
import type { Task, TaskPriority } from '../domain/types';

export type TaskTemplate = {
    id: string;
    name: string;
    task: Partial<Task>;
};

const STORAGE_KEY = 'extension-tasks:task-templates';
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const positiveIds = (value: unknown) =>
    Array.isArray(value)
        ? value.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
        : undefined;
const sanitizeTask = (value: unknown): Partial<Task> => {
    if (!isRecord(value)) return {};
    const priority = ['none', 'low', 'medium', 'high', 'urgent'].includes(String(value.priority))
        ? (value.priority as TaskPriority)
        : undefined;
    return {
        ...(typeof value.name === 'string' ? { name: value.name } : {}),
        ...(typeof value.description === 'string' ? { description: value.description } : {}),
        ...(typeof value.url === 'string' ? { url: value.url } : {}),
        ...(priority ? { priority } : {}),
        ...(typeof value.list === 'number' && Number.isSafeInteger(value.list) && value.list > 0
            ? { list: value.list }
            : {}),
        ...(positiveIds(value.tags) ? { tags: positiveIds(value.tags) } : {}),
        ...(positiveIds(value.assignedTo) ? { assignedTo: positiveIds(value.assignedTo) } : {}),
        ...(positiveIds(value.blockedBy) ? { blockedBy: positiveIds(value.blockedBy) } : {}),
    };
};
export const parseTaskTemplateStorage = (value: unknown): Record<number, TaskTemplate[]> => {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).flatMap(([projectKey, entries]) => {
            const projectId = Number(projectKey);
            if (!Number.isSafeInteger(projectId) || projectId <= 0 || !Array.isArray(entries)) return [];
            const templates = entries.flatMap<TaskTemplate>(entry => {
                if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string') return [];
                const name = entry.name.trim();
                return name ? [{ id: entry.id, name, task: sanitizeTask(entry.task) }] : [];
            });
            return templates.length ? [[projectId, templates]] : [];
        }),
    );
};
const loadTemplates = (): Record<number, TaskTemplate[]> => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value ? parseTaskTemplateStorage(JSON.parse(value)) : {};
    } catch {
        return {};
    }
};
const templatesByProject = ref<Record<number, TaskTemplate[]>>(loadTemplates());
const persist = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templatesByProject.value));
    } catch {
        // Templates remain available for this session when storage is unavailable.
    }
};

export function useTaskTemplates(projectId: number) {
    const templates = () => templatesByProject.value[projectId] ?? [];
    const saveTemplate = (name: string, task: Task) => {
        const normalizedName = name.trim();
        if (!normalizedName) return;
        const existing = templates().find(template => template.name === normalizedName);
        const template: TaskTemplate = {
            id: existing?.id ?? `template-${Date.now().toString(36)}`,
            name: normalizedName,
            task: cloneDeep(
                pick(task, ['name', 'description', 'priority', 'url', 'list', 'tags', 'assignedTo', 'blockedBy']),
            ),
        };
        templatesByProject.value = {
            ...templatesByProject.value,
            [projectId]: [...templates().filter(item => item.id !== template.id), template],
        };
        persist();
        return template;
    };
    const removeTemplate = (templateId: string) => {
        templatesByProject.value = {
            ...templatesByProject.value,
            [projectId]: templates().filter(template => template.id !== templateId),
        };
        persist();
    };
    return { templates, saveTemplate, removeTemplate };
}
