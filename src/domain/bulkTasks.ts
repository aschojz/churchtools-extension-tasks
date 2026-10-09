import type { TransformedTask } from './types';

export type BulkValuesMode = 'add' | 'remove' | 'replace';
export function changeTaskValues(
    task: TransformedTask,
    field: 'tags' | 'assignedTo',
    values: number[],
    mode: BulkValuesMode,
): TransformedTask {
    const current = task[field] ?? [];
    const next =
        mode === 'replace'
            ? values
            : mode === 'remove'
              ? current.filter(id => !values.includes(id))
              : [...current, ...values];
    return { ...task, [field]: [...new Set(next)] };
}
