const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Unbekannter Fehler');

export class CompensatedOperationError extends Error {
    constructor(
        message: string,
        public readonly compensated: boolean,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'CompensatedOperationError';
    }
}

export async function failWithCompensation(
    context: string,
    cause: unknown,
    compensations: Array<() => Promise<unknown>>,
): Promise<never> {
    const rollbackErrors: unknown[] = [];
    for (const compensate of [...compensations].reverse()) {
        try {
            await compensate();
        } catch (error) {
            rollbackErrors.push(error);
        }
    }
    if (rollbackErrors.length) {
        throw new CompensatedOperationError(
            `${context} fehlgeschlagen und konnte nicht vollständig bereinigt werden. Bitte den aktuellen Datenstand prüfen. Ursache: ${messageOf(cause)}`,
            false,
            { cause: new AggregateError([cause, ...rollbackErrors]) },
        );
    }
    throw new CompensatedOperationError(
        `${context} fehlgeschlagen. Bereits ausgeführte Änderungen wurden zurückgenommen. Ursache: ${messageOf(cause)}`,
        true,
        { cause },
    );
}
