import React, { useState } from 'react';
import { t } from '../i18n/i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/i18n';
import { CURRENT_VERSION } from '../data/changelog';
import { COLOUR_SCHEMES } from '../data/themes';
import { IconTrash, IconImage, IconCopy, IconUpload, IconSave, IconPDF, IconHelp, IconLink, IconGear } from './icons';
import { InstrumentIcon } from './chart/InstrumentIcon';
import { CreditsFooter } from './CreditsFooter';
import type { ColourScheme, ToolDefinition } from '../types';

export interface SidebarProps {
    scheme: ColourScheme;
    colourScheme: string;
    changeTheme: (id: string) => void;
    currentLang: string;
    changeLang: (code: string) => void;
    selectedTool: string;
    setSelectedTool: (tool: string) => void;
    activeChart: string;
    setActiveChart: (chart: string) => void;
    viewMode: string;
    setViewMode: (mode: string) => void;
    showPelvis: boolean;
    togglePelvis: () => void;
    incognitoMode: boolean;
    setIncognitoMode: (v: boolean) => void;
    syncConnected: boolean;
    tools: { categoryKey: string; items: ToolDefinition[] }[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    loadProjectJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
    saveProjectJSON: () => void;
    promptExportJPG: () => void;
    promptExportPDF: () => void;
    copyPlanToCompleted: () => void;
    clearConstruct: () => void;
    newPatientAction: () => void;
    onOpenPreferences: () => void;
    onOpenHelp: () => void;
    onOpenChangelog: () => void;
    isLocked: boolean;
    onFinishCase: () => void;
    onUnlockRecord: () => void;
}

export const Sidebar = ({
    scheme, colourScheme, changeTheme, currentLang, changeLang,
    selectedTool, setSelectedTool, activeChart, setActiveChart,
    viewMode, setViewMode, showPelvis, togglePelvis,
    incognitoMode, setIncognitoMode, syncConnected,
    tools, fileInputRef, loadProjectJSON, saveProjectJSON,
    promptExportJPG, promptExportPDF, copyPlanToCompleted, clearConstruct,
    newPatientAction, onOpenPreferences, onOpenHelp, onOpenChangelog,
    isLocked, onFinishCase, onUnlockRecord,
}: SidebarProps) => {
    const [themeOpen, setThemeOpen] = useState(false);

    return (
        <aside className="w-[340px] flex flex-col z-20 overflow-y-auto no-print shadow-xl" style={{ backgroundColor: scheme.sidebarBg, borderInlineEnd: `1px solid ${scheme.sidebarBorder}`, color: scheme.textPrimary }}>
            {/* 1. Tool Palette - most used, top position */}
            <div className="p-3 space-y-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                {tools.map((g,i) => (
                    <div key={i}>
                        <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t(g.categoryKey)}</h3>
                        <div className="grid grid-cols-2 gap-1">
                            {g.items.map(item => {
                                const active = selectedTool === item.id;
                                return <button key={item.id} onClick={() => setSelectedTool(item.id)} className={`p-1 h-10 rounded border flex flex-col items-center justify-center gap-0.5 transition-all text-xs ${active ? 'font-bold' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                                    <InstrumentIcon type={item.icon} className="w-3.5 h-3.5" color={active ? scheme.activeText : scheme.textSecondary} />
                                    <span className="text-center text-[10px] leading-tight">{t(item.labelKey)}</span>
                                </button>;
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. Plan/Construct Toggle + Confirm Plan - workflow controls */}
            <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.editing')}</h3>
                <div className="flex rounded p-1 border" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                    <button onClick={() => setActiveChart('planned')} className={`flex-1 px-3 py-1.5 rounded transition-all text-xs ${activeChart==='planned'?'font-bold':'hover:brightness-125'}`} style={activeChart==='planned' ? { backgroundColor: scheme.activeBg, color: scheme.activeText } : undefined}>{t('sidebar.plan')}</button>
                    <button onClick={() => setActiveChart('completed')} className={`flex-1 px-3 py-1.5 rounded transition-all text-xs ${activeChart==='completed'?'font-bold':'hover:brightness-125'}`} style={activeChart==='completed' ? { backgroundColor: scheme.activeBg, color: scheme.activeText } : undefined}>{t('sidebar.construct')}</button>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                    <button onClick={copyPlanToCompleted} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }} title={t('sidebar.confirm_plan_tooltip')}><IconCopy /> {t('sidebar.confirm_all')}</button>
                    <button onClick={clearConstruct} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-600" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }} title={t('sidebar.clear_construct_tooltip')}><IconTrash /> {t('sidebar.clear_construct')}</button>
                </div>
                <div className="mt-2">
                    {isLocked ? (
                        <button onClick={onUnlockRecord} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: '#d97706', borderColor: '#b45309', color: '#fff' }}>{t('sidebar.unlock_record')}</button>
                    ) : (
                        <button onClick={onFinishCase} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: '#0d9488', borderColor: '#0f766e', color: '#fff' }}>{t('sidebar.finish_case')}</button>
                    )}
                </div>
            </div>

            {/* 3. Region View */}
            <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.region_view')}</h3>
                <div className="grid grid-cols-2 gap-1">
                    {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                        const labels: Record<string, string> = { cervical: t('sidebar.view.cervical'), thoracolumbar: t('sidebar.view.thoracolumbar'), t10_pelvis: t('sidebar.view.t10_pelvis'), whole: t('sidebar.view.whole') };
                        const active = viewMode === vm;
                        return <button key={vm} onClick={() => setViewMode(vm)} className={`py-1.5 px-1 text-[10px] rounded border font-bold transition-all ${active ? 'border-transparent' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{labels[vm]}</button>;
                    })}
                </div>
                {viewMode !== 'cervical' && (
                    <button onClick={togglePelvis} className={`mt-1.5 w-full py-1.5 px-1 text-[10px] rounded border font-bold transition-all ${showPelvis ? 'border-transparent' : 'hover:brightness-125'}`} style={showPelvis ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{showPelvis ? t('sidebar.hide_pelvis') : t('sidebar.show_pelvis')}</button>
                )}
            </div>

            {/* 4. File Operations */}
            <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                <input type="file" ref={fileInputRef} onChange={loadProjectJSON} className="hidden" accept=".json" />
                <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconUpload /> {t('sidebar.load')}</button>
                    <button onClick={saveProjectJSON} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconSave /> {t('sidebar.save')}</button>
                    <button onClick={promptExportJPG} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconImage /> {t('sidebar.jpg')}</button>
                    <button onClick={promptExportPDF} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconPDF /> {t('sidebar.pdf')}</button>
                </div>
            </div>

            {/* 5. Session Privacy */}
            <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                <div className={`flex items-center gap-2 px-2 py-2 rounded border cursor-pointer transition-colors ${incognitoMode ? 'bg-red-900/30 border-red-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`} onClick={() => setIncognitoMode(!incognitoMode)}>
                    <div className="relative inline-block w-10 h-5 align-middle select-none shrink-0"><input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300" style={{ top: 0, left: 0 }} checked={incognitoMode} onChange={(e) => setIncognitoMode(e.target.checked)}/><label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer border ${incognitoMode ? 'bg-red-600 border-red-600' : 'bg-slate-600 border-slate-600'}`}></label></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: incognitoMode ? '#dc2626' : scheme.textMuted }}>{t('sidebar.session_privacy')}</span>
                </div>
            </div>

            {/* 6. Theme & Language - preferences, rarely changed */}
            <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => setThemeOpen(!themeOpen)} className="flex items-center gap-1.5 hover:brightness-125 py-1 rounded transition-colors">
                            <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.theme')}</span>
                            <div className="flex gap-0.5">
                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.sidebarBg, borderColor: scheme.sidebarBorder }}></div>
                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#FFFFFF', borderColor: scheme.sidebarBorder }}></div>
                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.activeBg, borderColor: scheme.sidebarBorder }}></div>
                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.activeText, borderColor: scheme.sidebarBorder }}></div>
                            </div>
                        </button>
                        {themeOpen && (
                            <div className="absolute start-0 bottom-full mb-1 rounded-lg shadow-xl border p-1.5 z-50" style={{ backgroundColor: scheme.sidebarTitleBg, borderColor: scheme.sidebarBorder }}>
                                {COLOUR_SCHEMES.map(s => (
                                    <button key={s.id} onClick={() => { changeTheme(s.id); setThemeOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${colourScheme === s.id ? 'ring-1 ring-white/50' : 'hover:bg-white/10'}`}>
                                        <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.sidebarBg }}></div>
                                        <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: '#FFFFFF' }}></div>
                                        <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeBg }}></div>
                                        <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeText }}></div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-bold text-[10px] uppercase tracking-widest shrink-0" style={{ color: scheme.textMuted }}>{t('sidebar.language')}</span>
                        <select value={currentLang} onChange={e => changeLang(e.target.value)}
                            className="flex-1 min-w-0 bg-transparent text-[10px] border-none outline-none cursor-pointer" style={{ color: scheme.textSecondary }}>
                            {SUPPORTED_LANGUAGES.filter(l => !l.hidden || l.code === currentLang).map(l => (
                                <option key={l.code} value={l.code} style={{color: '#1e293b'}}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Spacer to push bottom items down */}
            <div className="flex-1"></div>

            {/* 7. Help + Fullscreen - prominent, bottom */}
            <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${scheme.sidebarBorder}` }}>
                <button onClick={onOpenPreferences} className="flex items-center justify-center hover:brightness-125 px-3 py-2 rounded text-xs font-bold border transition-colors" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconGear /></button>
                <button onClick={onOpenHelp} className="flex-1 flex items-center justify-center gap-2 hover:brightness-125 px-3 py-2 rounded text-xs font-bold border transition-colors" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconHelp /> {t('sidebar.help')}</button>
                <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }} className="flex items-center justify-center px-3 py-2 rounded text-xs font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }} title="Fullscreen"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
            </div>

            {/* 8. Utility row - version, new patient, sync */}
            <div className="px-3 pb-1 flex items-center gap-1">
                <div className="flex items-center justify-center px-1.5 py-1.5 rounded text-[10px]" style={{ color: syncConnected ? '#34d399' : scheme.textMuted }} title={syncConnected ? t('sync.linked') : t('sync.no_peer')}><IconLink />{syncConnected && <span className="ms-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}</div>
                <button onClick={onOpenChangelog} className="flex items-center justify-center px-2 py-1.5 rounded text-[10px] font-mono" style={{ color: scheme.textMuted }}>{CURRENT_VERSION}</button>
                <div className="flex-1"></div>
                <button onClick={newPatientAction} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold" style={{ color: '#dc2626' }}>
                    <IconTrash /> {t('sidebar.new_patient')}
                </button>
            </div>

            <CreditsFooter lang={currentLang} />
        </aside>
    );
};
