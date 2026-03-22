import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { NOTE_PRESET_KEYS } from '../../data/clinical';
import { modalKeyHandler } from './ScrewModal';
import { IconTrash, IconX } from '../icons';

export const NoteModal = ({ isOpen, onClose, onConfirm, onDelete, initialText, initialShowArrow, isEditing }) => {
    if (!isOpen) return null;
    const [text, setText] = useState(initialText || '');
    const [showArrow, setShowArrow] = useState(initialShowArrow || false);
    const noteRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setText(initialText || '');
            setShowArrow(initialShowArrow || false);
        }
    }, [isOpen, initialText, initialShowArrow]);

    useEffect(() => { if (noteRef.current) noteRef.current.focus(); }, []);

    const handleSubmit = () => {
        if (!text.trim()) return;
        onConfirm(text.trim(), showArrow);
        onClose();
    };

    return (
        <div ref={noteRef} tabIndex={-1} style={{outline:'none'}} onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete, isEditing })} className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-violet-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{isEditing ? t('modal.note.title_edit') : t('modal.note.title_new')}</h3>
                    <button onClick={onClose} className="hover:text-violet-200"><IconX /></button>
                </div>
                <div className="p-5 space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('modal.note.text')}</label>
                        <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder={t('modal.note.text_placeholder')} className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm focus:border-violet-500 outline-none" autoFocus />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {NOTE_PRESET_KEYS.map(key => { const label = t(key); return (
                            <button key={key} onClick={() => setText(label)} className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${text === label ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200'}`}>{label}</button>
                        ); })}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showArrow} onChange={e => setShowArrow(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                        <span className="text-xs text-slate-600">{t('modal.note.show_arrow')}</span>
                    </label>
                </div>
                <div className="bg-slate-50 px-4 py-3 flex justify-between border-t border-slate-100">
                    {isEditing ? <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold flex gap-1 items-center"><IconTrash/> {t('button.remove')}</button> : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded bg-violet-800 text-white hover:bg-violet-700 text-sm font-bold shadow-lg">{t('button.confirm')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
