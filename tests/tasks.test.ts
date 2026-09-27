import { describe, expect, it } from 'vitest';
import { descendantIds, reorderTasks, taskDiff, taskDraft, taskDueDate, taskProgress } from '../src/domain/tasks';

const task = (id: number, overrides: Partial<TransformedTask> = {}): TransformedTask => ({
    id,
    dataCategoryId: 1,
    ...taskDraft({ name: `Task ${id}`, sortKey: id * 10000 }),
    ...overrides,
});

describe('task integrity', () => {
    it('keeps edits and nested arrays separate from the cached task', () => {
        const source = task(1, { assignedTo: [2], activity: [{ personId: 1, date: '2026-09-27', type: 'create' }] });
        const draft = taskDraft(source);
        draft.name = 'Edited';
        draft.assignedTo!.push(3);
        draft.activity![0].personId = 9;
        expect(source.name).toBe('Task 1');
        expect(source.assignedTo).toEqual([2]);
        expect(source.activity![0].personId).toBe(1);
    });
    it('detects removal and false/zero changes without diffing the audit history', () => {
        expect(
            taskDiff({ name: 'Task', fullfilled: false, dueDateRelative: 0 }, {
                name: 'Task',
                fullfilled: true,
                dueDateRelative: 2,
                url: 'https://example.org',
                activity: [],
                id: 12,
                dataCategoryId: 4,
            } as TransformedTask),
        ).toEqual({
            fullfilled: { from: true, to: false },
            dueDateRelative: { from: 2, to: 0 },
            url: { from: 'https://example.org', to: undefined },
        });
    });
    it('handles zero-day offsets without changing the stored parent date', () => {
        const parent = task(1, { dueDate: '2026-03-30' });
        const child = task(2, { dueDateRelative: 0 });
        expect(taskDueDate(child, t => (t.id === 2 ? parent : undefined))).toEqual(new Date('2026-03-30T00:00:00'));
        expect(parent.dueDate).toBe('2026-03-30');
    });
    it('uses calendar days around daylight saving and guards cyclic dates', () => {
        const parent = task(1, { dueDate: '2026-03-30' });
        expect(taskDueDate(task(2, { dueDateRelative: 1 }), t => (t.id === 2 ? parent : undefined))?.getDate()).toBe(
            29,
        );
        const a = task(1, { dueDateRelative: 1 });
        const b = task(2, { dueDateRelative: 1 });
        expect(taskDueDate(a, t => (t.id === 1 ? b : a))).toBeUndefined();
    });
    it('ignores missing children and visits cyclic trees only once', () => {
        const a = task(1, { subTasks: [2, 99] });
        const b = task(2, { subTasks: [1], fullfilled: true });
        expect(descendantIds(a, { 1: a, 2: b })).toEqual([2, 1]);
        expect(taskProgress(a, { 1: a, 2: b })).toBe(100);
        expect(taskProgress(task(3), {})).toBe(0);
        expect(taskProgress(undefined, {})).toBe(0);
    });
    it('reorders explicitly without changing input or producing updates for unchanged items', () => {
        const a = task(1, { list: 10 }),
            b = task(2, { list: 10 });
        expect(reorderTasks([a, b], 10)).toEqual([]);
        expect(reorderTasks([b, a], 20).map(t => [t.id, t.list, t.sortKey])).toEqual([
            [2, 20, 10000],
            [1, 20, 20000],
        ]);
        expect(a.list).toBe(10);
        expect(b.sortKey).toBe(20000);
    });
});
