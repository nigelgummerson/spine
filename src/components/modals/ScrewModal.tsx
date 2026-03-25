import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { DIAMETER_OPTIONS, LENGTH_OPTIONS } from '../../data/implants';
import { HOOK_TYPES, NO_SIZE_TYPES } from '../../data/clinical';
import { InstrumentIcon } from '../chart/InstrumentIcon';
import { IconTrash, IconX } from '../icons';
import { Portal } from '../Portal';

/** Scroll wheel increments/decrements a number input on hover. */
export const numberWheelHandler = (
    setter: (v: string) => void,
    step: number = 1,
    min?: number,
    max?: number
) => (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const current = parseFloat(e.currentTarget.value) || 0;
    const next = e.deltaY < 0 ? current + step : current - step;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    setter(String(Math.round(next * 100) / 100));
};

/** Scroll wheel cycles through <select> options without opening the dropdown. */
export const selectWheelHandler = (e: React.WheelEvent<HTMLSelectElement>) => {
    e.preventDefault();
    const sel = e.currentTarget;
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = sel.selectedIndex + dir;
    if (next >= 0 && next < sel.options.length) {
        sel.selectedIndex = next;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

interface ModalKeyHandlerParams {
    onSubmit: () => void;
    onClose: () => void;
    onDelete: (() => void) | null | undefined;
    isEditing: boolean;
}

export const modalKeyHandler = ({ onSubmit, onClose, onDelete, isEditing }: ModalKeyHandlerParams) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    const inTextField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (!inTextField && (e.key === 'Delete' || e.key === 'Backspace') && isEditing && onDelete) { e.preventDefault(); onDelete(); }
    else if (e.key === 'Tab') {
        e.preventDefault();
        const modal = e.currentTarget;
        const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) as HTMLElement[];
        if (focusable.length === 0) return;
        const idx = focusable.indexOf(document.activeElement as HTMLElement);
        let next: number;
        if (idx === -1) {
            // Focus not on a known element — start from beginning or end
            next = e.shiftKey ? focusable.length - 1 : 0;
        } else {
            next = e.shiftKey
                ? (idx <= 0 ? focusable.length - 1 : idx - 1)
                : (idx >= focusable.length - 1 ? 0 : idx + 1);
        }
        focusable[next].focus();
    }
};

interface ScrewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (size: string | null, details: any, type: string, annotation: string) => void;
    onDelete?: () => void;
    initialData?: string | null;
    initialTool?: string;
    defaultDiameter: string;
    defaultLength: string;
    defaultMode?: string;
    defaultCustomText?: string;
    initialAnnotation?: string;
    isPelvicZone?: boolean;
}

export const ScrewModal = ({ isOpen, onClose, onConfirm, onDelete, initialData, initialTool, defaultDiameter, defaultLength, defaultMode, defaultCustomText, initialAnnotation, isPelvicZone }: ScrewModalProps) => {
    if (!isOpen) return null;
    // Compute initial values from props (runs on mount since component unmounts when closed)
    const computeInitial = () => {
        let mode = defaultMode || 'standard';
        let dia = defaultDiameter;
        let len = defaultLength;
        let custom = defaultCustomText || '';
        if (initialData && typeof initialData === 'string') {
            if (initialData === "Custom") { mode = 'custom'; custom = defaultCustomText || ''; }
            else if (initialData.includes('x')) { const parts = initialData.split('x'); if (parts.length === 2) { mode = 'standard'; dia = parts[0]; len = parts[1]; } else { mode = 'custom'; custom = initialData; } }
        } else if (initialData === null) { mode = 'none'; }
        const legacyFixationAnn = (initialData && typeof initialData === 'string' && initialTool && ['band','wire','cable'].includes(initialTool)) ? initialData : '';
        return { mode, dia, len, custom, ann: initialAnnotation !== undefined && initialAnnotation !== null ? initialAnnotation : legacyFixationAnn };
    };
    const init = computeInitial();
    const [mode, setMode] = useState(init.mode);
    const [diameter, setDiameter] = useState(init.dia);
    const [length, setLength] = useState(init.len);
    const [customText, setCustomText] = useState(init.custom);
    const [selectedType, setSelectedType] = useState(initialTool || 'polyaxial');
    const [annotation, setAnnotation] = useState(init.ann);
    const [fixationText, setFixationText] = useState('');
    const isHookOnly = HOOK_TYPES.includes(selectedType);
    const isFixation = ['band','wire','cable'].includes(selectedType);
    const isHook = isHookOnly || isFixation;

    useEffect(() => {
        if (isOpen) {
            const v = computeInitial();
            if (initialTool) setSelectedType(initialTool);
            setMode(v.mode); setDiameter(v.dia); setLength(v.len); setCustomText(v.custom); setAnnotation(v.ann);
        }
    }, [isOpen, initialData, initialTool, defaultDiameter, defaultLength, defaultMode, defaultCustomText, initialAnnotation]);

    const handleSubmit = () => {
        let finalSize = null;
        if (isHookOnly || isFixation) { finalSize = null; }
        else if (mode === 'custom') finalSize = customText || "Custom";
        else if (mode === 'standard') finalSize = `${Number(diameter).toFixed(1)}x${length}`;
        onConfirm(
            finalSize,
            (isHookOnly || isFixation) ? null : { diameter, length, mode, customText },
            selectedType,
            annotation
        );
        onClose();
    };
    const isScrew = ['monoaxial','polyaxial','uniplanar'].includes(selectedType);
    const isEditing = initialData !== undefined;
    const hookLabels: Record<string, string> = { pedicle_hook: t('clinical.hook.pedicle_hook'), tp_hook: t('clinical.hook.tp_hook'), tp_hook_up: t('clinical.hook.tp_hook_up'), sl_hook: t('clinical.hook.sl_hook'), il_hook: t('clinical.hook.il_hook') };
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (modalRef.current) modalRef.current.focus(); }, []);

    return (<Portal>
        <div ref={modalRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete, isEditing })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center"><h3 className="font-bold text-sm">{isEditing ? t('modal.screw.title_edit') : t('modal.screw.title_new')}</h3><button onClick={onClose} className="hover:text-red-400"><IconX /></button></div>
                <div className="p-6">
                    <div className="bg-slate-100 p-1 rounded mb-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-0.5">{t('modal.screw.section_screws')}</div>
                        <div className="grid grid-cols-3 gap-1">{['monoaxial', 'polyaxial', 'uniplanar'].map(typ => (<button key={typ} onClick={() => setSelectedType(typ)} className={`py-2.5 px-1 text-[10px] font-bold uppercase rounded transition-all flex flex-col items-center gap-1 ${selectedType === typ ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><InstrumentIcon type={typ} className="w-6 h-6" color={selectedType === typ ? '#0f172a' : '#94a3b8'} />{t('clinical.screw.' + typ + '.short')}</button>))}</div>
                    </div>
                    <div className="bg-slate-100 p-1 rounded mb-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-0.5">{t('modal.screw.section_hooks')}</div>
                        <div className="grid grid-cols-5 gap-0.5">{HOOK_TYPES.map(typ => (<button key={typ} onClick={() => setSelectedType(typ)} className={`py-1.5 px-0.5 text-[10px] font-bold uppercase rounded transition-all flex flex-col items-center gap-0.5 ${selectedType === typ ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><InstrumentIcon type={typ} className="w-4 h-4" color={selectedType === typ ? '#0f172a' : '#94a3b8'} />{hookLabels[typ]}</button>))}</div>
                    </div>
                    <div className="bg-slate-50 p-0.5 rounded mb-5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-0.5">{t('modal.screw.section_bands')}</div>
                        <div className="grid grid-cols-3 gap-0.5">{['band', 'wire', 'cable'].map(typ => (<button key={typ} onClick={() => setSelectedType(typ)} className={`py-1 px-0.5 text-[10px] font-bold uppercase rounded transition-all ${selectedType === typ ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{t('clinical.fixation.' + typ)}</button>))}</div>
                    </div>
                    {isScrew && (<>
                        <div className="flex gap-2 mb-4">{['standard','custom','none'].map(m => { const labels: Record<string, string> = { standard: t('modal.screw.mode_standard'), custom: t('modal.screw.mode_custom'), none: t('modal.screw.mode_none') }; const active = mode === m; return <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1 text-xs font-bold rounded border transition-all ${active ? 'bg-amber-500 text-slate-900 border-amber-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{labels[m]}</button>; })}</div>
                        {mode === 'standard' && (<div className="space-y-4"><div className="grid grid-cols-4 gap-2"><select value={diameter} onChange={(e) => setDiameter(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="col-span-4 w-full p-2 border border-slate-300 rounded bg-slate-50 text-lg font-mono focus:border-amber-500 outline-none">{DIAMETER_OPTIONS.map(d => <option key={d} value={d}>{d} mm</option>)}</select></div><select value={length} onChange={(e) => setLength(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-lg font-mono focus:border-amber-500 outline-none">{LENGTH_OPTIONS.map(l => <option key={l} value={l}>{l} mm</option>)}</select></div>)}
                        {mode === 'custom' && <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder={t('modal.screw.custom_placeholder')} className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-lg focus:border-amber-500 outline-none" autoFocus />}
                        {mode === 'none' && <div className="text-center py-6 text-slate-400 text-sm italic">{t('modal.screw.icon_only')}</div>}
                    </>)}
                    {isPelvicZone ? (
                        <div className="mt-3 text-[10px] text-slate-400 italic">{t('modal.screw.pelvic_note_hint')}</div>
                    ) : (
                        <div className="mt-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.screw.annotation')}</label><input type="text" value={annotation} onChange={(e) => setAnnotation(e.target.value)} placeholder={t('modal.screw.annotation_placeholder')} className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm focus:border-amber-500 outline-none" /></div>
                    )}
                </div>
                <div className="bg-slate-50 px-4 py-3 flex justify-between border-t border-slate-100">{isEditing ? <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold flex gap-1 items-center" title={t('shortcut.delete')}><IconTrash/> {t('button.remove')}</button> : <div></div>}<div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold" title={t('shortcut.escape')}>{t('button.cancel')}</button><button onClick={handleSubmit} className="px-6 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold shadow-lg" title={t('shortcut.enter')}>{t('button.confirm')}</button></div></div>
            </div>
        </div>
    </Portal>);
};
