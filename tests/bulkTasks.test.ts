import { describe, expect, it } from 'vitest';
import { changeTaskValues } from '../src/domain/bulkTasks';
import { taskDraft } from '../src/domain/tasks';

describe('bulk task values', () => {
    it('adds without duplicates, removes only selected values and replaces explicitly', () => {
        const task = {
            ...taskDraft({ name: 'Task', tags: [1, 2], assignedTo: [7, 8] }),
            id: 1,
            dataCategoryId: 17,
            external: { key: 'keep' },
        };
        expect(changeTaskValues(task, 'tags', [2, 3], 'add').tags).toEqual([1, 2, 3]);
        expect(changeTaskValues(task, 'tags', [2, 3], 'remove').tags).toEqual([1]);
        expect(changeTaskValues(task, 'assignedTo', [], 'replace').assignedTo).toEqual([]);
        expect(changeTaskValues(task, 'assignedTo', [9], 'replace')).toMatchObject({
            tags: [1, 2],
            assignedTo: [9],
            external: task.external,
        });
        expect(task.tags).toEqual([1, 2]);
        expect(task.assignedTo).toEqual([7, 8]);
    });
});
