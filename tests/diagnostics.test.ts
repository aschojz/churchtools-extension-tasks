import { describe, expect, it } from 'vitest';
import { createDiagnosticSnapshot } from '../src/domain/diagnostics';

describe('diagnostic snapshot', () => {
    it('contains operational metadata without entity contents or user data', () => {
        const snapshot = createDiagnosticSnapshot({
            version: '1.2.3',
            commit: 'abc1234',
            moduleId: 7,
            authentication: 'authenticated',
            dataIssues: [{ entity: 'value', id: 42, categoryId: 3, message: 'Ungültiger Wert' }],
            operationalErrors: [
                {
                    id: 'ERR-TEST-01',
                    occurredAt: '2026-10-04T10:00:00.000Z',
                    context: 'Aufgabe speichern',
                    kind: 'Error',
                },
            ],
            migrationCandidates: [{ entity: 'value', id: 43, categoryId: 3, fromVersion: 1, toVersion: 3 }],
        });

        expect(snapshot).toEqual({
            application: { version: '1.2.3', commit: 'abc1234', schemaVersion: 4 },
            runtime: { moduleId: 7, authentication: 'authenticated' },
            dataIssues: [{ entity: 'value', id: 42, categoryId: 3, message: 'Ungültiger Wert' }],
            operationalErrors: [
                {
                    id: 'ERR-TEST-01',
                    occurredAt: '2026-10-04T10:00:00.000Z',
                    context: 'Aufgabe speichern',
                    kind: 'Error',
                },
            ],
            migrationCandidates: [{ entity: 'value', id: 43, categoryId: 3, fromVersion: 1, toVersion: 3 }],
        });
        expect(JSON.stringify(snapshot)).not.toContain('firstName');
        expect(JSON.stringify(snapshot)).not.toContain('taskName');
    });
});
