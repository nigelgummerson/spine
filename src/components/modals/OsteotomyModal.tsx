import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../i18n/i18n';
import { modalKeyHandler, selectWheelHandler, numberWheelHandler } from './ScrewModal';
import { IconTrash, IconX } from '../icons';
import { Portal } from '../Portal';

interface OsteotomyConfirmData {
    type: string;
    angle: string | null;
    shortLabel: string;
    reconstructionCage: string;
}

interface OsteotomyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: OsteotomyConfirmData) => void;
    onDelete?: () => void;
    initialData?: { type: string; angle?: number | string | null; reconstructionCage?: string } | null;
    defaultType?: string;
    defaultAngle?: string;
    discLevelOnly?: boolean | null;
}

export const OsteotomyModal = ({ isOpen, onClose, onConfirm, onDelete, initialData, defaultType, defaultAngle, discLevelOnly }: OsteotomyModalProps) => {
    if (!isOpen) return null;

    const OSTEOTOMY_TYPES = [
        { id: 'Facet', labelKey: 'clinical.osteotomy.facet.label', shortLabel: 'Facet', schwabKey: 'clinical.osteotomy.facet.schwab', descKey: 'clinical.osteotomy.facet.desc', defaultAngle: '5', group: 'posterior', discLevel: true },
        { id: 'Ponte', labelKey: 'clinical.osteotomy.ponte.label', shortLabel: 'Ponte', schwabKey: 'clinical.osteotomy.ponte.schwab', descKey: 'clinical.osteotomy.ponte.desc', defaultAngle: '10', group: 'posterior', discLevel: true },
        { id: 'PSO', labelKey: 'clinical.osteotomy.pso.label', shortLabel: 'PSO', schwabKey: 'clinical.osteotomy.pso.schwab', descKey: 'clinical.osteotomy.pso.desc', defaultAngle: '25', group: 'posterior' },
        { id: 'ExtPSO', labelKey: 'clinical.osteotomy.extpso.label', shortLabel: 'Ext PSO', schwabKey: 'clinical.osteotomy.extpso.schwab', descKey: 'clinical.osteotomy.extpso.desc', defaultAngle: '35', group: 'posterior' },
        { id: 'VCR', labelKey: 'clinical.osteotomy.vcr.label', shortLabel: 'VCR', schwabKey: 'clinical.osteotomy.vcr.schwab', descKey: 'clinical.osteotomy.vcr.desc', defaultAngle: '40', group: 'posterior' },
        { id: 'ML-VCR', labelKey: 'clinical.osteotomy.mlvcr.label', shortLabel: 'ML VCR', schwabKey: 'clinical.osteotomy.mlvcr.schwab', descKey: 'clinical.osteotomy.mlvcr.desc', defaultAngle: '0', group: 'posterior' },
        { id: 'Corpectomy', labelKey: 'clinical.osteotomy.corpectomy.label', shortLabel: 'Corpectomy', schwabKey: 'clinical.osteotomy.corpectomy.schwab', descKey: 'clinical.osteotomy.corpectomy.desc', defaultAngle: '0', group: 'anterior' }
    ];

    const filteredTypes = discLevelOnly === true
        ? OSTEOTOMY_TYPES.filter(ot => ot.discLevel)
        : discLevelOnly === false
            ? OSTEOTOMY_TYPES.filter(ot => !ot.discLevel)
            : OSTEOTOMY_TYPES;

    // Resolve initial type: use defaultType only if it's in the filtered list
    const resolvedDefault = filteredTypes.find(ot => ot.id === defaultType) ? defaultType! : filteredTypes[0]?.id || 'PSO';

    const [type, setType] = useState(resolvedDefault);
    const [angle, setAngle] = useState('');
    const [reconstructionCage, setReconstructionCage] = useState('');

    const needsReconCage = ['VCR','ML-VCR','Corpectomy'].includes(type);

    useEffect(() => {
        if (isOpen) {
            if (initialData && typeof initialData === 'object') {
                setType(initialData.type);
                setAngle(initialData.angle !== undefined && initialData.angle !== null ? String(initialData.angle) : '');
                setReconstructionCage(initialData.reconstructionCage || '');
            } else {
                setType(resolvedDefault);
                setAngle('');
                setReconstructionCage('');
            }
        }
    }, [isOpen, initialData, defaultType, defaultAngle]);

    const selectedDef = filteredTypes.find(ot => ot.id === type) || filteredTypes[0];
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTypeID = e.target.value;
        setType(newTypeID);
        setAngle('');
        if (!['VCR','ML-VCR','Corpectomy'].includes(newTypeID)) setReconstructionCage('');
    };
    const handleSubmit = () => {
        onConfirm({
            type, angle: angle !== '' ? angle : null,
            shortLabel: selectedDef?.shortLabel || type,
            reconstructionCage: needsReconCage ? reconstructionCage : ''
        });
        onClose();
    };
    const isEditing = !!initialData;
    const osteoRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (osteoRef.current) osteoRef.current.focus(); }, []);
    return (<Portal>
        <div ref={osteoRef} tabIndex={-1} style={{outline:'none'}}
            onKeyDown={modalKeyHandler({ onSubmit: handleSubmit, onClose, onDelete, isEditing })}
            className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-amber-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{isEditing ? t('modal.osteotomy.title_edit') : t('modal.osteotomy.title_new')}</h3>
                    <button onClick={onClose} className="hover:text-red-200"><IconX /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal.osteotomy.type')}</label>
                        <select value={type} onChange={handleTypeChange} onWheel={selectWheelHandler} title={t('hint.scroll_to_change')}
                            className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none">
                            {filteredTypes.some(ot => ot.group === 'posterior') && <optgroup label={t('modal.osteotomy.optgroup_posterior')}>
                                {filteredTypes.filter(ot => ot.group === 'posterior').map(ot =>
                                    <option key={ot.id} value={ot.id}>{t(ot.labelKey)}</option>
                                )}
                            </optgroup>}
                            {filteredTypes.some(ot => ot.group === 'anterior') && <optgroup label={t('modal.osteotomy.optgroup_anterior')}>
                                {filteredTypes.filter(ot => ot.group === 'anterior').map(ot =>
                                    <option key={ot.id} value={ot.id}>{t(ot.labelKey)}</option>
                                )}
                            </optgroup>}
                        </select>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded p-3 text-xs">
                        <div className="font-bold text-amber-800 uppercase tracking-wider mb-1">{t(selectedDef.schwabKey)}</div>
                        <div className="text-amber-700 mb-2">{t(selectedDef.descKey)}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal.osteotomy.angle')}</label>
                        <div className="flex items-center gap-2">
                            <input type="number" value={angle} onChange={(e) => setAngle(e.target.value)} onWheel={numberWheelHandler(setAngle, 5, 0, 90)} title={t('hint.scroll_to_change')} placeholder={selectedDef.defaultAngle}
                                className="w-24 p-2 border border-slate-300 rounded bg-slate-50 text-lg font-mono focus:border-amber-500 outline-none text-center" />
                            <span className="italic text-slate-400 text-sm">{t('modal.osteotomy.degrees')}</span>
                        </div>
                    </div>
                    {needsReconCage && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal.osteotomy.recon_cage')}</label>
                            <input type="text" value={reconstructionCage}
                                onChange={(e) => setReconstructionCage(e.target.value)}
                                placeholder={t('modal.osteotomy.recon_cage_placeholder')}
                                className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm focus:border-amber-500 outline-none" />
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 px-4 py-3 flex justify-between border-t border-slate-100">
                    {isEditing ? (
                        <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold flex gap-1 items-center">
                            <IconTrash/> {t('button.remove')}
                        </button>
                    ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded bg-amber-800 text-white hover:bg-amber-700 text-sm font-bold shadow-lg">{t('button.confirm')}</button>
                    </div>
                </div>
            </div>
        </div>
    </Portal>);
};
