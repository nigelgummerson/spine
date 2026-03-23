import React, { useState, useMemo } from 'react';
import { t } from '../i18n/i18n';
import { INVENTORY_CATEGORIES, getDiscLabel } from '../data/clinical';
import type { Placement, ToolDefinition, Level } from '../types';

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
}

export const ImplantInventory = ({ placements, tools, title, visibleLevelIds, levels, rods }: ImplantInventoryProps) => {
    const grouped = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        placements.forEach(p => {
            if (!visibleLevelIds.includes(p.levelId)) return;
            const tool = tools.find(item => item.id === p.tool);
            if (!tool || tool.type === 'force' || p.tool === 'osteotomy') return;
            const toolLabel = tool.labelKey ? t(tool.labelKey) : (tool as any).label;
            const isFixation = ['band','wire','cable'].includes(p.tool);
            let key = toolLabel;
            if (p.data && !isFixation) {
                if (typeof p.data === 'string' && tool.needsSize) { key = `${toolLabel} (${p.data}mm)`; }
                else if (p.tool === 'osteotomy' && typeof p.data === 'object') { const od = p.data as any; key = od.angle != null && od.angle !== '' ? `${od.shortLabel} (${od.angle}°)` : od.shortLabel; }
                else if (typeof p.data === 'object' && (p.data as any).height) {
                    const cd = p.data as any;
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
    const useColumns = totalItems > 6;

    return (
        <div className="mt-2 border-t border-slate-200 pt-1 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">{title}</h3>
            {!hasImplants && !hasRods && <div className="text-[10px] text-slate-400 italic py-1">{t('inventory.empty')}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mb-1.5">
                {INVENTORY_CATEGORIES.map(cat => {
                    const items = grouped[cat.key];
                    if (!items) return null;
                    const total = Object.values(items).reduce((s, c) => s + c, 0);
                    return <span key={cat.key}><span className="font-bold text-slate-700">{total}</span> {t(cat.labelKey)}</span>;
                }).filter(Boolean)}
            </div>
            {(() => {
                const cats: React.ReactNode[] = INVENTORY_CATEGORIES.map(cat => {
                    const items = grouped[cat.key];
                    if (!items || Object.keys(items).length === 0) return null;
                    return (
                        <div key={cat.key} className="mb-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-0">{t(cat.labelKey)}</div>
                            {Object.entries(items).sort().map(([name, count]) => (
                                <div key={name} className="flex justify-between text-[10px] leading-tight py-px border-b border-slate-50">
                                    <span className="text-slate-700 font-medium">{name}</span>
                                    <span className="font-bold text-slate-900 ml-2">{count}</span>
                                </div>
                            ))}
                        </div>
                    );
                }).filter(Boolean);
                if (hasRods) {
                    cats.push(
                        <div key="rods" className="mb-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-0">{t('inventory.rods')}</div>
                            {rods.left && <div className="text-[10px] leading-tight py-px border-b border-slate-50"><span className="text-slate-700 font-medium">{t('inventory.rod_left')} {rods.left}</span></div>}
                            {rods.right && <div className="text-[10px] leading-tight py-px border-b border-slate-50"><span className="text-slate-700 font-medium">{t('inventory.rod_right')} {rods.right}</span></div>}
                        </div>
                    );
                }
                if (!useColumns) return <div>{cats}</div>;
                const mid = Math.ceil(cats.length / 2);
                return (
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">{cats.slice(0, mid)}</div>
                        <div className="flex-1 min-w-0">{cats.slice(mid)}</div>
                    </div>
                );
            })()}
        </div>
    );
};

