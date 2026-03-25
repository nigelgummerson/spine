import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { t } from '../../i18n/i18n';
import { ALL_LEVELS, VERT_SVG_SCALE, VERT_PAD, getLevelHeight, getDiscHeight,
         calculateAutoScale, yNormToRenderedY, renderedYToYNorm,
         CHART_CONTENT_HEIGHT, buildHeightMap, DISC_MIN_PX } from '../../data/anatomy';
import { PelvisRegion } from './PelvisRegion';
import { FORCE_TYPES } from '../../data/clinical';
import { InstrumentIcon } from './InstrumentIcon';
import { LevelRow } from './LevelRow';
import type { Placement, Cage, Connector, Note, Level, ToolDefinition, OsteotomyData } from '../../types';
import { measureText } from '../../utils/measureText';

export interface ChartPaperProps {
    title: string;
    placements: Placement[];
    ghostPlacements?: Placement[];
    onZoneClick: (levelId: string, zone: string) => void;
    onPlacementClick: (placement: Placement) => void;
    onGhostClick?: (placement: Placement) => void;
    tools: ToolDefinition[];
    readOnly: boolean;
    levels: Level[];
    showForces: boolean;
    heightScale: number;
    cages: Cage[];
    onDiscClick: (levelId: string) => void;
    connectors: Connector[];
    onConnectorUpdate: (id: string, pos: { levelId: string; fraction: number }) => void;
    onConnectorRemove: (id: string) => void;
    rodHeader?: React.ReactElement;
    viewMode: string;
    notes: Note[];
    onNoteUpdate: (id: string, pos: { offsetX: number; offsetY: number }) => void;
    onNoteRemove: (id: string) => void;
    onNoteClick: (note: Note) => void;
    ghostNotes?: Note[];
    onGhostNoteClick?: (note: Note) => void;
    forcePlacements?: Placement[];
    ghostConnectors?: Connector[];
    onGhostConnectorClick?: (connector: Connector) => void;
    ghostCages?: Cage[];
    onGhostCageClick?: (cage: Cage) => void;
    reconLabelPositions?: Record<string, { offsetX: number; offsetY: number }>;
    onReconLabelUpdate?: (id: string, pos: { offsetX: number; offsetY: number }) => void;
    onPelvisZoneClick?: (levelId: string, zone: string) => void;
    isActive?: boolean;
    activeBg?: string;
    activeText?: string;
    focusedLevelId?: string | null;
    focusedZone?: 'left' | 'right' | 'mid';
}

// Header area height in SVG units
const TITLE_H = 28;       // Title row (PLAN / CONSTRUCT)
const COL_HEADER_H = 20;  // Column headers (LEFT / RIGHT / FORCE)
const ROD_HEADER_H = 22;  // Rod text row
const CONTENT_TOP = TITLE_H + COL_HEADER_H + ROD_HEADER_H;

export const ChartPaper: React.FC<ChartPaperProps> = React.memo(({ title, placements, ghostPlacements, onZoneClick, onPlacementClick, onGhostClick, tools, readOnly, levels, showForces, heightScale, cages, onDiscClick, connectors, onConnectorUpdate, onConnectorRemove, rodHeader, viewMode, notes, onNoteUpdate, onNoteRemove, onNoteClick, ghostNotes, onGhostNoteClick, forcePlacements, ghostConnectors, onGhostConnectorClick, ghostCages, onGhostCageClick, reconLabelPositions, onReconLabelUpdate, onPelvisZoneClick, isActive, activeBg, activeText, focusedLevelId, focusedZone }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(500);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragStartRef = useRef<{ y: number } | null>(null);
    const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
    const noteDragStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
    const didDragRef = useRef(false);
    const reconPositions = reconLabelPositions || {};
    const scaledWidth = 160 * heightScale;
    const iconScale = Math.max(0.65, Math.min(1.3, heightScale));
    const connW = Math.round(80 * iconScale);
    const connH = Math.round(24 * iconScale);

    const activeGhostConnectors = ghostConnectors ? ghostConnectors.filter(gc => !connectors.some(c => c.levelId === gc.levelId)) : [];

    // Measure container width and update chartWidth
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setChartWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        setChartWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // Build height map for Y calculations
    const heightMap = useMemo(() => buildHeightMap(levels, heightScale), [levels, heightScale]);
    const contentHeight = heightMap.totalHeight;
    const totalSvgHeight = contentHeight;

    // Reconstruction cage labels
    const reconCageLabels = useMemo(() => {
        return (placements || [])
            .filter(p => p.tool === 'osteotomy' && typeof p.data === 'object' && p.data !== null && (p.data as OsteotomyData).reconstructionCage)
            .map(p => ({ id: `recon-${p.levelId}`, levelId: p.levelId, text: (p.data as OsteotomyData).reconstructionCage as string, offsetX: undefined as number | undefined, offsetY: undefined as number | undefined }));
    }, [placements]);

    // Convert screen coords to SVG coords
    const screenToSvg = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        return {
            x: (clientX - ctm.e) / ctm.a,
            y: (clientY - ctm.f) / ctm.d,
        };
    }, []);

    // Convert connector {levelId, fraction} to rendered Y pixel position (relative to content area)
    const connectorToRenderedY = (conn: Connector) => {
        const entry = heightMap.map.find(e => e.levelId === conn.levelId);
        if (!entry) return null;
        return entry.startY + conn.fraction * (entry.vertEnd - entry.startY);
    };

    // Convert content-area Y to {levelId, fraction}
    const contentYToConnector = (contentY: number) => {
        const localY = contentY;
        let entry = heightMap.map.find(e => localY >= e.startY && localY <= e.endY);
        if (!entry) {
            let best = heightMap.map[0], bestDist = Infinity;
            heightMap.map.forEach(e => {
                const mid = (e.startY + e.endY) / 2;
                const dist = Math.abs(localY - mid);
                if (dist < bestDist) { bestDist = dist; best = e; }
            });
            entry = best;
        }
        const segLen = entry.vertEnd - entry.startY;
        const fraction = segLen > 0 ? Math.max(0, Math.min(1, (localY - entry.startY) / segLen)) : 0.5;
        return { levelId: entry.levelId, fraction };
    };

    // Connector drag handler (mouse + touch)
    useEffect(() => {
        if (!draggingId || readOnly) return;
        const handleMove = (clientX: number, clientY: number) => {
            const { y } = screenToSvg(clientX, clientY);
            const { levelId, fraction } = contentYToConnector(y);
            onConnectorUpdate(draggingId, { levelId, fraction });
        };
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
        const handleEnd = () => setDraggingId(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleEnd); document.removeEventListener('touchmove', handleTouchMove); document.removeEventListener('touchend', handleEnd); };
    }, [draggingId, levels, heightScale, readOnly, onConnectorUpdate, screenToSvg]);

    // Note pixel position within SVG
    const getNotePixelPos = (note: { levelId: string; offsetX?: number; offsetY?: number }) => {
        const entry = heightMap.map.find(e => e.levelId === note.levelId);
        if (!entry) return null;
        const anchorY = (entry.startY + entry.vertEnd) / 2;
        const x = note.offsetX !== undefined ? note.offsetX : -140;
        const y = anchorY + (note.offsetY || 0);
        return { x, y, anchorY };
    };

    // Note + recon label drag handler (mouse + touch)
    useEffect(() => {
        if (!draggingNoteId || readOnly) return;
        const isRecon = typeof draggingNoteId === 'string' && draggingNoteId.startsWith('recon-');
        const handleMove = (clientX: number, clientY: number) => {
            if (!noteDragStartRef.current) return;
            const dx = clientX - noteDragStartRef.current.clientX;
            const dy = clientY - noteDragStartRef.current.clientY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
            const svg = svgRef.current;
            let scaleX = 1, scaleY = 1;
            if (svg) {
                const ctm = svg.getScreenCTM();
                if (ctm) { scaleX = 1 / ctm.a; scaleY = 1 / ctm.d; }
            }
            const startOX = noteDragStartRef.current.offsetX;
            const startOY = noteDragStartRef.current.offsetY;
            if (isRecon) {
                if (onReconLabelUpdate) onReconLabelUpdate(draggingNoteId, { offsetX: startOX + dx * scaleX, offsetY: startOY + dy * scaleY });
            } else {
                onNoteUpdate(draggingNoteId, { offsetX: startOX + dx * scaleX, offsetY: startOY + dy * scaleY });
            }
        };
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
        const handleEnd = () => setDraggingNoteId(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleEnd); document.removeEventListener('touchmove', handleTouchMove); document.removeEventListener('touchend', handleEnd); };
    }, [draggingNoteId, readOnly, onNoteUpdate, screenToSvg]);

    // Calculate row Y offsets for each level
    const levelYOffsets = useMemo(() => {
        const offsets: Record<string, number> = {};
        heightMap.map.forEach(entry => {
            offsets[entry.levelId] = entry.startY;
        });
        return offsets;
    }, [heightMap]);

    // Column header positions
    const forceW = showForces ? 56 : 0;
    const sideZoneW = (chartWidth - scaledWidth - 2 * forceW) / 2;
    const leftZoneX = forceW;
    const vertX = leftZoneX + sideZoneW;
    const rightZoneX = vertX + scaledWidth;
    const forceRightX = chartWidth - forceW;
    const chartCenterX = chartWidth / 2;

    return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full border-l border-slate-200 bg-white relative overflow-hidden">
        {/* Title bar — HTML, fixed at top */}
        <div className={`${forcePlacements ? 'px-2 py-1' : 'p-2'} bg-slate-50 border-b border-slate-200 text-center shrink-0`}>
            <div className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center justify-center gap-2">{title}{isActive && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide" data-export-hide="true" style={{ backgroundColor: activeBg || '#005EB8', color: activeText || '#fff', lineHeight: '1.1' }}>{t('sidebar.editing')}</span>}</div>
            {forcePlacements && <div className="flex items-center justify-center gap-3 -mt-0.5">
                <span className="text-[10px] font-normal text-blue-400 italic">{t('chart.force_plan_only')}</span>
                {ghostPlacements && <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#14b8a6' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="3"><circle cx="12" cy="12" r="9" /><path d="M7 7l10 10M17 7l-10 10" /></svg>= {t('export.plan')}</span>}
            </div>}
        </div>

        {/* Column headers — HTML, fixed */}
        <div className="flex w-full px-2 text-sm font-bold uppercase tracking-tight text-center pointer-events-none shrink-0 py-1">
            {showForces && <div className="w-14 text-blue-400 text-left text-xs">{t('chart.header.force')}</div>}
            <div className="flex-1 text-right pr-4 text-slate-700">{t('chart.header.left')}</div>
            <div style={{ width: `${scaledWidth}px` }}></div>
            <div className="flex-1 text-left pl-4 text-slate-700">{t('chart.header.right')}</div>
            {showForces && <div className="w-14 text-blue-400 text-right text-xs">{t('chart.header.force')}</div>}
        </div>

        {/* Rod headers — HTML, fixed */}
        {rodHeader && (
            <div className="flex w-full px-2 shrink-0 -mt-1">
                {showForces && <div style={{ width: 56 }}></div>}
                <div className="flex-1 flex justify-end pr-1">
                    {React.Children.toArray((rodHeader.props as { children: React.ReactNode }).children)[0]}
                </div>
                <div style={{ width: `${scaledWidth * 0.5}px` }}></div>
                <div className="flex-1 flex justify-start pl-0">
                    {React.Children.toArray((rodHeader.props as { children: React.ReactNode }).children)[1]}
                </div>
                {showForces && <div style={{ width: 56 }}></div>}
            </div>
        )}

        {/* SVG chart content — scales with spine view */}
        <svg ref={svgRef} data-chart-svg="true" data-chart="true" viewBox={`0 0 ${chartWidth} ${totalSvgHeight}`} preserveAspectRatio="xMidYMid meet" className="flex-1 w-full" style={{ overflow: 'visible' }}>
            {/* 0. Pelvis background — iliac wings behind S1/S2, drawn first so levels paint on top */}
            {levels.some(l => l.type === 'pelvic' || l.id === 'S2') && levelYOffsets['L5'] !== undefined && (
                <PelvisRegion
                    chartWidth={chartWidth} scaledWidth={scaledWidth} vertX={vertX}
                    heightScale={heightScale}
                    l5Y={levelYOffsets['L5'] || 0}
                    s1Y={levelYOffsets['S1'] || 0}
                    s2Y={levelYOffsets['S2'] || 0}
                    clipLeft={forceW} clipRight={chartWidth - forceW}
                    readOnly={readOnly} />
            )}

            {/* 1. Level rows — vertebral bodies, zones, cages, osteotomies, implant icons */}
            <g>
                {levels.filter(lvl => lvl.type !== 'Pelvis' && lvl.type !== 'pelvic').map(lvl => (
                    <LevelRow key={lvl.id} level={lvl} placements={placements} ghostPlacements={ghostPlacements}
                        onZoneClick={onZoneClick} onPlacementClick={onPlacementClick} onGhostClick={onGhostClick}
                        tools={tools} readOnly={readOnly} showForces={showForces} heightScale={heightScale}
                        cages={cages} onDiscClick={onDiscClick} levels={levels} viewMode={viewMode}
                        forcePlacements={forcePlacements} ghostCages={ghostCages} onGhostCageClick={onGhostCageClick}
                        chartWidth={chartWidth} rowY={levelYOffsets[lvl.id] || 0}
                        focusedZone={focusedLevelId === lvl.id ? focusedZone : undefined} />
                ))}
                {/* Pelvis ghost targets — rendered ON TOP of level rows */}
                {levels.some(l => l.type === 'pelvic' || l.id === 'S2') && levelYOffsets['L5'] !== undefined && (
                    <PelvisRegion overlay
                        chartWidth={chartWidth} scaledWidth={scaledWidth} vertX={vertX}
                        heightScale={heightScale}
                        l5Y={levelYOffsets['L5'] || 0}
                        s1Y={levelYOffsets['S1'] || 0}
                        s2Y={levelYOffsets['S2'] || 0}
                        clipLeft={forceW} clipRight={chartWidth - forceW}
                        readOnly={readOnly}
                        placements={placements} ghostPlacements={ghostPlacements} tools={tools}
                        onZoneClick={onPelvisZoneClick}
                        onPlacementClick={onPlacementClick}
                        onGhostClick={onGhostClick} />
                )}
            </g>

            {/* 1b. Disc zones — separate pass so they paint on top of next level's zone rects */}
            <g>
                {levels.map(lvl => {
                    const rowY = levelYOffsets[lvl.id] || 0;
                    const entry = heightMap.map.find(e => e.levelId === lvl.id);
                    if (!entry) return null;
                    const vertH = entry.vertEnd - entry.startY;
                    const discH = entry.endY - entry.vertEnd;
                    if (discH <= 0) return null;
                    const discY = rowY + vertH;
                    // Route disc clicks: ghost cage → ghost cage handler, ghost osteo → ghost click, otherwise → disc picker
                    const ghostCage = ghostCages?.find(gc => gc.levelId === lvl.id);
                    const existingCage = cages.find(c => c.levelId === lvl.id);
                    const ghostOsteo = ghostPlacements?.find(p => p.levelId === lvl.id && p.zone === 'disc');
                    const existingOsteo = placements.find(p => p.levelId === lvl.id && p.zone === 'disc');
                    const handleDiscAreaClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        if (!existingCage && ghostCage && onGhostCageClick) { onGhostCageClick(ghostCage); }
                        else if (!existingOsteo && ghostOsteo && onGhostClick) { onGhostClick(ghostOsteo); }
                        else { onDiscClick(lvl.id); }
                    };
                    return (
                        <rect key={`disc-click-${lvl.id}`} data-zone="disc" data-level={lvl.id} x={vertX} y={discY} width={scaledWidth} height={discH}
                            fill="transparent" cursor={!readOnly ? 'pointer' : 'default'}
                            pointerEvents="all"
                            onMouseEnter={!readOnly ? (e) => { (e.target as SVGRectElement).setAttribute('fill', 'rgba(186, 230, 253, 0.4)'); } : undefined}
                            onMouseLeave={!readOnly ? (e) => { (e.target as SVGRectElement).setAttribute('fill', 'transparent'); } : undefined}
                            onClick={handleDiscAreaClick} />
                    );
                })}
            </g>

            {/* 2. Crosslinks — above vertebrae/cages/osteotomies, below notes */}
            {connectors && connectors.length > 0 && (
                <g opacity={0.55}>
                    {connectors.map(conn => {
                        const y = connectorToRenderedY(conn);
                        if (y === null) return null;
                        return (
                            <g key={conn.id}
                                cursor={!readOnly ? (draggingId === conn.id ? 'grabbing' : 'grab') : 'default'}
                                onMouseDown={(e) => {
                                    if (!readOnly) {
                                        e.preventDefault();
                                        dragStartRef.current = { y: e.clientY };
                                        setDraggingId(conn.id);
                                    }
                                }}
                                onTouchStart={(e) => {
                                    if (!readOnly) {
                                        e.preventDefault();
                                        dragStartRef.current = { y: e.touches[0].clientY };
                                        setDraggingId(conn.id);
                                    }
                                }}>
                                <svg x={vertX} y={y - connH / 2} width={scaledWidth} height={connH} overflow="visible">
                                    <InstrumentIcon type="connector" className="w-full h-full" color="#1e293b" />
                                </svg>
                                {!readOnly && (
                                    <g className="connector-remove-btn" opacity={0}
                                        style={{ pointerEvents: 'all' }}
                                        onClick={(e) => { e.stopPropagation(); onConnectorRemove(conn.id); }}
                                        onMouseDown={(e) => e.stopPropagation()}>
                                        <circle cx={vertX + scaledWidth + 4} cy={y} r={7} fill="#ef4444" />
                                        <text x={vertX + scaledWidth + 4} y={y}
                                            textAnchor="middle" dominantBaseline="middle"
                                            fontSize={10} fontWeight="bold" fill="white">x</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </g>
            )}

            {/* Ghost crosslinks */}
            {activeGhostConnectors.length > 0 && (
                <g>
                    {activeGhostConnectors.map(gc => {
                        const y = connectorToRenderedY(gc);
                        if (y === null) return null;
                        return (
                            <g key={gc.id || gc.levelId} opacity={0.75} cursor="pointer"
                                onClick={() => onGhostConnectorClick && onGhostConnectorClick(gc)}>
                                <svg x={vertX} y={y - connH / 2} width={scaledWidth} height={connH} overflow="visible">
                                    <InstrumentIcon type="connector" className="w-full h-full" color="#14b8a6" />
                                </svg>
                            </g>
                        );
                    })}
                </g>
            )}

            {/* 3. Leader lines */}
            {(() => {
                const activeGhostNotes = ghostNotes ? ghostNotes.filter(gn => !notes.some(n => n.levelId === gn.levelId)) : [];
                const allLeaderItems = [
                    ...(notes || []).map(n => ({ ...n, _type: 'note' })),
                    ...activeGhostNotes.map(gn => ({ ...gn, _type: 'ghost-note' })),
                    ...reconCageLabels.map(rc => ({ ...rc, _type: 'recon' })),
                ];
                if (allLeaderItems.length === 0) return null;
                return (
                    <g>
                        {allLeaderItems.filter(item => item._type === 'recon' || ('showArrow' in item && item.showArrow !== false)).map(item => {
                            let pos;
                            if (item._type === 'recon') {
                                const rPos = reconPositions[item.id] || {};
                                pos = getNotePixelPos({ levelId: item.levelId, offsetX: rPos.offsetX !== undefined ? rPos.offsetX : -160, offsetY: rPos.offsetY || 0 });
                            } else {
                                pos = getNotePixelPos(item);
                            }
                            if (!pos) return null;
                            const labelX = chartCenterX + pos.x;
                            const labelY = pos.y;
                            const anchorX = chartCenterX;
                            const anchorY = pos.anchorY;
                            const dx = anchorX - labelX;
                            const dy = anchorY - labelY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < 15) return null;
                            const startX = labelX < anchorX ? labelX + 50 : labelX - 50;
                            const startY = labelY;
                            const endX = anchorX - (dx / dist) * 15;
                            const endY = anchorY - (dy / dist) * 15;
                            const color = item._type === 'recon' ? '#0369a1' : '#c4b5fd';
                            const opacity = item._type === 'ghost-note' ? 0.75 : 1;
                            return <line key={`leader-${item.id}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke={color} strokeWidth={0.75} strokeDasharray="3 2" opacity={opacity} />;
                        })}
                    </g>
                );
            })()}

            {/* Notes + recon cage labels */}
            {(() => {
                const activeGhostNotes = ghostNotes ? ghostNotes.filter(gn => !notes.some(n => n.levelId === gn.levelId)) : [];
                const hasNotes = notes && notes.length > 0;
                const hasGhosts = activeGhostNotes.length > 0;
                const hasRecon = reconCageLabels.length > 0;
                if (!hasNotes && !hasGhosts && !hasRecon) return null;

                const renderNoteLabel = (n: { id: string; levelId: string; text: string; offsetX?: number; offsetY?: number }, opts: {
                    opacity?: number; draggable?: boolean; onClick?: (e: React.MouseEvent) => void;
                    onMouseDown?: (e: React.MouseEvent) => void; onTouchStart?: (e: React.TouchEvent) => void;
                    bgFill?: string; borderColor?: string; textColor?: string;
                }) => {
                    const pos = getNotePixelPos(n);
                    if (!pos) return null;
                    const x = chartCenterX + pos.x;
                    const y = pos.y;
                    const lines = n.text.split('\\n');
                    const lineH = 12;
                    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
                    const measured = measureText(longestLine, '9px Inter, Noto Sans SC, Noto Sans JP, Noto Sans KR, Tahoma, sans-serif') + 12;
                    const heuristic = longestLine.length * 6 + 12;
                    const rectW = Math.min(200, Math.max(30, Math.max(measured, heuristic)));
                    const rectH = lines.length * lineH + 4;
                    const rectTop = y - rectH / 2;
                    return (
                        <g key={n.id} opacity={opts.opacity || 1}
                            cursor={opts.draggable && !readOnly ? 'grab' : (opts.onClick ? 'pointer' : 'default')}
                            onMouseDown={opts.onMouseDown}
                            onTouchStart={opts.onTouchStart}
                            onClick={opts.onClick}>
                            <rect x={x - rectW / 2} y={rectTop} width={rectW} height={rectH}
                                rx={3} fill={opts.bgFill || 'rgba(255,255,255,0.9)'}
                                stroke={opts.borderColor || '#ddd6fe'} strokeWidth={1} />
                            {lines.map((line, i) => (
                                <text key={i} x={x} y={rectTop + 2 + lineH / 2 + i * lineH}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={10} fontWeight="bold" fill={opts.textColor || '#6d28d9'}>
                                    {line}
                                </text>
                            ))}
                            {opts.draggable && !readOnly && (
                                <g className="note-remove-btn" opacity={0}
                                    onClick={(e) => { e.stopPropagation(); onNoteRemove(n.id); }}
                                    onMouseDown={(e) => e.stopPropagation()}>
                                    <circle cx={x + rectW / 2 + 4} cy={y - rectH / 2 - 4} r={8} fill="#ef4444" />
                                    <text x={x + rectW / 2 + 4} y={y - rectH / 2 - 4}
                                        textAnchor="middle" dominantBaseline="middle"
                                        fontSize={10} fontWeight="bold" fill="white">x</text>
                                </g>
                            )}
                        </g>
                    );
                };

                return (
                    <g>
                        {hasNotes && notes.map(n => renderNoteLabel(n, {
                            draggable: true,
                            onMouseDown: (e) => {
                                if (readOnly) return;
                                e.preventDefault();
                                e.stopPropagation();
                                didDragRef.current = false;
                                noteDragStartRef.current = { clientX: e.clientX, clientY: e.clientY, offsetX: n.offsetX || 80, offsetY: n.offsetY || 0 };
                                setDraggingNoteId(n.id);
                            },
                            onTouchStart: (e) => {
                                if (readOnly) return;
                                e.preventDefault();
                                e.stopPropagation();
                                didDragRef.current = false;
                                const t = e.touches[0];
                                noteDragStartRef.current = { clientX: t.clientX, clientY: t.clientY, offsetX: n.offsetX || 80, offsetY: n.offsetY || 0 };
                                setDraggingNoteId(n.id);
                            },
                            onClick: (e) => { e.stopPropagation(); if (!readOnly && !didDragRef.current) { setDraggingNoteId(null); onNoteClick(n); } },
                        }))}
                        {hasGhosts && activeGhostNotes.map(gn => renderNoteLabel(gn, {
                            opacity: 0.75,
                            onClick: (e) => { e.stopPropagation(); if (onGhostNoteClick) onGhostNoteClick(gn); },
                            borderColor: '#5eead4',
                            textColor: '#0d9488',
                        }))}
                        {hasRecon && reconCageLabels.map(rc => {
                            const rPos = reconPositions[rc.id] || {};
                            const noteForPos = { ...rc, offsetX: rPos.offsetX !== undefined ? rPos.offsetX : -160, offsetY: rPos.offsetY || 0 };
                            return renderNoteLabel(noteForPos, {
                                draggable: true,
                                bgFill: '#f0f9ff',
                                borderColor: '#bae6fd',
                                textColor: '#0369a1',
                                onMouseDown: (e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    didDragRef.current = false;
                                    noteDragStartRef.current = { clientX: e.clientX, clientY: e.clientY, offsetX: rPos.offsetX !== undefined ? rPos.offsetX : -160, offsetY: rPos.offsetY || 0 };
                                    setDraggingNoteId(rc.id);
                                },
                                onTouchStart: (e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    didDragRef.current = false;
                                    const t = e.touches[0];
                                    noteDragStartRef.current = { clientX: t.clientX, clientY: t.clientY, offsetX: rPos.offsetX !== undefined ? rPos.offsetX : -160, offsetY: rPos.offsetY || 0 };
                                    setDraggingNoteId(rc.id);
                                },
                                onClick: (e) => {
                                    e.stopPropagation();
                                    if (readOnly || draggingNoteId || didDragRef.current) return;
                                    const osteo = placements.find(p => p.levelId === rc.levelId && p.tool === 'osteotomy');
                                    if (osteo) onPlacementClick(osteo);
                                },
                            });
                        })}
                    </g>
                );
            })()}
        </svg>
    </div>
    );
});

// ==========================================
