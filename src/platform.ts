import { churchtoolsClient } from '@churchtools/churchtools-client';
import { reactive, readonly } from 'vue';

export const CtColor = {
    BASIC: 'basic',
    RED: 'red',
    ORANGE: 'orange',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    VIOLET: 'violet',
    PURPLE: 'purple',
    PINK: 'pink',
    TEAL: 'teal',
} as const;
export type CtColor = (typeof CtColor)[keyof typeof CtColor];

export const CtIcon = { ADD: 'fas fa-plus', EDIT: 'fas fa-pen', DELETE: 'fas fa-trash' } as const;

export type Person = { id: number; firstName?: string; lastName?: string; imageUrl?: string };
export type PersonDisplay = { domainIdentifier: string; title: string; imageUrl?: string; icon?: string };

const currentUser = reactive<Person>({ id: 0 });
const currentUserState = reactive<{
    status: 'loading' | 'authenticated' | 'error';
    message?: string;
}>({ status: 'loading' });
export const useCurrentUser = () => currentUser;
export const authState = readonly(currentUserState);
export async function loadCurrentUser() {
    currentUserState.status = 'loading';
    currentUserState.message = undefined;
    try {
        const person = await churchtoolsClient.get<Person>('/whoami');
        if (!Number.isSafeInteger(person.id) || person.id <= 0) throw new Error('Ungültige Benutzer-ID.');
        Object.assign(currentUser, person);
        currentUserState.status = 'authenticated';
    } catch (error) {
        currentUser.id = 0;
        currentUserState.status = 'error';
        currentUserState.message =
            error instanceof Error ? error.message : 'Der aktuelle Benutzer konnte nicht geladen werden.';
    }
}

export function requireCurrentUser(): Person {
    if (currentUserState.status !== 'authenticated' || currentUser.id <= 0)
        throw new Error('Schreiben ist derzeit nicht möglich. Bitte die Anmeldung prüfen und erneut versuchen.');
    return currentUser;
}

export const personDisplay = (person: Person): PersonDisplay => ({
    domainIdentifier: String(person.id),
    title: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || `Person ${person.id}`,
    imageUrl: person.imageUrl,
    icon: 'fas fa-user',
});
export const notNullish = <T>(value: T | null | undefined): value is T => value != null;
export const firstOrSelf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export const formatDateTime = (date: Date) => date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export const colorOptions = Object.values(CtColor).map(key => ({ id: key, nameTranslated: key }));
export const colorKey = (color: unknown): string =>
    typeof color === 'string'
        ? color
        : color && typeof color === 'object' && 'key' in color
          ? String(color.key)
          : 'basic';
export const uiColor = (color: unknown): 'neutral' | 'error' | 'warning' | 'success' | 'info' | 'primary' => {
    const key = colorKey(color);
    if (key === 'red') return 'error';
    if (key === 'yellow' || key === 'orange') return 'warning';
    if (key === 'green' || key === 'teal') return 'success';
    if (key === 'blue') return 'info';
    if (key === 'violet' || key === 'purple' || key === 'pink') return 'primary';
    return 'neutral';
};
