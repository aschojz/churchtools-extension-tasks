import type { OperationalError } from '../application/operationalErrors';
import type { DataIssue, MigrationCandidate } from './storedData';
import { CURRENT_SCHEMA_VERSION } from './storedData';

export type DiagnosticSnapshot = {
    application: { version: string; commit: string; schemaVersion: number };
    runtime: { moduleId?: number; authentication: 'loading' | 'authenticated' | 'error' };
    dataIssues: Array<Pick<DataIssue, 'entity' | 'id' | 'categoryId' | 'message'>>;
    operationalErrors: OperationalError[];
    migrationCandidates: MigrationCandidate[];
};

export function createDiagnosticSnapshot(input: {
    version: string;
    commit: string;
    moduleId?: number;
    authentication: DiagnosticSnapshot['runtime']['authentication'];
    dataIssues: DataIssue[];
    operationalErrors: OperationalError[];
    migrationCandidates: MigrationCandidate[];
}): DiagnosticSnapshot {
    return {
        application: {
            version: input.version,
            commit: input.commit,
            schemaVersion: CURRENT_SCHEMA_VERSION,
        },
        runtime: {
            ...(input.moduleId ? { moduleId: input.moduleId } : {}),
            authentication: input.authentication,
        },
        dataIssues: input.dataIssues.map(({ entity, id, categoryId, message }) => ({
            entity,
            id,
            ...(categoryId ? { categoryId } : {}),
            message,
        })),
        operationalErrors: input.operationalErrors.map(error => ({ ...error })),
        migrationCandidates: input.migrationCandidates.map(candidate => ({ ...candidate })),
    };
}
