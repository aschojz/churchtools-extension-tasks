import { beforeEach, describe, expect, it } from 'vitest';
import {
    CURRENT_SCHEMA_VERSION,
    dataIssues,
    migrateStoredData,
    parseStoredProject,
    parseStoredValue,
    withCurrentSchemaVersion,
} from '../src/domain/storedData';

beforeEach(() => {
    dataIssues.value = [];
});

describe('stored data schemas and migrations', () => {
    it('migrates an unversioned legacy task and normalizes arrays', () => {
        expect(migrateStoredData({ type: 'task', fulfilled: true })).toMatchObject({
            schemaVersion: 1,
            fullfilled: true,
        });
        const migrated = parseStoredValue({
            id: 12,
            dataCategoryId: 3,
            type: 'task',
            name: 'Legacy',
            fulfilled: true,
            dueDate: '2026-02-31',
            tags: { id: 4 },
            assignedTo: [8, 8, 'invalid', -1],
            activity: [{ personId: 0, date: '2026-10-03T10:00:00Z', type: 'comment', value: 'Hallo' }],
        });
        expect(migrated).toMatchObject({
            schemaVersion: CURRENT_SCHEMA_VERSION,
            id: 12,
            dataCategoryId: 3,
            type: 'task',
            name: 'Legacy',
            fullfilled: true,
            assignedTo: [8],
            activity: [{ personId: 0, date: '2026-10-03T10:00:00Z', type: 'comment', value: 'Hallo' }],
        });
        expect(migrated).not.toHaveProperty('tags');
        expect(migrated).not.toHaveProperty('dueDate');
    });

    it('normalizes list, tag and project defaults', () => {
        const list = parseStoredValue({
            id: 4,
            dataCategoryId: 3,
            type: 'list',
            name: 'Offen',
            sortKey: 'invalid',
        });
        expect(list).toMatchObject({ schemaVersion: 1, sortKey: 40_000 });
        expect(list).not.toHaveProperty('showCompleted');
        expect(
            parseStoredValue({ id: 5, dataCategoryId: 3, type: 'tag', name: 'Wichtig', color: 'invalid' }),
        ).toMatchObject({ schemaVersion: 1, color: 'basic', sortKey: 50_000 });
        expect(parseStoredProject({ id: 3, customModuleId: 2, name: 'Projekt', shorty: 'project-3' })).toMatchObject({
            schemaVersion: 1,
            description: '',
            color: 'basic',
            securityLevelId: 1,
        });
    });

    it('normalizes persistence metadata on legacy and current values', () => {
        expect(
            parseStoredValue({
                id: 4,
                dataCategoryId: 2,
                type: 'task',
                name: 'Legacy',
                fullfilled: false,
                sortKey: 1,
            }),
        ).toMatchObject({ revision: 0 });
        expect(
            parseStoredValue({
                id: 5,
                dataCategoryId: 2,
                type: 'task',
                name: 'Current',
                fullfilled: false,
                sortKey: 1,
                deletedAt: '2026-10-03T10:00:00.000Z',
                deletedBy: 9,
                revision: 7,
                updatedAt: '2026-10-03T10:00:00.000Z',
            }),
        ).toMatchObject({
            revision: 7,
            updatedAt: '2026-10-03T10:00:00.000Z',
            deletedAt: '2026-10-03T10:00:00.000Z',
            deletedBy: 9,
        });
    });

    it('rejects unsupported future versions and unusable values', () => {
        expect(() =>
            parseStoredValue({
                schemaVersion: CURRENT_SCHEMA_VERSION + 1,
                id: 1,
                dataCategoryId: 1,
                type: 'task',
                name: 'Future',
            }),
        ).toThrow('noch nicht unterstützt');
        expect(() => parseStoredValue({ id: 1, dataCategoryId: 1, type: 'task', name: '' })).toThrow('Aufgabentitel');
        expect(() => parseStoredValue({ id: 1, dataCategoryId: 1, type: 'unknown' })).toThrow('Unbekannter');
    });

    it('adds the current version to domain writes only', () => {
        expect(withCurrentSchemaVersion({ type: 'task', name: 'Neu' })).toEqual({
            schemaVersion: CURRENT_SCHEMA_VERSION,
            type: 'task',
            name: 'Neu',
        });
        expect(withCurrentSchemaVersion({ name: 'Generic' })).toEqual({ name: 'Generic' });
    });
});
