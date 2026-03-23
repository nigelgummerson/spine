import React from 'react';
import { t } from '../../i18n/i18n';
import { getDiscHeight, getLevelHeight, DISC_MIN_PX } from '../../data/anatomy';
import { HOOK_TYPES, FORCE_TYPES } from '../../data/clinical';
const FIXATION_TYPES = ['band', 'wire', 'cable'];
import { InstrumentIcon } from './InstrumentIcon';
import { SpineVertebra } from './SpineVertebra';
import { CageVisualization } from './CageVisualization';
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
export const LevelRow: React.FC<LevelRowProps> = ({ level, placements, ghostPlacements, onZoneClick, tools, onPlacementClick, onGhostClick, readOnly, showForces, heightScale, onDiscClick, cages, levels, viewMode, forcePlacements, ghostCages, onGhostCageClick, chartWidth, rowY }) => {
    const getItems = (z: string) => {
        const src = (forcePlacements && z.startsWith('force')) ? forcePlacements : placements;
        return src.filter(p => p.levelId === level.id && p.zone === z);
    };
    const rowHeight = getLevelHeight(level) * heightScale;
    const scaledWidth = 160 * heightScale;

    // Scaled instrument sizes
    const iconScale = Math.max(0.65, Math.min(1.3, heightScale));
    const screwPx = Math.round(24 * iconScale);
    const hookW = Math.round(30 * iconScale);
    const hookH = Math.round(20 * iconScale);
    const fixW = Math.round(40 * iconScale);
    const fixH = Math.round(18 * iconScale);
    const osteoPx = Math.round(32 * iconScale);
    const midPx = Math.round(36 * iconScale);
    const labelScale = Math.max(0.9, Math.min(1.2, Math.pow(heightScale, 0.3)));
    const labelPx = Math.max(15, Math.min(18, Math.round(16 * labelScale)));
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
    const renderIcon = (type: string, x: number, y: number, w: number, h: number, extraProps?: Record<string, any>) => (
        <svg x={x} y={y} width={w} height={h} overflow="visible" {...extraProps}>
            <InstrumentIcon type={type} className="w-full h-full" />
        </svg>
    );

    /** Render a ghost target (empty zone indicator) */
    const renderGhostTarget = (cx: number, cy: number, isForce: boolean) => {
        if (isForce) {
            // Cardinal icon for force zones
            return (
                <svg x={cx - 10} y={cy - 10} width={20} height={20} viewBox="0 0 24 24" opacity={0.4} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <path d="M12 3v18"/><path d="M3 12h18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/><path d="M17 8l4 4-4 4"/><path d="M7 8l-4 4 4 4"/>
                </svg>
            );
        }
        const r = screwPx / 2;
        return (
            <g opacity={0.6}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" />
                <circle cx={cx} cy={cy} r={1.5} fill="#94a3b8" />
            </g>
        );
    };

    /** Render items for a zone (left, right, force_left, force_right) */
    const renderZoneContent = (zone: string, zoneX: number, zoneW: number, align: 'left' | 'right' | 'center') => {
        const items = getItems(zone);
        const ghostItem = (!items.length && ghostPlacements && !zone.startsWith('force'))
            ? ghostPlacements.find(p => p.levelId === level.id && p.zone === zone)
            : null;
        const isForceZone = zone.startsWith('force');

        // Centre of zone for ghost targets
        const zoneCx = zoneX + zoneW / 2;
        const zoneCy = rowHeight / 2;

        // Click zone background
        const clickable = !readOnly && (!isForceZone || !forcePlacements);
        const elements: React.ReactElement[] = [];

        // Clickable background rect
        elements.push(
            <rect key={`zone-bg-${zone}`} x={zoneX} y={0} width={zoneW} height={rowHeight}
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
            elements.push(<g key={`ghost-target-${zone}`}>{renderGhostTarget(zoneCx, zoneCy, isForceZone)}</g>);
        }

        // Render placed items
        items.forEach(p => {
            const tool = tools.find(item => item.id === p.tool);
            const isHookItem = HOOK_TYPES.includes(p.tool);
            const isOsteo = p.tool === 'osteotomy';
            let displayLabel: any = p.data;
            let angle: any = null;
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

            // Position icon: for left align icon is on the right side of zone, for right on left side
            let iconX: number;
            const iconY = 2; // slight top offset like pt-[2px]
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                // Icon on right side of zone (near vertebra)
                iconX = zoneX + zoneW - iW - 4;
            } else {
                // Icon on left side of zone (near vertebra)
                iconX = zoneX + 4;
            }

            // Label text
            const labelText = showData
                ? (isOsteo ? (angle != null && angle !== '' ? `${displayLabel} ${angle}\u00B0` : String(displayLabel)) : String(displayLabel))
                : '';
            const annText = showAnn ? ann : '';

            // Label position: opposite side of icon from vertebra
            let labelX: number;
            let labelAnchor: string;
            if (align === 'left') {
                labelX = iconX - 4;
                labelAnchor = 'end';
            } else if (align === 'right') {
                labelX = iconX + iW + 4;
                labelAnchor = 'start';
            } else {
                labelX = zoneCx;
                labelAnchor = 'middle';
            }

            elements.push(
                <g key={p.id} cursor={!readOnly ? 'pointer' : 'default'}
                    onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(p); }}>
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH)}
                    {labelText && (
                        <text x={labelX} y={iconY + iH / 2 - 1}
                            textAnchor={labelAnchor} dominantBaseline="middle"
                            fontSize={labelPx} fontFamily="ui-monospace, monospace" fontWeight="bold" fill="#334155">
                            {labelText}
                        </text>
                    )}
                    {annText && (
                        <text x={labelX} y={iconY + iH / 2 + (labelText ? labelPx * 0.7 : 0)}
                            textAnchor={labelAnchor} dominantBaseline="middle"
                            fontSize={9} fontStyle="italic" fill="#94a3b8">
                            {annText}
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
            let displayLabel: any = ghostItem.data;
            let angle: any = null;
            if (isOsteo && typeof ghostItem.data === 'object' && ghostItem.data !== null) {
                displayLabel = (ghostItem.data as OsteotomyData).shortLabel || (ghostItem.data as OsteotomyData).type;
                angle = (ghostItem.data as OsteotomyData).angle;
            }
            const isFixation = FIXATION_TYPES.includes(ghostItem.tool);
            const iW = isFixation ? fixW : isHookItem ? hookW : isOsteo ? osteoPx : screwPx;
            const iH = isFixation ? fixH : isHookItem ? hookH : isOsteo ? osteoPx : screwPx;
            const ann = ghostItem.annotation || '';
            const showData = ghostItem.data && !isHookItem && !isFixation;
            const showAnn = !!ann;

            let iconX: number;
            const iconY = 2;
            if (align === 'center') {
                iconX = zoneCx - iW / 2;
            } else if (align === 'left') {
                iconX = zoneX + zoneW - iW - 4;
            } else {
                iconX = zoneX + 4;
            }

            const labelText = showData
                ? (isOsteo ? (angle != null && angle !== '' ? `${displayLabel} ${angle}\u00B0` : String(displayLabel)) : String(displayLabel))
                : '';
            const annText = showAnn ? ann : '';
            let labelX: number;
            let labelAnchor: string;
            if (align === 'left') {
                labelX = iconX - 4;
                labelAnchor = 'end';
            } else if (align === 'right') {
                labelX = iconX + iW + 4;
                labelAnchor = 'start';
            } else {
                labelX = zoneCx;
                labelAnchor = 'middle';
            }

            elements.push(
                <g key={'ghost-' + ghostItem.id} opacity={0.4} cursor="pointer"
                    onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostItem); }}>
                    {renderIcon(tool?.icon || '', iconX, iconY, iW, iH)}
                    {labelText && (
                        <text x={labelX} y={iconY + iH / 2 - 1}
                            textAnchor={labelAnchor} dominantBaseline="middle"
                            fontSize={labelPx} fontFamily="ui-monospace, monospace" fontWeight="bold" fill="#334155">
                            {labelText}
                        </text>
                    )}
                    {annText && (
                        <text x={labelX} y={iconY + iH / 2 + (labelText ? labelPx * 0.7 : 0)}
                            textAnchor={labelAnchor} dominantBaseline="middle"
                            fontSize={9} fontStyle="italic" fill="#94a3b8">
                            {annText}
                        </text>
                    )}
                </g>
            );
        }

        return <g key={`zone-${zone}`}>{elements}</g>;
    };

    /** Render midline zone content (osteotomies on vertebral body) */
    const renderMidContent = () => {
        const midItems = getItems('mid').filter(p => p.tool !== 'connector');
        const elements: React.ReactElement[] = [];

        midItems.forEach(p => {
            const tool = tools.find(item => item.id === p.tool);
            let displayLabel: any = '';
            let angle: any = '';
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
                    {p.tool === 'osteotomy' && p.data && (
                        <g>
                            <rect x={vertX + scaledWidth / 2 - 30} y={rowHeight / 2 - osteoLabelPx / 2 - 2}
                                width={60} height={osteoLabelPx + 4} rx={3}
                                fill="#fffbeb" fillOpacity={0.8} stroke="#fcd34d" strokeWidth={1} />
                            <text x={vertX + scaledWidth / 2} y={rowHeight / 2}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={osteoLabelPx} fontWeight="bold" fill="#92400e">
                                {displayLabel}{angle != null && angle !== '' ? ` ${angle}\u00B0` : ''}
                            </text>
                        </g>
                    )}
                </g>
            );
        });

        // Ghost mid placement
        if (ghostPlacements && !midItems.length) {
            const gp = ghostPlacements.find(p => p.levelId === level.id && p.zone === 'mid');
            if (gp) {
                const tool = tools.find(item => item.id === gp.tool);
                let displayLabel: any = '';
                let angle: any = '';
                if (gp.tool === 'osteotomy' && typeof gp.data === 'object' && gp.data !== null) {
                    displayLabel = (gp.data as OsteotomyData).shortLabel || (gp.data as OsteotomyData).type;
                    angle = (gp.data as OsteotomyData).angle;
                }
                elements.push(
                    <g key={'ghost-' + gp.id} opacity={0.4} cursor="pointer"
                        onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(gp); }}>
                        <svg x={vertX + scaledWidth / 2 - midPx / 2} y={rowHeight / 2 - midPx / 2} width={midPx} height={midPx} overflow="visible">
                            <InstrumentIcon type={tool?.icon || ''} className="w-full h-full" />
                        </svg>
                        {gp.tool === 'osteotomy' && gp.data && (
                            <g>
                                <rect x={vertX + scaledWidth / 2 - 30} y={rowHeight / 2 - osteoLabelPx / 2 - 2}
                                    width={60} height={osteoLabelPx + 4} rx={3}
                                    fill="#fffbeb" fillOpacity={0.8} stroke="#fcd34d" strokeWidth={1} />
                                <text x={vertX + scaledWidth / 2} y={rowHeight / 2}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={osteoLabelPx} fontWeight="bold" fill="#92400e">
                                    {displayLabel}{angle != null && angle !== '' ? ` ${angle}\u00B0` : ''}
                                </text>
                            </g>
                        )}
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

        const renderCageInfo = (cage: Cage, opacity?: number) => {
            if (viewMode === 'whole' && level.type === 'C') {
                return (
                    <g opacity={opacity}>
                        <text x={vertX + scaledWidth / 2} y={discY + discH / 2}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={Math.max(9, cageLabelPx - 1)} fontStyle="italic" fill="#d97706">
                            {t('chart.cervical_cage_hint')}
                        </text>
                    </g>
                );
            }
            const sideChar = cage.data.side && cage.data.side !== 'bilateral' && cage.data.side !== 'midline'
                ? ` (${cage.data.side.charAt(0).toUpperCase()})` : '';
            const cageLabel = `${cage.tool.toUpperCase()} ${cage.data.height}H ${cage.data.lordosis || '0'}\u00B0${sideChar}`;
            return (
                <g opacity={opacity}>
                    <svg x={vertX} y={discY} width={scaledWidth} height={discH} viewBox="0 0 160 20" preserveAspectRatio="none" overflow="visible">
                        <CageVisualization cageType={cage.tool} heightScale={1} levelId={level.id} />
                    </svg>
                    <text x={rightZoneX + 8} y={discY + discH / 2}
                        textAnchor="start" dominantBaseline="middle"
                        fontSize={cageLabelPx} fontWeight="bold" fill="#0369a1">
                        {cageLabel}
                    </text>
                </g>
            );
        };

        const renderOsteoLabel = (osteo: Placement, opacity?: number) => {
            const data = osteo.data as any;
            const label = data?.shortLabel || t('clinical.osteotomy.fallback');
            const angleStr = data?.angle != null && data?.angle !== '' ? ` ${data.angle}\u00B0` : '';
            return (
                <g opacity={opacity}>
                    <rect x={vertX + scaledWidth / 2 - 30} y={discY + discH / 2 - cageLabelPx / 2 - 2}
                        width={60} height={cageLabelPx + 4} rx={3}
                        fill="#fffbeb" fillOpacity={0.8} stroke="#fcd34d" strokeWidth={1} />
                    <text x={vertX + scaledWidth / 2} y={discY + discH / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={cageLabelPx} fontWeight="bold" fill="#92400e">
                        {label}{angleStr}
                    </text>
                </g>
            );
        };

        return (
            <g>
                {/* Disc zone click area */}
                <rect x={vertX} y={discY} width={scaledWidth} height={discH}
                    fill="transparent" cursor={!readOnly ? 'pointer' : 'default'}
                    onClick={() => !readOnly && onDiscClick(level.id)} />
                {cageBelow ? renderCageInfo(cageBelow)
                    : ghostCageBelow ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); onGhostCageClick && onGhostCageClick(ghostCageBelow); }}>
                            {renderCageInfo(ghostCageBelow, 0.4)}
                        </g>
                    )
                    : discOsteo ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(discOsteo); }}>
                            {renderOsteoLabel(discOsteo)}
                        </g>
                    )
                    : ghostDiscOsteo ? (
                        <g cursor="pointer" onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostDiscOsteo); }}>
                            {renderOsteoLabel(ghostDiscOsteo, 0.4)}
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

            {/* Vertebral body */}
            <rect x={vertX} y={0} width={scaledWidth} height={rowHeight}
                fill="transparent" cursor={!readOnly ? 'pointer' : 'default'}
                onClick={() => !readOnly && onZoneClick(level.id, 'mid')} />
            <svg x={vertX} y={0} width={scaledWidth} height={rowHeight} overflow="visible" style={{ pointerEvents: 'none' }}>
                <SpineVertebra label={level.id} type={level.type} height={getLevelHeight(level)} isCorpectomy={isCorpectomy} heightScale={heightScale} />
            </svg>

            {/* Mid zone content (osteotomies etc) */}
            {renderMidContent()}

            {/* Left/right zones */}
            {showForces && renderZoneContent('force_left', forceLeftX, forceW, 'center')}
            {renderZoneContent('left', leftZoneX, sideZoneW, 'left')}
            {renderZoneContent('right', rightZoneX, sideZoneW, 'right')}
            {showForces && renderZoneContent('force_right', forceRightX, forceW, 'center')}

            {/* Disc zone */}
            {renderDiscZone()}
        </g>
    );
};
