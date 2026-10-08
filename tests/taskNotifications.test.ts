import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyTaskAssignees } from '../src/application/taskNotifications';
import { taskDraft } from '../src/domain/tasks';

const api = vi.hoisted(() => ({ oldApi: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: api }));
beforeEach(() => api.oldApi.mockReset());

describe('task assignment notifications', () => {
    it('sends a single escaped message to unique valid assignees with the task link', async () => {
        await notifyTaskAssignees(
            taskDraft({
                name: '<Neue Aufgabe>',
                description: 'Text & Details\nZweite Zeile',
                assignedTo: [1, 1, 2, -1],
                dueDate: '2026-10-12',
            }),
            'Team & Organisation',
            'https://demo.church.tools/ccm/tasks/17/board/42',
        );
        expect(api.oldApi).toHaveBeenCalledOnce();
        expect(api.oldApi).toHaveBeenCalledWith('churchhome/ajax', 'sendEMailToPersonIds', {
            ids: '1,2',
            betreff: 'Neue Aufgabe: <Neue Aufgabe>',
            attachments: '',
            inhalt: expect.stringContaining('&lt;Neue Aufgabe&gt;'),
        });
        const body = api.oldApi.mock.calls[0][2].inhalt;
        expect(body).toContain('Team &amp; Organisation');
        expect(body).toContain('Text &amp; Details<br>Zweite Zeile');
        expect(body).toContain('https://demo.church.tools/ccm/tasks/17/board/42');
    });

    it('does not send when no assignees are selected', async () => {
        await notifyTaskAssignees(taskDraft({ name: 'Aufgabe' }), 'Projekt', 'https://demo.church.tools');
        expect(api.oldApi).not.toHaveBeenCalled();
    });

    it('reports transport failure and refuses unsafe links', async () => {
        api.oldApi.mockRejectedValue(new Error('Versand gesperrt'));
        const task = taskDraft({ name: 'Aufgabe', assignedTo: [1] });
        await expect(notifyTaskAssignees(task, 'Projekt', 'https://demo.church.tools')).rejects.toThrow(
            'Versand gesperrt',
        );
        api.oldApi.mockReset();
        await expect(notifyTaskAssignees(task, 'Projekt', 'javascript:alert(1)')).rejects.toThrow('Aufgabenlink');
        expect(api.oldApi).not.toHaveBeenCalled();
    });
});
