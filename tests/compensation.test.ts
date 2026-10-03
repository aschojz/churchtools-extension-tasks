import { describe, expect, it, vi } from 'vitest';
import { CompensatedOperationError, failWithCompensation } from '../src/application/compensation';

describe('operation compensation', () => {
    it('runs compensations in reverse order and reports a clean rollback', async () => {
        const order: number[] = [];
        await expect(
            failWithCompensation('Testoperation', new Error('offline'), [
                async () => void order.push(1),
                async () => void order.push(2),
            ]),
        ).rejects.toMatchObject({ compensated: true });
        expect(order).toEqual([2, 1]);
    });

    it('continues cleanup after one rollback fails and marks manual repair', async () => {
        const cleanup = vi.fn();
        let caught: unknown;
        try {
            await failWithCompensation('Testoperation', new Error('write failed'), [
                cleanup,
                async () => {
                    throw new Error('rollback failed');
                },
            ]);
        } catch (error) {
            caught = error;
        }
        expect(cleanup).toHaveBeenCalledOnce();
        expect(caught).toBeInstanceOf(CompensatedOperationError);
        expect(caught).toMatchObject({ compensated: false });
    });
});
