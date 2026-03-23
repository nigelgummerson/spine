// SECTION 3: RENDERERS
// ==========================================

export const REGIONS = {
    Oc: { height: 25, color: '#f1f5f9' },
    C: { height: 24, color: '#f1f5f9' },
    T: { height: 36, color: '#f1f5f9' },
    L: { height: 46, color: '#f1f5f9' },
    S: { height: 52, color: '#f1f5f9' },
    Pelvis: { height: 56, color: '#f1f5f9' }
};

// Anatomical dimensions (mm): bodyW/bodyH from X-ray measurements interpolated
// between anchors T2(36x20), T12(48x30), L4(60x36).
// Pedicle data from Lien et al. 2007 (Eur Spine J, PMC2200778) - averaged L/R.
// Lumbar pedH cross-checked against Zindrick 1987 (Spine 12:160-166).
export const VERTEBRA_ANATOMY = {
    T1:  { bodyW: 34.8, bodyH: 19.0, pedW: 7.7, pedH:  8.7 },
    T2:  { bodyW: 36.0, bodyH: 20.0, pedW: 5.5, pedH: 10.3 },
    T3:  { bodyW: 37.2, bodyH: 21.0, pedW: 4.0, pedH: 10.4 },
    T4:  { bodyW: 38.4, bodyH: 22.0, pedW: 3.5, pedH: 10.3 },
    T5:  { bodyW: 39.6, bodyH: 23.0, pedW: 3.8, pedH: 10.6 },
    T6:  { bodyW: 40.8, bodyH: 24.0, pedW: 4.0, pedH: 10.2 },
    T7:  { bodyW: 42.0, bodyH: 25.0, pedW: 4.4, pedH: 10.4 },
    T8:  { bodyW: 43.2, bodyH: 26.0, pedW: 4.8, pedH: 10.9 },
    T9:  { bodyW: 44.4, bodyH: 27.0, pedW: 5.3, pedH: 12.4 },
    T10: { bodyW: 45.6, bodyH: 28.0, pedW: 5.7, pedH: 13.7 },
    T11: { bodyW: 46.8, bodyH: 29.0, pedW: 7.2, pedH: 15.1 },
    T12: { bodyW: 48.0, bodyH: 30.0, pedW: 7.6, pedH: 15.1 },
    L1:  { bodyW: 51.0, bodyH: 31.5, pedW: 6.5, pedH: 13.7 },
    L2:  { bodyW: 54.0, bodyH: 33.0, pedW: 7.2, pedH: 14.1 },
    L3:  { bodyW: 57.0, bodyH: 34.5, pedW: 9.2, pedH: 13.9 },
    L4:  { bodyW: 60.0, bodyH: 36.0, pedW: 11.9, pedH: 12.8 },
    L5:  { bodyW: 63.0, bodyH: 35.0, pedW: 17.6, pedH: 12.5 },
    S1:  { bodyW: 66.0, bodyH: 34.0, pedW: 20.0, pedH: 14.0 },
};

// Per-level SVG height: use same mm-to-SVG scale as width (130/66 ≈ 1.97) for correct aspect ratio
// Add padding (6 SVG units) so body path doesn't touch viewBox edges
export const VERT_SVG_SCALE = 130 / 66.0; // same scale for width and height
export const VERT_PAD = 3; // top/bottom padding in SVG units
export const getLevelHeight = (level) => {
    const a = VERTEBRA_ANATOMY[level.id];
    if (a) return Math.round(a.bodyH * VERT_SVG_SCALE) + VERT_PAD * 2;
    return REGIONS[level.type].height;
};

// Convert mm anatomy data to SVG coordinates within the 160-unit viewBox
export const getVertSvgGeometry = (levelId) => {
    const a = VERTEBRA_ANATOMY[levelId];
    if (!a) return null;
    const maxBodySvg = 130;
    const maxBodyMm = 66.0;
    const scale = maxBodySvg / maxBodyMm;
    const bw = a.bodyW * scale;
    const cx = 80;
    const left = cx - bw / 2;
    const right = cx + bw / 2;
    // Pedicle positions: inset from body edge
    const pedInset = (a.pedW * scale) * 0.5;
    const pedLeftCx = left + pedInset + 5;
    const pedRightCx = right - pedInset - 5;
    // Pedicle radii: scaled down for schematic (not anatomically literal)
    // pedRx = transverse (width), pedRy = sagittal (height)
    const pedScale = 1.0;
    const pedRx = Math.max(1.5, (a.pedW * scale / 2) * pedScale);
    const pedRy = Math.max(2, (a.pedH * scale / 2) * pedScale);
    const isLumbar = levelId.startsWith('L') || levelId === 'S1';
    return { left, right, cx, bw, pedLeftCx, pedRightCx, pedRx, pedRy, isLumbar };
};

export const ALL_LEVELS = [
    { id: 'Oc', type: 'Oc' },
    ...['C1','C2','C3','C4','C5','C6','C7'].map(id => ({ id, type: 'C' })),
    ...['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(id => ({ id, type: 'T' })),
    ...['L1','L2','L3','L4','L5'].map(id => ({ id, type: 'L' })),
    { id: 'S1', type: 'S' },
    { id: 'Pelvis', type: 'Pelvis' },
];

// Disc height varies by region: lumbar ~30% body height, thoracic ~18%, cervical ~5mm
export const DISC_MIN_PX = 8; // minimum rendered disc zone height in pixels
export const getDiscHeight = (level) => {
    if (level.type === 'Pelvis' || level.type === 'S' || level.id === 'Oc' || level.id === 'C1') return 0;
    const h = getLevelHeight(level);
    if (level.type === 'L') return Math.round(h * 0.30);
    if (level.type === 'T') return Math.round(h * 0.18);
    return Math.round(5 * VERT_SVG_SCALE); // cervical ~5mm
};

export const buildHeightMap = (lvls, hScale) => {
    let y = 0;
    const map = [];
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

export const levelToYNorm = (levelId) => {
    const entry = WHOLE_SPINE_MAP.map.find(e => e.levelId === levelId);
    if (!entry) return 500;
    const midY = (entry.startY + entry.vertEnd) / 2;
    return (midY / WHOLE_SPINE_MAP.totalHeight) * 1000;
};

export const yNormToRenderedY = (yNorm, viewLevels, hScale) => {
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

export const renderedYToYNorm = (renderedY, viewLevels, hScale) => {
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
export const calculateAutoScale = (levels) => {
    let totalUnscaled = 0;
    let discCount = 0;
    levels.forEach(level => {
        totalUnscaled += getLevelHeight(level) + getDiscHeight(level);
        if (getDiscHeight(level) > 0) discCount++;
    });
    if (totalUnscaled <= 0) return 0.5;
    // Account for fixed per-level costs: 1px border per level, min disc zone height
    const borderCost = levels.length; // 1px border-b per level
    const available = CHART_CONTENT_HEIGHT - borderCost;
    // Iterative: disc zones have min DISC_MIN_PX, so solve for scale
    // where scaled disc heights below DISC_MIN_PX get clamped
    let scale = available / totalUnscaled;
    for (let i = 0; i < 3; i++) {
        let minHeightExtra = 0;
        levels.forEach(level => {
            const dh = getDiscHeight(level);
            if (dh > 0 && dh * scale < DISC_MIN_PX) {
                minHeightExtra += DISC_MIN_PX - dh * scale;
            }
        });
        scale = (available - minHeightExtra) / totalUnscaled;
    }
    return Math.min(1.5, Math.max(0.5, scale));
};
