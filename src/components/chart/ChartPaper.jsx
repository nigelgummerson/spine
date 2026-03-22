import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { t } from '../../i18n/i18n';
import { ALL_LEVELS, VERT_SVG_SCALE, VERT_PAD, getLevelHeight, getDiscHeight,
         calculateAutoScale, yNormToRenderedY, renderedYToYNorm,
         CHART_CONTENT_HEIGHT, buildHeightMap } from '../../data/anatomy';
import { FORCE_TYPES } from '../../data/clinical';
import { InstrumentIcon } from './InstrumentIcon';
import { LevelRow } from './LevelRow';

export const ChartPaper = ({ title, placements, ghostPlacements, onZoneClick, onPlacementClick, onGhostClick, tools, readOnly, levels, showForces, heightScale, cages, onDiscClick, connectors, onConnectorUpdate, onConnectorRemove, rodHeader, viewMode, notes, onNoteUpdate, onNoteRemove, onNoteClick, ghostNotes, onGhostNoteClick, forcePlacements, ghostConnectors, onGhostConnectorClick, ghostCages, onGhostCageClick }) => {
    const contentRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const dragStartRef = useRef(null);
    const [draggingNoteId, setDraggingNoteId] = useState(null);
    const noteDragStartRef = useRef(null);
    const scaledWidth = 160 * heightScale;
    const iconScale = Math.max(0.65, Math.min(1.3, heightScale));
    const connW = Math.round(80 * iconScale);
    const connH = Math.round(24 * iconScale);

    const activeGhostConnectors = ghostConnectors ? ghostConnectors.filter(gc => !connectors.some(c => c.levelId === gc.levelId)) : [];

    // Convert connector {levelId, fraction} to rendered Y pixel position
    const connectorToRenderedY = (conn) => {
        const viewMap = buildHeightMap(levels, heightScale);
        const entry = viewMap.map.find(e => e.levelId === conn.levelId);
        if (!entry) return null;
        return entry.startY + conn.fraction * (entry.vertEnd - entry.startY);
    };

    // Convert rendered Y to {levelId, fraction}, snapping to nearest level
    const renderedYToConnector = (localY) => {
        const viewMap = buildHeightMap(levels, heightScale);
        // Use <= endY to include the exact boundary pixel; also handles gap pixels between levels
        let entry = viewMap.map.find(e => localY >= e.startY && localY <= e.endY);
        if (!entry) {
            // Find nearest level by distance to midpoint (handles border gaps)
            let best = viewMap.map[0], bestDist = Infinity;
            viewMap.map.forEach(e => {
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

    useEffect(() => {
        if (!draggingId || readOnly) return;
        const handleMouseMove = (e) => {
            if (!contentRef.current) return;
            const rect = contentRef.current.getBoundingClientRect();
            const localY = e.clientY - rect.top;
            const { levelId, fraction } = renderedYToConnector(localY);
            onConnectorUpdate(draggingId, { levelId, fraction });
        };
        const handleMouseUp = () => setDraggingId(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [draggingId, levels, heightScale, readOnly, onConnectorUpdate]);

    // Note position: convert note to pixel coords within contentRef
    const getNotePixelPos = (note) => {
        const viewMap = buildHeightMap(levels, heightScale);
        const entry = viewMap.map.find(e => e.levelId === note.levelId);
        if (!entry) return null;
        const anchorY = (entry.startY + entry.vertEnd) / 2;
        const x = note.offsetX || 80;
        const y = anchorY + (note.offsetY || 0);
        return { x, y, anchorY };
    };

    // Note drag handler
    useEffect(() => {
        if (!draggingNoteId || readOnly) return;
        const handleMouseMove = (e) => {
            if (!contentRef.current || !noteDragStartRef.current) return;
            const dx = e.clientX - noteDragStartRef.current.clientX;
            const dy = e.clientY - noteDragStartRef.current.clientY;
            const startOX = noteDragStartRef.current.offsetX;
            const startOY = noteDragStartRef.current.offsetY;
            onNoteUpdate(draggingNoteId, { offsetX: startOX + dx, offsetY: startOY + dy });
        };
        const handleMouseUp = () => setDraggingNoteId(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [draggingNoteId, readOnly, onNoteUpdate]);


    return (
    <div className="flex-1 flex flex-col h-full border-l border-slate-200 bg-white relative"><div className={`${forcePlacements ? 'px-2 py-1' : 'p-2'} bg-slate-50 border-b border-slate-200 text-center`}><div className="font-bold text-sm text-slate-800 uppercase tracking-wider">{title}</div>{forcePlacements && <div className="text-[10px] font-normal text-blue-400 italic -mt-0.5">{t('chart.force_plan_only')}</div>}</div><div className="flex-1 relative flex flex-col pt-8 px-2 justify-center">
        <div className="flex w-full absolute top-1 left-0 right-0 px-2 text-xs font-bold uppercase tracking-tighter text-center pointer-events-none z-10">
            {showForces && <div className="w-10 text-blue-400 text-left">{t('chart.header.force')}</div>}
            <div className="flex-1 text-right pr-4 text-slate-500">{t('chart.header.left')}</div>
            <div style={{ width: `${scaledWidth}px` }}></div>
            <div className="flex-1 text-left pl-4 text-slate-500">{t('chart.header.right')}</div>
            {showForces && <div className="w-10 text-blue-400 text-right">{t('chart.header.force')}</div>}
        </div>
        {rodHeader && <div className="flex w-full absolute top-4 left-0 right-0 px-2 z-10">
            {showForces && <div className="w-10"></div>}
            <div className="flex-1 flex justify-end pr-1">{React.Children.toArray(rodHeader.props.children)[0]}</div>
            <div style={{ width: `${scaledWidth * 0.5}px` }}></div>
            <div className="flex-1 flex justify-start pl-0">{React.Children.toArray(rodHeader.props.children)[1]}</div>
            {showForces && <div className="w-10"></div>}
        </div>}
        <div ref={contentRef} className="flex flex-col w-full relative">
            {levels.map(lvl => <LevelRow key={lvl.id} level={lvl} placements={placements} ghostPlacements={ghostPlacements} onZoneClick={onZoneClick} onPlacementClick={onPlacementClick} onGhostClick={onGhostClick} tools={tools} readOnly={readOnly} showForces={showForces} heightScale={heightScale} cages={cages} onDiscClick={onDiscClick} levels={levels} viewMode={viewMode} forcePlacements={forcePlacements} ghostCages={ghostCages} onGhostCageClick={onGhostCageClick} />)}
            {/* Connector overlay */}
            {connectors && connectors.length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-30">
                    {connectors.map(conn => {
                        const y = connectorToRenderedY(conn);
                        if (y === null) return null;
                        return (
                            <div key={conn.id}
                                className={`absolute pointer-events-auto group ${!readOnly ? 'cursor-grab' : ''} ${draggingId === conn.id ? 'cursor-grabbing z-40' : ''}`}
                                style={{ top: `${y - connH / 2}px`, left: '50%', transform: 'translateX(-50%)', width: `${scaledWidth}px`, height: `${connH}px` }}
                                onMouseDown={(e) => { if (!readOnly) { e.preventDefault(); dragStartRef.current = { y: e.clientY }; setDraggingId(conn.id); } }}>
                                <InstrumentIcon type="connector" className="w-full h-full drop-shadow-md text-slate-900" />
                                {!readOnly && <button
                                    className="hidden group-hover:flex absolute -top-2.5 -right-2.5 bg-red-500 text-white rounded-full w-5 h-5 items-center justify-center text-[10px] font-bold shadow hover:bg-red-600 z-50"
                                    onClick={(e) => { e.stopPropagation(); onConnectorRemove(conn.id); }}
                                    onMouseDown={(e) => e.stopPropagation()}>x</button>}
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Ghost connector overlay */}
            {activeGhostConnectors.length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-29">
                    {activeGhostConnectors.map(gc => {
                        const y = connectorToRenderedY(gc);
                        if (y === null) return null;
                        return (
                            <div key={gc.id || gc.levelId}
                                className="absolute pointer-events-auto cursor-pointer"
                                style={{ top: `${y - connH / 2}px`, left: '50%', transform: 'translateX(-50%)', width: `${scaledWidth}px`, height: `${connH}px`, opacity: 0.4 }}
                                onClick={() => onGhostConnectorClick && onGhostConnectorClick(gc)}>
                                <InstrumentIcon type="connector" className="w-full h-full drop-shadow-md text-slate-900" />
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Notes overlay */}
            {(() => {
                const activeGhostNotes = ghostNotes ? ghostNotes.filter(gn => !notes.some(n => n.levelId === gn.levelId)) : [];
                const hasNotes = notes && notes.length > 0;
                const hasGhosts = activeGhostNotes.length > 0;
                if (!hasNotes && !hasGhosts) return null;
                return (
                <React.Fragment>
                    {/* Arrow SVG layer */}
                    <svg className="absolute inset-0 pointer-events-none z-31 w-full h-full" style={{ overflow: 'visible' }}>
                        <defs>
                            <marker id={`arrowhead-${title.replace(/\s+/g,'')}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#7c3aed" />
                            </marker>
                        </defs>
                        {hasNotes && notes.filter(n => n.showArrow).map(n => {
                            const pos = getNotePixelPos(n);
                            if (!pos) return null;
                            const contentW = contentRef.current?.clientWidth || 600;
                            const noteX = contentW / 2 + pos.x;
                            const noteY = pos.y;
                            const anchorX = contentW / 2;
                            const anchorY = pos.anchorY;
                            const dx = anchorX - noteX;
                            const dy = anchorY - noteY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < 10) return null;
                            const startX = noteX + (dx / dist) * 8;
                            const startY = noteY + (dy / dist) * 8;
                            const endX = anchorX - (dx / dist) * 4;
                            const endY = anchorY - (dy / dist) * 4;
                            return <line key={n.id} x1={startX} y1={startY} x2={endX} y2={endY} stroke="#7c3aed" strokeWidth="1" markerEnd={`url(#arrowhead-${title.replace(/\s+/g,'')})`} />;
                        })}
                        {hasGhosts && <g style={{ opacity: 0.4 }}>
                            {activeGhostNotes.filter(gn => gn.showArrow).map(gn => {
                                const pos = getNotePixelPos(gn);
                                if (!pos) return null;
                                const contentW = contentRef.current?.clientWidth || 600;
                                const noteX = contentW / 2 + pos.x;
                                const noteY = pos.y;
                                const anchorX = contentW / 2;
                                const anchorY = pos.anchorY;
                                const dx = anchorX - noteX;
                                const dy = anchorY - noteY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < 10) return null;
                                const startX = noteX + (dx / dist) * 8;
                                const startY = noteY + (dy / dist) * 8;
                                const endX = anchorX - (dx / dist) * 4;
                                const endY = anchorY - (dy / dist) * 4;
                                return <line key={`ghost-${gn.id}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke="#7c3aed" strokeWidth="1" markerEnd={`url(#arrowhead-${title.replace(/\s+/g,'')})`} />;
                            })}
                        </g>}
                    </svg>
                    {/* Note label layer */}
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 32 }}>
                        {hasNotes && notes.map(n => {
                            const pos = getNotePixelPos(n);
                            if (!pos) return null;
                            return (
                                <div key={n.id} data-note-click="true"
                                    className={`absolute pointer-events-auto group select-none ${!readOnly ? 'cursor-grab' : ''} ${draggingNoteId === n.id ? 'cursor-grabbing' : ''}`}
                                    style={{ left: `calc(50% + ${pos.x}px)`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }}
                                    onMouseDown={(e) => {
                                        if (readOnly) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        noteDragStartRef.current = { clientX: e.clientX, clientY: e.clientY, offsetX: n.offsetX || 80, offsetY: n.offsetY || 0 };
                                        setDraggingNoteId(n.id);
                                    }}
                                    onClick={(e) => { e.stopPropagation(); if (!readOnly && !draggingNoteId) onNoteClick(n); }}
                                >
                                    <span className="text-[10px] font-bold text-violet-700 bg-white/90 border border-violet-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">{n.text}</span>
                                    {!readOnly && <button
                                        className="hidden group-hover:flex absolute -top-2.5 -right-2.5 bg-red-500 text-white rounded-full w-5 h-5 items-center justify-center text-[10px] font-bold shadow hover:bg-red-600 z-50"
                                        onClick={(e) => { e.stopPropagation(); onNoteRemove(n.id); }}
                                        onMouseDown={(e) => e.stopPropagation()}>x</button>}
                                </div>
                            );
                        })}
                        {hasGhosts && activeGhostNotes.map(gn => {
                            const pos = getNotePixelPos(gn);
                            if (!pos) return null;
                            return (
                                <div key={`ghost-${gn.id}`}
                                    className="absolute pointer-events-auto select-none"
                                    style={{ left: `calc(50% + ${pos.x}px)`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)', opacity: 0.4, cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); if (onGhostNoteClick) onGhostNoteClick(gn); }}
                                >
                                    <span className="text-[10px] font-bold text-violet-700 bg-white/90 border border-violet-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">{gn.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </React.Fragment>
                );
            })()}
        </div></div></div>
    );
};

// ==========================================
