import React, { useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { FORCE_TYPES } from '../../data/clinical';
import { InstrumentIcon } from '../chart/InstrumentIcon';
import { IconX } from '../icons';
import { modalKeyHandler } from './ScrewModal';

interface ForceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (forceId: string) => void;
}

export const ForceModal = ({ isOpen, onClose, onConfirm }: ForceModalProps) => {
    if (!isOpen) return null;
    const forceRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (forceRef.current) forceRef.current.focus(); }, []);
    return (
        <div ref={forceRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: () => {}, onClose, onDelete: null, isEditing: false })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden">
                <div className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{t('modal.force.title')}</h3>
                    <button onClick={onClose} className="hover:text-blue-200"><IconX /></button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                    {FORCE_TYPES.map(f => (
                        <button key={f.id} onClick={() => { onConfirm(f.id); onClose(); }}
                            className="flex flex-col items-center gap-1 p-3 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all">
                            <InstrumentIcon type={f.icon} className="w-8 h-8" color="#2563eb" />
                            <span className="text-[10px] font-bold text-slate-700">{t(f.labelKey)}</span>
                        </button>
                    ))}
                </div>
                <div className="bg-slate-50 px-4 py-2 text-right border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-1.5 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                </div>
            </div>
        </div>
    );
};
