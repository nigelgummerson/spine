import { describe, it, expect } from 'vitest';
import { getScrewDefault } from '../implants';

describe('getScrewDefault', () => {
    it('returns null for upper cervical (Oc, C1, C2)', () => {
        expect(getScrewDefault('Oc')).toBeNull();
        expect(getScrewDefault('C1')).toBeNull();
        expect(getScrewDefault('C2')).toBeNull();
    });
    it('returns 3.5x14 for subaxial cervical', () => {
        expect(getScrewDefault('C3')).toEqual({ diameter: '3.5', length: '14' });
        expect(getScrewDefault('C7')).toEqual({ diameter: '3.5', length: '14' });
    });
    it('returns 4.0x28 for T3 (narrow pedicles)', () => {
        expect(getScrewDefault('T3')).toEqual({ diameter: '4.0', length: '28' });
    });
    it('returns 5.0x35 for T8 (transitional)', () => {
        expect(getScrewDefault('T8')).toEqual({ diameter: '5.0', length: '35' });
    });
    it('returns 6.5x45 for L3', () => {
        expect(getScrewDefault('L3')).toEqual({ diameter: '6.5', length: '45' });
    });
    it('returns 7.0x45 for S1', () => {
        expect(getScrewDefault('S1')).toEqual({ diameter: '7.0', length: '45' });
    });
    it('returns pelvic defaults for zone overrides', () => {
        expect(getScrewDefault('S1', 's2ai_left')).toEqual({ diameter: '7.5', length: '80' });
        expect(getScrewDefault('S1', 'iliac_left')).toEqual({ diameter: '7.5', length: '80' });
        expect(getScrewDefault('S1', 'si_left')).toEqual({ diameter: '7.0', length: '45' });
    });
    it('returns S2 default for S2 pedicle', () => {
        expect(getScrewDefault('S2')).toEqual({ diameter: '6.5', length: '35' });
    });
    it('returns null for unknown level', () => {
        expect(getScrewDefault('X9')).toBeNull();
    });
});
