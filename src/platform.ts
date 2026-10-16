import { churchtoolsClient } from '@churchtools/churchtools-client';
import { reactive, readonly } from 'vue';
import { reportOperationalError } from './application/operationalErrors';

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
    AMBER: 'amber',
    LIME: 'lime',
    EMERALD: 'emerald',
    CYAN: 'cyan',
    SKY: 'sky',
    INDIGO: 'indigo',
    FUCHSIA: 'fuchsia',
    ROSE: 'rose',
} as const;
export type CtColor = (typeof CtColor)[keyof typeof CtColor];

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
        currentUserState.message = reportOperationalError(
            'Anmeldung laden',
            error,
            'Der aktuelle Benutzer konnte nicht geladen werden.',
        );
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
    icon: 'i-lucide-user',
});
export const notNullish = <T>(value: T | null | undefined): value is T => value != null;
export const firstOrSelf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export const formatDateTime = (date: Date) => date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

const COLOR_LABELS: Record<CtColor, string> = {
    basic: 'Neutral',
    red: 'Rot',
    orange: 'Orange',
    yellow: 'Gelb',
    green: 'Grün',
    blue: 'Blau',
    violet: 'Violett',
    purple: 'Lila',
    pink: 'Pink',
    teal: 'Türkis',
    amber: 'Bernstein',
    lime: 'Limette',
    emerald: 'Smaragd',
    cyan: 'Cyan',
    sky: 'Himmelblau',
    indigo: 'Indigo',
    fuchsia: 'Fuchsia',
    rose: 'Rosé',
};
// Fixed palette values keep custom colors independent of the app's primary/status colors.
const COLOR_VALUES: Record<CtColor, string> = {
    basic: '#78716c',
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    purple: '#a855f7',
    pink: '#ec4899',
    teal: '#14b8a6',
    amber: '#f59e0b',
    lime: '#84cc16',
    emerald: '#10b981',
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    indigo: '#6366f1',
    fuchsia: '#d946ef',
    rose: '#f43f5e',
};
export const colorValue = (color: unknown): string => COLOR_VALUES[colorKey(color) as CtColor] ?? COLOR_VALUES.basic;
export const colorStyle = (color: unknown) => ({ '--chip': colorValue(color) });
export const colorOptions = Object.values(CtColor).map(key => ({ id: key, nameTranslated: COLOR_LABELS[key] }));
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
