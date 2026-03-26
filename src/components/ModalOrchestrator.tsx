import React from 'react';
import { t } from '../i18n/i18n';
import { FORCE_TYPES, getDiscLabel } from '../data/clinical';
import { ScrewModal, modalKeyHandler } from './modals/ScrewModal';
import { CageModal } from './modals/CageModal';
import { OsteotomyModal } from './modals/OsteotomyModal';
import { ForceModal } from './modals/ForceModal';
import { NoteModal } from './modals/NoteModal';
import { HelpModal } from './modals/HelpModal';
import { ChangeLogModal } from './modals/ChangeLogModal';
import { PreferencesModal } from './modals/PreferencesModal';
import { Portal } from './Portal';
import { InstrumentIcon } from './chart/InstrumentIcon';
import type { Placement, Level, Zone, OsteotomyData, CageData, Cage, Note, ColourScheme } from '../types';

/** Data shape returned by CageModal.onConfirm */
interface CageConfirmData {
    type: string;
    height: string;
    width: string;
    length: string;
    lordosis: string;
    side: string;
    expandable: boolean;
}

/** Detail components returned by ScrewModal's computeDetails() */
interface ScrewDetails {
    diameter: string;
    length: string;
    mode: string;
    customText: string;
}

/** Data shape returned by OsteotomyModal.onConfirm */
interface OsteotomyConfirmData {
    type: string;
    angle: string | null;
    shortLabel: string;
    reconstructionCage: string;
}

/** Editing data can be placement data, cage data for ghost cages, or undefined for new entries */
type EditingData = string | OsteotomyData | CageData | Cage | null | undefined;

export type ModalId = 'screw' | 'osteotomy' | 'cage' | 'force' | 'help' | 'note' | 'changelog' | 'preferences' | null;

export interface ModalOrchestratorProps {
    // Modal state
    openModal: ModalId;
    setOpenModal: (id: ModalId) => void;

    // Editing state
    editingData: EditingData;
    editingTool: string | null;
    editingPlacementId: string | null;
    editingAnnotation: string;
    editingCageLevel: string | null;
    pendingPlacement: { levelId: string; zone: string; tool: string } | null;
    osteoDiscLevel: boolean | undefined;
    pendingNoteTool: { tool: string; levelId: string; offsetX: number; offsetY: number } | null;
    editingNote: Note | null;

    // Popover state
    discPickerLevel: { levelId: string; x: number; y: number } | null;
    setDiscPickerLevel: (v: { levelId: string; x: number; y: number } | null) => void;
    forcePopover: { x: number; y: number; existingTool: string | null; existingId: string | null } | null;
    setForcePopover: (v: { x: number; y: number; existingTool: string | null; existingId: string | null } | null) => void;

    // Confirmation state
    confirmNewPatient: boolean;
    setConfirmNewPatient: (v: boolean) => void;
    confirmClearConstruct: boolean;
    setConfirmClearConstruct: (v: boolean) => void;
    exportPicker: string | null;
    setExportPicker: (v: string | null) => void;

    // Screw modal callbacks
    onScrewConfirm: (sizeData: string | null, components: ScrewDetails | null, finalType: string, annotation: string, finalLevelId: string, finalZone: Zone) => void;
    onScrewConfirmAndNext: (confirmedLevelId: string, confirmedZone: Zone) => void;
    onScrewDelete: () => void;

    // Osteotomy modal callbacks
    onOsteoConfirm: (data: OsteotomyConfirmData) => void;
    onOsteoDelete: () => void;
    onOsteoClose: () => void;

    // Cage modal callbacks
    onCageConfirm: (data: CageConfirmData) => void;
    onCageDelete: () => void;

    // Force callbacks
    onForceConfirm: (forceType: string) => void;
    onForceSelect: (forceId: string) => void;
    onForceRemove: () => void;
    setPendingForceZone: (v: { levelId: string; zone: string } | null) => void;

    // Note modal callbacks
    onNoteConfirm: (text: string, showArrow: boolean) => void;
    onNoteDelete: () => void;
    setEditingNote: (n: Note | null) => void;
    setPendingNoteTool: (v: { tool: string; levelId: string; offsetX: number; offsetY: number } | null) => void;

    // Disc picker callbacks
    onDiscPickCage: () => void;
    onDiscPickOsteo: () => void;

    // Confirmation callbacks
    onConfirmNewPatient: () => void;
    onConfirmClearConstruct: () => void;

    // Lock/unlock confirmation state
    confirmLock: boolean;
    setConfirmLock: (v: boolean) => void;
    confirmUnlock: boolean;
    setConfirmUnlock: (v: boolean) => void;
    onConfirmLock: () => void;
    onConfirmUnlock: () => void;

    // Export callback
    onExportWithChoice: (format: string, useFinal: boolean) => void;

    // Preferences callbacks
    useRegionDefaults: boolean;
    onToggleRegionDefaults: () => void;
    confirmAndNextDefault: boolean;
    onToggleConfirmAndNextDefault: () => void;

    // Data props
    levels: Level[];
    scheme: ColourScheme;
    plannedPlacements: Placement[];
    completedPlacements: Placement[];
    activeChart: string;
    defaultDiameter: string;
    defaultLength: string;
    defaultScrewMode: string;
    defaultCustomText: string;
    defaultOsteoType: string;
    defaultOsteoAngle: string;

}

export const ModalOrchestrator = ({
    openModal, setOpenModal,
    editingData, editingTool, editingPlacementId, editingAnnotation,
    editingCageLevel, pendingPlacement, osteoDiscLevel,
    pendingNoteTool, editingNote,
    discPickerLevel, setDiscPickerLevel,
    forcePopover, setForcePopover,
    confirmNewPatient, setConfirmNewPatient,
    confirmClearConstruct, setConfirmClearConstruct,
    exportPicker, setExportPicker,
    onScrewConfirm, onScrewConfirmAndNext, onScrewDelete,
    onOsteoConfirm, onOsteoDelete, onOsteoClose,
    onCageConfirm, onCageDelete,
    onForceConfirm, onForceSelect, onForceRemove, setPendingForceZone,
    onNoteConfirm, onNoteDelete, setEditingNote, setPendingNoteTool,
    onDiscPickCage, onDiscPickOsteo,
    onConfirmNewPatient, onConfirmClearConstruct,
    confirmLock, setConfirmLock, confirmUnlock, setConfirmUnlock,
    onConfirmLock, onConfirmUnlock,
    onExportWithChoice,
    useRegionDefaults, onToggleRegionDefaults,
    confirmAndNextDefault, onToggleConfirmAndNextDefault,
    levels, scheme, plannedPlacements, completedPlacements, activeChart,
    defaultDiameter, defaultLength, defaultScrewMode, defaultCustomText,
    defaultOsteoType, defaultOsteoAngle,
}: ModalOrchestratorProps) => (
    <React.Fragment>
        <ScrewModal isOpen={openModal === 'screw'} onClose={() => setOpenModal(null)}
            onConfirm={onScrewConfirm}
            onConfirmAndNext={onScrewConfirmAndNext}
            onDelete={onScrewDelete}
            initialData={editingData as string | null | undefined} initialTool={editingTool ?? undefined}
            defaultDiameter={defaultDiameter} defaultLength={defaultLength}
            defaultMode={defaultScrewMode} defaultCustomText={defaultCustomText}
            initialAnnotation={editingAnnotation}
            levelId={pendingPlacement?.levelId || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.levelId : '') || ''}
            zone={(pendingPlacement?.zone || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.zone : 'left') || 'left') as Zone}
            levels={levels}
            placements={activeChart === 'planned' ? plannedPlacements : completedPlacements}
            useRegionDefaults={useRegionDefaults}
            confirmAndNextDefault={confirmAndNextDefault} />
        <OsteotomyModal isOpen={openModal === 'osteotomy'} onClose={onOsteoClose} onConfirm={onOsteoConfirm} onDelete={onOsteoDelete} initialData={editingData as OsteotomyData | null | undefined} defaultType={defaultOsteoType} defaultAngle={defaultOsteoAngle} discLevelOnly={osteoDiscLevel}
            levelId={pendingPlacement?.levelId || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.levelId : undefined)} />
        <CageModal isOpen={openModal === 'cage'} onClose={() => setOpenModal(null)} onConfirm={onCageConfirm} onDelete={onCageDelete} initialData={editingData as { tool: string; data: CageData } | null | undefined} levelId={editingCageLevel ?? ''} levels={levels} />
        <ForceModal isOpen={openModal === 'force'} onClose={() => setOpenModal(null)} onConfirm={onForceConfirm} />
        {forcePopover && (() => {
            const popW = 200, popH = forcePopover.existingTool ? 300 : 260;
            const px = Math.min(forcePopover.x, window.innerWidth - popW - 8);
            const py = Math.min(forcePopover.y - popH / 2, window.innerHeight - popH - 8);
            return (<Portal>
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true"
                    onKeyDown={e => {
                        if (e.key === 'Escape') { e.preventDefault(); setForcePopover(null); }
                        else if ((e.key === 'Delete' || e.key === 'Backspace') && forcePopover.existingId) { e.preventDefault(); onForceRemove(); }
                        else if (e.key === 'Tab') {
                            e.preventDefault();
                            const btns = Array.from(document.querySelectorAll('.force-picker-btn')) as HTMLElement[];
                            const idx = btns.indexOf(document.activeElement as HTMLElement);
                            const next = e.shiftKey ? (idx <= 0 ? btns.length - 1 : idx - 1) : (idx >= btns.length - 1 ? 0 : idx + 1);
                            btns[next]?.focus();
                        }
                    }}
                    onClick={() => setForcePopover(null)}>
                    <div className="absolute bg-white rounded-lg shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out]"
                        style={{ left: Math.max(8, px), top: Math.max(8, py), width: popW }}
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-700 text-white px-3 py-1.5 text-center text-xs font-bold">{t('modal.force.title')}</div>
                        <div className="p-2 grid grid-cols-2 gap-1.5">
                            {FORCE_TYPES.map((f, i) => (
                                <button key={f.id} onClick={() => onForceSelect(f.id)}
                                    autoFocus={i === 0}
                                    className={`force-picker-btn flex flex-col items-center gap-1 p-2 rounded border transition-all outline-none focus:ring-2 focus:ring-blue-400 ${
                                        forcePopover.existingTool === f.id
                                            ? 'bg-blue-600 border-blue-700 text-white'
                                            : 'border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300'
                                    }`}>
                                    <InstrumentIcon type={f.icon} className="w-7 h-7" color={forcePopover.existingTool === f.id ? '#ffffff' : '#2563eb'} />
                                    <span className={`text-[9px] font-bold leading-tight text-center ${forcePopover.existingTool === f.id ? 'text-blue-100' : 'text-slate-700'}`}>{t(f.labelKey)}</span>
                                </button>
                            ))}
                        </div>
                        {forcePopover.existingTool && (
                            <div className="px-2 pb-2">
                                <button onClick={onForceRemove}
                                    className="w-full px-2 py-1.5 rounded text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors">{t('button.remove')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </Portal>);
        })()}
        <HelpModal isOpen={openModal === 'help'} onClose={() => setOpenModal(null)} />
        <PreferencesModal isOpen={openModal === 'preferences'} onClose={() => setOpenModal(null)} useRegionDefaults={useRegionDefaults} onToggleRegionDefaults={onToggleRegionDefaults} confirmAndNextDefault={confirmAndNextDefault} onToggleConfirmAndNextDefault={onToggleConfirmAndNextDefault} />
        <ChangeLogModal isOpen={openModal === 'changelog'} onClose={() => setOpenModal(null)} />
        {exportPicker && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: () => onExportWithChoice(exportPicker, false), onClose: () => setExportPicker(null), onDelete: undefined, isEditing: false })} onClick={() => setExportPicker(null)} ref={el => el?.focus()}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-center">{exportPicker.toUpperCase()}</div>
                <div className="p-3 flex flex-col gap-2">
                    <button onClick={() => onExportWithChoice(exportPicker, false)} className="w-full px-4 py-3 rounded text-sm font-bold border transition-colors hover:brightness-95" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{t('export.plan')}</button>
                    <button onClick={() => onExportWithChoice(exportPicker, true)} className="w-full px-4 py-3 rounded text-sm font-bold text-white bg-slate-800 hover:bg-slate-700">{t('export.construct')}</button>
                </div>
            </div>
        </div></Portal>}
        {confirmClearConstruct && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: onConfirmClearConstruct, onClose: () => setConfirmClearConstruct(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmClearConstruct(false)} ref={el => el?.focus()}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold">{t('sidebar.clear_construct')}</div>
                <div className="p-5 text-sm text-slate-600">{t('alert.clear_construct')}</div>
                <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                    <button onClick={() => setConfirmClearConstruct(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                    <button onClick={onConfirmClearConstruct} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-bold">{t('button.confirm')}</button>
                </div>
            </div>
        </div></Portal>}
        {confirmNewPatient && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: onConfirmNewPatient, onClose: () => setConfirmNewPatient(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmNewPatient(false)} ref={el => el?.focus()}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold">{t('sidebar.new_patient')}</div>
                <div className="p-5 text-sm text-slate-600">{t('alert.new_patient')}</div>
                <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                    <button onClick={() => setConfirmNewPatient(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                    <button onClick={onConfirmNewPatient} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-bold">{t('button.confirm')}</button>
                </div>
            </div>
        </div></Portal>}
        {confirmLock && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: onConfirmLock, onClose: () => setConfirmLock(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmLock(false)} ref={el => el?.focus()}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="text-white px-4 py-3 text-sm font-bold" style={{ backgroundColor: '#0d9488' }}>{t('sidebar.finish_case')}</div>
                <div className="p-5 text-sm text-slate-600">{t('sidebar.finish_case_confirm')}</div>
                <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                    <button onClick={() => setConfirmLock(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                    <button onClick={onConfirmLock} className="px-4 py-2 rounded text-white hover:brightness-110 text-sm font-bold" style={{ backgroundColor: '#0d9488' }}>{t('button.confirm')}</button>
                </div>
            </div>
        </div></Portal>}
        {confirmUnlock && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: onConfirmUnlock, onClose: () => setConfirmUnlock(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmUnlock(false)} ref={el => el?.focus()}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="text-white px-4 py-3 text-sm font-bold" style={{ backgroundColor: '#d97706' }}>{t('sidebar.unlock_record')}</div>
                <div className="p-5 text-sm text-slate-600">{t('sidebar.unlock_confirm')}</div>
                <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                    <button onClick={() => setConfirmUnlock(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                    <button onClick={onConfirmUnlock} className="px-4 py-2 rounded text-white hover:brightness-110 text-sm font-bold" style={{ backgroundColor: '#d97706' }}>{t('button.confirm')}</button>
                </div>
            </div>
        </div></Portal>}
        {discPickerLevel && (() => {
            const pickerButtons = [
                { action: onDiscPickCage, label: t('help.cages.title'), cls: 'text-sky-800 bg-sky-50 border-sky-200 hover:bg-sky-100 focus:ring-2 focus:ring-sky-400' },
                { action: onDiscPickOsteo, label: t('help.osteotomies.title'), cls: 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 focus:ring-2 focus:ring-amber-400' },
            ];
            // Position popover near click, clamped to viewport
            const popW = 180, popH = 120;
            const px = Math.min(discPickerLevel.x, window.innerWidth - popW - 8);
            const py = Math.min(discPickerLevel.y - popH / 2, window.innerHeight - popH - 8);
            return (<Portal>
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true"
                    onKeyDown={e => {
                        if (e.key === 'Escape') { e.preventDefault(); setDiscPickerLevel(null); }
                        else if (e.key === 'Enter') {
                            e.preventDefault();
                            const focused = document.activeElement as HTMLElement;
                            if (focused?.tagName === 'BUTTON') focused.click();
                            else onDiscPickCage();
                        }
                        else if (e.key === 'Tab') {
                            e.preventDefault();
                            const btns = Array.from(document.querySelectorAll('.disc-picker-btn')) as HTMLElement[];
                            const idx = btns.indexOf(document.activeElement as HTMLElement);
                            const next = e.shiftKey ? (idx <= 0 ? btns.length - 1 : idx - 1) : (idx >= btns.length - 1 ? 0 : idx + 1);
                            btns[next]?.focus();
                        }
                    }}
                    onClick={() => setDiscPickerLevel(null)}>
                    <div className="absolute bg-white rounded-lg shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out]"
                        style={{ left: Math.max(8, px), top: Math.max(8, py), width: popW }}
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-700 text-white px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider">{getDiscLabel(discPickerLevel.levelId, levels)}</div>
                        <div className="p-1.5 flex flex-col gap-1">
                            {pickerButtons.map((btn, i) => (
                                <button key={i} onClick={btn.action}
                                    className={`disc-picker-btn w-full px-3 py-2 rounded text-sm font-bold border transition-colors outline-none ${btn.cls}`}
                                    autoFocus={i === 0}>{btn.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </Portal>);
        })()}
        <NoteModal isOpen={openModal === 'note'} onClose={() => { setOpenModal(null); setEditingNote(null); setPendingNoteTool(null); }} onConfirm={onNoteConfirm} onDelete={onNoteDelete} initialText={editingNote?.text || ''} initialShowArrow={editingNote ? editingNote.showArrow : undefined} isEditing={!!editingNote} />
    </React.Fragment>
);
