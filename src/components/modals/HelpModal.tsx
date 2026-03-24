import React from 'react';
import { t, SUPPORTED_LANGUAGES } from '../../i18n/i18n';
import { CURRENT_VERSION } from '../../data/changelog';
import { IconX , IconCopy, IconSave, IconCC, IconLink} from '../icons';
import { InstrumentIcon } from '../chart/InstrumentIcon';
import { Portal } from '../Portal';

const IconCage = () => (
    <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
        <rect x="4" y="10" width="24" height="12" rx="3" fill="#0ea5e9" opacity="0.25" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="7" y="13" width="7" height="6" rx="1" fill="#0284c7" opacity="0.9"/>
        <rect x="18" y="13" width="7" height="6" rx="1" fill="#0284c7" opacity="0.9"/>
        <line x1="16" y1="12" x2="16" y2="20" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1"/>
    </svg>
);

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
    if (!isOpen) return null;
    return (<Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onClick={onClose} onKeyDown={e => (e.key === 'Escape' || e.key === 'Enter') && onClose()} ref={el => { el?.focus(); }}>
            <div className="bg-white rounded-lg shadow-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ maxWidth: window.matchMedia('(orientation: landscape)').matches ? '48rem' : '32rem', outline: 'none' }} onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{t('help.title')}</h3>
                    <button onClick={onClose} className="hover:text-slate-300"><IconX /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1" style={{ columns: window.matchMedia('(orientation: landscape)').matches ? 2 : 1, columnGap: '24px' }}>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><div className="w-8 h-4 rounded-full border border-red-500 bg-white relative"><div className="absolute right-0 top-0 w-3.5 h-3.5 bg-red-500 rounded-full"></div></div></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.session_privacy.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.session_privacy.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><InstrumentIcon type="polyaxial" className="w-6 h-6" /></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.screws_hooks.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.screws_hooks.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><IconCage /></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.cages.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.cages.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><InstrumentIcon type="osteotomy" className="w-6 h-6" /></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.osteotomies.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.osteotomies.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><div className="bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold inline-block"><IconCopy /></div></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.copy_plan.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.copy_plan.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1 text-center text-lg">📱</div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.portrait_mode.title')}</h4>
                            <p className="text-slate-600 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: t('help.portrait_mode.body') }} />
                        </div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><IconSave /></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.save_load.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.save_load.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><IconLink /></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.linked_screens.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.linked_screens.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><span className="text-lg">&#x2328;</span></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.shortcuts.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.shortcuts.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><span className="text-lg">&#x2B07;</span></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.offline_use.title')}</h4><p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: t('help.offline_use.body')}} /></div>
                    </div>
                    <div className="flex gap-4" style={{ breakInside: 'avoid' }}>
                        <div className="min-w-[40px] pt-1"><span className="text-lg">&#x2696;</span></div>
                        <div><h4 className="font-bold text-slate-800 text-sm mb-1">{t('help.disclaimer.title')}</h4><p className="text-xs text-slate-600 leading-relaxed">{t('disclaimer.clinical_short')}</p></div>
                    </div>
                    <div className="border-t border-slate-200 pt-4 mt-2" style={{ breakInside: 'avoid', columnSpan: 'all' }}>
                        <p className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-slate-900">{t('credits.app_name')}</span> {CURRENT_VERSION}<br/>
                            {t('credits.developer')} <span className="font-bold">{t('credits.developer_name')}</span><br/>
                            {/* Statement of origin - not translated */}Designed in Leeds · Yorkshire · England
                        </p>
                        <div className="flex items-start gap-1 text-[10px] text-slate-400 leading-tight mt-2">
                            <div className="mt-0.5 shrink-0"><IconCC /></div>
                            <span dangerouslySetInnerHTML={{__html: t('credits.license')}} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2"><a href="https://plan.skeletalsurgery.com/spine/quick-reference.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{t('credits.quick_reference', { count: SUPPORTED_LANGUAGES.length })}</a></p>
                    </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 text-end border-t border-slate-200">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold">{t('button.close')}</button>
                </div>
            </div>
        </div>
    </Portal>);
};
