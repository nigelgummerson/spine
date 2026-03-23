import React from 'react';
import { t } from '../../i18n/i18n';
import { CURRENT_VERSION, CHANGE_LOG, formatDate } from '../../data/changelog';
import { IconX , IconHistory} from '../icons';

interface ChangeLogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangeLogModal = ({ isOpen, onClose }: ChangeLogModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onClick={onClose} onKeyDown={e => (e.key === 'Escape' || e.key === 'Enter') && onClose()} ref={el => { el?.focus(); }}>
            <div className="bg-white rounded-lg shadow-2xl w-full overflow-hidden flex flex-col max-h-[80vh]" style={{ maxWidth: window.matchMedia('(orientation: landscape)').matches ? '48rem' : '32rem', outline: 'none' }} onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center"><h3 className="font-bold text-sm flex items-center gap-2"><IconHistory/> {t('modal.changelog.title')}</h3><button onClick={onClose} className="hover:text-slate-300"><IconX /></button></div>
                <div className="p-0 overflow-y-auto flex-1">
                    {CHANGE_LOG.map((log, i) => (
                        <div key={i} className={`p-4 border-b border-slate-100 ${i===0 ? 'bg-amber-50/50' : ''}`}>
                            <div className="flex justify-between items-baseline mb-2"><span className="font-bold text-slate-800 text-sm">{log.version}</span><span className="text-[10px] text-slate-400 font-mono">{log.date}</span></div>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">{log.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-50 px-4 py-3 text-end border-t border-slate-200"><button onClick={onClose} className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold">{t('button.close')}</button></div>
            </div>
        </div>
    );
};
