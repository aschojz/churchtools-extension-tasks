import { describe, expect, it } from 'vitest';
import { tasksFromCsv, tasksToCsv } from '../src/domain/taskExport';
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

        expect(csv).toContain('"Titel";"Status";"Priorität";"Start";"Fällig"');
        expect(csv).toContain('"Text; mit ""Zitat"""');
        expect(csv).toContain('"Erledigt";"Dringend";"";"4.10.2026";"Planung";"Alex Beispiel";"Wichtig"');
    });

    it('protects exported cells from spreadsheet formulas', () => {
        const csv = tasksToCsv([{ ...taskDraft({ name: '=HYPERLINK("bad")' }), id: 1, dataCategoryId: 3 }], {
            dueDate: () => undefined,
            listName: () => '',
            personName: () => '',
            tagName: () => '',
        });
        expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    });

    it('imports the exported columns and reports unknown relations', () => {
        const csv = [
            '"Titel";"Status";"Priorität";"Start";"Fällig";"Liste";"Verantwortliche";"Tags";"Wiederholung"',
            '"Text; mit ""Zitat""";"Offen";"Hoch";"3.10.2026";"4.10.2026";"Planung";"Alex Beispiel, Niemand";"Wichtig";"Alle 2 Wochen"',
        ].join('\n');
        const result = tasksFromCsv(csv, {
            listId: name => (name === 'Planung' ? 2 : undefined),
            personId: name => (name === 'Alex Beispiel' ? 4 : undefined),
            tagId: name => (name === 'Wichtig' ? 6 : undefined),
        });
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0]).toMatchObject({
            name: 'Text; mit "Zitat"',
            priority: 'high',
            startDate: '2026-10-03',
            dueDate: '2026-10-04',
            list: 2,
            assignedTo: [4],
            tags: [6],
            recurrence: { frequency: 'weekly', interval: 2 },
        });
        expect(result.issues).toEqual([{ row: 2, message: 'Person „Niemand“ wurde nicht gefunden.' }]);
    });

    it('rejects malformed files and skips rows without a title', () => {
        expect(() =>
            tasksFromCsv('Status;Priorität\nOffen;Hoch', { listId: () => 1, personId: () => 1, tagId: () => 1 }),
        ).toThrow('Pflichtspalte');
        expect(
            tasksFromCsv('Titel;Status\n;Offen\nAufgabe;Erledigt', {
                listId: () => undefined,
                personId: () => undefined,
                tagId: () => undefined,
            }),
        ).toMatchObject({ tasks: [{ name: 'Aufgabe', fullfilled: true }], issues: [{ row: 2 }] });
    });
});
