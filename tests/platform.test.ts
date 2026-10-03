import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authState, loadCurrentUser, requireCurrentUser, useCurrentUser } from '../src/platform';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: api }));

beforeEach(() => vi.resetAllMocks());

describe('current user state', () => {
    it('exposes a valid authenticated user', async () => {
        api.get.mockResolvedValue({ id: 42, firstName: 'Ada' });
        await loadCurrentUser();
        expect(authState.status).toBe('authenticated');
        expect(requireCurrentUser()).toMatchObject({ id: 42, firstName: 'Ada' });
    });

    it('surfaces loading failures and blocks writes with an invalid identity', async () => {
        api.get.mockRejectedValue(new Error('401'));
        await loadCurrentUser();
        expect(authState.status).toBe('error');
        expect(useCurrentUser().id).toBe(0);
        expect(() => requireCurrentUser()).toThrow('Schreiben ist derzeit nicht möglich');
    });
});
