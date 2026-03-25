import { describe, it, expect } from 'vitest';
import { formatScrewSize } from '../formatScrewSize';

describe('formatScrewSize', () => {
    it('adds 1dp to whole number diameter: "7x50" → "7.0x50"', () => {
        expect(formatScrewSize('7x50')).toBe('7.0x50');
    });

    it('preserves already 1dp diameter: "3.5x14" → "3.5x14"', () => {
        expect(formatScrewSize('3.5x14')).toBe('3.5x14');
    });

    it('adds 1dp to 2-digit diameter: "10x50" → "10.0x50"', () => {
        expect(formatScrewSize('10x50')).toBe('10.0x50');
    });

    it('preserves already 1dp 2-digit diameter: "6.5x45" → "6.5x45"', () => {
        expect(formatScrewSize('6.5x45')).toBe('6.5x45');
    });

    it('passes through non-numeric string: "Custom" → "Custom"', () => {
        expect(formatScrewSize('Custom')).toBe('Custom');
    });

    it('passes through empty string: "" → ""', () => {
        expect(formatScrewSize('')).toBe('');
    });

    it('passes through malformed size: "7.5x" → "7.5x"', () => {
        expect(formatScrewSize('7.5x')).toBe('7.5x');
    });
});
