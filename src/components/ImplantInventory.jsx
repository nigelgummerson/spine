import React, { useState } from 'react';
import { t } from '../i18n/i18n';
import { INVENTORY_CATEGORIES, getDiscLabel } from '../data/clinical';

export const ImplantInventory = ({ placements, tools, title, visibleLevelIds, levels, rods }) => {
    const grouped = useMemo(() => {
        const counts = {};
        placements.forEach(p => {
            if (!visibleLevelIds.includes(p.levelId)) return;
            const tool = tools.find(item => item.id === p.tool);
            if (!tool || tool.type === 'force') return;
            const toolLabel = tool.labelKey ? t(tool.labelKey) : tool.label;
            let key = toolLabel;
            if (p.data) {
                if (typeof p.data === 'string' && tool.needsSize) { key = `${toolLabel} (${p.data})`; }
                else if (p.tool === 'osteotomy' && typeof p.data === 'object') { key = p.data.angle != null && p.data.angle !== '' ? `${p.data.shortLabel} (${p.data.angle}°)` : p.data.shortLabel; }
                else if (typeof p.data === 'object' && p.data.height) {
                    const discLbl = levels ? getDiscLabel(p.levelId, levels) : p.levelId;
                    const sideStr = p.data.side && p.data.side !== 'bilateral' && p.data.side !== 'midline' ? ` (${p.data.side.charAt(0).toUpperCase()})` : '';
                    key = `${toolLabel} ${discLbl} ${p.data.height}H ${p.data.lordosis}°${sideStr}`;
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
    if (!hasImplants && !hasRods) return null;

    const totalItems = Object.values(grouped).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const useColumns = totalItems > 6;

    return (
        <div className="mt-2 border-t border-slate-200 pt-1 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">{title}</h3>
            <div style={useColumns ? { columns: 2, columnGap: '8px' } : undefined}>
                {INVENTORY_CATEGORIES.map(cat => {
                    const items = grouped[cat.key];
                    if (!items || Object.keys(items).length === 0) return null;
                    return (
                        <div key={cat.key} className="mb-2" style={{ breakInside: 'avoid' }}>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-0.5">{t(cat.labelKey)}</div>
                            {Object.entries(items).sort().map(([name, count]) => (
                                <div key={name} className="flex justify-between text-[10px] py-0.5 border-b border-slate-100">
                                    <span className="text-slate-700 font-medium">{name}</span>
                                    <span className="font-bold text-slate-900 ml-2">{count}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
                {hasRods && (
                    <div className="mb-2" style={{ breakInside: 'avoid' }}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-0.5">{t('inventory.rods')}</div>
                        {rods.left && <div className="text-[10px] py-0.5 border-b border-slate-100"><span className="text-slate-700 font-medium">{t('inventory.rod_left')} {rods.left}</span></div>}
                        {rods.right && <div className="text-[10px] py-0.5 border-b border-slate-100"><span className="text-slate-700 font-medium">{t('inventory.rod_right')} {rods.right}</span></div>}
                    </div>
                )}
            </div>
        </div>
    );
};

