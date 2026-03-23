/**
 * Measure rendered text width using a hidden canvas context.
 * Returns pixel-accurate width for any script (Latin, CJK, Arabic, etc.).
 * Falls back to a conservative heuristic in environments without canvas (jsdom/SSR).
 */

let _ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D | null {
    if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
    return _ctx;
}

export function measureText(text: string, font: string): number {
    const ctx = getCtx();
    if (!ctx) return text.length * 8; // conservative fallback for jsdom/SSR
    ctx.font = font;
    return ctx.measureText(text).width;
}
