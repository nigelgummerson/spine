/** Format screw size "7x50" → "7.0x50" (always 1dp on diameter) */
export const formatScrewSize = (s: string): string => {
    const m = s.match(/^(\d+\.?\d*)x(\d+)$/);
    if (!m) return s;
    return `${Number(m[1]).toFixed(1)}x${m[2]}`;
};
