// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    absolutifyFontUrls,
    extractFontFaceRules,
    serialiseSvgWithFonts,
    compositeCanvases,
} from '../svgExport';

// ─── absolutifyFontUrls ────────────────────────────────────────────

describe('absolutifyFontUrls', () => {
    it('converts relative url() to absolute using document.baseURI', () => {
        const input = 'src: url(./fonts/inter.woff2) format("woff2");';
        const result = absolutifyFontUrls(input);
        // Should produce an absolute URL based on document.baseURI
        expect(result).toMatch(/url\("https?:\/\/.*\/fonts\/inter\.woff2"\)/);
        expect(result).not.toContain('url(./fonts');
    });

    it('leaves http:// URLs unchanged', () => {
        const input = 'src: url("https://example.com/font.woff2");';
        const result = absolutifyFontUrls(input);
        expect(result).toBe(input);
    });

    it('leaves data: URIs unchanged', () => {
        const input = 'src: url(data:font/woff2;base64,AAAA) format("woff2");';
        const result = absolutifyFontUrls(input);
        expect(result).toBe(input);
    });

    it('handles single-quoted URLs', () => {
        const input = "src: url('./font.woff2');";
        const result = absolutifyFontUrls(input);
        expect(result).toMatch(/url\("https?:\/\/.*\/font\.woff2"\)/);
    });

    it('handles unquoted URLs', () => {
        const input = 'src: url(./font.woff2);';
        const result = absolutifyFontUrls(input);
        expect(result).toMatch(/url\("https?:\/\/.*\/font\.woff2"\)/);
    });

    it('handles mixed relative and data: URLs in one string', () => {
        const input =
            'src: url(./a.woff2) format("woff2"), url(data:font/woff2;base64,XX);';
        const result = absolutifyFontUrls(input);
        // Relative should be absolutified
        expect(result).toMatch(/url\("https?:\/\/.*\/a\.woff2"\)/);
        // data: URI should remain intact
        expect(result).toContain('url(data:font/woff2;base64,XX)');
    });
});

// ─── extractFontFaceRules ──────────────────────────────────────────

describe('extractFontFaceRules', () => {
    it('returns empty string when no stylesheets exist', () => {
        // jsdom starts with no font-face rules
        const result = extractFontFaceRules();
        expect(result).toBe('');
    });

    // Deeper testing of extractFontFaceRules requires injecting CSSFontFaceRule
    // instances into document.styleSheets, which jsdom does not fully support
    // (CSSFontFaceRule constructor is not available). The function is exercised
    // indirectly through serialiseSvgWithFonts tests below.
});

// ─── serialiseSvgWithFonts ─────────────────────────────────────────

describe('serialiseSvgWithFonts', () => {
    let svgEl: SVGSVGElement;

    beforeEach(() => {
        svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgEl.setAttribute('width', '100');
        svgEl.setAttribute('height', '50');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '50');
        svgEl.appendChild(rect);
    });

    it('returns a valid SVG string containing original content', () => {
        const result = serialiseSvgWithFonts(svgEl);
        expect(result).toContain('<rect');
        expect(result).toContain('width="100"');
        expect(result).toMatch(/^<svg/);
    });

    it('does not inject <defs><style> when no font-face rules exist', () => {
        const result = serialiseSvgWithFonts(svgEl);
        expect(result).not.toContain('<defs><style>');
    });

    it('injects <defs><style> when font-face rules exist in stylesheets', () => {
        // Inject a real @font-face rule into the document
        const style = document.createElement('style');
        style.textContent = '@font-face { font-family: "TestFont"; src: url("https://example.com/test.woff2"); }';
        document.head.appendChild(style);

        try {
            const result = serialiseSvgWithFonts(svgEl);
            expect(result).toContain('<defs><style>');
            expect(result).toContain('TestFont');
            // The <defs><style> block should appear after the opening <svg> tag
            const svgTagEnd = result.indexOf('>');
            const defsPos = result.indexOf('<defs><style>');
            expect(defsPos).toBeGreaterThan(svgTagEnd);
        } finally {
            document.head.removeChild(style);
        }
    });
});

// ─── compositeCanvases ─────────────────────────────────────────────

describe('compositeCanvases', () => {
    // Mock canvas 2D context
    const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            mockCtx as unknown as CanvasRenderingContext2D
        );
    });

    it('creates output canvas with specified dimensions', () => {
        const output = compositeCanvases(1000, 500, []);
        expect(output.width).toBe(1000);
        expect(output.height).toBe(500);
    });

    it('fills background white before compositing', () => {
        compositeCanvases(800, 600, []);
        expect(mockCtx.fillStyle).toBe('#ffffff');
        expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('draws each entry at its specified x offset', () => {
        const c1 = document.createElement('canvas');
        const c2 = document.createElement('canvas');
        compositeCanvases(1000, 500, [
            { canvas: c1, x: 0, width: 400 },
            { canvas: c2, x: 400, width: 600 },
        ]);
        expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);
        expect(mockCtx.drawImage).toHaveBeenCalledWith(c1, 0, 0, 400, 500);
        expect(mockCtx.drawImage).toHaveBeenCalledWith(c2, 400, 0, 600, 500);
    });
});

// ─── svgToCanvas ───────────────────────────────────────────────────
// svgToCanvas is tightly coupled to Image loading, URL.createObjectURL,
// document.fonts.ready, and actual canvas rendering. Meaningful tests
// would require extensive browser API mocking with little confidence
// gain — the function is best validated by integration/e2e tests.
