import React from 'react';
import { getLevelHeight, getVertSvgGeometry, VERT_PAD } from '../../data/anatomy';
import { InstrumentIcon } from './InstrumentIcon';
import { formatScrewSize } from '../../utils/formatScrewSize';
import type { Placement, ToolDefinition } from '../../types';

interface PelvisRegionProps {
    chartWidth: number;
    scaledWidth: number;
    vertX: number;
    heightScale: number;
    l5Y: number;
    s1Y: number;
    s2Y: number;
    clipLeft: number;
    clipRight: number;
    readOnly: boolean;
    overlay?: boolean;
    placements?: Placement[];
    ghostPlacements?: Placement[];
    tools?: ToolDefinition[];
    onZoneClick?: (levelId: string, zone: string) => void;
    onPlacementClick?: (placement: Placement) => void;
    onGhostClick?: (placement: Placement) => void;
}

/**
 * Posterior pelvis — iliac wings as background layer spanning L5 to S2.
 * Wings extend at natural proportions and are clipped to the available area
 * (between force columns). No squashing — anything beyond the clip is hidden.
 * SI joint shown as a distinct gap between sacral ala and iliac wing.
 * No bottom cut line on wings — the fill fades naturally.
 */
export const PelvisRegion: React.FC<PelvisRegionProps> = ({
    chartWidth, scaledWidth, vertX, heightScale,
    l5Y, s1Y, s2Y, clipLeft, clipRight, readOnly, overlay, placements, ghostPlacements, tools, onZoneClick, onPlacementClick, onGhostClick,
}) => {
    const s1H = getLevelHeight({ id: 'S1', type: 'S' }) * heightScale;
    const s2H = getLevelHeight({ id: 'S2', type: 'S' }) * heightScale;
    const s2Bottom = s2Y + s2H;
    const cx = vertX + scaledWidth / 2;

    // Sacral ala edges in chart coords
    const s1ChartHalfW = (100 * (130 / 54) / 160) * scaledWidth / 2;
    const s2ChartHalfW = (83 * (130 / 54) / 160) * scaledWidth / 2;

    const siLeftTop = cx - s1ChartHalfW;
    const siRightTop = cx + s1ChartHalfW;
    const siLeftBottom = cx - s2ChartHalfW * 0.80;
    const siRightBottom = cx + s2ChartHalfW * 0.80;

    const crestTopY = l5Y;
    const wingBottomY = s2Bottom + 2;

    // Natural wing extent — bi-iliac breadth ratio, NOT clamped to chart width
    const wingExtent = s1ChartHalfW * 2.7;

    // SI joint gap — distinct visible space between sacral ala and iliac wing
    const siGap = 6 * heightScale;

    const boneStroke = '#94a3b8';
    const clipId = `pelvis-clip-${Math.round(clipLeft)}-${Math.round(clipRight)}-${Math.round(s1Y)}`;

    return (
        <g>
            {/* Clip path — masks wings to the area between force columns */}
            <defs>
                <clipPath id={clipId}>
                    <rect x={clipLeft} y={crestTopY - 20 * heightScale} width={clipRight - clipLeft} height={wingBottomY - crestTopY + 30 * heightScale} />
                </clipPath>
            </defs>

            {!overlay && <g clipPath={`url(#${clipId})`}>
                {/* LEFT ILIAC WING — medial edge is straight (no convexity to overlap sacrum) */}
                <path d={`
                    M${siLeftTop - siGap},${s1Y}
                    C${siLeftTop - siGap - 15 * heightScale},${s1Y - 12 * heightScale} ${cx - wingExtent * 0.65},${crestTopY - 8 * heightScale} ${cx - wingExtent * 0.8},${crestTopY - 4 * heightScale}
                    Q${cx - wingExtent},${crestTopY + 4 * heightScale} ${cx - wingExtent},${crestTopY + 20 * heightScale}
                    Q${cx - wingExtent},${s1Y + s1H * 0.5} ${cx - wingExtent * 0.97},${s2Y + s2H * 0.4}
                    Q${cx - wingExtent * 0.9},${s2Y + s2H * 0.8} ${cx - wingExtent * 0.78},${wingBottomY}
                    L${siLeftBottom - siGap},${wingBottomY}
                    L${siLeftTop - siGap},${s1Y}
                    Z
                `} fill="#e8ecf1" fillOpacity={0.2} stroke="none" />
                {/* Wing outline — top and outer edges only */}
                <path d={`
                    M${siLeftTop - siGap},${s1Y}
                    C${siLeftTop - siGap - 15 * heightScale},${s1Y - 12 * heightScale} ${cx - wingExtent * 0.65},${crestTopY - 8 * heightScale} ${cx - wingExtent * 0.8},${crestTopY - 4 * heightScale}
                    Q${cx - wingExtent},${crestTopY + 4 * heightScale} ${cx - wingExtent},${crestTopY + 20 * heightScale}
                    Q${cx - wingExtent},${s1Y + s1H * 0.5} ${cx - wingExtent * 0.97},${s2Y + s2H * 0.4}
                    Q${cx - wingExtent * 0.9},${s2Y + s2H * 0.8} ${cx - wingExtent * 0.78},${wingBottomY}
                `} fill="none" stroke={boneStroke} strokeWidth={1 * Math.min(1, heightScale)} strokeOpacity={0.4} />
                {/* Wing medial edge — straight line, no curve */}
                <line x1={siLeftTop - siGap} y1={s1Y} x2={siLeftBottom - siGap} y2={wingBottomY}
                    stroke={boneStroke} strokeWidth={1 * Math.min(1, heightScale)} strokeOpacity={0.4} />

                {/* RIGHT ILIAC WING */}
                <path d={`
                    M${siRightTop + siGap},${s1Y}
                    C${siRightTop + siGap + 15 * heightScale},${s1Y - 12 * heightScale} ${cx + wingExtent * 0.65},${crestTopY - 8 * heightScale} ${cx + wingExtent * 0.8},${crestTopY - 4 * heightScale}
                    Q${cx + wingExtent},${crestTopY + 4 * heightScale} ${cx + wingExtent},${crestTopY + 20 * heightScale}
                    Q${cx + wingExtent},${s1Y + s1H * 0.5} ${cx + wingExtent * 0.97},${s2Y + s2H * 0.4}
                    Q${cx + wingExtent * 0.9},${s2Y + s2H * 0.8} ${cx + wingExtent * 0.78},${wingBottomY}
                    L${siRightBottom + siGap},${wingBottomY}
                    L${siRightTop + siGap},${s1Y}
                    Z
                `} fill="#e8ecf1" fillOpacity={0.2} stroke="none" />
                {/* Wing outline — top and outer only */}
                <path d={`
                    M${siRightTop + siGap},${s1Y}
                    C${siRightTop + siGap + 15 * heightScale},${s1Y - 12 * heightScale} ${cx + wingExtent * 0.65},${crestTopY - 8 * heightScale} ${cx + wingExtent * 0.8},${crestTopY - 4 * heightScale}
                    Q${cx + wingExtent},${crestTopY + 4 * heightScale} ${cx + wingExtent},${crestTopY + 20 * heightScale}
                    Q${cx + wingExtent},${s1Y + s1H * 0.5} ${cx + wingExtent * 0.97},${s2Y + s2H * 0.4}
                    Q${cx + wingExtent * 0.9},${s2Y + s2H * 0.8} ${cx + wingExtent * 0.78},${wingBottomY}
                `} fill="none" stroke={boneStroke} strokeWidth={1 * Math.min(1, heightScale)} strokeOpacity={0.4} />
                {/* Wing medial edge — straight line */}
                <line x1={siRightTop + siGap} y1={s1Y} x2={siRightBottom + siGap} y2={wingBottomY}
                    stroke={boneStroke} strokeWidth={1 * Math.min(1, heightScale)} strokeOpacity={0.4} />
            </g>}

            {/* Pelvic screws + ghost targets — rendered as overlay on top of level rows */}
            {overlay && (() => {
                // Match LevelRow ghost target size: screwPx * 0.4
                const iconScale = Math.max(0.65, Math.min(1.3, heightScale));
                const screwPx = Math.round(24 * iconScale);
                const r = screwPx * 0.4;
                const fontSize = Math.max(5, 7 * heightScale);

                // S1/S2 foramina X — ~38mm apart for S1
                const foramenHalfSpacing = 38 * (130 / 54) / 160 * scaledWidth / 2;

                // S2AI entry: midpoint between S1 and S2 foramen, just LATERAL to foramen
                // but MEDIAL to SI joint. Moved up slightly from S1/S2 junction.
                const s2aiY = s1Y + s1H * 0.85 + r * 0.5;
                const s2aiLeftX = cx - foramenHalfSpacing - r * 3.0;
                const s2aiRightX = cx + foramenHalfSpacing + r * 3.0;

                // S2AI trajectory: lateral and caudal, line starts at circle edge
                const arrowLen = r * 5.3;
                const s2aiArrow = (x: number, y: number, dirX: number, color: string) => {
                    // Direction vector: lateral (dirX) and caudal (0.4 ratio)
                    const dx = dirX * arrowLen;
                    const dy = arrowLen * 0.4;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const nx = dx / len; // unit vector
                    const ny = dy / len;
                    // Start at circle edge, end at arrowLen
                    const startX = x + nx * r;
                    const startY = y + ny * r;
                    const endX = x + dx;
                    const endY = y + dy;
                    // Arrowhead: rotated triangle aligned with direction
                    const headLen = 7;
                    const headW = 4;
                    // Perpendicular to direction
                    const px = -ny * headW;
                    const py = nx * headW;
                    const baseX = endX - nx * headLen;
                    const baseY = endY - ny * headLen;
                    return (
                        <g>
                            <line x1={startX} y1={startY} x2={baseX} y2={baseY} stroke={color} strokeWidth={1.5} />
                            <path d={`M${endX},${endY} L${baseX + px},${baseY + py} L${baseX - px},${baseY - py} Z`} fill={color} />
                        </g>
                    );
                };

                // Iliac screw entry: at PSIS (~S2 level), in the iliac wing body
                // Offset by one screw width laterally so they sit further out on the wing
                const iliacY = s2Y + s2H * 0.4;
                const iliacLeftX = cx - wingExtent * 0.5 - screwPx;
                const iliacRightX = cx + wingExtent * 0.5 + screwPx;

                // SI fusion: clickable zone highlighting the SI joint at S1 and upper S2
                const siZoneTop = s1Y;
                const siZoneBottom = s2Y + s2H * 0.5;
                const siY = (siZoneTop + siZoneBottom) / 2; // midpoint for placed screw rendering

                const hitR = r * 1.8; // larger hit area
                const ghostTarget = (x: number, y: number, label: string, levelId: string, zone: string, side?: 'left' | 'right') => (
                    <g key={`${levelId}-${zone}`} cursor="crosshair"
                        onClick={(e) => { e.stopPropagation(); onZoneClick?.(levelId, zone); }}>
                        {/* Hit area with hover highlight */}
                        <circle cx={x} cy={y} r={hitR} fill="transparent"
                            onMouseEnter={(e) => (e.target as SVGCircleElement).setAttribute('fill', 'rgba(148, 163, 184, 0.15)')}
                            onMouseLeave={(e) => (e.target as SVGCircleElement).setAttribute('fill', 'transparent')} />
                        <g opacity={0.5} pointerEvents="none">
                            <circle cx={x} cy={y} r={r} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" />
                            <circle cx={x} cy={y} r={1.5} fill="#94a3b8" />
                            {side ? (
                                <text x={side === 'left' ? x - r - 3 : x + r + 3} y={y + fontSize * 0.35}
                                    textAnchor={side === 'left' ? 'end' : 'start'} fontSize={fontSize}
                                    fontWeight="bold" fill="#94a3b8" fontFamily="Inter, sans-serif">{label}</text>
                            ) : (
                                <text x={x} y={y + r + fontSize + 1} textAnchor="middle" fontSize={fontSize}
                                    fontWeight="bold" fill="#94a3b8" fontFamily="Inter, sans-serif">{label}</text>
                            )}
                        </g>
                    </g>
                );

                // S2AI ghost with trajectory arrow
                const s2aiTarget = (x: number, y: number, levelId: string, zone: string, dirX: number) => (
                    <g key={`${levelId}-${zone}`} cursor="crosshair"
                        onClick={(e) => { e.stopPropagation(); onZoneClick?.(levelId, zone); }}>
                        <circle cx={x} cy={y} r={hitR} fill="transparent"
                            onMouseEnter={(e) => (e.target as SVGCircleElement).setAttribute('fill', 'rgba(245, 158, 11, 0.15)')}
                            onMouseLeave={(e) => (e.target as SVGCircleElement).setAttribute('fill', 'transparent')} />
                        <g opacity={0.5} pointerEvents="none">
                            <circle cx={x} cy={y} r={r} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" />
                            <circle cx={x} cy={y} r={1.5} fill="#94a3b8" />
                            {s2aiArrow(x, y, dirX, '#94a3b8')}
                            <text x={x} y={y + r + fontSize + 1} textAnchor="middle" fontSize={fontSize}
                                fontWeight="bold" fill="#94a3b8" fontFamily="Inter, sans-serif">S2AI</text>
                        </g>
                    </g>
                );

                // SI fusion zone — angled zone following the SI joint line
                const siZone = (topX: number, bottomX: number, levelId: string, zone: string) => {
                    const halfW = 10 * heightScale;
                    const pathD = `
                        M${topX - halfW},${siZoneTop}
                        L${topX + halfW},${siZoneTop}
                        L${bottomX + halfW},${siZoneBottom}
                        L${bottomX - halfW},${siZoneBottom}
                        Z`;
                    return (
                        <g key={`${levelId}-${zone}`} cursor="crosshair"
                            onClick={(e) => { e.stopPropagation(); onZoneClick?.(levelId, zone); }}>
                            {/* Hit area with hover */}
                            <path d={pathD} fill="transparent"
                                onMouseEnter={(e) => (e.target as SVGPathElement).setAttribute('fill', 'rgba(225, 29, 72, 0.12)')}
                                onMouseLeave={(e) => (e.target as SVGPathElement).setAttribute('fill', 'transparent')} />
                            <g opacity={0.5} pointerEvents="none">
                                <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
                            </g>
                        </g>
                    );
                };

                // S1 pedicle screw positions — same medial shift as LevelRow
                const s1Geom = getVertSvgGeometry('S1');
                const s2Geom = getVertSvgGeometry('S2');
                // S1/S2 pedicle screws at anatomical position — no medial shift needed
                // (pelvic fixation targets are on their own levels now, not crammed onto S1)
                const s1PedLeftX = s1Geom ? vertX + (s1Geom.pedLeftCx / 160) * scaledWidth : cx - 20;
                const s1PedRightX = s1Geom ? vertX + (s1Geom.pedRightCx / 160) * scaledWidth : cx + 20;
                const s1ViewH = getLevelHeight({ id: 'S1', type: 'S' });
                const s1PedViewY = s1Geom ? VERT_PAD + s1Geom.pedRy + 5 : s1ViewH / 2;
                const s1PedY = s1Y + (s1PedViewY / s1ViewH) * s1H;

                const s2PedLeftX = s1PedLeftX; // aligned below S1
                const s2PedRightX = s1PedRightX;
                const s2ViewH = getLevelHeight({ id: 'S2', type: 'S' });
                const s2PedViewY = s2Geom ? VERT_PAD + s2Geom.pedRy + 5 : s2ViewH / 2;
                const s2PedY = s2Y + (s2PedViewY / s2ViewH) * s2H;

                const findPlacement = (levelId: string, zone: string) =>
                    placements?.find(p => p.levelId === levelId && p.zone === zone);
                const findGhost = (levelId: string, zone: string) =>
                    !findPlacement(levelId, zone) ? ghostPlacements?.find(p => p.levelId === levelId && p.zone === zone) : undefined;

                const hasS1Left = findPlacement('S1', 'left');
                const hasS1Right = findPlacement('S1', 'right');
                const hasS2Left = findPlacement('S2', 'left');
                const hasS2Right = findPlacement('S2', 'right');
                const ghostS1Left = findGhost('S1', 'left');
                const ghostS1Right = findGhost('S1', 'right');
                const ghostS2Left = findGhost('S2', 'left');
                const ghostS2Right = findGhost('S2', 'right');

                const iW = screwPx;
                const iH = screwPx;
                // Pelvic screw size text — smaller than lumbar to avoid clashing at small scales
                const labelScale = Math.max(0.9, Math.min(1.2, Math.pow(heightScale, 0.3)));
                const labelPx = Math.max(13, Math.min(16, Math.round(15 * labelScale)));

                // Text positioning per zone type:
                // 'right-of' = text to the right of icon (for left-side screws)
                // 'left-of' = text to the left (for right-side screws)
                // 'above' = text above icon (SI)
                // 'below' = text below (fallback)
                type TextPos = { tx: number; ty: number; anchor: 'start' | 'middle' | 'end' };
                const textPos = (x: number, y: number, side: 'left' | 'right', variant: Variant): TextPos => {
                    if (variant === 'iliac') {
                        const lateralOffset = iW / 2 + 3;
                        return side === 'left'
                            ? { tx: x - lateralOffset, ty: y + iH / 2 + labelPx * 0.5, anchor: 'end' }
                            : { tx: x + lateralOffset, ty: y + iH / 2 + labelPx * 0.5, anchor: 'start' };
                    }
                    // S2: lower outer quadrant — below and lateral
                    if (variant === 's2') {
                        const lateralOffset = iW / 2 + 3;
                        return side === 'left'
                            ? { tx: x - lateralOffset, ty: y + iH / 2 + labelPx * 0.5, anchor: 'end' }
                            : { tx: x + lateralOffset, ty: y + iH / 2 + labelPx * 0.5, anchor: 'start' };
                    }
                    // Text on the LATERAL side (away from midline), in line with icon
                    if (side === 'left') {
                        return { tx: x - iW / 2 - 3, ty: y + labelPx * 0.35, anchor: 'end' };
                    }
                    return { tx: x + iW / 2 + 3, ty: y + labelPx * 0.35, anchor: 'start' };
                };

                type Variant = 'standard' | 's2' | 'si' | 'iliac' | 's2ai_left' | 's2ai_right';
                const siIconScale = 0.75; // SI screws slightly smaller
                const siLabelPx = Math.round(labelPx * 0.8);

                // Render a placed screw icon with positioned label
                // Tiny "Iliac" label font size — small but readable
                const iliacLabelPx = Math.max(6, Math.round(8 * heightScale));

                const placedScrew = (x: number, y: number, p: Placement, side: 'left' | 'right', variant: Variant = 'standard') => {
                    const tool = tools?.find(t => t.id === p.tool);
                    const isSi = variant === 'si';
                    const isS2ai = variant === 's2ai_left' || variant === 's2ai_right';
                    const sW = isSi ? Math.round(iW * siIconScale) : iW;
                    const sH = isSi ? Math.round(iH * siIconScale) : iH;
                    const fPx = isSi ? siLabelPx : labelPx;
                    const tp = textPos(x, y, side, variant);
                    const dirX = variant === 's2ai_left' ? -1 : variant === 's2ai_right' ? 1 : 0;
                    return (
                        <g key={p.id} cursor={readOnly ? 'default' : 'pointer'}
                            onClick={(e) => { e.stopPropagation(); if (!readOnly && onPlacementClick) onPlacementClick(p); }}>
                            <svg x={x - sW / 2} y={y - sH / 2} width={sW} height={sH} overflow="visible">
                                <InstrumentIcon type={tool?.icon || 'polyaxial'} className="w-full h-full" side={side} />
                            </svg>
                            {isS2ai && s2aiArrow(x, y, dirX, '#475569')}
                            {p.data && typeof p.data === 'string' && (
                                <text x={tp.tx} y={tp.ty} textAnchor={tp.anchor} fontSize={fPx}
                                    fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">
                                    {formatScrewSize(p.data as string)}
                                </text>
                            )}
                            {variant === 'iliac' && (
                                <text x={side === 'left' ? x - iW / 2 - 3 : x + iW / 2 + 3}
                                    y={y + iliacLabelPx * 0.35} textAnchor={side === 'left' ? 'end' : 'start'}
                                    fontSize={iliacLabelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">Iliac</text>
                            )}
                            {variant === 'si' && (
                                <text x={side === 'left' ? x + sW / 2 + 3 : x - sW / 2 - 3}
                                    y={y + iliacLabelPx * 0.35} textAnchor={side === 'left' ? 'start' : 'end'}
                                    fontSize={iliacLabelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">SI-J</text>
                            )}
                        </g>
                    );
                };

                // Render a ghost (teal) screw from plan
                const ghostScrew = (x: number, y: number, p: Placement, side: 'left' | 'right', variant: Variant = 'standard') => {
                    const tool = tools?.find(t => t.id === p.tool);
                    const isSi = variant === 'si';
                    const isS2ai = variant === 's2ai_left' || variant === 's2ai_right';
                    const sW = isSi ? Math.round(iW * siIconScale) : iW;
                    const sH = isSi ? Math.round(iH * siIconScale) : iH;
                    const fPx = isSi ? siLabelPx : labelPx;
                    const tp = textPos(x, y, side, variant);
                    const dirX = variant === 's2ai_left' ? -1 : variant === 's2ai_right' ? 1 : 0;
                    return (
                        <g key={'ghost-' + p.id} opacity={0.75} cursor="pointer"
                            onClick={(e) => { e.stopPropagation(); if (onGhostClick) onGhostClick(p); }}>
                            <svg x={x - sW / 2} y={y - sH / 2} width={sW} height={sH} overflow="visible">
                                <InstrumentIcon type={tool?.icon || 'polyaxial'} className="w-full h-full" color="#14b8a6" side={side} />
                            </svg>
                            {isS2ai && s2aiArrow(x, y, dirX, '#14b8a6')}
                            {p.data && typeof p.data === 'string' && (
                                <text x={tp.tx} y={tp.ty} textAnchor={tp.anchor} fontSize={fPx}
                                    fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">
                                    {formatScrewSize(p.data as string)}
                                </text>
                            )}
                            {variant === 'iliac' && (
                                <text x={side === 'left' ? x - iW / 2 - 3 : x + iW / 2 + 3}
                                    y={y + iliacLabelPx * 0.35} textAnchor={side === 'left' ? 'end' : 'start'}
                                    fontSize={iliacLabelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">Iliac</text>
                            )}
                            {variant === 'si' && (
                                <text x={side === 'left' ? x + sW / 2 + 3 : x - sW / 2 - 3}
                                    y={y + iliacLabelPx * 0.35} textAnchor={side === 'left' ? 'start' : 'end'}
                                    fontSize={iliacLabelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">SI-J</text>
                            )}
                        </g>
                    );
                };

                // Render: placed > ghost > empty ghost target (targets only when interactive)
                const renderZone = (x: number, y: number, levelId: string, zone: string, side: 'left' | 'right', variant: Variant, emptyRenderer: () => React.ReactElement) => {
                    const placed = findPlacement(levelId, zone);
                    if (placed) return placedScrew(x, y, placed, side, variant);
                    const ghost = findGhost(levelId, zone);
                    if (ghost) return ghostScrew(x, y, ghost, side, variant);
                    if (readOnly) return null;
                    return emptyRenderer();
                };

                return (
                    <g>
                        {/* S1 pedicle screws */}
                        {renderZone(s1PedLeftX, s1PedY, 'S1', 'left', 'left', 'standard', () => ghostTarget(s1PedLeftX, s1PedY, 'S1', 'S1', 'left'))}
                        {renderZone(s1PedRightX, s1PedY, 'S1', 'right', 'right', 'standard', () => ghostTarget(s1PedRightX, s1PedY, 'S1', 'S1', 'right'))}
                        {/* S2 pedicle screws */}
                        {renderZone(s2PedLeftX, s2PedY, 'S2', 'left', 'left', 's2', () => ghostTarget(s2PedLeftX, s2PedY, 'S2', 'S2', 'left'))}
                        {renderZone(s2PedRightX, s2PedY, 'S2', 'right', 'right', 's2', () => ghostTarget(s2PedRightX, s2PedY, 'S2', 'S2', 'right'))}
                        {/* S2AI */}
                        {renderZone(s2aiLeftX, s2aiY, 'S2AI', 'left', 'left', 's2ai_left', () => s2aiTarget(s2aiLeftX, s2aiY, 'S2AI', 'left', -1))}
                        {renderZone(s2aiRightX, s2aiY, 'S2AI', 'right', 'right', 's2ai_right', () => s2aiTarget(s2aiRightX, s2aiY, 'S2AI', 'right', 1))}
                        {/* Iliac */}
                        {renderZone(iliacLeftX, iliacY, 'Iliac', 'left', 'left', 'iliac', () => ghostTarget(iliacLeftX, iliacY, 'Iliac', 'Iliac', 'left', 'left'))}
                        {renderZone(iliacRightX, iliacY, 'Iliac', 'right', 'right', 'iliac', () => ghostTarget(iliacRightX, iliacY, 'Iliac', 'Iliac', 'right', 'right'))}
                        {/* SI fusion — medial to SI joint */}
                        {renderZone(siLeftTop + r * 2 + r, siZoneTop + (siZoneBottom - siZoneTop) * 0.3 + r, 'SI-J', 'left', 'left', 'si', () => siZone(siLeftTop - siGap, siLeftBottom - siGap, 'SI-J', 'left'))}
                        {renderZone(siRightTop - r * 2 - r, siZoneTop + (siZoneBottom - siZoneTop) * 0.3 + r, 'SI-J', 'right', 'right', 'si', () => siZone(siRightTop + siGap, siRightBottom + siGap, 'SI-J', 'right'))}
                    </g>
                );
            })()}
        </g>
    );
};
