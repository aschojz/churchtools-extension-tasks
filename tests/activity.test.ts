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
});
