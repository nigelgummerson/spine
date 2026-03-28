import React, { useState } from 'react';
import { t, formatDate } from '../i18n/i18n';
import { IMPLANT_COMPANIES } from '../data/implants';
import { AUTO_THEME_FROM_COMPANY, COMPANY_THEME_MAP } from '../data/themes';
import { BONE_GRAFT_OPTIONS, BONE_GRAFT_LABEL_KEYS } from '../data/implants';
import { ScrewSystemCombo } from './ScrewSystemCombo';
import { CreditsFooter } from './CreditsFooter';
import { ImplantInventory } from './ImplantInventory';
import type { PatientData, Placement, Level, ToolDefinition, Zone, DocumentAction } from '../types';

/** Paste handler for contentEditable fields — strips HTML, inserts plain text only. */
const handlePastePlainText = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
};

export interface DemographicsPanelProps {
    patientData: PatientData;
    dispatch: React.Dispatch<DocumentAction>;
    setPatientField: (field: string, value: string) => void;
    changeTheme: (id: string) => void;
    showFinalInventory: boolean;
    setShowFinalInventory: (v: boolean) => void;
    plannedPlacements: Placement[];
    completedPlacements: Placement[];
    plannedCages: { id: string; levelId: string; tool: string; data: unknown }[];
    completedCages: { id: string; levelId: string; tool: string; data: unknown }[];
    plannedConnectors: { id: string; levelId: string; tool: string }[];
    completedConnectors: { id: string; levelId: string; tool: string }[];
    allTools: ToolDefinition[];
    levels: Level[];
    currentLang: string;
}

export const DemographicsPanel = ({
    patientData, dispatch, setPatientField, changeTheme,
    showFinalInventory, setShowFinalInventory,
    plannedPlacements, completedPlacements,
    plannedCages, completedCages,
    plannedConnectors, completedConnectors,
    allTools, levels, currentLang,
}: DemographicsPanelProps) => {
    const [isEditingDate, setIsEditingDate] = useState(false);

    return (
        <React.Fragment>
            <h2 className="font-bold text-2xl text-slate-900 mb-4 border-b-4 border-slate-900 pb-2">{t('export.title')}</h2>
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
                <div className="space-y-1 shrink-0">
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.name')}</label><div className="editable-field w-full text-sm font-bold" contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('name', e.target.innerText)} placeholder={t('patient.click_to_enter')}>{patientData.name}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.id')}</label><div className="editable-field w-full text-sm font-mono font-bold" contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('id', e.target.innerText)} placeholder={t('patient.click_to_enter')}>{patientData.id}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.surgeon')}</label><div className="editable-field w-full text-xs" contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('surgeon', e.target.innerText)} placeholder={t('patient.click_to_enter')}>{patientData.surgeon}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.date')}</label><div className="editable-field w-full text-xs cursor-pointer" onClick={() => setIsEditingDate(true)}>{isEditingDate ? <input type="date" className="w-full text-xs border-b border-slate-800 bg-transparent outline-none py-0" value={patientData.date} autoFocus onBlur={()=>setIsEditingDate(false)} onChange={e=>setPatientField('date', e.target.value)} /> : formatDate(patientData.date)}</div></div>
                </div>
                <div className="border-t border-slate-200 my-3"></div>
                <div className="space-y-1 shrink-0">
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.supplier')}</label><select className="editable-field w-full text-xs bg-white cursor-pointer" value={patientData.company} onChange={e => { const v = e.target.value; setPatientField('company', v); if (AUTO_THEME_FROM_COMPANY && COMPANY_THEME_MAP[v]) { changeTheme(COMPANY_THEME_MAP[v]); } }}><option value="">{t('patient.select_supplier')}</option>{IMPLANT_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}<option value="__other">{t('patient.other')}</option></select>{patientData.company === '__other' && <div className="editable-field w-full text-xs mt-0.5" contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('company', e.target.innerText)} placeholder={t('patient.enter_company')}></div>}</div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.screw_system')}</label><ScrewSystemCombo value={patientData.screwSystem} onChange={v => setPatientField('screwSystem', v)} company={patientData.company} placeholder={t('patient.screw_system_placeholder')} /></div>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className="shrink-0">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t('patient.bone_graft')}</h3>
                    <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
                        {BONE_GRAFT_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-1 text-[10px] text-slate-700 cursor-pointer hover:text-slate-900 leading-tight">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 shrink-0" checked={(patientData.boneGraft?.types || []).includes(opt)} onChange={e => { const types = patientData.boneGraft?.types || []; dispatch({ type: 'SET_BONE_GRAFT', types: e.target.checked ? [...types, opt] : types.filter(v => v !== opt), notes: patientData.boneGraft?.notes || '' }); }} />
                                <span className="truncate">{BONE_GRAFT_LABEL_KEYS[opt] ? t(BONE_GRAFT_LABEL_KEYS[opt]) : opt}</span>
                            </label>
                        ))}
                    </div>
                    <div className="editable-field w-full text-[10px] mt-1" contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => dispatch({ type: 'SET_BONE_GRAFT', types: patientData.boneGraft?.types || [], notes: e.target.innerText })} placeholder={t('patient.bone_graft_notes_placeholder')}>{patientData.boneGraft?.notes || ''}</div>
                </div>
                <ImplantInventory placements={[...(showFinalInventory ? completedPlacements : plannedPlacements), ...(showFinalInventory ? completedCages : plannedCages).map(c => ({...c, zone: 'mid' as Zone, annotation: '', tool: c.tool, data: c.data as unknown as Placement['data']})), ...(showFinalInventory ? completedConnectors : plannedConnectors).map(c => ({...c, levelId: levels[0]?.id || 'T1', zone: 'mid' as Zone, annotation: '', data: null}))] as Placement[]} tools={[...allTools, {id: 'tlif', labelKey: 'inventory.cage.tlif', icon: 'cage', type: 'cage'}, {id: 'plif', labelKey: 'inventory.cage.plif', icon: 'cage', type: 'cage'}, {id: 'acdf', labelKey: 'inventory.cage.acdf', icon: 'cage', type: 'cage'}, {id: 'xlif', labelKey: 'inventory.cage.xlif', icon: 'cage', type: 'cage'}, {id: 'olif', labelKey: 'inventory.cage.olif', icon: 'cage', type: 'cage'}, {id: 'alif', labelKey: 'inventory.cage.alif', icon: 'cage', type: 'cage'}]} title={showFinalInventory ? t('inventory.title_construct') : t('inventory.title_plan')} visibleLevelIds={levels.map(l => l.id)} levels={levels} rods={showFinalInventory ? { left: patientData.leftRod, right: patientData.rightRod } : { left: patientData.planLeftRod, right: patientData.planRightRod }} company={patientData.company} screwSystem={patientData.screwSystem} />
                <button onClick={() => setShowFinalInventory(!showFinalInventory)} className="mt-1 w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">{showFinalInventory ? t('inventory.view_plan') : t('inventory.view_final')}</button>
            </div>
            <CreditsFooter lang={currentLang} />
        </React.Fragment>
    );
};
