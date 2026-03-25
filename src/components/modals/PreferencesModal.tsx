import React from 'react';
import { t } from '../../i18n/i18n';
import { IconX, IconGear } from '../icons';
import { Portal } from '../Portal';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    useRegionDefaults: boolean;
    onToggleRegionDefaults: () => void;
    confirmAndNextDefault: boolean;
    onToggleConfirmAndNextDefault: () => void;
}

export const PreferencesModal = ({ isOpen, onClose, useRegionDefaults, onToggleRegionDefaults, confirmAndNextDefault, onToggleConfirmAndNextDefault }: PreferencesModalProps) => {
    if (!isOpen) return null;
    return (<Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e => e.key === 'Escape' && onClose()} ref={el => { el?.focus(); }}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2"><IconGear /> {t('modal.preferences.title')}</h3>
                    <button onClick={onClose} className="hover:text-slate-300"><IconX /></button>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                            <div className="text-sm font-bold text-slate-700">{t('modal.preferences.region_defaults')}</div>
                            <div className="text-[10px] text-slate-400">{t('modal.preferences.region_defaults_desc')}</div>
                        </div>
                        <button onClick={onToggleRegionDefaults} className={`w-10 h-5 rounded-full transition-colors relative ${useRegionDefaults ? 'bg-amber-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useRegionDefaults ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </label>
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                            <div className="text-sm font-bold text-slate-700">{t('modal.preferences.confirm_next_default')}</div>
                            <div className="text-[10px] text-slate-400">{t('modal.preferences.confirm_next_default_desc')}</div>
                        </div>
                        <button onClick={onToggleConfirmAndNextDefault} className={`w-10 h-5 rounded-full transition-colors relative ${confirmAndNextDefault ? 'bg-amber-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${confirmAndNextDefault ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </label>
                </div>
                <div className="bg-slate-50 px-4 py-3 text-end border-t border-slate-200">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold">{t('button.close')}</button>
                </div>
            </div>
        </div>
    </Portal>);
};
