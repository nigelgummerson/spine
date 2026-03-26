import React, { useState } from 'react';
import { t } from '../i18n/i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/i18n';
import { CURRENT_VERSION } from '../data/changelog';
import { COLOUR_SCHEMES } from '../data/themes';
import { IconTrash, IconImage, IconCopy, IconUpload, IconSave, IconPDF, IconHelp, IconLink, IconGear } from './icons';
import { InstrumentIcon } from './chart/InstrumentIcon';
import type { ColourScheme, ToolDefinition } from '../types';

const PORTRAIT_TABS = ['portrait.tab.demographics', 'portrait.tab.plan', 'portrait.tab.construct', 'portrait.tab.inventory'];

export interface PortraitToolbarProps {
    scheme: ColourScheme;
    colourScheme: string;
    changeTheme: (id: string) => void;
    currentLang: string;
    changeLang: (code: string) => void;
    selectedTool: string;
    setSelectedTool: (tool: string) => void;
    viewMode: string;
    setViewMode: (mode: string) => void;
    showPelvis: boolean;
    togglePelvis: () => void;
    incognitoMode: boolean;
    setIncognitoMode: (v: boolean) => void;
    syncConnected: boolean;
    isViewOnly: boolean;
    tools: { categoryKey: string; items: ToolDefinition[] }[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    loadProjectJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
    saveProjectJSON: () => void;
    promptExportJPG: () => void;
    promptExportPDF: () => void;
    copyPlanToCompleted: () => void;
    onConfirmClearConstruct: () => void;
    newPatientAction: () => void;
    onOpenPreferences: () => void;
    onOpenHelp: () => void;
    onOpenChangelog: () => void;
    portraitTab: number;
    switchPortraitTab: (tab: number) => void;
    isLocked: boolean;
    onFinishCase: () => void;
    onUnlockRecord: () => void;
}

export const PortraitToolbar = ({
    scheme, colourScheme, changeTheme, currentLang, changeLang,
    selectedTool, setSelectedTool, viewMode, setViewMode,
    showPelvis, togglePelvis, incognitoMode, setIncognitoMode,
    syncConnected, isViewOnly, tools,
    fileInputRef, loadProjectJSON, saveProjectJSON,
    promptExportJPG, promptExportPDF, copyPlanToCompleted, onConfirmClearConstruct,
    newPatientAction, onOpenPreferences, onOpenHelp, onOpenChangelog,
    portraitTab, switchPortraitTab,
    isLocked, onFinishCase, onUnlockRecord,
}: PortraitToolbarProps) => {
    const [themeOpen, setThemeOpen] = useState(false);

    const themeDropdown = (
        <div className="relative">
            <button onClick={() => setThemeOpen(!themeOpen)} className="flex items-center gap-0.5 p-1 rounded hover:bg-white/10">
                {[scheme.sidebarBg, '#FFFFFF', scheme.activeBg, scheme.activeText].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: c, borderColor: scheme.sidebarBorder }}></div>
                ))}
            </button>
            {themeOpen && (
                <div className="absolute end-0 top-full mt-1 rounded-lg shadow-xl border p-1.5 z-50" style={{ backgroundColor: scheme.sidebarTitleBg, borderColor: scheme.sidebarBorder }}>
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
    );

    return (
        <React.Fragment>
            {/* Portrait Toolbar */}
            <div className="portrait-toolbar flex flex-col z-20 no-print shadow-xl shrink-0" style={{ backgroundColor: scheme.sidebarBg, color: scheme.textPrimary }}>
                {/* Row 1: Title, Theme, Language, Action icons */}
                <div className="flex items-center gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                    <span className="font-bold text-sm tracking-tight shrink-0">{t('sidebar.title')}</span>
                    <button onClick={onOpenChangelog} className="text-[9px] font-mono opacity-50 shrink-0">{CURRENT_VERSION}</button>
                    <div className="flex-1"></div>
                    {themeDropdown}
                    <select value={currentLang} onChange={e => changeLang(e.target.value)}
                        className="bg-transparent text-[10px] border-none outline-none cursor-pointer w-14" style={{ color: scheme.textSecondary }}>
                        {SUPPORTED_LANGUAGES.filter(l => !l.hidden || l.code === currentLang).map(l => (
                            <option key={l.code} value={l.code} style={{color: '#1e293b'}}>{l.code.toUpperCase()}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-0">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.load')}><IconUpload /></button>
                        <button onClick={saveProjectJSON} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.save')}><IconSave /></button>
                        <button onClick={promptExportJPG} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.jpg')}><IconImage /></button>
                        <button onClick={promptExportPDF} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.pdf')}><IconPDF /></button>
                        <button onClick={onOpenPreferences} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.preferences')}><IconGear /></button>
                        <button onClick={onOpenHelp} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.help')}><IconHelp /></button>
                        <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }} className="p-2 rounded hover:bg-white/10 hover:brightness-125" title="Fullscreen"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
                        <div className="p-2 rounded flex items-center" style={{ color: syncConnected ? '#34d399' : scheme.textMuted }} title={syncConnected ? t('sync.linked') : t('sync.no_peer')}><IconLink />{syncConnected && <span className="inline-block ms-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>}</div>
                    </div>
                </div>

                {/* Row 2: Editing tools (tablet+) or view-only banner (phone) */}
                {isViewOnly ? (
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <div className="flex-1 text-[10px] italic" style={{ color: scheme.textMuted }}>{t('portrait.view_only')}</div>
                        <div className="flex gap-0.5 shrink-0">
                            {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                                const shortLabels: Record<string, string> = { cervical: 'C', thoracolumbar: 'T', t10_pelvis: 'L', whole: t('sidebar.view.whole_short') };
                                const active = viewMode === vm;
                                return <button key={vm} onClick={() => setViewMode(vm)} title={t('sidebar.view.' + vm)} className={`px-3 py-2 text-[10px] rounded border font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{shortLabels[vm]}</button>;
                            })}
                            {viewMode !== 'cervical' && <button onClick={togglePelvis} title={showPelvis ? t('sidebar.hide_pelvis') : t('sidebar.show_pelvis')} className={`px-2 py-2 text-[10px] rounded border font-bold ${showPelvis ? '' : 'hover:brightness-125'}`} style={showPelvis ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{showPelvis ? t('sidebar.hide_pelvis') : t('sidebar.show_pelvis')}</button>}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <div className="flex gap-0.5 overflow-x-auto flex-1 min-w-0">
                            {tools[0].items.map(item => {
                                const active = selectedTool === item.id;
                                return <button key={item.id} onClick={() => setSelectedTool(item.id)} title={t(item.labelKey)} className={`shrink-0 px-2.5 py-2 rounded border flex items-center gap-1 text-[10px] font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                                    <InstrumentIcon type={item.icon} className="w-3 h-3" color={active ? scheme.activeText : scheme.textSecondary} />
                                </button>;
                            })}
                        </div>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <div className="flex gap-0.5 shrink-0">
                            {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                                const shortLabels: Record<string, string> = { cervical: 'C', thoracolumbar: 'T', t10_pelvis: 'L', whole: t('sidebar.view.whole_short') };
                                const active = viewMode === vm;
                                return <button key={vm} onClick={() => setViewMode(vm)} title={t('sidebar.view.' + vm)} className={`px-3 py-2 text-[10px] rounded border font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{shortLabels[vm]}</button>;
                            })}
                            {viewMode !== 'cervical' && <button onClick={togglePelvis} title={showPelvis ? t('sidebar.hide_pelvis') : t('sidebar.show_pelvis')} className={`px-2 py-2 text-[10px] rounded border font-bold ${showPelvis ? '' : 'hover:brightness-125'}`} style={showPelvis ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{showPelvis ? t('sidebar.hide_pelvis') : t('sidebar.show_pelvis')}</button>}
                        </div>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => { copyPlanToCompleted(); switchPortraitTab(2); }} className="flex items-center gap-1 px-2.5 py-2 rounded text-[10px] font-bold hover:bg-white/10 hover:brightness-125 shrink-0 border" style={{ borderColor: 'rgba(255,255,255,0.2)' }} title={t('sidebar.confirm_plan_tooltip')}><IconCopy /> {t('sidebar.confirm_all')}</button>
                        <button onClick={onConfirmClearConstruct} className="flex items-center gap-1 px-2.5 py-2 rounded text-[10px] font-bold hover:bg-white/10 hover:brightness-125 shrink-0 border" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#dc2626' }} title={t('sidebar.clear_construct')}><IconTrash /> {t('sidebar.clear_construct')}</button>
                        {isLocked ? (
                            <button onClick={onUnlockRecord} className="flex items-center gap-1 px-2.5 py-2 rounded text-[10px] font-bold shrink-0 border hover:brightness-125" style={{ backgroundColor: '#d97706', borderColor: '#b45309', color: '#fff' }}>{t('sidebar.unlock_record')}</button>
                        ) : (
                            <button onClick={onFinishCase} className="flex items-center gap-1 px-2.5 py-2 rounded text-[10px] font-bold shrink-0 border hover:brightness-125" style={{ backgroundColor: '#0d9488', borderColor: '#0f766e', color: '#fff' }}>{t('sidebar.finish_case')}</button>
                        )}
                        <div className={`shrink-0 w-5 h-5 rounded-full cursor-pointer ${incognitoMode ? 'bg-red-500' : 'bg-white/20'}`} onClick={() => setIncognitoMode(!incognitoMode)} title={t('sidebar.session_privacy')}></div>
                        <button onClick={newPatientAction} className="p-2.5 rounded shrink-0" style={{ color: '#dc2626' }} title={t('sidebar.new_patient')}><IconTrash /></button>
                    </div>
                )}
            </div>

            {/* Portrait Tab Bar */}
            <div className="portrait-tabs flex shrink-0 z-10" style={{ backgroundColor: scheme.sidebarTitleBg, color: scheme.titleText }}>
                {PORTRAIT_TABS.map((tabKey, i) => {
                    const active = portraitTab === i;
                    return (
                        <button key={tabKey} onClick={() => switchPortraitTab(i)}
                            className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${active ? '' : 'opacity-60 hover:opacity-80 border-transparent'}`}
                            style={active ? { color: scheme.activeText, backgroundColor: scheme.activeBg, borderColor: scheme.activeText } : undefined}>
                            {t(tabKey)}
                        </button>
                    );
                })}
            </div>
        </React.Fragment>
    );
};
