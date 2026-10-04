import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearOperationalErrors,
    operationalErrors,
    reportOperationalError,
} from '../src/application/operationalErrors';

describe('operational error reporting', () => {
    beforeEach(clearOperationalErrors);

    it('adds a matching error id without storing the potentially sensitive message', () => {
        const message = reportOperationalError('Aufgabe speichern', new Error('Geheimer Aufgabentitel'), 'Fehler');

        expect(message).toMatch(/^Geheimer Aufgabentitel \(Fehler-ID: ERR-[A-Z0-9-]+\)$/);
        expect(operationalErrors.value).toHaveLength(1);
        expect(operationalErrors.value[0]).toMatchObject({ context: 'Aufgabe speichern', kind: 'Error' });
        expect(JSON.stringify(operationalErrors.value)).not.toContain('Geheimer Aufgabentitel');
        expect(message).toContain(operationalErrors.value[0]!.id);
    });

    it('keeps only the ten most recent errors', () => {
        for (let index = 0; index < 12; index++) reportOperationalError(`Aktion ${index}`, null, 'Fehler');

        expect(operationalErrors.value).toHaveLength(10);
        expect(operationalErrors.value[0]?.context).toBe('Aktion 11');
        expect(operationalErrors.value.at(-1)?.context).toBe('Aktion 2');
    });
});
