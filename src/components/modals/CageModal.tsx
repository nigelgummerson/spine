import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { CAGE_TYPES, CAGE_PERMISSIBILITY, APPROACH_GROUPS, getDiscLabel } from '../../data/clinical';
import { modalKeyHandler, numberWheelHandler } from './ScrewModal';
import { IconTrash, IconX } from '../icons';
import { Portal } from '../Portal';

import type { Level } from '../../types';

interface CageModalInitialData {
    tool: string;
    data: {
        height?: string;
        width?: string;
        length?: string;
        lordosis?: string;
        side?: string;
    };
}

interface CageConfirmData {
    type: string;
    height: string;
    width: string;
    length: string;
    lordosis: string;
    side: string;
}

interface CageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: CageConfirmData) => void;
    onDelete?: () => void;
    initialData?: CageModalInitialData | null;
    levelId: string;
    levels: Level[];
}

export const CageModal = ({ isOpen, onClose, onConfirm, onDelete, initialData, levelId, levels }: CageModalProps) => {
    if (!isOpen) return null;

    // Determine smart default type for this level
    const getDefaultType = (lvl: string | null) => {
        if (!lvl) return 'tlif';
        if (lvl.startsWith('C')) return 'acdf';
        if (lvl === 'T11' || lvl === 'T12') return 'xlif';
        if (lvl === 'L1' || lvl === 'L2' || lvl === 'L3') return 'xlif';
        if (lvl === 'L4') return 'tlif';
        if (lvl === 'L5') return 'alif';
        return 'tlif';
    };

    const permittedTypes = CAGE_TYPES.filter(ct => (CAGE_PERMISSIBILITY[ct.id] || []).includes(levelId));

    const initType = initialData ? initialData.tool : getDefaultType(levelId);
    // If initType isn't permitted, fall back to first permitted
    const safeInitType = permittedTypes.find(ct => ct.id === initType) ? initType : (permittedTypes[0]?.id || 'tlif');
    const initDef = CAGE_TYPES.find(ct => ct.id === safeInitType);

    const [type, setType] = useState(safeInitType);
    const [height, setHeight] = useState(initialData?.data?.height || initDef?.defaults?.height || '10');
    const [width, setWidth] = useState(initialData?.data?.width || initDef?.defaults?.width || '10');
    const [length, setLength] = useState(initialData?.data?.length || initDef?.defaults?.length || '25');
    const [lordosis, setLordosis] = useState(initialData?.data?.lordosis || initDef?.defaults?.lordosis || '0');
    const [side, setSide] = useState(initialData?.data?.side || initDef?.defaultSide || 'left');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setType(initialData.tool);
                setHeight(initialData.data.height || '10');
                setWidth(initialData.data.width || '10');
                setLength(initialData.data.length || '25');
                setLordosis(initialData.data.lordosis || '0');
                setSide(initialData.data.side || CAGE_TYPES.find(ct => ct.id === initialData.tool)?.defaultSide || 'left');
            } else {
                const def = CAGE_TYPES.find(ct => ct.id === safeInitType);
                setType(safeInitType);
                if (def) {
                    setHeight(def.defaults.height);
                    setWidth(def.defaults.width);
                    setLength(def.defaults.length);
                    setLordosis(def.defaults.lordosis);
                    setSide(def.defaultSide);
                }
            }
        }
    }, [isOpen, initialData]);

    const handleTypeChange = (newType: string) => {
        setType(newType);
        const def = CAGE_TYPES.find(ct => ct.id === newType);
        if (def) {
            setHeight(def.defaults.height);
            setWidth(def.defaults.width);
            setLength(def.defaults.length);
            setLordosis(def.defaults.lordosis);
            setSide(def.defaultSide);
        }
    };

    const selectedDef = CAGE_TYPES.find(ct => ct.id === type);
    const discLabel = levels ? getDiscLabel(levelId, levels) : levelId;

    const handleSubmit = () => {
        onConfirm({ type, height, width, length, lordosis, side });
        onClose();
    };
    const cageRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (cageRef.current) cageRef.current.focus(); }, []);

    return (<Portal>
        <div ref={cageRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete, isEditing: !!initialData })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-sky-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{initialData ? t('modal.cage.title_edit') : t('modal.cage.title_new')} - {discLabel}</h3>
                    <button onClick={onClose} className="hover:text-sky-200"><IconX /></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Approach groups */}
                    {APPROACH_GROUPS.map(group => {
                        const permittedInGroup = group.types
                            .map(id => CAGE_TYPES.find(ct => ct.id === id))
                            .filter((ct): ct is NonNullable<typeof ct> => !!ct && (CAGE_PERMISSIBILITY[ct.id] || []).includes(levelId));
                        if (permittedInGroup.length === 0) return null;
                        return (
                            <div key={group.labelKey}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t(group.labelKey)} <span className="font-normal normal-case">- {t(group.descKey)}</span></div>
                                <div className="flex gap-1.5">
                                    {permittedInGroup.map(ct => (
                                        <button key={ct.id} onClick={() => handleTypeChange(ct.id)}
                                            className={`flex-1 py-2 px-2 rounded border text-xs font-bold transition-all ${
                                                type === ct.id ? 'bg-sky-700 text-white border-sky-800 shadow' :
                                                'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                                            }`}>
                                            <div>{ct.label}</div>
                                            <div className={`text-[10px] font-normal mt-0.5 ${type === ct.id ? 'text-sky-200' : 'text-slate-400'}`}>{t(ct.descKey).split(' ').slice(0,2).join(' ')}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Side selector (for types with sideOptions) */}
                    {selectedDef?.sideOptions && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.side')}</label>
                            <div className="flex gap-1">
                                {selectedDef.sideOptions.map(s => (
                                    <button key={s} onClick={() => setSide(s)}
                                        className={`flex-1 py-1.5 rounded border text-xs font-bold transition-all ${
                                            side === s ? 'bg-sky-700 text-white border-sky-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                                        }`}>{t('modal.cage.side_' + s)}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.height')}</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} onWheel={numberWheelHandler(setHeight, 1, 0)} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none"/></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.lordosis')}</label><input type="number" value={lordosis} onChange={e => setLordosis(e.target.value)} onWheel={numberWheelHandler(setLordosis, 1, 0, 30)} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none"/></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.length')}</label><input type="number" value={length} onChange={e => setLength(e.target.value)} onWheel={numberWheelHandler(setLength, 1, 0)} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none"/></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.width')}</label><input type="number" value={width} onChange={e => setWidth(e.target.value)} onWheel={numberWheelHandler(setWidth, 1, 0)} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none"/></div>
                    </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 flex justify-between border-t border-slate-100">{initialData ? <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold flex gap-1 items-center"><IconTrash/> {t('button.remove')}</button> : <div></div>}<div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button><button onClick={handleSubmit} className="px-6 py-2 rounded bg-sky-800 text-white hover:bg-sky-700 text-sm font-bold shadow-lg">{t('button.confirm')}</button></div></div>
            </div>
        </div>
    </Portal>);
};
