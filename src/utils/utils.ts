export const ICONS = {
    MAIN: 'i-lucide-list-checks' as const,
    DEFAULT_PROJECT: 'i-lucide-folder' as const,
};

const legacyProjectIcons: Record<string, string> = {
    'fas fa-folder': 'i-lucide-folder',
    'fas fa-list-check': 'i-lucide-list-checks',
    'fas fa-users': 'i-lucide-users',
    'fas fa-calendar': 'i-lucide-calendar-days',
    'fas fa-church': 'i-lucide-church',
    'fas fa-heart': 'i-lucide-heart',
    'fas fa-lightbulb': 'i-lucide-lightbulb',
    'fas fa-music': 'i-lucide-music',
    'fas fa-house': 'i-lucide-house',
};

export const projectIcon = (icon: string | undefined) =>
    (icon?.startsWith('i-lucide-') ? icon : legacyProjectIcons[icon ?? '']) ?? ICONS.DEFAULT_PROJECT;

type RandomSource = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>;

export function createProjectShorty(randomSource: RandomSource | undefined = globalThis.crypto) {
    if (typeof randomSource?.randomUUID === 'function') return `project_${randomSource.randomUUID()}`;

    const bytes = new Uint8Array(8);
    if (typeof randomSource?.getRandomValues === 'function') randomSource.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);

    const randomPart = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `project_${Date.now().toString(36)}_${randomPart}`;
}
