import { describe, expect, it } from 'vitest';
import { tasksToCsv } from '../src/domain/taskExport';
import { taskDraft } from '../src/domain/tasks';

describe('task CSV export', () => {
    it('exports readable labels and escapes spreadsheet cells', () => {
        const task: TransformedTask = {
            ...taskDraft({
                name: 'Text; mit "Zitat"',
                priority: 'urgent',
                fullfilled: true,
                list: 2,
                assignedTo: [4],
                tags: [6],
            }),
            id: 1,
            dataCategoryId: 3,
        };
        const csv = tasksToCsv([task], {
            dueDate: () => new Date(2026, 9, 4),
            listName: () => 'Planung',
            personName: () => 'Alex Beispiel',
            tagName: () => 'Wichtig',
        });

        expect(csv).toContain('"Titel";"Status";"Priorität"');
        expect(csv).toContain('"Text; mit ""Zitat"""');
        expect(csv).toContain('"Erledigt";"Dringend";"4.10.2026";"Planung";"Alex Beispiel";"Wichtig"');
    });
});
