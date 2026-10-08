import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Task } from '../domain/types';

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );

export async function notifyTaskAssignees(task: Task, projectName: string, taskUrl: string) {
    const ids = [...new Set((task.assignedTo ?? []).filter(id => Number.isSafeInteger(id) && id > 0))];
    if (!ids.length) return;
    const url = new URL(taskUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Ungültiger Aufgabenlink.');
    const content = [
        '<p>Dir wurde eine neue Aufgabe zugewiesen.</p>',
        `<p><strong>${escapeHtml(task.name)}</strong><br>Projekt: ${escapeHtml(projectName)}</p>`,
        task.description ? `<p>${escapeHtml(task.description).replace(/\n/g, '<br>')}</p>` : '',
        task.dueDate ? `<p>Fällig am: ${escapeHtml(task.dueDate)}</p>` : '',
        `<p><a href="${escapeHtml(url.href)}">Aufgabe in ChurchTools öffnen</a></p>`,
    ].join('');
    await churchtoolsClient.oldApi('churchhome/ajax', 'sendEMailToPersonIds', {
        ids: ids.join(','),
        betreff: `Neue Aufgabe: ${task.name}`,
        inhalt: content,
        attachments: '',
    });
}
