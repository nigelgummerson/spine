import { describe, it, expect } from 'vitest';
import { computeChecksum, verifyChecksum } from '../checksum';

describe('computeChecksum', () => {
    it('produces consistent hash for identical data', async () => {
        const payload = { document: { name: 'test', levels: [1, 2, 3] } };
        const hash1 = await computeChecksum(payload);
        const hash2 = await computeChecksum(payload);
        expect(hash1).toBe(hash2);
    });

    it('produces different hash for different data', async () => {
        const payload1 = { document: { name: 'test1' } };
        const payload2 = { document: { name: 'test2' } };
        const hash1 = await computeChecksum(payload1);
        const hash2 = await computeChecksum(payload2);
        expect(hash1).not.toBe(hash2);
    });

    it('returns a 64-character hex string (SHA-256)', async () => {
        const hash = await computeChecksum({ document: { x: 1 } });
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('excludes existing checksum field from hash', async () => {
        const base = { document: { name: 'test' } };
        const withChecksum = { document: { name: 'test', checksum: 'old_hash_value' } };
        const hash1 = await computeChecksum(base);
        const hash2 = await computeChecksum(withChecksum);
        expect(hash1).toBe(hash2);
    });
});

describe('verifyChecksum', () => {
    it("returns 'valid' for a correct checksum", async () => {
        const payload = { document: { name: 'surgery plan', levels: ['L3', 'L4'] } };
        const checksum = await computeChecksum(payload);
        const signed = { document: { ...payload.document, checksum } };
        const result = await verifyChecksum(signed);
        expect(result).toBe('valid');
    });

    it("returns 'mismatch' for tampered data", async () => {
        const payload = { document: { name: 'original' } };
        const checksum = await computeChecksum(payload);
        const tampered = { document: { name: 'tampered', checksum } };
        const result = await verifyChecksum(tampered);
        expect(result).toBe('mismatch');
    });

    it("returns 'absent' when no checksum is present", async () => {
        const payload = { document: { name: 'no checksum here' } };
        const result = await verifyChecksum(payload);
        expect(result).toBe('absent');
    });

    it("returns 'absent' when document field is missing", async () => {
        const payload = { someOtherField: 'value' };
        const result = await verifyChecksum(payload);
        expect(result).toBe('absent');
    });
});
