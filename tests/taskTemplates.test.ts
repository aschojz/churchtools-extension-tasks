import { beforeEach, describe, expect, it } from 'vitest';
import { parseTaskTemplateStorage, useTaskTemplates } from '../src/composables/useTaskTemplates';
import { taskDraft } from '../src/domain/tasks';

describe('personal task templates', () => {
    beforeEach(() => localStorage.clear());

    it('stores reusable fields without activity or task state', () => {
        const { templates, saveTemplate } = useTaskTemplates(91);
        saveTemplate(
            'Website',
            taskDraft({
                name: 'Website prüfen',
                description: 'Checkliste',
                priority: 'high',
                tags: [4],
                blockedBy: [8],
                activity: [{ personId: 1, date: '2026-10-04T00:00:00Z', type: 'create' }],
                fullfilled: true,
                deletedAt: '2026-10-04T00:00:00Z',
            }),
        );

        expect(templates()).toHaveLength(1);
        expect(templates()[0]?.task).toMatchObject({
            name: 'Website prüfen',
            description: 'Checkliste',
            priority: 'high',
            tags: [4],
            blockedBy: [8],
        });
        expect(templates()[0]?.task).not.toHaveProperty('activity');
        expect(templates()[0]?.task).not.toHaveProperty('fullfilled');
        expect(templates()[0]?.task).not.toHaveProperty('deletedAt');
    });

    it('isolates malformed local storage entries', () => {
        expect(
            parseTaskTemplateStorage({
                3: [
                    { id: 'valid', name: ' Sicher ', task: { priority: 'urgent', tags: [2, 'bad'], activity: [] } },
                    { id: 4, name: 'Invalid', task: {} },
                ],
                invalid: 'broken',
            }),
        ).toEqual({ 3: [{ id: 'valid', name: 'Sicher', task: { priority: 'urgent', tags: [2] } }] });
        expect(parseTaskTemplateStorage('broken')).toEqual({});
    });
});
