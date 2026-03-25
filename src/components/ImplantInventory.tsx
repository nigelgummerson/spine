import React, { useState, useMemo } from 'react';
import { t } from '../i18n/i18n';
import { INVENTORY_CATEGORIES, getDiscLabel } from '../data/clinical';
import { formatScrewSize } from '../utils/formatScrewSize';
import type { Placement, ToolDefinition, Level, OsteotomyData, CageData } from '../types';

interface Rods {
    left?: string;
    right?: string;
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

export const ImplantInventory = ({ placements, tools, title, visibleLevelIds, levels, rods, large }: ImplantInventoryProps) => {
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
                    const cd = p.data as unknown as CageData; // legacy: cage data in placement
                    const sideStr = p.tool !== 'acdf' && cd.side && cd.side !== 'bilateral' && cd.side !== 'midline' ? ` (${cd.side.charAt(0).toUpperCase()})` : '';
                    key = `${toolLabel} ${cd.height}mm ${cd.lordosis || '0'}°${sideStr}`;
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
    const hasRods = rods && (rods.left || rods.right);

    const totalItems = Object.values(grouped).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const useColumns = totalItems > 3;

    const sz = large ? 'text-lg' : 'text-[10px]';
    const szSm = large ? 'text-base' : 'text-[10px]';
    const gap = large ? 'gap-x-5 gap-y-1' : 'gap-x-3 gap-y-0.5';
    const py = large ? 'py-1' : 'py-px';

    return (
        <div className={`${large ? 'mt-4' : 'mt-2'} border-t border-slate-200 ${large ? 'pt-3' : 'pt-1'} shrink-0`}>
            <h3 className={`${sz} font-bold text-slate-900 uppercase tracking-widest ${large ? 'mb-3 pb-2' : 'mb-1 pb-1'} border-b border-slate-100`}>{title}</h3>
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
                    catEntries.push({
                        lines: 1 + (rods.left ? 1 : 0) + (rods.right ? 1 : 0),
                        node: (
                            <div key="rods" className={large ? 'mb-3' : 'mb-1'}>
                                <div className={`${szSm} font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${large ? 'pb-1 mb-1' : 'pb-0.5 mb-0'}`}>{t('inventory.rods')}</div>
                                {rods.left && <div className={`${sz} leading-tight ${py} border-b border-slate-50`}><span className="text-slate-700 font-medium">{t('inventory.rod_left')} {rods.left}</span></div>}
                                {rods.right && <div className={`${sz} leading-tight ${py} border-b border-slate-50`}><span className="text-slate-700 font-medium">{t('inventory.rod_right')} {rods.right}</span></div>}
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

