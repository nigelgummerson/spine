import React from 'react';
import { t } from '../../i18n/i18n';
import { getDiscHeight, getLevelHeight, getVertSvgGeometry, DISC_MIN_PX, VERT_PAD, VERT_SVG_SCALE } from '../../data/anatomy';
import { HOOK_TYPES, FORCE_TYPES, getTrajectoryAngle, projectScrewShank, getEntryPointOffset, getTrajectoryOptions } from '../../data/clinical';
const FIXATION_TYPES = ['band', 'wire', 'cable'];
import { InstrumentIcon } from './InstrumentIcon';
import { SpineVertebra } from './SpineVertebra';
import { CageVisualization } from './CageVisualization';
import { measureText } from '../../utils/measureText';
import { formatScrewSize } from '../../utils/formatScrewSize';
import type { Placement, Cage, Level, ToolDefinition, OsteotomyData } from '../../types';

export interface LevelRowProps {
    level: Level;
    placements: Placement[];
    ghostPlacements?: Placement[];
    onZoneClick: (levelId: string, zone: string) => void;
    tools: ToolDefinition[];
    onPlacementClick: (placement: Placement) => void;
    onGhostClick?: (placement: Placement) => void;
    readOnly: boolean;
    showForces: boolean;
    heightScale: number;
    onDiscClick: (levelId: string) => void;
    cages: Cage[];
    levels: Level[];
    viewMode: string;
    forcePlacements?: Placement[];
    ghostCages?: Cage[];
    onGhostCageClick?: (cage: Cage) => void;
    // Layout props from ChartPaper
    chartWidth: number;
    rowY: number;
    // Fixed label alignment — outer boundary of widest level in 160-unit SVG coordinates
    labelBoundary?: { left: number; right: number };
    // Keyboard navigation focus
    focusedZone?: 'left' | 'right' | 'mid';
}

/** SVG-native level row — renders as a <g> group at a given Y offset */
export const LevelRow: React.FC<LevelRowProps> = React.memo(({ level, placements, ghostPlacements, onZoneClick, tools, onPlacementClick, onGhostClick, readOnly, showForces, heightScale, onDiscClick, cages, levels, viewMode, forcePlacements, ghostCages, onGhostCageClick, chartWidth, rowY, labelBoundary, focusedZone }) => {
    const getItems = (z: string) => {
        const src = (forcePlacements && z.startsWith('force')) ? forcePlacements : placements;
        return src.filter(p => p.levelId === level.id && p.zone === z);
    };
    const rowHeight = getLevelHeight(level) * heightScale;
    const scaledWidth = 160 * heightScale;

    // Scaled instrument sizes — cervical levels get 25% smaller (clinically appropriate)
    const isCervical = level.type === 'C' || level.type === 'Oc';
    const cervicalFactor = isCervical ? 0.75 : 1;
    const baseIconScale = Math.max(0.65, Math.min(1.3, heightScale));
    const iconScale = baseIconScale * cervicalFactor;
    const screwPx = Math.round(24 * iconScale);
    const baseScrewPx = Math.round(24 * baseIconScale); // for consistent zone centre alignment
    const hookW = Math.round(34 * iconScale);
    const hookH = Math.round(22 * iconScale);
    const fixW = Math.round(40 * iconScale);
    const fixH = Math.round(18 * iconScale);
    const osteoPx = Math.round(32 * iconScale);
    const midPx = Math.round(36 * iconScale);
    const labelScale = Math.max(0.9, Math.min(1.2, Math.pow(heightScale, 0.3)));
    const labelPxBase = Math.max(15, Math.min(18, Math.round(16 * labelScale)));
    const labelPx = isCervical ? labelPxBase : Math.max(19, Math.min(22, Math.round(20 * labelScale)));
    const cageLabelPx = Math.max(14, Math.min(17, Math.round(15 * labelScale)));
    const osteoLabelPx = Math.max(13, Math.min(16, Math.round(15 * labelScale)));

    // Layout: calculate column x positions
    const forceW = showForces ? 56 : 0;
    const sideZoneW = (chartWidth - scaledWidth - 2 * forceW) / 2;
    const forceLeftX = 0;
    const leftZoneX = forceW;
    const vertX = leftZoneX + sideZoneW;
    const rightZoneX = vertX + scaledWidth;
    const forceRightX = chartWidth - forceW;

    // Check if Corpectomy
    const isCorpectomy = placements.some(p => p.levelId === level.id && typeof p.data === 'object' && p.data !== null && (p.data as OsteotomyData).type === 'Corpectomy');

    // Check for Cage below this level
    const cageBelow = cages.find(c => c.levelId === level.id);
    const ghostCageBelow = !cageBelow && ghostCages ? ghostCages.find(c => c.levelId === level.id) : null;
    // Check for disc-level osteotomy (Schwab 1-2)
    const discOsteo = placements.find(p => p.levelId === level.id && p.zone === 'disc');
    const ghostDiscOsteo = !discOsteo && ghostPlacements ? ghostPlacements.find(p => p.levelId === level.id && p.zone === 'disc') : null;

    // Disc height
    const rawDiscH = getDiscHeight(level) * heightScale;
    const hasDisc = level.type !== 'Pelvis' && level.type !== 'S' && level.id !== 'Oc' && level.id !== 'C1';
    const discH = hasDisc && rawDiscH > 0 ? Math.max(DISC_MIN_PX, rawDiscH) : 0;

    /** Render an instrument icon as a nested SVG */
    const renderIcon = (type: string, x: number, y: number, w: number, h: number, colorOrProps?: string | React.SVGAttributes<SVGSVGElement>, side?: 'left' | 'right') => {
        const color = typeof colorOrProps === 'string' ? colorOrProps : undefined;
        const extraProps = typeof colorOrProps === 'object' ? colorOrProps : undefined;
        return (
            <svg x={x} y={y} width={w} height={h} overflow="visible" {...extraProps}>
                <InstrumentIcon type={type} className="w-full h-full" color={color} side={side} />
            </svg>
        );
    };

    /** Render a ghost target (empty zone indicator) */
    const renderGhostTarget = (cx: number, cy: number, isForce: boolean, zoneName?: string) => {
        if (isForce) {
            // Cardinal icon for force zones
            return (
                <svg x={cx - 10} y={cy - 10} width={20} height={20} viewBox="0 0 24 24" opacity={0.4} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <path d="M12 3v18"/><path d="M3 12h18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/><path d="M17 8l4 4-4 4"/><path d="M7 8l-4 4 4 4"/>
                </svg>
            );
        }
        const r = screwPx * 0.4;
        return (
            <g opacity={0.6} data-ghost-zone={zoneName} data-ghost-level={level.id}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" />
                <circle cx={cx} cy={cy} r={1.5} fill="#94a3b8" />
            </g>
        );
    };

    // Compute screw zone position in chart coordinates from anatomy data
    const geom = getVertSvgGeometry(level.id);
    const viewBoxHeight = getLevelHeight(level);

    // Determine screw zone vertical centre based on region
    let viewBoxScrewCy: number;
    if (geom && (geom.region === 'thoracic' || geom.region === 'lumbar' || geom.region === 'sacral')) {
        viewBoxScrewCy = geom.pedCy;
    } else if (geom && geom.region === 'cervical-subaxial' && geom.pedCy) {
        // C7: use pedCy from geometry (same formula as thoracic — upper portion of body)
        viewBoxScrewCy = geom.pedCy;
    } else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
        // C3-C6: lower quadrant of lateral mass — shift 30% of lateral mass height downward
        viewBoxScrewCy = geom.latMassCy + geom.latMassRy * 0.3;
    } else {
        viewBoxScrewCy = viewBoxHeight / 2;
    }
    const chartScrewCy = (viewBoxScrewCy / viewBoxHeight) * rowHeight;

    // Screw zone X positions — sacral screws aligned under L5 pedicles (not S1 anatomical position)
    const isSacral = level.type === 'S';
    const l5GeomRaw = getVertSvgGeometry('L5');
    const l5Geom = l5GeomRaw && l5GeomRaw.region === 'lumbar' ? l5GeomRaw : null;
    const l5LeftX = l5Geom ? vertX + (l5Geom.pedLeftCx / 160) * scaledWidth : undefined;
    const l5RightX = l5Geom ? vertX + (l5Geom.pedRightCx / 160) * scaledWidth : undefined;

    let chartScrewLeftCx: number | undefined;
    let chartScrewRightCx: number | undefined;
    if (isSacral) {
        chartScrewLeftCx = l5LeftX;
        chartScrewRightCx = l5RightX;
    } else if (geom && (geom.region === 'thoracic' || geom.region === 'lumbar')) {
        chartScrewLeftCx = vertX + (geom.pedLeftCx / 160) * scaledWidth;
        chartScrewRightCx = vertX + (geom.pedRightCx / 160) * scaledWidth;
    } else if (geom && geom.region === 'occiput') {
        chartScrewLeftCx = vertX + (geom.screwLeftCx / 160) * scaledWidth;
        chartScrewRightCx = vertX + (geom.screwRightCx / 160) * scaledWidth;
    } else if (geom && geom.region === 'cervical-upper') {
        chartScrewLeftCx = vertX + (geom.latMassLeftCx / 160) * scaledWidth;
        chartScrewRightCx = vertX + (geom.latMassRightCx / 160) * scaledWidth;
    } else if (geom && geom.region === 'cervical-subaxial') {
        if (geom.pedLeftCx !== undefined && geom.pedRightCx !== undefined) {
            // C7: use pedicle positions
            chartScrewLeftCx = vertX + (geom.pedLeftCx / 160) * scaledWidth;
            chartScrewRightCx = vertX + (geom.pedRightCx / 160) * scaledWidth;
        } else {
            // C3-C6: lateral mass screw entry point — lower medial quadrant
            const medialOffset = geom.latMassRx * 0.3 * (scaledWidth / 160);
            const chartLmLeftCx = vertX + (geom.latMassLeftCx / 160) * scaledWidth;
            const chartLmRightCx = vertX + (geom.latMassRightCx / 160) * scaledWidth;
            chartScrewLeftCx = chartLmLeftCx + medialOffset;   // medial = toward midline = +X for left
            chartScrewRightCx = chartLmRightCx - medialOffset; // medial = toward midline = -X for right
        }
    }

    // Body edges and TP edges in chart coordinates — for zone boundaries and label positioning
    const chartBodyLeft = geom ? vertX + (geom.left / 160) * scaledWidth : vertX;
    const chartBodyRight = geom ? vertX + (geom.right / 160) * scaledWidth : vertX + scaledWidth;
    // Outer edge = TP tip for T/L, lateral mass edge for cervical, body edge for others
    let chartOuterLeft = chartBodyLeft;
    let chartOuterRight = chartBodyRight;
    if (geom && (geom.region === 'thoracic' || geom.region === 'lumbar')) {
        chartOuterLeft = vertX + (geom.tpLeftX / 160) * scaledWidth;
        chartOuterRight = vertX + (geom.tpRightX / 160) * scaledWidth;
    } else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
        chartOuterLeft = vertX + ((geom.latMassLeftCx - geom.latMassRx) / 160) * scaledWidth;
        chartOuterRight = vertX + ((geom.latMassRightCx + geom.latMassRx) / 160) * scaledWidth;
    }
    // Fixed label edge — aligned to widest level in the view for consistent label columns
    const labelEdgeLeft = labelBoundary ? vertX + (labelBoundary.left / 160) * scaledWidth : chartOuterLeft;
    const labelEdgeRight = labelBoundary ? vertX + (labelBoundary.right / 160) * scaledWidth : chartOuterRight;

    /** Render items for a zone (left, right, force_left, force_right) */
    const renderZoneContent = (zone: string, zoneX: number, zoneW: number, align: 'left' | 'right' | 'center') => {
        const items = getItems(zone);
        const ghostItem = (!items.length && ghostPlacements && !zone.startsWith('force'))
            ? ghostPlacements.find(p => p.levelId === level.id && p.zone === zone)
            : null;
        const isForceZone = zone.startsWith('force');

        // Position zone centre at anatomical screw entry point when available
        const zoneCx = isForceZone ? zoneX + zoneW / 2
            : zone === 'left' && chartScrewLeftCx !== undefined ? chartScrewLeftCx
            : zone === 'right' && chartScrewRightCx !== undefined ? chartScrewRightCx
            : zone === 'left' ? zoneX + zoneW - baseScrewPx / 2 - 4
            : zone === 'right' ? zoneX + baseScrewPx / 2 + 4
            : zoneX + zoneW / 2;
        const zoneCy = isForceZone ? rowHeight / 2 : chartScrewCy;

        // Click zone background
        const clickable = !readOnly && (!isForceZone || !forcePlacements);
        const elements: React.ReactElement[] = [];

        // Clickable background rect — hover via parent <g> onMouseEnter/Leave
        const hoverFill = isForceZone ? 'rgba(191, 219, 254, 0.5)' : 'rgba(148, 163, 184, 0.25)';
        elements.push(
            <rect key={`zone-bg-${zone}`} className="zone-bg" data-zone={zone} data-level={level.id} x={zoneX} y={0} width={zoneW} height={rowHeight}
                fill="transparent" cursor={clickable ? 'crosshair' : 'default'}
                onClick={() => clickable && onZoneClick(level.id, zone)} />
        );

        // Force zone border + background tint
        if (isForceZone) {
            elements.push(<rect key={`zone-tint-${zone}`} x={zoneX} y={0} width={zoneW} height={rowHeight} fill="#eff6ff" opacity={0.2} pointerEvents="none" />);
            if (zone === 'force_left') {
                elements.push(<line key={`zone-border-${zone}`} x1={zoneX + zoneW} y1={0} x2={zoneX + zoneW} y2={rowHeight} stroke="#f1f5f9" strokeWidth={0.5} pointerEvents="none" />);
            } else {
                elements.push(<line key={`zone-border-${zone}`} x1={zoneX} y1={0} x2={zoneX} y2={rowHeight} stroke="#f1f5f9" strokeWidth={0.5} pointerEvents="none" />);
            }
        }

        // Ghost target when empty
        if (!items.length && !ghostItem && !readOnly && (zone === 'left' || zone === 'right' || isForceZone)) {
            elements.push(<g key={`ghost-target-${zone}`}>{renderGhostTarget(zoneCx, zoneCy, isForceZone, zone)}</g>);
        }

        // Render placed items
        items.forEach(p => {
            const tool = tools.find(item => item.id === p.tool);
            const isHookItem = HOOK_TYPES.includes(p.tool);
            const isOsteo = p.tool === 'osteotomy';
            let displayLabel: string | OsteotomyData | null = p.data;
            let angle: number | null = null;
            if (isOsteo && typeof p.data === 'object' && p.data !== null) {
                displayLabel = (p.data as OsteotomyData).shortLabel || (p.data as OsteotomyData).type;
                angle = (p.data as OsteotomyData).angle;
            }
            const isFixation = FIXATION_TYPES.includes(p.tool);
            const iW = isFixation ? fixW : isHookItem ? hookW : isOsteo ? osteoPx : screwPx;
            const iH = isFixation ? fixH : isHookItem ? hookH : isOsteo ? osteoPx : screwPx;
            const ann = p.annotation || '';
            const showData = p.data && !isHookItem && !isFixation;
            const showAnn = !!ann;

            // Position icon: centre on anatomical screw entry point
            let iconX: number;
            let iconY = zoneCy - iH / 2;
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if ((zone === 'left' && chartScrewLeftCx !== undefined) || (zone === 'right' && chartScrewRightCx !== undefined)) {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                iconX = zoneX + zoneW - iW - 4;
            } else {
                iconX = zoneX + 4;
            }
            // Offset screw icon to entry point on pedicle ellipse.
            // Entry Y positioned so vertical midpoint of shank = pedicle centre.
            // Entry X at lateral (pedicle) or medial (CBT) edge of ellipse at that Y.
            // For lateral mass trajectory at C7: reposition to lateral mass centre instead.
            if (['monoaxial','polyaxial','uniplanar'].includes(p.tool) && geom) {
                const screwSide = zone === 'left' ? 'left' as const : 'right' as const;
                const traj = p.trajectory || (() => { const opts = getTrajectoryOptions(level.id); return opts ? (opts.find(o => o.isDefault) || opts[0]).id : 'pedicle'; })();
                // Lateral mass trajectory: reposition to Magerl entry point (lower medial quadrant)
                if (traj === 'lateral_mass' && 'latMassLeftCx' in geom) {
                    const medialOff = geom.latMassRx * 0.3 * (scaledWidth / 160);
                    const lmCx = screwSide === 'left'
                        ? vertX + (geom.latMassLeftCx / 160) * scaledWidth + medialOff
                        : vertX + (geom.latMassRightCx / 160) * scaledWidth - medialOff;
                    // Y at lateral mass centre + 30% inferior (lower medial quadrant)
                    const lmCyChart = geom.latMassCy * heightScale;
                    const inferiorOff = geom.latMassRy * 0.3 * heightScale;
                    iconX = lmCx - iW / 2;
                    iconY = lmCyChart + inferiorOff - iH / 2;
                }
                const angles = getTrajectoryAngle(level.id, traj);
                if (angles && getEntryPointOffset(traj, screwSide) && 'pedRx' in geom && 'pedCy' in geom) {
                    const g = geom as { pedRx: number; pedRy: number; pedCy: number; pedLeftCx: number; pedRightCx: number };
                    const pedRxC = g.pedRx * heightScale;
                    const pedRyC = g.pedRy * heightScale;
                    const pedCyC = g.pedCy * heightScale;
                    const pedCxC = screwSide === 'left'
                        ? vertX + (g.pedLeftCx / 160) * scaledWidth
                        : vertX + (g.pedRightCx / 160) * scaledWidth;
                    // Compute shank dy to determine entry Y offset
                    let lenMm = 0;
                    if (typeof p.data === 'string' && p.data.includes('x')) {
                        const parts = p.data.split('x').map(Number);
                        if (parts.length === 2 && !isNaN(parts[1])) lenMm = parts[1];
                    }
                    const { dy } = lenMm ? projectScrewShank(lenMm, angles, screwSide, VERT_SVG_SCALE * heightScale) : { dy: 0 };
                    // Entry Y: offset from pedCy so midpoint of shank is at pedCy
                    const yOffFromCentre = -dy / 2;
                    const clampedY = Math.max(-pedRyC, Math.min(pedRyC, yOffFromCentre));
                    // Entry X: on ellipse at that Y, lateral side (pedicle) or medial side (CBT)
                    const ellipseXFrac = Math.sqrt(Math.max(0, 1 - (clampedY / pedRyC) ** 2));
                    const isMedialEntry = traj === 'cortical';
                    const lateralSign = screwSide === 'left' ? -1 : 1; // lateral = away from midline
                    const xOff = (isMedialEntry ? -lateralSign : lateralSign) * ellipseXFrac * pedRxC;
                    iconX = pedCxC + xOff - iW / 2;
                    iconY = pedCyC + clampedY - iH / 2;
                }
            }

            // Label text
            const labelText = showData
                ? (isOsteo ? (angle != null ? `${displayLabel} ${angle}\u00B0` : String(displayLabel)) : formatScrewSize(String(displayLabel)))
                : '';
            const annText = showAnn ? ann : '';
            const isInline = heightScale < 0.85 && !!labelText && !!annText;

            elements.push(
                <g key={p.id} cursor={!readOnly ? 'pointer' : 'default'}
                    onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(p); }}>
                    {align === 'left' && (labelText || annText) && (() => {
                        const labelRight = labelEdgeLeft - 2;
                        const labelW = labelRight - leftZoneX;
                        return (
                        <foreignObject x={leftZoneX} y={0} width={Math.max(0, labelW)} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: isInline ? 'row-reverse' : 'column', alignItems: isInline ? 'center' : 'flex-end', gap: isInline ? 3 : 0, lineHeight: 1 }}>
                                    {labelText && <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#334155', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>}
                                    {annText && <div style={{ alignSelf: 'stretch', textAlign: 'left', width: '100%' }}>
                                        <span style={{ fontSize: 9, fontStyle: 'italic', color: '#94a3b8', paddingLeft: 1, paddingRight: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.1 } as React.CSSProperties}>{annText}</span>
                                    </div>}
                                </div>
                            </div>
                        </foreignObject>);
                    })()}
                    {/* Screw shank — projected PA view, starts from icon centre (already at entry point) */}
                    {['monoaxial','polyaxial','uniplanar'].includes(p.tool) && (() => {
                        const screwSide = zone === 'left' ? 'left' as const : 'right' as const;
                        const angles = getTrajectoryAngle(level.id, p.trajectory);
                        if (!angles) return null;
                        let diamMm = 0, lenMm = 0;
                        if (typeof p.data === 'string' && p.data.includes('x')) {
                            const parts = p.data.split('x').map(Number);
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                diamMm = parts[0]; lenMm = parts[1];
                            }
                        }
                        if (!lenMm) return null;
                        const { dx, dy } = projectScrewShank(lenMm, angles, screwSide, VERT_SVG_SCALE * heightScale);
                        const cx = iconX + iW / 2;
                        const cy = iconY + iH / 2;
                        const strokeW = Math.max(1.5, diamMm * VERT_SVG_SCALE * heightScale);
                        return <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy}
                            stroke="#64748b" strokeWidth={strokeW} strokeLinecap="round" opacity={0.6} pointerEvents="none" />;
                    })()}
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH, undefined, zone === 'left' ? 'left' : zone === 'right' ? 'right' : undefined)}
                    {align === 'right' && (labelText || annText) && (() => {
                        const labelLeft = labelEdgeRight + 2;
                        const labelW = rightZoneX + sideZoneW - labelLeft;
                        return (
                        <foreignObject x={labelLeft} y={0} width={Math.max(0, labelW)} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: isInline ? 'row' : 'column', alignItems: isInline ? 'center' : 'flex-start', gap: isInline ? 3 : 0, lineHeight: 1 }}>
                                    {labelText && <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#334155', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>}
                                    {annText && <div style={{ width: '100%', textAlign: 'right', lineHeight: 1.1 }}>
                                        <span style={{ fontSize: 9, fontStyle: 'italic', color: '#94a3b8', paddingLeft: 1, paddingRight: 1, lineHeight: 1.1, display: 'inline-block' }}>{annText}</span>
                                    </div>}
                                </div>
                            </div>
                        </foreignObject>);
                    })()}
                    {align === 'center' && labelText && (
                        <text x={zoneCx} y={iconY + iH / 2 - 1}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={labelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#334155">
                            {labelText}
                        </text>
                    )}
                </g>
            );
        });

        // Ghost item
        if (ghostItem) {
            const tool = tools.find(item => item.id === ghostItem.tool);
            const isHookItem = HOOK_TYPES.includes(ghostItem.tool);
            const isOsteo = ghostItem.tool === 'osteotomy';
            let displayLabel: string | OsteotomyData | null = ghostItem.data;
            let angle: number | null = null;
            if (isOsteo && typeof ghostItem.data === 'object' && ghostItem.data !== null) {
                displayLabel = (ghostItem.data as OsteotomyData).shortLabel || (ghostItem.data as OsteotomyData).type;
                angle = (ghostItem.data as OsteotomyData).angle;
            }
            const isFixation = FIXATION_TYPES.includes(ghostItem.tool);
            const iW = isFixation ? fixW : isHookItem ? hookW : isOsteo ? osteoPx : screwPx;
            const iH = isFixation ? fixH : isHookItem ? hookH : isOsteo ? osteoPx : screwPx;
            const showData = ghostItem.data && !isHookItem && !isFixation;

            let iconX: number;
            let iconY = zoneCy - iH / 2;
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if ((zone === 'left' && chartScrewLeftCx !== undefined) || (zone === 'right' && chartScrewRightCx !== undefined)) {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                iconX = zoneX + zoneW - iW - 4;
            } else {
                iconX = zoneX + 4;
            }
            // Offset ghost screw icon to entry point on pedicle ellipse (same logic as placed screws)
            if (['monoaxial','polyaxial','uniplanar'].includes(ghostItem.tool) && geom) {
                const screwSide = zone === 'left' ? 'left' as const : 'right' as const;
                const traj = ghostItem.trajectory || (() => { const opts = getTrajectoryOptions(level.id); return opts ? (opts.find(o => o.isDefault) || opts[0]).id : 'pedicle'; })();
                if (traj === 'lateral_mass' && 'latMassLeftCx' in geom) {
                    const medialOff = geom.latMassRx * 0.3 * (scaledWidth / 160);
                    const lmCx = screwSide === 'left'
                        ? vertX + (geom.latMassLeftCx / 160) * scaledWidth + medialOff
                        : vertX + (geom.latMassRightCx / 160) * scaledWidth - medialOff;
                    const lmCyChart = geom.latMassCy * heightScale;
                    const inferiorOff = geom.latMassRy * 0.3 * heightScale;
                    iconX = lmCx - iW / 2;
                    iconY = lmCyChart + inferiorOff - iH / 2;
                }
                const angles = getTrajectoryAngle(level.id, traj);
                if (angles && getEntryPointOffset(traj, screwSide) && 'pedRx' in geom && 'pedCy' in geom) {
                    const g = geom as { pedRx: number; pedRy: number; pedCy: number; pedLeftCx: number; pedRightCx: number };
                    const pedRxC = g.pedRx * heightScale;
                    const pedRyC = g.pedRy * heightScale;
                    const pedCyC = g.pedCy * heightScale;
                    const pedCxC = screwSide === 'left'
                        ? vertX + (g.pedLeftCx / 160) * scaledWidth
                        : vertX + (g.pedRightCx / 160) * scaledWidth;
                    let lenMm = 0;
                    if (typeof ghostItem.data === 'string' && ghostItem.data.includes('x')) {
                        const parts = ghostItem.data.split('x').map(Number);
                        if (parts.length === 2 && !isNaN(parts[1])) lenMm = parts[1];
                    }
                    const { dy } = lenMm ? projectScrewShank(lenMm, angles, screwSide, VERT_SVG_SCALE * heightScale) : { dy: 0 };
                    const yOffFromCentre = -dy / 2;
                    const clampedY = Math.max(-pedRyC, Math.min(pedRyC, yOffFromCentre));
                    const ellipseXFrac = Math.sqrt(Math.max(0, 1 - (clampedY / pedRyC) ** 2));
                    const isMedialEntry = traj === 'cortical';
                    const lateralSign = screwSide === 'left' ? -1 : 1;
                    const xOff = (isMedialEntry ? -lateralSign : lateralSign) * ellipseXFrac * pedRxC;
                    iconX = pedCxC + xOff - iW / 2;
                    iconY = pedCyC + clampedY - iH / 2;
                }
            }

            const labelText = showData
                ? (isOsteo ? (angle != null ? `${displayLabel} ${angle}\u00B0` : String(displayLabel)) : formatScrewSize(String(displayLabel)))
                : '';

            elements.push(
                <g key={'ghost-' + ghostItem.id} opacity={0.75} cursor="pointer"
                    onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostItem); }}>
                    {align === 'left' && labelText && (() => {
                        const labelRight = labelEdgeLeft - 2;
                        const labelW = labelRight - leftZoneX;
                        return (
                        <foreignObject x={leftZoneX} y={0} width={Math.max(0, labelW)} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#0f172a', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>
                                </div>
                            </div>
                        </foreignObject>);
                    })()}
                    {/* Ghost screw shank */}
                    {['monoaxial','polyaxial','uniplanar'].includes(ghostItem.tool) && (() => {
                        const screwSide = zone === 'left' ? 'left' as const : 'right' as const;
                        const angles = getTrajectoryAngle(level.id, ghostItem.trajectory);
                        if (!angles) return null;
                        let diamMm = 0, lenMm = 0;
                        if (typeof ghostItem.data === 'string' && ghostItem.data.includes('x')) {
                            const parts = ghostItem.data.split('x').map(Number);
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                diamMm = parts[0]; lenMm = parts[1];
                            }
                        }
                        if (!lenMm) return null;
                        const { dx, dy } = projectScrewShank(lenMm, angles, screwSide, VERT_SVG_SCALE * heightScale);
                        const cx = iconX + iW / 2;
                        const cy = iconY + iH / 2;
                        const strokeW = Math.max(1.5, diamMm * VERT_SVG_SCALE * heightScale);
                        return <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy}
                            stroke="#14b8a6" strokeWidth={strokeW} strokeLinecap="round" opacity={0.5} pointerEvents="none" />;
                    })()}
                    <rect x={iconX} y={iconY} width={iW} height={iH} fill="transparent" pointerEvents="all" />
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH, '#14b8a6', zone === 'left' ? 'left' : zone === 'right' ? 'right' : undefined)}
                    {align === 'right' && labelText && (() => {
                        const labelLeft = labelEdgeRight + 2;
                        const labelW = rightZoneX + sideZoneW - labelLeft;
                        return (
                        <foreignObject x={labelLeft} y={0} width={Math.max(0, labelW)} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#0f172a', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>
                                </div>
                            </div>
                        </foreignObject>);
                    })()}
                    {align === 'center' && labelText && (
                        <text x={zoneCx} y={iconY + iH / 2 - 1}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={labelPx} fontFamily="Inter, sans-serif" fontWeight="bold" fill="#0f172a">
                            {labelText}
                        </text>
                    )}
                </g>
            );
        }

        return <g key={`zone-${zone}`}
            onMouseEnter={clickable ? (e) => { (e.currentTarget.querySelector('.zone-bg') as SVGRectElement)?.setAttribute('fill', hoverFill); } : undefined}
            onMouseLeave={clickable ? (e) => { (e.currentTarget.querySelector('.zone-bg') as SVGRectElement)?.setAttribute('fill', 'transparent'); } : undefined}
        >{elements}</g>;
    };

    /** Render midline zone content (osteotomies on vertebral body) */
    const renderMidContent = () => {
        const midItems = getItems('mid').filter(p => p.tool !== 'connector');
        const elements: React.ReactElement[] = [];
        midItems.forEach(p => {
            const tool = tools.find(item => item.id === p.tool);
            let displayLabel: string = '';
            let angle: number | null = null;
            if (p.tool === 'osteotomy' && typeof p.data === 'object' && p.data !== null) {
                displayLabel = (p.data as OsteotomyData).shortLabel || (p.data as OsteotomyData).type;
                angle = (p.data as OsteotomyData).angle;
            }
            const cx = scaledWidth / 2;
            const cy = rowHeight / (2 * heightScale); // in vertebra viewBox coords
            elements.push(
                <g key={p.id} cursor={!readOnly ? 'pointer' : 'default'}
                    onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(p); }}>
                    <svg x={vertX + scaledWidth / 2 - midPx / 2} y={rowHeight / 2 - midPx / 2} width={midPx} height={midPx} overflow="visible">
                        <InstrumentIcon type={tool?.icon || ''} className="w-full h-full" />
                    </svg>
                    {p.tool === 'osteotomy' && p.data && (() => {
                        const osteoText = angle != null ? `${displayLabel} ${angle}\u00B0` : String(displayLabel);
                        const osteoRectW = Math.max(measureText(osteoText, `bold ${osteoLabelPx}px Inter, Noto Sans SC, Noto Sans JP, Noto Sans KR, sans-serif`) + 16, 60);
                        return (
                        <g>
                            <rect x={vertX + scaledWidth / 2 - osteoRectW / 2} y={rowHeight / 2 - osteoLabelPx / 2 - 2}
                                width={osteoRectW} height={osteoLabelPx + 4} rx={3}
                                fill="#fffbeb" fillOpacity={0.8} stroke="#fcd34d" strokeWidth={1} />
                            <text x={vertX + scaledWidth / 2} y={rowHeight / 2}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={osteoLabelPx} fontWeight="bold" fill="#92400e">
                                {displayLabel}{angle != null ? ` ${angle}\u00B0` : ''}
                            </text>
                        </g>
                        );
                    })()}
                </g>
            );
        });

        // Ghost mid placement
        if (ghostPlacements && !midItems.length) {
            const gp = ghostPlacements.find(p => p.levelId === level.id && p.zone === 'mid');
            if (gp) {
                const tool = tools.find(item => item.id === gp.tool);
                let displayLabel: string = '';
                let angle: number | null = null;
                if (gp.tool === 'osteotomy' && typeof gp.data === 'object' && gp.data !== null) {
                    displayLabel = (gp.data as OsteotomyData).shortLabel || (gp.data as OsteotomyData).type;
                    angle = (gp.data as OsteotomyData).angle;
                }
                elements.push(
                    <g key={'ghost-' + gp.id} opacity={0.75} cursor="pointer"
                        onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(gp); }}>
                        <svg x={vertX + scaledWidth / 2 - midPx / 2} y={rowHeight / 2 - midPx / 2} width={midPx} height={midPx} overflow="visible">
                            <InstrumentIcon type={tool?.icon || ''} className="w-full h-full" color="#14b8a6" />
                        </svg>
                        {gp.tool === 'osteotomy' && gp.data && (() => {
                            const ghostOsteoText = angle != null ? `${displayLabel} ${angle}\u00B0` : String(displayLabel);
                            const ghostOsteoRectW = Math.max(measureText(ghostOsteoText, `bold ${osteoLabelPx}px Inter, Noto Sans SC, Noto Sans JP, Noto Sans KR, sans-serif`) + 16, 60);
                            return (
                            <g>
                                <rect x={vertX + scaledWidth / 2 - ghostOsteoRectW / 2} y={rowHeight / 2 - osteoLabelPx / 2 - 2}
                                    width={ghostOsteoRectW} height={osteoLabelPx + 4} rx={3}
                                    fill="#f0fdfa" fillOpacity={0.8} stroke="#5eead4" strokeWidth={1} />
                                <text x={vertX + scaledWidth / 2} y={rowHeight / 2}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={osteoLabelPx} fontWeight="bold" fill="#0d9488">
                                    {displayLabel}{angle != null ? ` ${angle}\u00B0` : ''}
                                </text>
                            </g>
                            );
                        })()}
                    </g>
                );
            }
        }

        return elements;
    };

    /** Render disc zone content */
    const renderDiscZone = () => {
        if (!hasDisc || discH <= 0) return null;
        const discY = rowHeight;

        const renderCageInfo = (cage: Cage, opacity?: number, isGhost?: boolean) => {
            const sideChar = cage.data.side && cage.data.side !== 'bilateral' && cage.data.side !== 'midline'
                ? ` (${cage.data.side.charAt(0).toUpperCase()})` : '';
            const hasDims = cage.data.height || cage.data.lordosis;
            const isCervicalWhole = viewMode === 'whole' && level.type === 'C';
            const expSuffix = cage.data.expandable ? ' exp.' : '';
            const cageLabel = hasDims
                ? `${cage.tool.toUpperCase()} ${cage.data.height}H ${cage.data.lordosis || '0'}\u00B0${sideChar}${expSuffix}`
                : `${cage.tool.toUpperCase()}${sideChar}${expSuffix}`;
            const labelColor = isGhost ? '#14b8a6' : '#0369a1';
            const fontSize = isCervicalWhole ? Math.max(8, cageLabelPx * 0.6) : cageLabelPx;
            return (
                <g opacity={opacity}>
                    <svg x={vertX} y={discY} width={scaledWidth} height={discH} viewBox="0 0 160 20" preserveAspectRatio="none" overflow="visible">
                        <CageVisualization cageType={cage.tool} heightScale={1} levelId={level.id} color={isGhost ? '#14b8a6' : undefined} />
                    </svg>
                    <text x={rightZoneX + 8} y={discY + discH / 2}
                        textAnchor="start" dominantBaseline="middle"
                        fontSize={fontSize} fontWeight="bold" fill={labelColor}>
                        {cageLabel}
                    </text>
                </g>
            );
        };

        const renderOsteoLabel = (osteo: Placement, opacity?: number, isGhost?: boolean) => {
            const data = osteo.data as OsteotomyData;
            const label = data?.shortLabel || t('clinical.osteotomy.fallback');
            const angleStr = data?.angle != null ? ` ${data.angle}\u00B0` : '';
            const discOsteoText = `${label}${angleStr}`;
            const discOsteoRectW = Math.max(measureText(discOsteoText, `bold ${cageLabelPx}px Inter, Noto Sans SC, Noto Sans JP, Noto Sans KR, sans-serif`) + 16, 60);
            return (
                <g opacity={opacity}>
                    <rect x={vertX + scaledWidth / 2 - discOsteoRectW / 2} y={discY + discH / 2 - cageLabelPx / 2 - 2}
                        width={discOsteoRectW} height={cageLabelPx + 4} rx={3}
                        fill={isGhost ? '#f0fdfa' : '#fffbeb'} fillOpacity={0.8} stroke={isGhost ? '#5eead4' : '#fcd34d'} strokeWidth={1} />
                    <text x={vertX + scaledWidth / 2} y={discY + discH / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={cageLabelPx} fontWeight="bold" fill={isGhost ? '#0d9488' : '#92400e'}>
                        {label}{angleStr}
                    </text>
                </g>
            );
        };

        return (
            <g>
                {/* Disc zone click handled by ChartPaper overlay for correct z-order */}
                {cageBelow ? (
                        <g cursor={!readOnly ? 'pointer' : 'default'} onClick={(e) => { e.stopPropagation(); !readOnly && onDiscClick(level.id); }}>
                            {renderCageInfo(cageBelow)}
                        </g>
                    )
                    : ghostCageBelow ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); onGhostCageClick && onGhostCageClick(ghostCageBelow); }}>
                            {renderCageInfo(ghostCageBelow, 0.75, true)}
                        </g>
                    )
                    : discOsteo ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(discOsteo); }}>
                            {renderOsteoLabel(discOsteo)}
                        </g>
                    )
                    : ghostDiscOsteo ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostDiscOsteo); }}>
                            {renderOsteoLabel(ghostDiscOsteo, 0.75, true)}
                        </g>
                    )
                    : (!readOnly && <rect x={vertX} y={discY} width={scaledWidth} height={discH} fill="transparent" />)
                }
            </g>
        );
    };

    const totalRowHeight = rowHeight + discH;

    return (
        <g transform={`translate(0, ${rowY})`}>
            {/* Level border bottom */}
            <line x1={0} y1={rowHeight} x2={chartWidth} y2={rowHeight} stroke="#f1f5f9" strokeWidth={1} />

            {/* Vertebral body SVG (visual only, no pointer events) */}
            <svg x={vertX} y={0} width={scaledWidth} height={rowHeight} overflow="visible" style={{ pointerEvents: 'none' }}>
                <SpineVertebra label={level.id} type={level.type} height={getLevelHeight(level)} isCorpectomy={isCorpectomy} heightScale={heightScale} />
            </svg>

            {/* Mid zone — osteotomy click area, body width only */}
            {(() => {
                const midClickable = !readOnly && !isSacral;
                const midX = chartBodyLeft;
                const midW = chartBodyRight - chartBodyLeft;
                return (
                <g onMouseEnter={midClickable ? (e) => { (e.currentTarget.querySelector('.mid-bg') as SVGRectElement)?.setAttribute('fill', 'rgba(253, 230, 138, 0.45)'); } : undefined}
                   onMouseLeave={midClickable ? (e) => { (e.currentTarget.querySelector('.mid-bg') as SVGRectElement)?.setAttribute('fill', 'transparent'); } : undefined}>
                <rect className="mid-bg" x={midX} y={0} width={midW} height={rowHeight}
                    fill="transparent" cursor={midClickable ? 'pointer' : 'default'}
                    onClick={() => midClickable && onZoneClick(level.id, 'mid')} />
                {renderMidContent()}
            </g>);
            })()}

            {/* Screw click zones — from body edge outward through pedicle/TP area */}
            {!readOnly && !isSacral && (() => {
                const leftScrewX = leftZoneX;
                const leftScrewW = chartBodyLeft - leftZoneX;
                const rightScrewX = chartBodyRight;
                const rightScrewW = rightZoneX + sideZoneW - chartBodyRight;
                const hoverFillScrew = 'rgba(148, 163, 184, 0.25)';
                return (
                    <>
                        <g onMouseEnter={(e) => { (e.currentTarget.querySelector('.screw-bg') as SVGRectElement)?.setAttribute('fill', hoverFillScrew); }}
                           onMouseLeave={(e) => { (e.currentTarget.querySelector('.screw-bg') as SVGRectElement)?.setAttribute('fill', 'transparent'); }}>
                            <rect className="screw-bg" x={leftScrewX} y={0} width={leftScrewW} height={rowHeight}
                                fill="transparent" cursor="crosshair"
                                onClick={() => onZoneClick(level.id, 'left')} />
                        </g>
                        <g onMouseEnter={(e) => { (e.currentTarget.querySelector('.screw-bg') as SVGRectElement)?.setAttribute('fill', hoverFillScrew); }}
                           onMouseLeave={(e) => { (e.currentTarget.querySelector('.screw-bg') as SVGRectElement)?.setAttribute('fill', 'transparent'); }}>
                            <rect className="screw-bg" x={rightScrewX} y={0} width={rightScrewW} height={rowHeight}
                                fill="transparent" cursor="crosshair"
                                onClick={() => onZoneClick(level.id, 'right')} />
                        </g>
                    </>
                );
            })()}

            {/* Pedicle click circles — overlay on vertebral body, intercept clicks before mid-zone osteotomy */}
            {!readOnly && !isSacral && chartScrewLeftCx !== undefined && chartScrewRightCx !== undefined && (() => {
                const pedClickR = Math.max(screwPx * 0.7, 14);
                return (
                    <>
                        <circle cx={chartScrewLeftCx} cy={chartScrewCy} r={pedClickR}
                            fill="transparent" cursor="crosshair" style={{ pointerEvents: 'all' }}
                            onMouseEnter={(e) => e.currentTarget.setAttribute('fill', 'rgba(148, 163, 184, 0.25)')}
                            onMouseLeave={(e) => e.currentTarget.setAttribute('fill', 'transparent')}
                            onClick={(e) => { e.stopPropagation(); onZoneClick(level.id, 'left'); }} />
                        <circle cx={chartScrewRightCx} cy={chartScrewCy} r={pedClickR}
                            fill="transparent" cursor="crosshair" style={{ pointerEvents: 'all' }}
                            onMouseEnter={(e) => e.currentTarget.setAttribute('fill', 'rgba(148, 163, 184, 0.25)')}
                            onMouseLeave={(e) => e.currentTarget.setAttribute('fill', 'transparent')}
                            onClick={(e) => { e.stopPropagation(); onZoneClick(level.id, 'right'); }} />
                    </>
                );
            })()}

            {/* Left/right zones — icons and labels (click handled by screw zones above for non-sacral) */}
            {showForces && renderZoneContent('force_left', forceLeftX, forceW, 'center')}
            {isSacral && !levels.some(l => l.id === 'S2')
                ? <>
                    {renderZoneContent('left', leftZoneX, sideZoneW + scaledWidth / 2, 'left')}
                    {renderZoneContent('right', vertX + scaledWidth / 2, sideZoneW + scaledWidth / 2, 'right')}
                </>
                : !isSacral && <>
                    {renderZoneContent('left', leftZoneX, chartBodyLeft - leftZoneX, 'left')}
                    {renderZoneContent('right', chartBodyRight, rightZoneX + sideZoneW - chartBodyRight, 'right')}
                </>
            }
            {showForces && renderZoneContent('force_right', forceRightX, forceW, 'center')}

            {/* Keyboard navigation focus ring */}
            {focusedZone && (() => {
                const inset = 2;
                let fx: number, fy: number, fw: number, fh: number;
                if (focusedZone === 'mid') {
                    fx = vertX + inset; fy = inset; fw = scaledWidth - inset * 2; fh = rowHeight - inset * 2;
                } else if (focusedZone === 'left') {
                    const zw = isSacral && !levels.some(l => l.id === 'S2') ? sideZoneW + scaledWidth / 2 : sideZoneW;
                    fx = leftZoneX + inset; fy = inset; fw = zw - inset * 2; fh = rowHeight - inset * 2;
                } else {
                    const zx = isSacral && !levels.some(l => l.id === 'S2') ? vertX + scaledWidth / 2 : rightZoneX;
                    const zw = isSacral && !levels.some(l => l.id === 'S2') ? sideZoneW + scaledWidth / 2 : sideZoneW;
                    fx = zx + inset; fy = inset; fw = zw - inset * 2; fh = rowHeight - inset * 2;
                }
                return <rect x={fx} y={fy} width={fw} height={fh} rx={3} fill="none" stroke="#3b82f6" strokeWidth={2} pointerEvents="none" />;
            })()}

            {/* Disc zone */}
            {renderDiscZone()}
        </g>
    );
});
