import { describe, expect, it, vi } from 'vitest';
import { createProjectShorty } from '../src/utils/utils';

describe('project identifiers', () => {
    it('uses randomUUID when the browser provides it', () => {
        const source = {
            randomUUID: () =>
                '12345678-1234-1234-1234-123456789abc' as `${string}-${string}-${string}-${string}-${string}`,
            getRandomValues: vi.fn(),
        };
        expect(createProjectShorty(source)).toBe('project_12345678-1234-1234-1234-123456789abc');
        expect(source.getRandomValues).not.toHaveBeenCalled();
    });

    it('works in HTTP browser contexts without randomUUID', () => {
        const source = {
            getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
                (array as Uint8Array).fill(0xab);
                return array;
            },
        };
        const shorty = createProjectShorty(source);
        expect(shorty).toMatch(/^project_[a-z0-9]+_abababababababab$/);
        expect(shorty.length).toBeLessThanOrEqual(50);
    });
});
