export const ICONS = {
    MAIN: 'fas fa-tasks' as const,
    DEFAULT_PROJECT: 'fas fa-folder' as const,
};

type RandomSource = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>;

export function createProjectShorty(randomSource: RandomSource | undefined = globalThis.crypto) {
    if (typeof randomSource?.randomUUID === 'function') return `project_${randomSource.randomUUID()}`;

    const bytes = new Uint8Array(8);
    if (typeof randomSource?.getRandomValues === 'function') randomSource.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);

    const randomPart = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `project_${Date.now().toString(36)}_${randomPart}`;
}
