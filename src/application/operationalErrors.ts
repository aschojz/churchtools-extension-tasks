import { ref } from 'vue';

export type OperationalError = {
    id: string;
    occurredAt: string;
    context: string;
    kind: string;
};

const MAX_RECENT_ERRORS = 10;
let sequence = 0;

export const operationalErrors = ref<OperationalError[]>([]);

const nextErrorId = () => {
    sequence = (sequence + 1) % 1296;
    return `ERR-${Date.now().toString(36).toUpperCase()}-${sequence.toString(36).toUpperCase().padStart(2, '0')}`;
};

export function reportOperationalError(context: string, error: unknown, fallback: string) {
    const id = nextErrorId();
    operationalErrors.value = [
        {
            id,
            occurredAt: new Date().toISOString(),
            context,
            kind: error instanceof Error ? error.name : 'UnknownError',
        },
        ...operationalErrors.value,
    ].slice(0, MAX_RECENT_ERRORS);
    const message = error instanceof Error && error.message ? error.message : fallback;
    return `${message} (Fehler-ID: ${id})`;
}

export function clearOperationalErrors() {
    operationalErrors.value = [];
}
