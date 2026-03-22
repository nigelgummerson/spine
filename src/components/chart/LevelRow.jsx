import React, { useState } from 'react';
import { t } from '../../i18n/i18n';
import { genId } from '../../utils/id';
import { getDiscHeight, getLevelHeight, VERT_SVG_SCALE, VERT_PAD , DISC_MIN_PX} from '../../data/anatomy';
import { CAGE_TYPES, HOOK_TYPES, NO_SIZE_TYPES, FORCE_TYPES, getDiscLabel } from '../../data/clinical';
import { InstrumentIcon } from './InstrumentIcon';
import { SpineVertebra } from './SpineVertebra';
import { CageVisualization } from './CageVisualization';
import { IconCardinal } from '../icons';

export const LevelRow = ({ level, placements, ghostPlacements, onZoneClick, tools, onPlacementClick, onGhostClick, readOnly, showForces, heightScale, onDiscClick, cages, levels, viewMode, forcePlacements, ghostCages, onGhostCageClick }) => {
    const getItems = (z) => {
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
    const osteoPx = Math.round(32 * iconScale);
    const midPx = Math.round(36 * iconScale);
    // Label font scaling: gentle reduction in compressed views (use hs^0.3 not linear)
    const labelScale = Math.max(0.9, Math.min(1.2, Math.pow(heightScale, 0.3)));
    const labelPx = Math.max(13, Math.min(16, Math.round(14 * labelScale)));
    const cageLabelPx = Math.max(12, Math.min(15, Math.round(13 * labelScale)));
    const cageMaxW = Math.round(120 / Math.max(1, iconScale));
    const osteoLabelPx = Math.max(13, Math.min(16, Math.round(15 * labelScale)));

    // Check if Corpectomy
    const isCorpectomy = placements.some(p => p.levelId === level.id && p.data?.type === 'Corpectomy');

    // Reconstruction cage text from osteotomy
    const reconCageText = placements.filter(p => p.levelId === level.id && p.tool === 'osteotomy' && p.data?.reconstructionCage).map(p => p.data.reconstructionCage)[0] || '';

    // Check for Cage below this level
    const cageBelow = cages.find(c => c.levelId === level.id);
    const ghostCageBelow = !cageBelow && ghostCages ? ghostCages.find(c => c.levelId === level.id) : null;
    // Check for disc-level osteotomy (Schwab 1-2)
    const discOsteo = placements.find(p => p.levelId === level.id && p.zone === 'disc');
    const ghostDiscOsteo = !discOsteo && ghostPlacements ? ghostPlacements.find(p => p.levelId === level.id && p.zone === 'disc') : null;

    const GhostTarget = ({ type }) => {
        if (type === 'force') return <div className="flex items-center justify-center h-full w-full"><IconCardinal /></div>;
        return (<div style={{ width: screwPx, height: screwPx }} className="rounded-full border-2 border-slate-400 border-dashed flex items-center justify-center opacity-60 hover:opacity-100 hover:border-amber-400 hover:bg-amber-50 transition-all"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>);
    };

    const ZoneContent = ({ zone, align }) => {
        const items = getItems(zone);
        const ghostItem = (!items.length && ghostPlacements && !zone.startsWith('force'))
            ? ghostPlacements.find(p => p.levelId === level.id && p.zone === zone)
            : null;
        const hasItems = items.length > 0;
        const justifyClass = align === 'right' ? 'justify-start pl-1' : (align === 'center' ? 'justify-center' : 'justify-end pr-1');
        const isForceZone = zone.startsWith('force');
        const verticalClass = isForceZone ? 'items-center' : 'items-start pt-[2px]';
        return (
            <div className={`flex ${verticalClass} gap-1 h-full ${justifyClass} relative`}>{!hasItems && !ghostItem && !readOnly && (zone === 'left' || zone === 'right' || isForceZone) && <GhostTarget type={isForceZone ? 'force' : 'screw'} />}
                {items.map(p => {
                    const tool = tools.find(item => item.id === p.tool);
                    const isHookItem = HOOK_TYPES.includes(p.tool);
                    const isOsteo = p.tool === 'osteotomy';
                    let displayLabel = p.data;
                    let angle = null;
                    if (isOsteo && typeof p.data === 'object') {
                        displayLabel = p.data.shortLabel || p.data.type;
                        angle = p.data.angle;
                    }
                    const iW = isHookItem ? hookW : isOsteo ? osteoPx : screwPx;
                    const iH = isHookItem ? hookH : isOsteo ? osteoPx : screwPx;
                    const ann = p.annotation || '';
                    const showData = p.data && !isHookItem;
                    const showAnn = !!ann;
                    const isInline = heightScale < 0.85 && showData && showAnn;
                    const labelBlock = (showData || showAnn) ? (
                        <div
                            className={`flex ${isInline ? (align === 'left' ? 'flex-row-reverse' : 'flex-row') : 'flex-col'} leading-none`}
                            style={{
                                alignItems: isInline ? 'center' : (align === 'right' ? 'flex-start' : 'flex-end'),
                                gap: isInline ? '3px' : '0px'
                            }}
                        >
                            {showData && (
                                <span
                                    className="font-mono font-bold text-slate-700 bg-white/80 px-1 rounded whitespace-nowrap leading-tight"
                                    style={{ fontSize: labelPx + 'px' }}
                                >
                                    {isOsteo ? (angle != null && angle !== '' ? `${displayLabel} ${angle}\u00B0` : displayLabel) : displayLabel}
                                </span>
                            )}
                            {showAnn && (
                                <span
                                    className="text-slate-400 italic whitespace-nowrap px-1 leading-tight"
                                    style={{ fontSize: Math.max(8, labelPx - 2) + 'px' }}
                                >
                                    {ann}
                                </span>
                            )}
                        </div>
                    ) : null;
                    return (
                        <div
                            key={p.id}
                            className={`relative group flex items-center gap-1 ${!readOnly ? 'cursor-pointer' : ''}`}
                            onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(p); }}
                        >
                            {align === 'left' && labelBlock}
                            <div
                                style={{ width: iW, height: iH, willChange: 'transform' }}
                                className={`${!readOnly ? 'group-hover:scale-110 transition-transform' : ''}`}
                            >
                                <InstrumentIcon type={tool?.icon} className="w-full h-full drop-shadow-sm text-slate-900" />
                                {!readOnly && <div className="hidden group-hover:block absolute -top-1 -right-1 bg-amber-500 rounded-full w-2 h-2" />}
                            </div>
                            {align === 'right' && labelBlock}
                        </div>
                    );
                })}
                {ghostItem && (() => {
                    const tool = tools.find(item => item.id === ghostItem.tool);
                    const isHookItem = HOOK_TYPES.includes(ghostItem.tool);
                    const isOsteo = ghostItem.tool === 'osteotomy';
                    let displayLabel = ghostItem.data;
                    let angle = null;
                    if (isOsteo && typeof ghostItem.data === 'object') {
                        displayLabel = ghostItem.data.shortLabel || ghostItem.data.type;
                        angle = ghostItem.data.angle;
                    }
                    const iW = isHookItem ? hookW : isOsteo ? osteoPx : screwPx;
                    const iH = isHookItem ? hookH : isOsteo ? osteoPx : screwPx;
                    const ann = ghostItem.annotation || '';
                    const showData = ghostItem.data && !isHookItem;
                    const showAnn = !!ann;
                    const isInline = heightScale < 0.85 && showData && showAnn;
                    const ghostLabelBlock = (showData || showAnn) ? (
                        <div
                            className={`flex ${isInline ? (align === 'left' ? 'flex-row-reverse' : 'flex-row') : 'flex-col'} leading-none`}
                            style={{
                                alignItems: isInline ? 'center' : (align === 'right' ? 'flex-start' : 'flex-end'),
                                gap: isInline ? '3px' : '0px'
                            }}
                        >
                            {showData && (
                                <span
                                    className="font-mono font-bold text-slate-700 bg-white/80 px-1 rounded whitespace-nowrap leading-tight"
                                    style={{ fontSize: labelPx + 'px' }}
                                >
                                    {isOsteo ? (angle != null && angle !== '' ? `${displayLabel} ${angle}\u00B0` : displayLabel) : displayLabel}
                                </span>
                            )}
                            {showAnn && (
                                <span
                                    className="text-slate-400 italic whitespace-nowrap px-1 leading-tight"
                                    style={{ fontSize: Math.max(8, labelPx - 2) + 'px' }}
                                >
                                    {ann}
                                </span>
                            )}
                        </div>
                    ) : null;
                    return (
                        <div
                            key={'ghost-' + ghostItem.id}
                            className="relative group flex items-center gap-1 cursor-pointer"
                            style={{ opacity: 0.4 }}
                            onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostItem); }}
                        >
                            {align === 'left' && ghostLabelBlock}
                            <div
                                style={{ width: iW, height: iH, willChange: 'transform' }}
                                className="group-hover:scale-110 transition-transform"
                            >
                                <InstrumentIcon type={tool?.icon} className="w-full h-full drop-shadow-sm text-slate-900" />
                                <div className="hidden group-hover:block absolute -top-1 -right-1 bg-amber-500 rounded-full w-2 h-2" />
                            </div>
                            {align === 'right' && ghostLabelBlock}
                        </div>
                    );
                })()}
            </div>
        );
    };

    return (
        <div data-zone-click="true" className="flex flex-col w-full relative border-b border-slate-100">
            <div className="flex w-full relative z-20" style={{ height: `${rowHeight}px` }}>
                {showForces && <div className={`w-10 border-r border-slate-100/50 bg-blue-50/20 ${!readOnly && !forcePlacements ? 'hover:bg-blue-50 cursor-crosshair' : ''}`} onClick={() => !readOnly && !forcePlacements && onZoneClick(level.id, 'force_left')}><ZoneContent zone="force_left" align="center"/></div>}
                <div className={`flex-1 overflow-visible min-w-0 ${!readOnly ? 'hover:bg-blue-50/50 cursor-crosshair' : ''}`} onClick={() => !readOnly && onZoneClick(level.id, 'left')}><div className="flex items-center h-full">{reconCageText && <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1 rounded shadow-sm whitespace-nowrap ml-1 shrink-0" style={{ fontSize: Math.max(8, cageLabelPx) + 'px' }}>{reconCageText}</span>}<div className="flex-1 h-full"><ZoneContent zone="left" align="left"/></div></div></div>

                <div style={{ width: `${scaledWidth}px` }} className={`relative flex justify-center shrink-0 z-10 ${!readOnly ? 'hover:brightness-95 cursor-pointer' : ''}`} onClick={() => !readOnly && onZoneClick(level.id, 'mid')}>
                    <SpineVertebra label={level.id} type={level.type} height={getLevelHeight(level)} isCorpectomy={isCorpectomy} heightScale={heightScale} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {getItems('mid').filter(p => p.tool !== 'connector').map(p => {
                            const tool = tools.find(item => item.id === p.tool);
                            let displayLabel = '';
                            let angle = '';
                            if (p.tool === 'osteotomy' && typeof p.data === 'object') {
                                displayLabel = p.data.shortLabel || p.data.type;
                                angle = p.data.angle;
                            }
                            return (
                                <div
                                    key={p.id}
                                    className="pointer-events-auto relative group flex flex-col items-center"
                                    onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(p); }}
                                >
                                    <div style={{ width: midPx, height: midPx }}>
                                        <InstrumentIcon type={tool?.icon} className="w-full h-full drop-shadow-md text-slate-900" />
                                    </div>
                                    {p.tool === 'osteotomy' && p.data && (
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-amber-300 text-amber-800 px-1 rounded shadow-sm whitespace-nowrap z-20"
                                            style={{ fontSize: osteoLabelPx + 'px' }}
                                        >
                                            {displayLabel}{angle != null && angle !== '' ? ` ${angle}\u00B0` : ''}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {ghostPlacements && !getItems('mid').length && (() => {
                            const gp = ghostPlacements.find(p => p.levelId === level.id && p.zone === 'mid');
                            if (!gp) return null;
                            const tool = tools.find(item => item.id === gp.tool);
                            let displayLabel = '';
                            let angle = '';
                            if (gp.tool === 'osteotomy' && typeof gp.data === 'object') {
                                displayLabel = gp.data.shortLabel || gp.data.type;
                                angle = gp.data.angle;
                            }
                            return (
                                <div
                                    key={'ghost-' + gp.id}
                                    className="pointer-events-auto relative group flex flex-col items-center cursor-pointer"
                                    style={{ opacity: 0.4 }}
                                    onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(gp); }}
                                >
                                    <div style={{ width: midPx, height: midPx }}>
                                        <InstrumentIcon type={tool?.icon} className="w-full h-full drop-shadow-md text-slate-900" />
                                    </div>
                                    {gp.tool === 'osteotomy' && gp.data && (
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-amber-300 text-amber-800 px-1 rounded shadow-sm whitespace-nowrap z-20"
                                            style={{ fontSize: osteoLabelPx + 'px' }}
                                        >
                                            {displayLabel}{angle != null && angle !== '' ? ` ${angle}\u00B0` : ''}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className={`flex-1 overflow-visible min-w-0 ${!readOnly ? 'hover:bg-blue-50/50 cursor-crosshair' : ''}`} onClick={() => !readOnly && onZoneClick(level.id, 'right')}><ZoneContent zone="right" align="right"/></div>
                {showForces && <div className={`w-10 border-l border-slate-100/50 bg-blue-50/20 ${!readOnly && !forcePlacements ? 'hover:bg-blue-50 cursor-crosshair' : ''}`} onClick={() => !readOnly && !forcePlacements && onZoneClick(level.id, 'force_right')}><ZoneContent zone="force_right" align="center"/></div>}
            </div>

            {/* INTERBODY DISC ZONE (Except after Pelvis or C1) */}
            {level.type !== 'Pelvis' && level.type !== 'S' && level.id !== 'Oc' && level.id !== 'C1' && (
                <div className="w-full flex justify-center relative z-10">
                    <div style={{ width: `${scaledWidth}px`, height: `${Math.max(DISC_MIN_PX, getDiscHeight(level) * heightScale)}px` }} className={`flex items-center justify-center cursor-pointer transition-all ${!readOnly ? 'hover:bg-sky-100/50' : ''}`} onClick={() => !readOnly && onDiscClick(level.id)}>
                        {cageBelow ? (
                            viewMode === 'whole' && level.type === 'C' ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <span className="text-amber-600 italic whitespace-nowrap" style={{ fontSize: Math.max(9, cageLabelPx - 1) + 'px' }}>{t('chart.cervical_cage_hint')}</span>
                                </div>
                            ) : (
                            <div className="relative group w-full h-full flex justify-center">
                                <svg viewBox="0 0 160 20" preserveAspectRatio="none" className="w-full h-full overflow-visible"><CageVisualization cageType={cageBelow.tool} heightScale={1} levelId={level.id} /></svg>
                                <span className="absolute font-bold text-sky-700 bg-white/80 px-0.5 rounded whitespace-nowrap z-20" style={{ left: 'calc(75% + 2em)', top: '50%', transform: 'translateY(-50%)', fontSize: cageLabelPx + 'px' }}>{cageBelow.tool.toUpperCase()} {getDiscLabel(level.id, levels)} {cageBelow.data.height}H {cageBelow.data.lordosis}°{cageBelow.data.side && cageBelow.data.side !== 'bilateral' && cageBelow.data.side !== 'midline' ? ` (${cageBelow.data.side.charAt(0).toUpperCase()})` : ''}</span>
                            </div>)
                        ) : ghostCageBelow ? (
                            viewMode === 'whole' && level.type === 'C' ? (
                                <div className="relative w-full h-full flex items-center justify-center" style={{ opacity: 0.4 }}>
                                    <span className="text-amber-600 italic whitespace-nowrap" style={{ fontSize: Math.max(9, cageLabelPx - 1) + 'px' }}>{t('chart.cervical_cage_hint')}</span>
                                </div>
                            ) : (
                            <div className="relative group w-full h-full flex justify-center cursor-pointer" style={{ opacity: 0.4 }} onClick={(e) => { e.stopPropagation(); onGhostCageClick && onGhostCageClick(ghostCageBelow); }}>
                                <svg viewBox="0 0 160 20" preserveAspectRatio="none" className="w-full h-full overflow-visible"><CageVisualization cageType={ghostCageBelow.tool} heightScale={1} levelId={level.id} /></svg>
                                <span className="absolute font-bold text-sky-700 bg-white/80 px-0.5 rounded whitespace-nowrap z-20" style={{ left: 'calc(75% + 2em)', top: '50%', transform: 'translateY(-50%)', fontSize: cageLabelPx + 'px' }}>{ghostCageBelow.tool.toUpperCase()} {getDiscLabel(level.id, levels)} {ghostCageBelow.data.height}H {ghostCageBelow.data.lordosis}°{ghostCageBelow.data.side && ghostCageBelow.data.side !== 'bilateral' && ghostCageBelow.data.side !== 'midline' ? ` (${ghostCageBelow.data.side.charAt(0).toUpperCase()})` : ''}</span>
                            </div>)
                        ) : discOsteo ? (
                            <div className="relative group w-full h-full flex items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); !readOnly && onPlacementClick(discOsteo); }}>
                                <span className="font-bold text-amber-800 bg-amber-50/80 border border-amber-300 px-1.5 rounded whitespace-nowrap" style={{ fontSize: cageLabelPx + 'px' }}>{discOsteo.data?.shortLabel || t('clinical.osteotomy.fallback')} {getDiscLabel(level.id, levels)}{discOsteo.data?.angle != null && discOsteo.data?.angle !== '' ? ` ${discOsteo.data.angle}\u00B0` : ''}</span>
                            </div>
                        ) : ghostDiscOsteo ? (
                            <div className="relative group w-full h-full flex items-center justify-center cursor-pointer" style={{ opacity: 0.4 }} onClick={(e) => { e.stopPropagation(); onGhostClick && onGhostClick(ghostDiscOsteo); }}>
                                <span className="font-bold text-amber-800 bg-amber-50/80 border border-amber-300 px-1.5 rounded whitespace-nowrap" style={{ fontSize: cageLabelPx + 'px' }}>{ghostDiscOsteo.data?.shortLabel || t('clinical.osteotomy.fallback')} {getDiscLabel(level.id, levels)}{ghostDiscOsteo.data?.angle != null && ghostDiscOsteo.data?.angle !== '' ? ` ${ghostDiscOsteo.data.angle}\u00B0` : ''}</span>
                            </div>
                        ) : (
                            !readOnly && <div className="h-2 w-full bg-slate-200/0 hover:bg-sky-200/50 rounded-full"></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
