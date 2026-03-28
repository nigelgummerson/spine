import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { ROD_MATERIALS, ROD_PROFILES, ROD_CONTOURS, ROD_DIAMETERS, createEmptyRod } from '../../data/implants';
import { modalKeyHandler, numberWheelHandler, selectWheelHandler } from './ScrewModal';
import { IconTrash, IconX } from '../icons';
import { Portal } from '../Portal';

import type { RodData } from '../../types';

/** Cervical systems default to 3.5mm rods; all others to 5.5mm */
const DEFAULT_ROD_DIAMETER: Record<string, string> = {
    'Infinity OCT': '3.5', 'SYMPHONY OCT': '3.5', 'QUARTEX OCT': '3.5',
    'CASPIAN OCT': '3.5', 'Cortium': '3.5', 'NorthStar OCT': '3.5',
    'YUKON OCT': '3.5', 'Virage OCT': '3.5', 'Solstice OCT': '3.5',
    'InVictus OCT': '3.5',
};

function getDefaultRodDiameter(screwSystem: string): string {
    return DEFAULT_ROD_DIAMETER[screwSystem] || '5.5';
}

interface RodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (side: 'left' | 'right', rod: RodData) => void;
    onDelete?: (side: 'left' | 'right') => void;
    initialSide: 'left' | 'right';
    leftRod: RodData;
    rightRod: RodData;
    isEditing: boolean;
    screwSystem?: string;
}

export const RodModal = ({ isOpen, onClose, onConfirm, onDelete, initialSide, leftRod, rightRod, isEditing, screwSystem }: RodModalProps) => {
    if (!isOpen) return null;

    const [side, setSide] = useState<'left' | 'right'>(initialSide);
    const [applyBoth, setApplyBoth] = useState(true);
    const currentRod = side === 'left' ? leftRod : rightRod;
    const otherRod = side === 'left' ? rightRod : leftRod;
    const hasData = currentRod && (currentRod.material || currentRod.diameter || currentRod.profile || currentRod.length || currentRod.contour || currentRod.notes);

    // Default diameter from screw system when both rods are empty
    const defaultDiameter = screwSystem ? getDefaultRodDiameter(screwSystem) : '';
    const resolveInitialDiameter = (rod: RodData) => rod?.diameter || defaultDiameter;

    const [material, setMaterial] = useState(currentRod?.material || '');
    const [diameter, setDiameter] = useState(resolveInitialDiameter(currentRod));
    const [profile, setProfile] = useState(currentRod?.profile || '');
    const [length, setLength] = useState(currentRod?.length || '');
    const [contour, setContour] = useState(currentRod?.contour || '');
    const [notes, setNotes] = useState(currentRod?.notes || '');
    const [transitionFrom, setTransitionFrom] = useState(currentRod?.transitionFrom || '');
    const [transitionTo, setTransitionTo] = useState(currentRod?.transitionTo || '');

    // Per-side lengths for applyBoth mode
    const [leftLength, setLeftLength] = useState(leftRod?.length || '');
    const [rightLength, setRightLength] = useState(rightRod?.length || '');

    // Sync fields when side changes
    useEffect(() => {
        const rod = side === 'left' ? leftRod : rightRod;
        setMaterial(rod?.material || '');
        setDiameter(resolveInitialDiameter(rod));
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
            setDiameter(resolveInitialDiameter(rod));
            setProfile(rod?.profile || '');
            setLength(rod?.length || '');
            setContour(rod?.contour || '');
            setNotes(rod?.notes || '');
            setTransitionFrom(rod?.transitionFrom || '');
            setTransitionTo(rod?.transitionTo || '');
            setLeftLength(leftRod?.length || '');
            setRightLength(rightRod?.length || '');
        }
    }, [isOpen, initialSide]);

    const handleSubmit = () => {
        if (applyBoth) {
            const sharedRod = { material, diameter, profile, contour, notes, transitionFrom, transitionTo };
            onConfirm('left', { ...sharedRod, length: leftLength });
            onConfirm('right', { ...sharedRod, length: rightLength });
        } else {
            onConfirm(side, { material, diameter, profile, length, contour, notes, transitionFrom, transitionTo });
        }
        onClose();
    };

    const handleDelete = () => {
        if (onDelete) {
            if (applyBoth) {
                onDelete('left');
                onDelete('right');
            } else {
                onDelete(side);
            }
        }
        onClose();
    };

    const handleCopyToOther = () => {
        const otherSide: 'left' | 'right' = side === 'left' ? 'right' : 'left';
        onConfirm(otherSide, { material, diameter, profile, length, contour, notes, transitionFrom, transitionTo });
    };

    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (modalRef.current) modalRef.current.focus(); }, []);

    const sideLabel = side === 'left' ? t('chart.header.left') : t('chart.header.right');
    const titleKey = hasData ? 'modal.rod.title_edit' : 'modal.rod.title_new';
    const titleText = applyBoth
        ? t(titleKey) + ' — ' + t('chart.header.left') + ' + ' + t('chart.header.right')
        : t(titleKey) + ' — ' + sideLabel;

    return (<Portal>
        <div ref={modalRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete: hasData ? handleDelete : null, isEditing: !!hasData })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-sky-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{titleText}</h3>
                    <button onClick={onClose} className="hover:text-sky-200"><IconX /></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Apply to both sides checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={applyBoth} onChange={e => setApplyBoth(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500 cursor-pointer" />
                        <span className="text-xs font-bold text-slate-600">{t('modal.rod.apply_both')}</span>
                    </label>

                    {/* Side selector — only shown when applyBoth is off */}
                    {!applyBoth && (
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
                            {/* Copy to other side button */}
                            <button onClick={handleCopyToOther} className="mt-1.5 w-full py-1 rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 hover:bg-sky-50 hover:text-sky-700 transition-all">
                                {t('modal.rod.copy_to_other')}
                            </button>
                        </div>
                    )}

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

                    {/* Length — dual fields when applyBoth, single field otherwise */}
                    {applyBoth ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.left_length')}</label>
                                <input type="number" value={leftLength} onChange={e => setLeftLength(e.target.value)} onWheel={numberWheelHandler(setLeftLength, 5, 0)} title={t('hint.scroll_to_change')} placeholder="mm" className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.right_length')}</label>
                                <input type="number" value={rightLength} onChange={e => setRightLength(e.target.value)} onWheel={numberWheelHandler(setRightLength, 5, 0)} title={t('hint.scroll_to_change')} placeholder="mm" className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-center focus:border-sky-500 outline-none" />
                            </div>
                        </div>
                    ) : (
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
                    )}

                    {/* Contour — separate row when applyBoth (since length took the grid) */}
                    {applyBoth && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.rod.contour')}</label>
                            <select value={contour} onChange={e => setContour(e.target.value)} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')} className="w-full p-1.5 border border-slate-300 rounded bg-slate-50 text-sm focus:border-sky-500 outline-none cursor-pointer">
                                <option value="">—</option>
                                {ROD_CONTOURS.map(c => (
                                    <option key={c} value={c}>{t(`rod.contour.${c}`)}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
