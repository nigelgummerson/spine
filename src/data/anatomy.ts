import type { Level } from '../types';

interface AnatomyBase {
    bodyW: number;
    bodyH: number;
}

interface OccipitAnatomy extends AnatomyBase {
    region: 'occiput';
    foramenMagnumW: number;
    condyleW: number;
}

interface CervicalUpperAnatomy extends AnatomyBase {
    region: 'cervical-upper';
    latMassW: number;
    latMassH: number;
    totalWidth: number;
}

interface CervicalSubaxialAnatomy extends AnatomyBase {
    region: 'cervical-subaxial';
    latMassW: number;
    latMassH: number;
    pedW?: number;
    pedH?: number;
}

interface ThoracicAnatomy extends AnatomyBase {
    region: 'thoracic';
    pedW: number;
    pedH: number;
}

interface LumbarAnatomy extends AnatomyBase {
    region: 'lumbar';
    pedW: number;
    pedH: number;
}

interface SacralAnatomy extends AnatomyBase {
    region: 'sacral';
    pedW: number;
    pedH: number;
}

type VertAnatomyEntry =
    | OccipitAnatomy
    | CervicalUpperAnatomy
    | CervicalSubaxialAnatomy
    | ThoracicAnatomy
    | LumbarAnatomy
    | SacralAnatomy;

interface HeightMapEntry {
    levelId: string;
    startY: number;
    vertEnd: number;
    endY: number;
}

export const REGIONS: Record<string, { height: number; color: string }> = {
    Oc: { height: 25, color: '#f1f5f9' },
    C: { height: 24, color: '#f1f5f9' },
    T: { height: 36, color: '#f1f5f9' },
    L: { height: 46, color: '#f1f5f9' },
    S: { height: 52, color: '#f1f5f9' },
    Pelvis: { height: 56, color: '#f1f5f9' },
    pelvic: { height: 0, color: '#f1f5f9' }
};

// Anatomical dimensions (mm) from published CT morphometric data.
// Thoracic: PMC4857161 (CT-based, Indian population, n=120).
// Lumbar body heights: PMC11624215 (meta-analysis, n=1481).
// Lumbar body widths: PMC3207343 endplate data + PMC9252235 mid-body transverse.
// Lumbar pedicles: PMC11624215 meta-analysis.
// Sacral: PMC6286901 (systematic review).
// Pedicle data cross-checked against Lien 2007 (Eur Spine J) and Zindrick 1987.
export const VERTEBRA_ANATOMY: Record<string, VertAnatomyEntry> = {
    T1:  { region: 'thoracic', bodyW: 33.1, bodyH: 18.9, pedW: 9.3, pedH:  9.0 },
    T2:  { region: 'thoracic', bodyW: 32.0, bodyH: 19.0, pedW: 7.5, pedH: 10.3 },
    T3:  { region: 'thoracic', bodyW: 32.8, bodyH: 20.2, pedW: 6.0, pedH: 10.4 },
    T4:  { region: 'thoracic', bodyW: 34.2, bodyH: 21.0, pedW: 4.5, pedH: 10.3 },
    T5:  { region: 'thoracic', bodyW: 36.1, bodyH: 22.7, pedW: 5.0, pedH: 10.6 },
    T6:  { region: 'thoracic', bodyW: 37.5, bodyH: 22.9, pedW: 5.5, pedH: 10.2 },
    T7:  { region: 'thoracic', bodyW: 38.1, bodyH: 24.2, pedW: 6.0, pedH: 10.4 },
    T8:  { region: 'thoracic', bodyW: 38.2, bodyH: 24.8, pedW: 6.3, pedH: 10.9 },
    T9:  { region: 'thoracic', bodyW: 39.6, bodyH: 25.8, pedW: 6.3, pedH: 12.0 },
    T10: { region: 'thoracic', bodyW: 43.1, bodyH: 27.7, pedW: 6.5, pedH: 13.7 },
    T11: { region: 'thoracic', bodyW: 42.8, bodyH: 28.1, pedW: 7.8, pedH: 15.0 },
    T12: { region: 'thoracic', bodyW: 44.2, bodyH: 28.9, pedW: 8.3, pedH: 15.0 },
    L1:  { region: 'lumbar', bodyW: 45.0, bodyH: 24.5, pedW: 7.5, pedH: 15.4 },
    L2:  { region: 'lumbar', bodyW: 47.5, bodyH: 25.8, pedW: 8.2, pedH: 14.9 },
    L3:  { region: 'lumbar', bodyW: 49.0, bodyH: 26.8, pedW: 9.7, pedH: 14.5 },
    L4:  { region: 'lumbar', bodyW: 51.5, bodyH: 26.9, pedW: 11.5, pedH: 14.2 },
    L5:  { region: 'lumbar', bodyW: 54.0, bodyH: 27.4, pedW: 14.6, pedH: 14.7 },
    S1:  { region: 'sacral', bodyW: 100.0, bodyH: 28.0, pedW: 20.0, pedH: 14.0 }, // includes sacral ala (~49mm body + ~21mm ala each side)
    S2:  { region: 'sacral', bodyW: 83.0, bodyH: 22.0, pedW: 18.0, pedH: 11.0 },  // total S2 breadth (PMC6286901)
};

// Per-level SVG height: use same mm-to-SVG scale as width.
// Scale anchor: L5 (54mm) maps to 130 SVG units. S1/S2 extend beyond 160-unit viewBox (overflow visible).
export const VERT_SVG_SCALE = 130 / 54.0; // ~2.41; 130 SVG units = L5 body width
export const VERT_PAD = 3; // top/bottom padding in SVG units
export const getLevelHeight = (level: Level): number => {
    const a = VERTEBRA_ANATOMY[level.id];
    if (a) return Math.round(a.bodyH * VERT_SVG_SCALE) + VERT_PAD * 2;
    return REGIONS[level.type].height;
};

// Geometry return types — discriminated union matching anatomy regions
interface GeomBase {
    region: string;
    left: number;
    right: number;
    cx: number;
    bw: number;
}

interface OccipitGeom extends GeomBase {
    region: 'occiput';
    condyleLeftCx: number;
    condyleRightCx: number;
    condyleRx: number;
    condyleRy: number;
    foramenRx: number;
    foramenRy: number;
    screwLeftCx: number;
    screwRightCx: number;
}

interface CervicalUpperGeom extends GeomBase {
    region: 'cervical-upper';
    latMassLeftCx: number;
    latMassRightCx: number;
    latMassRx: number;
    latMassRy: number;
    latMassCy: number;
}

interface CervicalSubaxialGeom extends GeomBase {
    region: 'cervical-subaxial';
    latMassLeftCx: number;
    latMassRightCx: number;
    latMassRx: number;
    latMassRy: number;
    latMassCy: number;
    pedLeftCx?: number;
    pedRightCx?: number;
    pedRx?: number;
    pedRy?: number;
}

interface ThoracicGeom extends GeomBase {
    region: 'thoracic';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

interface LumbarGeom extends GeomBase {
    region: 'lumbar';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

interface SacralGeom extends GeomBase {
    region: 'sacral';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

export type VertSvgGeometry =
    | OccipitGeom
    | CervicalUpperGeom
    | CervicalSubaxialGeom
    | ThoracicGeom
    | LumbarGeom
    | SacralGeom;

// Convert mm anatomy data to SVG coordinates within the 160-unit viewBox
export const getVertSvgGeometry = (levelId: string): VertSvgGeometry | null => {
    const a = VERTEBRA_ANATOMY[levelId];
    if (!a) return null;
    const scale = 130 / 54.0;
    const bw = a.bodyW * scale;
    const cx = 80;
    const left = cx - bw / 2;
    const right = cx + bw / 2;

    if (a.region === 'thoracic' || a.region === 'lumbar' || a.region === 'sacral') {
        const pedInset = (a.pedW * scale) * 0.5;
        const pedLeftCx = left + pedInset + 5;
        const pedRightCx = right - pedInset - 5;
        const pedScale = 1.0;
        const pedRx = Math.max(1.5, (a.pedW * scale / 2) * pedScale);
        const pedRy = Math.max(2, (a.pedH * scale / 2) * pedScale);
        const pedCy = VERT_PAD + pedRy + 5;
        return { region: a.region, left, right, cx, bw, pedLeftCx, pedRightCx, pedRx, pedRy, pedCy };
    }

    // Cervical branches added in Task 2
    return null;
};

export const ALL_LEVELS: Level[] = [
    { id: 'Oc', type: 'Oc' },
    ...['C1','C2','C3','C4','C5','C6','C7'].map(id => ({ id, type: 'C' })),
    ...['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(id => ({ id, type: 'T' })),
    ...['L1','L2','L3','L4','L5'].map(id => ({ id, type: 'L' })),
    { id: 'S1', type: 'S' },
    { id: 'S2', type: 'S' },
    { id: 'Pelvis', type: 'Pelvis' },
];

// Disc height varies by region: lumbar ~30% body height, thoracic ~18%, cervical ~5mm
export const DISC_MIN_PX = 8; // minimum rendered disc zone height in pixels
export const getDiscHeight = (level: Level): number => {
    if (level.type === 'Pelvis' || level.type === 'pelvic' || level.type === 'S' || level.id === 'Oc' || level.id === 'C1') return 0;
    const h = getLevelHeight(level);
    if (level.type === 'L') return Math.round(h * 0.30);
    if (level.type === 'T') return Math.round(h * 0.18);
    return Math.round(5 * VERT_SVG_SCALE); // cervical ~5mm
};

export const buildHeightMap = (lvls: Level[], hScale: number): { map: HeightMapEntry[]; totalHeight: number } => {
    let y = 0;
    const map: HeightMapEntry[] = [];
    lvls.forEach(level => {
        const vertH = getLevelHeight(level) * hScale;
        const rawDiscH = getDiscHeight(level) * hScale;
        // Match actual DOM: disc zones have min DISC_MIN_PX, plus 1px border per level
        const discH = rawDiscH > 0 ? Math.max(DISC_MIN_PX, rawDiscH) : 0;
        const border = 1;
        map.push({ levelId: level.id, startY: y, vertEnd: y + vertH, endY: y + vertH + discH });
        y += vertH + discH + border;
    });
    return { map, totalHeight: y };
};

export const WHOLE_SPINE_MAP = buildHeightMap(ALL_LEVELS, 1);

export const levelToYNorm = (levelId: string): number => {
    const entry = WHOLE_SPINE_MAP.map.find(e => e.levelId === levelId);
    if (!entry) return 500;
    const midY = (entry.startY + entry.vertEnd) / 2;
    return (midY / WHOLE_SPINE_MAP.totalHeight) * 1000;
};

export const yNormToRenderedY = (yNorm: number, viewLevels: Level[], hScale: number): number | null => {
    const anatomicalY = (yNorm / 1000) * WHOLE_SPINE_MAP.totalHeight;
    const allEntry = WHOLE_SPINE_MAP.map.find(e => anatomicalY >= e.startY && anatomicalY < e.endY);
    if (!allEntry) {
        // Check if it's at the very bottom
        const last = WHOLE_SPINE_MAP.map[WHOLE_SPINE_MAP.map.length - 1];
        if (anatomicalY >= last.startY && anatomicalY <= last.endY) {
            const viewMap = buildHeightMap(viewLevels, hScale);
            const viewEntry = viewMap.map.find(e => e.levelId === last.levelId);
            if (!viewEntry) return null;
            const fraction = (last.endY - last.startY) > 0 ? (anatomicalY - last.startY) / (last.endY - last.startY) : 0;
            return viewEntry.startY + fraction * (viewEntry.endY - viewEntry.startY);
        }
        return null;
    }
    const viewMap = buildHeightMap(viewLevels, hScale);
    const viewEntry = viewMap.map.find(e => e.levelId === allEntry.levelId);
    if (!viewEntry) return null;
    const segLen = allEntry.endY - allEntry.startY;
    const fraction = segLen > 0 ? (anatomicalY - allEntry.startY) / segLen : 0;
    const viewSegLen = viewEntry.endY - viewEntry.startY;
    return viewEntry.startY + fraction * viewSegLen;
};

export const renderedYToYNorm = (renderedY: number, viewLevels: Level[], hScale: number): number => {
    const viewMap = buildHeightMap(viewLevels, hScale);
    let entry = viewMap.map.find(e => renderedY >= e.startY && renderedY < e.endY);
    if (!entry) {
        if (renderedY <= 0) entry = viewMap.map[0];
        else entry = viewMap.map[viewMap.map.length - 1];
    }
    const wholeEntry = WHOLE_SPINE_MAP.map.find(e => e.levelId === entry.levelId);
    if (!wholeEntry) return 500;
    const segLen = entry.endY - entry.startY;
    const fraction = segLen > 0 ? Math.max(0, Math.min(1, (renderedY - entry.startY) / segLen)) : 0;
    const wholeSegLen = wholeEntry.endY - wholeEntry.startY;
    const anatomicalY = wholeEntry.startY + fraction * wholeSegLen;
    return Math.max(0, Math.min(1000, (anatomicalY / WHOLE_SPINE_MAP.totalHeight) * 1000));
};

export const CHART_CONTENT_HEIGHT = 920;
export const calculateAutoScale = (levels: Level[]): number => {
    // Exclude pelvic levels — they have no vertebral body height and render
    // within the PelvisRegion overlay, not as LevelRow entries
    const vertebralLevels = levels.filter(l => l.type !== 'pelvic');
    let totalUnscaled = 0;
    let discCount = 0;
    vertebralLevels.forEach(level => {
        totalUnscaled += getLevelHeight(level) + getDiscHeight(level);
        if (getDiscHeight(level) > 0) discCount++;
    });
    if (totalUnscaled <= 0) return 0.5;
    // Account for fixed per-level costs: 1px border per level, min disc zone height
    // Add top/bottom padding for breathing room (iliac crests extend above L5)
    const padding = vertebralLevels.length > 20 ? 60 : 30; // more padding for whole-spine view
    const borderCost = vertebralLevels.length; // 1px border-b per level
    const available = CHART_CONTENT_HEIGHT - borderCost - padding;
    // Iterative: disc zones have min DISC_MIN_PX, so solve for scale
    // where scaled disc heights below DISC_MIN_PX get clamped
    let scale = available / totalUnscaled;
    for (let i = 0; i < 3; i++) {
        let minHeightExtra = 0;
        vertebralLevels.forEach(level => {
            const dh = getDiscHeight(level);
            if (dh > 0 && dh * scale < DISC_MIN_PX) {
                minHeightExtra += DISC_MIN_PX - dh * scale;
            }
        });
        scale = (available - minHeightExtra) / totalUnscaled;
    }
    return Math.min(1.5, Math.max(0.5, scale));
};
