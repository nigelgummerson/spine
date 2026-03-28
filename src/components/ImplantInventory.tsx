import React, { useState, useMemo } from 'react';
import { t } from '../i18n/i18n';
import { INVENTORY_CATEGORIES, getDiscLabel } from '../data/clinical';
import { formatScrewSize } from '../utils/formatScrewSize';
import { formatRodSummary, isRodEmpty } from '../data/implants';
import type { Placement, ToolDefinition, Level, OsteotomyData, CageData, RodData } from '../types';

interface Rods {
    left?: RodData;
    right?: RodData;
}

interface ImplantInventoryProps {
    placements: Placement[];
    tools: ToolDefinition[];
    title: string;
    visibleLevelIds: string[];
    levels: Level[];
    rods: Rods;
    large?: boolean;
}

// Canonical anatomical order for level range display
const LEVEL_ORDER: string[] = [
    'Oc', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    'L1', 'L2', 'L3', 'L4', 'L5',
    'S1', 'S2',
];
const PELVIC_IDS = new Set(['S2AI', 'Iliac']);
const SIJ_ID = 'SI-J';

/** Build a suffix like " — T4-L1 + Pelvis" from placements with implants */
function buildLevelRange(placements: Placement[], tools: ToolDefinition[]): string {
    // Only count screws, hooks, fixation (type === 'implant')
    const implantToolIds = new Set(tools.filter(t => t.type === 'implant').map(t => t.id));
    const levelIds = new Set<string>();
    for (const p of placements) {
        if (implantToolIds.has(p.tool)) levelIds.add(p.levelId);
    }
    if (levelIds.size === 0) return '';

    let hasPelvic = false;
    let hasSIJ = false;
    let minIdx = Infinity;
    let maxIdx = -1;

    for (const id of levelIds) {
        if (PELVIC_IDS.has(id)) { hasPelvic = true; continue; }
        if (id === SIJ_ID) { hasSIJ = true; continue; }
        const idx = LEVEL_ORDER.indexOf(id);
        if (idx === -1) continue;
        if (idx < minIdx) minIdx = idx;
        if (idx > maxIdx) maxIdx = idx;
    }

    const parts: string[] = [];
    if (minIdx <= maxIdx) {
        const top = LEVEL_ORDER[minIdx];
        const bottom = LEVEL_ORDER[maxIdx];
        parts.push(top === bottom ? top : `${top}\u2013${bottom}`);
    }
    if (hasPelvic) parts.push('Pelvis');
    if (hasSIJ) parts.push('SIJ');

    return parts.length > 0 ? ` \u2014 ${parts.join(' + ')}` : '';
}

export const ImplantInventory = ({ placements, tools, title, visibleLevelIds, levels, rods, large }: ImplantInventoryProps) => {
    const levelRange = useMemo(() => buildLevelRange(placements, tools), [placements, tools]);

    const grouped = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        placements.forEach(p => {
            if (!visibleLevelIds.includes(p.levelId)) return;
            const tool = tools.find(item => item.id === p.tool);
            if (!tool || tool.type === 'force' || p.tool === 'osteotomy') return;
            const toolLabel = tool.labelKey ? t(tool.labelKey) : tool.id;
            const isFixation = ['band','wire','cable'].includes(p.tool);
            let key = toolLabel;
            if (p.data && !isFixation) {
                if (typeof p.data === 'string' && tool.needsSize) { key = `${toolLabel} (${formatScrewSize(p.data)}mm)`; }
                else if (p.tool === 'osteotomy' && typeof p.data === 'object') { const od = p.data as OsteotomyData; key = od.angle != null && String(od.angle) !== '' ? `${od.shortLabel} (${od.angle}°)` : od.shortLabel; }
                else if (typeof p.data === 'object' && p.data !== null && 'height' in p.data) {
                    const cd = p.data as unknown as CageData;
                    const sideStr = p.tool !== 'acdf' && cd.side && cd.side !== 'bilateral' && cd.side !== 'midline' ? ` (${cd.side.charAt(0).toUpperCase()})` : '';
                    const expStr = cd.expandable ? ` ${t('inventory.cage.expandable_suffix')}` : '';
                    key = cd.height ? `${toolLabel} ${cd.height}mm ${cd.lordosis || '0'}°${sideStr}${expStr}` : `${toolLabel}${sideStr}${expStr}`;
                }
                else if (p.data !== 'Custom' && typeof p.data !== 'object') { key = `${toolLabel} ${p.data}`; }
            }
            const catKey = INVENTORY_CATEGORIES.find(c => c.toolIds.includes(p.tool))?.key || 'other';
            if (!counts[catKey]) counts[catKey] = {};
            counts[catKey][key] = (counts[catKey][key] || 0) + 1;
        });
        return counts;
    }, [placements, tools, visibleLevelIds, levels]);

    const hasImplants = Object.values(grouped).some(cat => Object.keys(cat).length > 0);
    const hasRods = rods && (!isRodEmpty(rods.left as RodData) || !isRodEmpty(rods.right as RodData));

    const totalItems = Object.values(grouped).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const useColumns = totalItems > 3;

    const sz = large ? 'text-lg' : 'text-[10px]';
    const szSm = large ? 'text-base' : 'text-[10px]';
    const gap = large ? 'gap-x-5 gap-y-1' : 'gap-x-3 gap-y-0.5';
    const py = large ? 'py-1' : 'py-px';

    return (
        <div className={`${large ? 'mt-4' : 'mt-2'} border-t border-slate-200 ${large ? 'pt-3' : 'pt-1'} shrink-0`}>
            <h3 className={`${sz} font-bold text-slate-900 uppercase tracking-widest ${large ? 'mb-3 pb-2' : 'mb-1 pb-1'} border-b border-slate-100`}>{title}{levelRange && <span className="normal-case tracking-normal font-semibold text-slate-500">{levelRange}</span>}</h3>
            {!hasImplants && !hasRods && <div className={`${sz} text-slate-400 italic py-1`}>{t('inventory.empty')}</div>}
            <div className={`flex flex-wrap ${gap} ${szSm} text-slate-500 ${large ? 'mb-3' : 'mb-1.5'}`}>
                {INVENTORY_CATEGORIES.map(cat => {
                    const items = grouped[cat.key];
                    if (!items) return null;
                    const total = Object.values(items).reduce((s, c) => s + c, 0);
                    return <span key={cat.key}><span className="font-bold text-slate-700">{total}</span> {t(cat.labelKey)}</span>;
                }).filter(Boolean)}
            </div>
            {(() => {
                const catEntries: { node: React.ReactNode; lines: number }[] = [];
                INVENTORY_CATEGORIES.forEach(cat => {
                    const items = grouped[cat.key];
                    if (!items || Object.keys(items).length === 0) return;
                    // Count diameter group gaps for balanced column splitting
                    const diameters = new Set(Object.keys(items).map(name => {
                        const m = name.match(/(\d+\.?\d*)x/);
                        return m ? m[1] : null;
                    }).filter(Boolean));
                    const diameterGaps = Math.max(0, diameters.size - 1);
                    catEntries.push({
                        lines: Object.keys(items).length + 1 + diameterGaps * 0.5, // +1 header, +0.5 per gap
                        node: (
                            <div key={cat.key} className={large ? 'mb-3' : 'mb-1'}>
                                <div className={`${szSm} font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${large ? 'pb-1 mb-1' : 'pb-0.5 mb-0'}`}>{t(cat.labelKey)}</div>
                                {(() => {
                                    const parseSize = (s: string) => {
                                        const m = s.match(/(\d+\.?\d*)x(\d+)/);
                                        return m ? [parseFloat(m[1]), parseFloat(m[2])] : [Infinity, Infinity];
                                    };
                                    const sorted = Object.entries(items).sort(([a], [b]) => {
                                        const [ad, al] = parseSize(a);
                                        const [bd, bl] = parseSize(b);
                                        if (ad !== bd) return ad - bd;
                                        if (al !== bl) return al - bl;
                                        return a.localeCompare(b);
                                    });
                                    let prevDiam = -1;
                                    return sorted.map(([name, count]) => {
                                        const [diam] = parseSize(name);
                                        const newGroup = diam !== Infinity && prevDiam !== -1 && diam !== prevDiam;
                                        prevDiam = diam;
                                        return (
                                            <div key={name} className={`flex justify-between ${sz} leading-tight ${py} border-b border-slate-50${newGroup ? (large ? ' mt-2' : ' mt-1') : ''}`}>
                                                <span className="text-slate-700 font-medium">{name}</span>
                                                <span className="font-bold text-slate-900 ms-2">{count}</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        ),
                    });
                });
                if (hasRods) {
                    const leftSummary = rods.left ? formatRodSummary(rods.left) : '';
                    const rightSummary = rods.right ? formatRodSummary(rods.right) : '';
                    catEntries.push({
                        lines: 1 + (leftSummary ? 1 : 0) + (rightSummary ? 1 : 0),
                        node: (
                            <div key="rods" className={large ? 'mb-3' : 'mb-1'}>
                                <div className={`${szSm} font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${large ? 'pb-1 mb-1' : 'pb-0.5 mb-0'}`}>{t('inventory.rods')}</div>
                                {leftSummary && <div className={`${sz} leading-tight ${py} border-b border-slate-50`}><span className="text-slate-700 font-medium">{t('inventory.rod_left')} {leftSummary}</span></div>}
                                {rightSummary && <div className={`${sz} leading-tight ${py} border-b border-slate-50`}><span className="text-slate-700 font-medium">{t('inventory.rod_right')} {rightSummary}</span></div>}
                            </div>
                        ),
                    });
                }
                if (!useColumns) return <div>{catEntries.map(e => e.node)}</div>;
                // Balance columns by line count
                const totalLines = catEntries.reduce((sum, e) => sum + e.lines, 0);
                const halfLines = Math.ceil(totalLines / 2);
                let runningLines = 0;
                let splitAt = 1;
                for (let i = 0; i < catEntries.length; i++) {
                    runningLines += catEntries[i].lines;
                    if (runningLines >= halfLines) { splitAt = i + 1; break; }
                }
                return (
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">{catEntries.slice(0, splitAt).map(e => e.node)}</div>
                        <div className="flex-1 min-w-0">{catEntries.slice(splitAt).map(e => e.node)}</div>
                    </div>
                );
            })()}
        </div>
    );
};

