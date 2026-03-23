import React from 'react';
import { t } from '../../i18n/i18n';
import { getVertSvgGeometry } from '../../data/anatomy';

interface CageVisualizationProps {
    cageType: string;
    heightScale: number;
    levelId: string;
}

export const CageVisualization = ({ cageType, heightScale, levelId }: CageVisualizationProps) => {
    const h = 12 * heightScale;
    const color = "#0ea5e9";
    const geom = getVertSvgGeometry(levelId);
    const l = geom ? geom.left : 30;
    const r = geom ? geom.right : 130;
    const bw = r - l;
    const ann = 3; // annulus margin each side
    // PLIF: ~10mm each cage ≈ 20 SVG units, bilateral
    const plifW = Math.min(20, bw * 0.18);
    const plifGap = bw * 0.08;
    // ACDF: ~14mm ≈ 28 SVG units
    const acdfW = Math.min(28, bw * 0.55);
    // TLIF: banana curve ~60% of body width
    const tlifHalf = bw * 0.3;

    switch (cageType) {
        case 'plif': return <g><rect x={80 - plifGap/2 - plifW} y="2" width={plifW} height={h} rx="1" fill={color} opacity="0.8" /><rect x={80 + plifGap/2} y="2" width={plifW} height={h} rx="1" fill={color} opacity="0.8" /></g>;
        case 'tlif': return <path d={`M${80 - tlifHalf},2 Q80,${h+5} ${80 + tlifHalf},2`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />;
        case 'acdf': return <rect x={80 - acdfW/2} y="2" width={acdfW} height={h} rx="2" fill={color} opacity="0.9" />;
        case 'xlif': { const oh = 4; return <rect x={l - oh} y="2" width={bw + oh*2} height={h} rx="2" fill={color} opacity="0.6" />; }
        case 'olif': return <rect x={l + ann} y="2" width={bw - ann*2} height={h} rx="2" fill={color} opacity="0.7" />;
        case 'alif': return <rect x={l + ann} y="2" width={bw - ann*2} height={h} rx="2" fill={color} opacity="0.7" />;
        default: return <rect x={80 - acdfW/2} y="2" width={acdfW} height={h} fill={color} />;
    }
};
