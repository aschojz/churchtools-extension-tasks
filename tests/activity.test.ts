import { describe, expect, it } from 'vitest';
import { formatActivityChanges } from '../src/domain/activity';

describe('activity formatting', () => {
    it('uses German field and value labels', () => {
        expect(
            formatActivityChanges({
                name: { from: 'Alt', to: 'Neu' },
                fullfilled: { from: false, to: true },
                assignedTo: { from: [], to: [12, 15] },
            }),
        ).toBe('Titel: Alt → Neu, Erledigt: Nein → Ja, Verantwortliche: leer → 12, 15');
    });

    it('formats missing values without exposing JavaScript terms', () => {
        expect(formatActivityChanges(undefined)).toBe('leer');
        expect(formatActivityChanges({ description: { from: null, to: '' } })).toBe('Beschreibung: leer → leer');
    });

    it('formats serialized additions and removals of recurrence settings', () => {
        const changes = JSON.parse(
            JSON.stringify({
                recurrence: { from: undefined, to: { frequency: 'daily', interval: 2 } },
                revision: { from: 1, to: 2 },
                schemaVersion: { from: undefined, to: 1 },
                updatedAt: { from: undefined, to: '2026-10-08T20:00:00Z' },
            }),
        );
        expect(formatActivityChanges(changes)).toBe('Wiederholung: leer → Alle 2 Tage');
        expect(formatActivityChanges({ recurrence: { from: { frequency: 'weekly', interval: 1 } } })).toBe(
            'Wiederholung: Wöchentlich → leer',
        );
        expect(formatActivityChanges({ revision: { from: 1, to: 2 } })).toBe('');
    });

    it('shows readable values for nested legacy changes and priorities', () => {
        expect(formatActivityChanges({ recurrence: { frequency: 'monthly', interval: 1 } })).toBe(
            'Wiederholung: Monatlich',
        );
        expect(formatActivityChanges({ custom: { nested: { enabled: true } } })).toBe('custom: nested: enabled: Ja');
        expect(formatActivityChanges({ priority: { from: 'none', to: 'high' } })).toBe(
            'Priorität: Keine Priorität → Hoch',
        );
    });
});
