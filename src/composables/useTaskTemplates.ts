import { cloneDeep, pick } from 'lodash-es';
import { ref } from 'vue';

export type TaskTemplate = {
    id: string;
    name: string;
    task: Partial<Task>;
};

const STORAGE_KEY = 'extension-tasks:task-templates';
const loadTemplates = (): Record<number, TaskTemplate[]> => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value ? (JSON.parse(value) as Record<number, TaskTemplate[]>) : {};
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
