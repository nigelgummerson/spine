/**
 * SVG chart export utilities.
 *
 * Converts SVG chart elements to canvas for JPG/PDF export.
 * Handles font embedding so SVG renders correctly in isolated contexts.
 */

/**
 * Convert relative url() references in CSS to absolute URLs.
 * SVG blobs have no base URL, so font references must be absolute
 * for text to render correctly in exported images.
 */
function absolutifyFontUrls(cssText: string): string {
    return cssText.replace(/url\(["']?((?!data:)[^"')]+)["']?\)/g, (match, url) => {
        if (url.startsWith('http') || url.startsWith('data:')) return match;
        try {
            const absolute = new URL(url, document.baseURI).href;
            return `url("${absolute}")`;
        } catch {
            return match; // malformed URL — leave unchanged
        }
    });
}

/**
 * Extract all @font-face rules from the document's stylesheets.
 * Returns a CSS string with the rules, including data: URIs for fonts.
 */
export function extractFontFaceRules(): string {
    const rules: string[] = [];
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (rule instanceof CSSFontFaceRule) {
                    rules.push(absolutifyFontUrls(rule.cssText));
                }
            }
        } catch {
            // Cross-origin stylesheets throw SecurityError — skip
        }
    }
    return rules.join('\n');
}

/**
 * Serialise an SVG element to a string with embedded font-face rules.
 */
export function serialiseSvgWithFonts(svgElement: SVGSVGElement): string {
    const serialiser = new XMLSerializer();
    let svgString = serialiser.serializeToString(svgElement);

    // Inject @font-face rules into the SVG
    const fontCSS = extractFontFaceRules();
    if (fontCSS) {
        const defsStyle = `<defs><style>${fontCSS}</style></defs>`;
        // Insert after the opening <svg ...> tag
        svgString = svgString.replace(/(<svg[^>]*>)/, `$1${defsStyle}`);
    }

    return svgString;
}

/**
 * Convert an SVG element to a canvas at the specified dimensions.
 * Embeds fonts so text renders correctly in the isolated img context.
 */
export async function svgToCanvas(
    svgElement: SVGSVGElement,
    width: number,
    height: number,
    scale: number = 1
): Promise<HTMLCanvasElement> {
    await document.fonts.ready;

    const svgString = serialiseSvgWithFonts(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to render SVG to canvas'));
        };
        img.src = url;
    });
}

/**
 * Composite multiple canvases side-by-side onto a single output canvas.
 * Each entry specifies the source canvas and its x-offset on the output.
 */
export function compositeCanvases(
    outputWidth: number,
    outputHeight: number,
    entries: Array<{ canvas: HTMLCanvasElement; x: number; width: number }>
): HTMLCanvasElement {
    const output = document.createElement('canvas');
    output.width = outputWidth;
    output.height = outputHeight;
    const ctx = output.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    for (const entry of entries) {
        ctx.drawImage(entry.canvas, entry.x, 0, entry.width, outputHeight);
    }

    return output;
}
