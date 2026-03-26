import { describe, it, expect } from 'vitest';
import { genId } from '../id';

describe('genId', () => {
    it('returns a string', () => {
        const id = genId();
        expect(typeof id).toBe('string');
    });

    it('produces unique IDs across 1000 calls', () => {
        const ids = new Set<string>();
        for (let i = 0; i < 1000; i++) {
            ids.add(genId());
        }
        expect(ids.size).toBe(1000);
    });

    it('returns a non-empty string', () => {
        expect(genId().length).toBeGreaterThan(0);
    });
});
