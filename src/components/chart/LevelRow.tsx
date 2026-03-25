import React from 'react';
import { t } from '../../i18n/i18n';
import { getDiscHeight, getLevelHeight, getVertSvgGeometry, DISC_MIN_PX } from '../../data/anatomy';
import { HOOK_TYPES, FORCE_TYPES } from '../../data/clinical';
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
}

/** SVG-native level row — renders as a <g> group at a given Y offset */
export const LevelRow: React.FC<LevelRowProps> = React.memo(({ level, placements, ghostPlacements, onZoneClick, tools, onPlacementClick, onGhostClick, readOnly, showForces, heightScale, onDiscClick, cages, levels, viewMode, forcePlacements, ghostCages, onGhostCageClick, chartWidth, rowY }) => {
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
    } else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
        viewBoxScrewCy = geom.latMassCy;
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
    } else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
        chartScrewLeftCx = vertX + (geom.latMassLeftCx / 160) * scaledWidth;
        chartScrewRightCx = vertX + (geom.latMassRightCx / 160) * scaledWidth;
    }

    /** Render items for a zone (left, right, force_left, force_right) */
    const renderZoneContent = (zone: string, zoneX: number, zoneW: number, align: 'left' | 'right' | 'center') => {
        const items = getItems(zone);
        const ghostItem = (!items.length && ghostPlacements && !zone.startsWith('force'))
            ? ghostPlacements.find(p => p.levelId === level.id && p.zone === zone)
            : null;
        const isForceZone = zone.startsWith('force');

        // Sacral: position at L5 pedicle alignment
        // All others: zone centre based on baseScrewPx so cervical/thoracolumbar centres align
        const zoneCx = isForceZone ? zoneX + zoneW / 2
            : isSacral && zone === 'left' && chartScrewLeftCx !== undefined ? chartScrewLeftCx
            : isSacral && zone === 'right' && chartScrewRightCx !== undefined ? chartScrewRightCx
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

            // Position icon: sacral at anatomy-based position; all others at zone edge
            let iconX: number;
            const iconY = zoneCy - iH / 2;
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if (isSacral) {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                iconX = zoneX + zoneW - iW - 4;
            } else {
                iconX = zoneX + 4;
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
                    {align === 'left' && (labelText || annText) && (
                        <foreignObject x={zoneX + 4} y={0} width={iconX - zoneX - 6} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: isInline ? 'row-reverse' : 'column', alignItems: isInline ? 'center' : 'flex-end', gap: isInline ? 3 : 0, lineHeight: 1 }}>
                                    {labelText && <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#334155', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>}
                                    {annText && <div style={{ alignSelf: 'stretch', textAlign: 'left', width: '100%' }}>
                                        <span style={{ fontSize: 9, fontStyle: 'italic', color: '#94a3b8', paddingLeft: 1, paddingRight: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.1 } as React.CSSProperties}>{annText}</span>
                                    </div>}
                                </div>
                            </div>
                        </foreignObject>
                    )}
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH, undefined, zone === 'left' ? 'left' : zone === 'right' ? 'right' : undefined)}
                    {align === 'right' && (labelText || annText) && (
                        <foreignObject x={iconX + iW + 2} y={0} width={zoneX + zoneW - iconX - iW - 12} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: isInline ? 'row' : 'column', alignItems: isInline ? 'center' : 'flex-start', gap: isInline ? 3 : 0, lineHeight: 1 }}>
                                    {labelText && <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#334155', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>}
                                    {annText && <div style={{ width: '100%', textAlign: 'right', lineHeight: 1.1 }}>
                                        <span style={{ fontSize: 9, fontStyle: 'italic', color: '#94a3b8', paddingLeft: 1, paddingRight: 1, lineHeight: 1.1, display: 'inline-block' }}>{annText}</span>
                                    </div>}
                                </div>
                            </div>
                        </foreignObject>
                    )}
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
            const iconY = zoneCy - iH / 2;
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if (isSacral) {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                iconX = zoneX + zoneW - iW - 4;
            } else {
                iconX = zoneX + 4;
            }

            const labelText = showData
                ? (isOsteo ? (angle != null ? `${displayLabel} ${angle}\u00B0` : String(displayLabel)) : formatScrewSize(String(displayLabel)))
                : '';

            elements.push(
                <g key={'ghost-' + ghostItem.id} opacity={0.75} cursor="pointer"
                    onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostItem); }}>
                    {align === 'left' && labelText && (
                        <foreignObject x={zoneX + 4} y={0} width={iconX - zoneX - 6} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#0f172a', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>
                                </div>
                            </div>
                        </foreignObject>
                    )}
                    <rect x={iconX} y={iconY} width={iW} height={iH} fill="transparent" pointerEvents="all" />
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH, '#14b8a6', zone === 'left' ? 'left' : zone === 'right' ? 'right' : undefined)}
                    {align === 'right' && labelText && (
                        <foreignObject x={iconX + iW + 2} y={0} width={zoneX + zoneW - iconX - iW - 12} height={rowHeight} overflow="visible" pointerEvents="none">
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible', pointerEvents: 'auto' }}>
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: labelPx, color: '#0f172a', whiteSpace: 'nowrap', paddingLeft: 1, paddingRight: 1 }}>{labelText}</span>
                                </div>
                            </div>
                        </foreignObject>
                    )}
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
            const cageLabel = hasDims
                ? `${cage.tool.toUpperCase()} ${cage.data.height}H ${cage.data.lordosis || '0'}\u00B0${sideChar}`
                : `${cage.tool.toUpperCase()}${sideChar}`;
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

            {/* Vertebral body + mid zone — sacral mid zone disabled when pelvis expanded */}
            {(() => {
                const midClickable = !readOnly && !isSacral;
                return (
                <g onMouseEnter={midClickable ? (e) => { (e.currentTarget.querySelector('.mid-bg') as SVGRectElement)?.setAttribute('fill', 'rgba(253, 230, 138, 0.45)'); } : undefined}
                   onMouseLeave={midClickable ? (e) => { (e.currentTarget.querySelector('.mid-bg') as SVGRectElement)?.setAttribute('fill', 'transparent'); } : undefined}>
                <rect className="mid-bg" x={vertX} y={0} width={scaledWidth} height={rowHeight}
                    fill="transparent" cursor={midClickable ? 'pointer' : 'default'}
                    onClick={() => midClickable && onZoneClick(level.id, 'mid')} />
                <svg x={vertX} y={0} width={scaledWidth} height={rowHeight} overflow="visible" style={{ pointerEvents: 'none' }}>
                    <SpineVertebra label={level.id} type={level.type} height={getLevelHeight(level)} isCorpectomy={isCorpectomy} heightScale={heightScale} />
                </svg>
                {renderMidContent()}
            </g>);
            })()}

            {/* Left/right zones */}
            {showForces && renderZoneContent('force_left', forceLeftX, forceW, 'center')}
            {/* Sacral levels: pelvis hidden = extended left/right zones; pelvis shown = no zones (PelvisRegion handles all targets) */}
            {isSacral && !levels.some(l => l.id === 'S2')
                ? <>
                    {renderZoneContent('left', leftZoneX, sideZoneW + scaledWidth / 2, 'left')}
                    {renderZoneContent('right', vertX + scaledWidth / 2, sideZoneW + scaledWidth / 2, 'right')}
                </>
                : !isSacral && <>
                    {renderZoneContent('left', leftZoneX, sideZoneW, 'left')}
                    {renderZoneContent('right', rightZoneX, sideZoneW, 'right')}
                </>
            }
            {showForces && renderZoneContent('force_right', forceRightX, forceW, 'center')}

            {/* Disc zone */}
            {renderDiscZone()}
        </g>
    );
});
