import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { ROD_MATERIALS, ROD_PROFILES, ROD_CONTOURS, ROD_DIAMETERS, createEmptyRod } from '../../data/implants';
import { modalKeyHandler, numberWheelHandler, selectWheelHandler } from './ScrewModal';
import { IconTrash, IconX } from '../icons';
import { Portal } from '../Portal';

import type { RodData } from '../../types';

interface RodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (side: 'left' | 'right', rod: RodData) => void;
    onDelete?: (side: 'left' | 'right') => void;
    initialSide: 'left' | 'right';
    leftRod: RodData;
    rightRod: RodData;
    isEditing: boolean;
}

export const RodModal = ({ isOpen, onClose, onConfirm, onDelete, initialSide, leftRod, rightRod, isEditing }: RodModalProps) => {
    if (!isOpen) return null;

    const [side, setSide] = useState<'left' | 'right'>(initialSide);
    const currentRod = side === 'left' ? leftRod : rightRod;
    const hasData = currentRod && (currentRod.material || currentRod.diameter || currentRod.profile || currentRod.length || currentRod.contour || currentRod.notes);

    const [material, setMaterial] = useState(currentRod?.material || '');
    const [diameter, setDiameter] = useState(currentRod?.diameter || '');
    const [profile, setProfile] = useState(currentRod?.profile || '');
    const [length, setLength] = useState(currentRod?.length || '');
    const [contour, setContour] = useState(currentRod?.contour || '');
    const [notes, setNotes] = useState(currentRod?.notes || '');
    const [transitionFrom, setTransitionFrom] = useState(currentRod?.transitionFrom || '');
    const [transitionTo, setTransitionTo] = useState(currentRod?.transitionTo || '');

    // Sync fields when side changes
    useEffect(() => {
        const rod = side === 'left' ? leftRod : rightRod;
        setMaterial(rod?.material || '');
        setDiameter(rod?.diameter || '');
        setProfile(rod?.profile || '');
        setLength(rod?.length || '');
        setContour(rod?.contour || '');
        setNotes(rod?.notes || '');
        setTransitionFrom(rod?.transitionFrom || '');
        setTransitionTo(rod?.transitionTo || '');
    }, [side]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setSide(initialSide);
            const rod = initialSide === 'left' ? leftRod : rightRod;
            setMaterial(rod?.material || '');
            setDiameter(rod?.diameter || '');
            setProfile(rod?.profile || '');
            setLength(rod?.length || '');
            setContour(rod?.contour || '');
            setNotes(rod?.notes || '');
            setTransitionFrom(rod?.transitionFrom || '');
            setTransitionTo(rod?.transitionTo || '');
        }
    }, [isOpen, initialSide]);

    const handleSubmit = () => {
        onConfirm(side, { material, diameter, profile, length, contour, notes, transitionFrom, transitionTo });
        onClose();
    };

    const handleDelete = () => {
        if (onDelete) onDelete(side);
        onClose();
    };

    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (modalRef.current) modalRef.current.focus(); }, []);

    const sideLabel = side === 'left' ? t('chart.header.left') : t('chart.header.right');
    const titleKey = hasData ? 'modal.rod.title_edit' : 'modal.rod.title_new';

    return (<Portal>
        <div ref={modalRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete: hasData ? handleDelete : null, isEditing: !!hasData })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-sky-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{t(titleKey)} — {sideLabel}</h3>
                    <button onClick={onClose} className="hover:text-sky-200"><IconX /></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Side selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.cage.side')}</label>
                        <div className="flex gap-1.5">
                            {(['left', 'right'] as const).map(s => (
                                <button key={s} onClick={() => setSide(s)}
                                    className={`flex-1 py-1.5 rounded border text-xs font-bold transition-all ${
                                        side === s ? 'bg-sky-700 text-white border-sky-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                                    }`}>{s === 'left' ? t('chart.header.left') : t('chart.header.right')}</button>
                            ))}
                        </div>
                    </div>

                    {/* Material */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.material')}</label>
                        <select value={material} onChange={e => setMaterial(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm focus:border-sky-500 outline-none cursor-pointer">
                            <option value="">—</option>
                            {ROD_MATERIALS.map(m => (
                                <option key={m} value={m}>{t(`rod.material.${m}`)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Diameter + Profile row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.diameter')}</label>
                            <select value={diameter} onChange={e => setDiameter(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm font-mono text-center focus:border-sky-500 outline-none cursor-pointer">
                                <option value="">—</option>
                                {ROD_DIAMETERS.map(d => (
                                    <option key={d} value={d}>{d} mm</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.profile')}</label>
                            <select value={profile} onChange={e => setProfile(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm focus:border-sky-500 outline-none cursor-pointer">
                                <option value="">—</option>
                                {ROD_PROFILES.map(p => (
                                    <option key={p} value={p}>{t(`rod.profile.${p}`)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Transition diameters — only visible when profile is 'transition' */}
                    {profile === 'transition' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.transition_from')}</label>
                                <select value={transitionFrom} onChange={e => setTransitionFrom(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm font-mono text-center focus:border-sky-500 outline-none cursor-pointer">
                                    <option value="">—</option>
                                    {ROD_DIAMETERS.map(d => (
                                        <option key={d} value={d}>{d} mm</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.transition_to')}</label>
                                <select value={transitionTo} onChange={e => setTransitionTo(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm font-mono text-center focus:border-sky-500 outline-none cursor-pointer">
                                    <option value="">—</option>
                                    {ROD_DIAMETERS.map(d => (
                                        <option key={d} value={d}>{d} mm</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Length + Contour row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.length')}</label>
                            <input type="number" value={length} onChange={e => setLength(e.target.value)} onWheel={numberWheelHandler(setLength, 5, 0)} title={t('hint.scroll_to_change')} placeholder="mm" className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.contour')}</label>
                            <select value={contour} onChange={e => setContour(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm focus:border-sky-500 outline-none cursor-pointer">
                                <option value="">—</option>
                                {ROD_CONTOURS.map(c => (
                                    <option key={c} value={c}>{t(`rod.contour.${c}`)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.notes')}</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('modal.rod.notes_placeholder')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm focus:border-sky-500 outline-none" />
                    </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 flex justify-between border-t border-slate-100">
                    {hasData ? <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold flex gap-1 items-center"><IconTrash/> {t('button.remove')}</button> : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded bg-sky-800 text-white hover:bg-sky-700 text-sm font-bold shadow-lg">{t('button.confirm')}</button>
                    </div>
                </div>
            </div>
        </div>
    </Portal>);
};
