import { describe, it, expect, vi, beforeEach } from 'vitest';

// measureText uses document.createElement('canvas') which is unavailable in node.
// We mock the module to test the fallback path and the real logic separately.

describe('measureText', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('returns a positive number for non-empty text (fallback path)', async () => {
        // In node environment, document is undefined, so measureText falls back to length * 8
        // We need to handle the ReferenceError by providing a minimal global.document
        const originalDocument = globalThis.document;
        // Provide a document that returns null for getContext (triggers fallback)
        globalThis.document = {
            createElement: () => ({
                getContext: () => null,
            }),
        } as unknown as Document;

        const { measureText } = await import('../measureText');
        const width = measureText('Hello', '12px Inter');
        expect(width).toBeGreaterThan(0);
        // Fallback: 5 chars * 8 = 40
        expect(width).toBe(40);

        globalThis.document = originalDocument;
    });

    it('returns 0 for empty string (fallback path)', async () => {
        const originalDocument = globalThis.document;
        globalThis.document = {
            createElement: () => ({
                getContext: () => null,
            }),
        } as unknown as Document;

        const { measureText } = await import('../measureText');
        const width = measureText('', '12px Inter');
        expect(width).toBe(0);

        globalThis.document = originalDocument;
    });

    it('longer text returns wider measurement than shorter text (fallback path)', async () => {
        const originalDocument = globalThis.document;
        globalThis.document = {
            createElement: () => ({
                getContext: () => null,
            }),
        } as unknown as Document;

        const { measureText } = await import('../measureText');
        const short = measureText('Hi', '12px Inter');
        const long = measureText('Hello World', '12px Inter');
        expect(long).toBeGreaterThan(short);

        globalThis.document = originalDocument;
    });

    it('uses canvas measureText when available', async () => {
        const originalDocument = globalThis.document;
        const mockMeasureText = vi.fn((text: string) => ({ width: text.length * 7.5 }));
        globalThis.document = {
            createElement: () => ({
                getContext: () => ({
                    font: '',
                    measureText: mockMeasureText,
                }),
            }),
        } as unknown as Document;

        const { measureText } = await import('../measureText');
        const width = measureText('Test', '14px Inter');
        expect(mockMeasureText).toHaveBeenCalledWith('Test');
        expect(width).toBe(30); // 4 * 7.5

        globalThis.document = originalDocument;
    });

    it('CJK text with more characters produces wider result', async () => {
        const originalDocument = globalThis.document;
        globalThis.document = {
            createElement: () => ({
                getContext: () => null,
            }),
        } as unknown as Document;

        const { measureText } = await import('../measureText');
        const latin = measureText('Hello', '12px Inter');       // 5 chars
        const cjk = measureText('\u4F60\u597D\u4E16\u754C\u5427\u5440', '12px Inter'); // 6 chars
        // Fallback: length * 8, so 6 > 5
        expect(cjk).toBeGreaterThan(latin);

        globalThis.document = originalDocument;
    });
});
