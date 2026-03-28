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
    pedCTC: number; // pedicle centre-to-centre distance (mm) — Lien 2007 pedW + IPD (Chhabra/Maaly)
    tpW: number;  // transverse process projection per side (mm), Tan et al. 2004
    tpH: number;  // transverse process craniocaudal height (mm)
    tpAngle: number;  // TP caudal angulation from horizontal (degrees)
}

interface LumbarAnatomy extends AnatomyBase {
    region: 'lumbar';
    pedW: number;
    pedH: number;
    pedCTC: number; // pedicle centre-to-centre distance (mm) — Lien 2007 pedW + IPD (Maaly)
    tpW: number;  // transverse process projection per side (mm), Tan et al. 2004
    tpH: number;  // transverse process craniocaudal height (mm)
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

// Anatomical dimensions (mm). Proportions from Tan et al. 2004 (PMC3476578,
// Chinese Singaporean, n=10, 3D CT), scaled to Caucasian using two anchors:
//   Width: Yao et al. 2018 EPWl White male C7=23.2mm (scale=1.143)
//   Height: Bostrom et al. 2010 VBHp Western C7=15.9mm (scale=1.348)
// Cervical bodyW: Yao et al. (2018) EPWl White male directly (PMC5838464).
// Cervical lateral masses: An et al. (1991), Gupta & Goel (2000), Xu et al. (1999).
// Oc: Naderi et al. (2005), Ebraheim et al. (1996).
// Pedicles: PMC4857161, Lien 2007, Zindrick 1987 (retained from prior calibration).
// Sacral: PMC6286901 (systematic review).
// tpW = transverse process projection per side, from Tan TPW: (TPW - EPWl)/2 * 1.143.
export const VERTEBRA_ANATOMY: Record<string, VertAnatomyEntry> = {
    Oc:  { region: 'occiput', bodyW: 78, bodyH: 12, foramenMagnumW: 35, condyleW: 22 },
    C1:  { region: 'cervical-upper', bodyW: 22, bodyH: 10, latMassW: 16, latMassH: 12, totalWidth: 58 },
    C2:  { region: 'cervical-upper', bodyW: 18, bodyH: 20, latMassW: 12, latMassH: 14, totalWidth: 54 },
    C3:  { region: 'cervical-subaxial', bodyW: 18.0, bodyH: 15.1, latMassW: 12.5, latMassH: 12 },
    C4:  { region: 'cervical-subaxial', bodyW: 18.3, bodyH: 15.2, latMassW: 13, latMassH: 12.5 },
    C5:  { region: 'cervical-subaxial', bodyW: 20.1, bodyH: 15.2, latMassW: 14, latMassH: 13 },
    C6:  { region: 'cervical-subaxial', bodyW: 21.6, bodyH: 15.2, latMassW: 14, latMassH: 13 },
    C7:  { region: 'cervical-subaxial', bodyW: 23.2, bodyH: 15.9, latMassW: 12, latMassH: 11, pedW: 5.5, pedH: 7 },
    // tpH: thoracic TP craniocaudal height — T1=10.8mm (thickest), T7=7.9mm (thinnest).
    // Lumbar TPs are thin flat plates ~8-10mm.
    // pedCTC: pedicle centre-to-centre distance (mm) = IPD + pedW.
    //   Thoracic IPD: Chhabra et al. CT study (PMC4857161); Lien et al. 2007 (Eur Spine J, PMC2200778) for pedW.
    //   Lumbar IPD: Maaly et al. CT study (PMC10540747); Lien et al. 2007 for pedW.
    //   bodyW: Panjabi 1991/1992 (Caucasian cadaveric) via Tan et al. 2004 methodology.
    //   pedW/pedH: Lien et al. 2007 (Eur Spine J 16:1215-1222, PMC2200778).
    //   tpW/tpH: Berry et al. 1987. tpAngle: Masharawi et al. 2004.
    T1:  { region: 'thoracic', bodyW: 31.0, bodyH: 18.9, pedW: 9.3, pedH:  9.0, pedCTC: 31.9, tpW: 21.0, tpH: 10.8, tpAngle: 28.9 },
    T2:  { region: 'thoracic', bodyW: 28.9, bodyH: 20.5, pedW: 7.5, pedH: 10.3, pedCTC: 29.5, tpW: 18.4, tpH: 10.3, tpAngle: 30.4 },
    T3:  { region: 'thoracic', bodyW: 27.9, bodyH: 20.6, pedW: 6.0, pedH: 10.4, pedCTC: 26.4, tpW: 15.4, tpH: 9.6, tpAngle: 36.0 },
    T4:  { region: 'thoracic', bodyW: 28.6, bodyH: 21.3, pedW: 4.5, pedH: 10.3, pedCTC: 24.9, tpW: 14.2, tpH: 9.0, tpAngle: 44.5 },
    T5:  { region: 'thoracic', bodyW: 27.2, bodyH: 22.1, pedW: 5.0, pedH: 10.6, pedCTC: 24.9, tpW: 14.8, tpH: 8.5, tpAngle: 54.1 },
    T6:  { region: 'thoracic', bodyW: 28.3, bodyH: 22.9, pedW: 5.5, pedH: 10.2, pedCTC: 27.1, tpW: 14.5, tpH: 8.1, tpAngle: 59.8 },
    T7:  { region: 'thoracic', bodyW: 30.6, bodyH: 23.4, pedW: 6.0, pedH: 10.4, pedCTC: 25.6, tpW: 13.1, tpH: 7.9, tpAngle: 56.4 },
    T8:  { region: 'thoracic', bodyW: 31.9, bodyH: 24.0, pedW: 6.3, pedH: 10.9, pedCTC: 26.1, tpW: 11.4, tpH: 8.2, tpAngle: 50.3 },
    T9:  { region: 'thoracic', bodyW: 33.4, bodyH: 24.3, pedW: 6.3, pedH: 12.0, pedCTC: 28.4, tpW: 10.7, tpH: 8.5, tpAngle: 43.9 },
    T10: { region: 'thoracic', bodyW: 36.5, bodyH: 25.7, pedW: 6.5, pedH: 13.7, pedCTC: 26.6, tpW: 7.7, tpH: 9.0, tpAngle: 35.9 },
    T11: { region: 'thoracic', bodyW: 40.3, bodyH: 27.5, pedW: 7.8, pedH: 15.0, pedCTC: 30.9, tpW: 4.4, tpH: 9.5, tpAngle: 23.5 },
    T12: { region: 'thoracic', bodyW: 41.6, bodyH: 29.0, pedW: 8.3, pedH: 15.0, pedCTC: 32.0, tpW: 2.6, tpH: 9.5, tpAngle: 13.1 },
    L1:  { region: 'lumbar', bodyW: 44.8, bodyH: 30.2, pedW: 7.5, pedH: 15.4, pedCTC: 31.3, tpW: 8.2, tpH: 9.0 },
    L2:  { region: 'lumbar', bodyW: 47.3, bodyH: 31.1, pedW: 8.2, pedH: 14.9, pedCTC: 32.3, tpW: 13.1, tpH: 8.5 },
    L3:  { region: 'lumbar', bodyW: 49.7, bodyH: 29.8, pedW: 9.7, pedH: 14.5, pedCTC: 35.1, tpW: 16.0, tpH: 8.0 },
    L4:  { region: 'lumbar', bodyW: 51.8, bodyH: 29.1, pedW: 11.5, pedH: 14.2, pedCTC: 39.2, tpW: 12.8, tpH: 8.5 },
    L5:  { region: 'lumbar', bodyW: 49.9, bodyH: 27.0, pedW: 14.6, pedH: 14.7, pedCTC: 49.5, tpW: 15.8, tpH: 10.0 },
    S1:  { region: 'sacral', bodyW: 100.0, bodyH: 28.0, pedW: 20.0, pedH: 14.0 }, // includes sacral ala
    S2:  { region: 'sacral', bodyW: 83.0, bodyH: 22.0, pedW: 18.0, pedH: 11.0 },
};

// Per-level SVG height: use same mm-to-SVG scale as width.
// Scale anchor: L4 (51.8mm) maps to 130 SVG units. S1/S2 extend beyond 160-unit viewBox (overflow visible).
export const VERT_SVG_SCALE = 130 / 51.8; // ~2.51; 130 SVG units = L4 body width
export const VERT_PAD = 3; // top/bottom padding in SVG units
export const getLevelHeight = (level: Level): number => {
    const a = VERTEBRA_ANATOMY[level.id];
    if (a) return Math.round(a.bodyH * VERT_SVG_SCALE) + VERT_PAD * 2;
    return REGIONS[level.type].height;
};

/**
 * Compute the outer boundary (in 160-unit SVG coordinates) for a level.
 * Uses getVertSvgGeometry so it matches LevelRow's chartOuterLeft/chartOuterRight.
 */
export function getOuterBoundary(levelId: string): { left: number; right: number } {
    const geom = getVertSvgGeometry(levelId);
    if (!geom) return { left: 0, right: 160 };
    if ((geom.region === 'thoracic' || geom.region === 'lumbar') && 'tpLeftX' in geom) {
        return { left: geom.tpLeftX, right: geom.tpRightX };
    }
    if ((geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial') && 'latMassLeftCx' in geom) {
        return { left: geom.latMassLeftCx - geom.latMassRx, right: geom.latMassRightCx + geom.latMassRx };
    }
    return { left: geom.left, right: geom.right };
}

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
    pedCy?: number;
}

interface ThoracicGeom extends GeomBase {
    region: 'thoracic';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
    tpLeftX: number;   // SVG x of left TP tip
    tpRightX: number;  // SVG x of right TP tip
    tpHalfH: number;   // SVG half-height of TP (craniocaudal)
    tpAngle: number;   // TP caudal angulation (degrees)
}

interface LumbarGeom extends GeomBase {
    region: 'lumbar';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
    tpLeftX: number;
    tpRightX: number;
    tpHalfH: number;
    tpAngle: number;
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
    const scale = VERT_SVG_SCALE;
    const bw = a.bodyW * scale;
    const cx = 80;
    const left = cx - bw / 2;
    const right = cx + bw / 2;

    if (a.region === 'thoracic' || a.region === 'lumbar') {
        // Pedicle centres from published centre-to-centre distance (IPD + pedW)
        // Sources: Lien et al. 2007 (pedW), Chhabra et al. (thoracic IPD), Maaly et al. (lumbar IPD)
        const halfCTC = (a.pedCTC * scale) / 2;
        const pedLeftCx = cx - halfCTC;
        const pedRightCx = cx + halfCTC;
        const pedRx = Math.max(1.5, (a.pedW * scale / 2));
        const pedRy = Math.max(2, (a.pedH * scale / 2));
        const pedCy = VERT_PAD + pedRy + 5;
        const tpSvg = a.tpW * scale;
        const tpLeftX = left - tpSvg;
        const tpRightX = right + tpSvg;
        const tpHalfH = (a.tpH * scale) / 2;
        const tpAngle = a.region === 'thoracic' ? a.tpAngle : 0;
        return { region: a.region, left, right, cx, bw, pedLeftCx, pedRightCx, pedRx, pedRy, pedCy, tpLeftX, tpRightX, tpHalfH, tpAngle };
    }

    if (a.region === 'sacral') {
        const pedInset = (a.pedW * scale) * 0.5;
        const pedLeftCx = left + pedInset + 5;
        const pedRightCx = right - pedInset - 5;
        const pedRx = Math.max(1.5, (a.pedW * scale / 2));
        const pedRy = Math.max(2, (a.pedH * scale / 2));
        const pedCy = VERT_PAD + pedRy + 5;
        return { region: a.region, left, right, cx, bw, pedLeftCx, pedRightCx, pedRx, pedRy, pedCy };
    }

    if (a.region === 'occiput') {
        const condyleOffset = a.condyleW * scale;
        const fmRx = (a.foramenMagnumW * scale) / 2;
        const screwOffset = 9 * scale;
        return {
            region: 'occiput', left, right, cx, bw,
            condyleLeftCx: cx - condyleOffset, condyleRightCx: cx + condyleOffset,
            condyleRx: (a.condyleW * scale) / 2, condyleRy: fmRx * 0.4,
            foramenRx: fmRx, foramenRy: fmRx * 0.7,
            screwLeftCx: cx - screwOffset, screwRightCx: cx + screwOffset,
        };
    }

    if (a.region === 'cervical-upper') {
        const lmRx = (a.latMassW * scale) / 2;
        const lmRy = (a.latMassH * scale) / 2;
        const halfTotal = (a.totalWidth * scale) / 2;
        const lmLeftCx = cx - halfTotal + lmRx;
        const lmRightCx = cx + halfTotal - lmRx;
        const height = Math.round(a.bodyH * scale) + VERT_PAD * 2;
        return {
            region: 'cervical-upper', left, right, cx, bw,
            latMassLeftCx: lmLeftCx, latMassRightCx: lmRightCx,
            latMassRx: lmRx, latMassRy: lmRy,
            latMassCy: height / 2,
        };
    }

    if (a.region === 'cervical-subaxial') {
        const lmRx = (a.latMassW * scale) / 2;
        const lmRy = (a.latMassH * scale) / 2;
        const lmLeftCx = left - lmRx - 2;
        const lmRightCx = right + lmRx + 2;
        const height = Math.round(a.bodyH * scale) + VERT_PAD * 2;
        const latMassCy = height / 2;
        const base: CervicalSubaxialGeom = {
            region: 'cervical-subaxial', left, right, cx, bw,
            latMassLeftCx: lmLeftCx, latMassRightCx: lmRightCx,
            latMassRx: lmRx, latMassRy: lmRy,
            latMassCy,
        };
        if (a.pedW && a.pedH) {
            const pedRx = Math.max(1.5, (a.pedW * scale / 2));
            const pedRy = Math.max(2, (a.pedH * scale / 2));
            const pedInset = (a.pedW * scale) * 0.5;
            base.pedLeftCx = left + pedInset + 3;
            base.pedRightCx = right - pedInset - 3;
            base.pedRx = pedRx;
            base.pedRy = pedRy;
            base.pedCy = VERT_PAD + pedRy + 5;
        }
        return base;
    }

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

// Per-level disc heights (mm) — disc below the named level.
// Cervical: Yu et al. 2017 (PMC5444210) posterior disc height.
// Thoracic: Back et al. 2019 ADH, interpolated between reported values.
// Lumbar: Back et al. 2019 male disc height.
const DISC_HEIGHT_MM: Record<string, number> = {
    C2: 4.5, C3: 4.6, C4: 4.6, C5: 4.2, C6: 3.8, C7: 4.5,
    T1: 4.0, T2: 3.5, T3: 3.2, T4: 3.0, T5: 3.5, T6: 4.0,
    T7: 4.5, T8: 5.2, T9: 6.0, T10: 7.2, T11: 6.0, T12: 5.6,
    L1: 6.9, L2: 8.1, L3: 8.7, L4: 9.2, L5: 8.8,
};
export const DISC_MIN_PX = 6; // minimum rendered disc zone height in pixels
export const getDiscHeight = (level: Level): number => {
    if (level.type === 'Pelvis' || level.type === 'pelvic' || level.type === 'S' || level.id === 'Oc' || level.id === 'C1') return 0;
    const mm = DISC_HEIGHT_MM[level.id];
    if (mm) return Math.round(mm * VERT_SVG_SCALE);
    return 0;
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
    vertebralLevels.forEach(level => {
        totalUnscaled += getLevelHeight(level) + getDiscHeight(level);
    });
    if (totalUnscaled <= 0) return 0.5;
    // Account for fixed per-level costs: 1px border per level, min disc zone height
    // Add top/bottom padding for breathing room (iliac crests extend above L5)
    const padding = vertebralLevels.length > 20 ? 20 : 30; // minimal padding for whole-spine view
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
    // Verify against actual buildHeightMap and shrink until it fits
    for (let j = 0; j < 5; j++) {
        const actual = buildHeightMap(vertebralLevels, scale).totalHeight;
        if (actual <= CHART_CONTENT_HEIGHT) break;
        scale *= CHART_CONTENT_HEIGHT / actual;
    }
    return Math.min(1.5, Math.max(0.3, scale));
};
