import { describe, it, expect } from 'vitest';
import { getScrewDefault, getSystemCatalogue, checkScrewSize } from '../implants';

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
    it('returns pelvic defaults for pelvic level IDs', () => {
        expect(getScrewDefault('S2AI')).toEqual({ diameter: '7.5', length: '80' });
        expect(getScrewDefault('Iliac')).toEqual({ diameter: '7.5', length: '80' });
        expect(getScrewDefault('SI-J')).toEqual({ diameter: '7.0', length: '45' });
    });
    it('returns S2 default for S2 pedicle', () => {
        expect(getScrewDefault('S2')).toEqual({ diameter: '6.5', length: '35' });
    });
    it('returns null for unknown level', () => {
        expect(getScrewDefault('X9')).toBeNull();
    });
});

describe('getSystemCatalogue', () => {
    it('returns catalogue data for Xia 3', () => {
        const cat = getSystemCatalogue('Xia 3');
        expect(cat).not.toBeNull();
        expect(cat!.type).toBe('thoracolumbar');
        expect(cat!.screwDiameters).toContain(6.5);
        expect(cat!.screwLengthsByDiameter['4.0']).toContain(20);
        expect(cat!.screwLengthsByDiameter['4.0']).not.toContain(70);
    });
    it('returns null for unknown system', () => {
        expect(getSystemCatalogue('Nonexistent System')).toBeNull();
    });
    it('returns null for empty string', () => {
        expect(getSystemCatalogue('')).toBeNull();
    });
});

describe('checkScrewSize', () => {
    it('returns no warnings for in-range Xia 3 diameter and length', () => {
        const result = checkScrewSize('Xia 3', 6.5, 45);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBeNull();
    });
    it('warns for diameter not in Xia 3 options list', () => {
        // 8.0mm is not in Xia 3 options (jumps from 7.5 to 8.5)
        const result = checkScrewSize('Xia 3', 8.0, 45);
        expect(result.diameterWarning).toBe('not_available');
        expect(result.lengthWarning).toBeNull();
    });
    it('warns for diameter at boundary — 3.5mm below Xia 3 minimum', () => {
        const result = checkScrewSize('Xia 3', 3.5, 45);
        expect(result.diameterWarning).toBe('not_available');
    });
    it('no warning for diameter at boundary — 4.0mm is Xia 3 minimum', () => {
        const result = checkScrewSize('Xia 3', 4.0, 45);
        expect(result.diameterWarning).toBeNull();
    });
    it('no warning for diameter at boundary — 10.5mm is Xia 3 maximum', () => {
        const result = checkScrewSize('Xia 3', 10.5, 45);
        expect(result.diameterWarning).toBeNull();
    });
    it('warns for length below Xia 3 minimum', () => {
        const result = checkScrewSize('Xia 3', 6.5, 15);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBe('not_available');
    });
    it('warns for length above Xia 3 maximum', () => {
        const result = checkScrewSize('Xia 3', 6.5, 110);
        expect(result.lengthWarning).toBe('not_available');
    });
    it('no warning for length at boundaries (per-diameter)', () => {
        // 6.5mm range is 25-90
        expect(checkScrewSize('Xia 3', 6.5, 25).lengthWarning).toBeNull();
        expect(checkScrewSize('Xia 3', 6.5, 90).lengthWarning).toBeNull();
        // 4.0mm range is 20-45
        expect(checkScrewSize('Xia 3', 4.0, 20).lengthWarning).toBeNull();
        expect(checkScrewSize('Xia 3', 4.0, 45).lengthWarning).toBeNull();
    });
    it('returns no warnings for unknown system', () => {
        const result = checkScrewSize('Unknown System', 99, 999);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBeNull();
    });

    // Per-diameter length validation
    it('warns for 4.0mm x 70mm — too long for 4.0mm diameter', () => {
        const result = checkScrewSize('Xia 3', 4.0, 70);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBe('not_available');
    });
    it('no warning for 4.0mm x 40mm — within 4.0mm range (20-45)', () => {
        const result = checkScrewSize('Xia 3', 4.0, 40);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBeNull();
    });
    it('no warning for 7.0mm x 70mm — within 7.0mm range (25-90)', () => {
        const result = checkScrewSize('Xia 3', 7.0, 70);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBeNull();
    });
    it('warns for 9.5mm x 30mm — too short for 9.5mm diameter (min 40)', () => {
        const result = checkScrewSize('Xia 3', 9.5, 30);
        expect(result.diameterWarning).toBeNull();
        expect(result.lengthWarning).toBe('not_available');
    });
    it('falls back to global range for unlisted diameter', () => {
        // 8.0mm is not in screwLengthsByDiameter, falls back to global 20-100
        const result = checkScrewSize('Xia 3', 8.0, 95);
        expect(result.diameterWarning).toBe('not_available'); // 8.0 not in options
        expect(result.lengthWarning).toBeNull(); // 95 within global 20-100
    });
});
