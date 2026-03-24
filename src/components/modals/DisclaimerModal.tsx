import React from 'react';
import { t, SUPPORTED_LANGUAGES } from '../../i18n/i18n';
import { Portal } from '../Portal';

const SESSION_KEY = 'spine_disclaimer_accepted';

export function isDisclaimerAccepted(lang: string): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'accepted'
        && sessionStorage.getItem(SESSION_KEY + '_lang') === lang;
}

export function getDisclaimerTimestamp(): string | null {
    return sessionStorage.getItem(SESSION_KEY + '_ts') || null;
}

export function acceptDisclaimer(lang: string): void {
    sessionStorage.setItem(SESSION_KEY, 'accepted');
    sessionStorage.setItem(SESSION_KEY + '_lang', lang);
    sessionStorage.setItem(SESSION_KEY + '_ts', new Date().toISOString().replace('T', ' ').substring(0, 19));
}

export function resetDisclaimer(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY + '_lang');
    sessionStorage.removeItem(SESSION_KEY + '_ts');
}

interface DisclaimerModalProps {
    lang: string;
    onLangChange: (lang: string) => void;
    onAccept: () => void;
}

export const DisclaimerModal = ({ lang, onLangChange, onAccept }: DisclaimerModalProps) => (<Portal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e => e.key === 'Enter' && onAccept()} ref={el => { el?.focus(); }}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                <h2 className="font-bold text-sm">{t('disclaimer.modal_title')}</h2>
                <select
                    value={lang}
                    onChange={e => onLangChange(e.target.value)}
                    className="bg-slate-700 text-white text-xs border-none rounded px-2 py-1 outline-none cursor-pointer"
                >
                    {SUPPORTED_LANGUAGES.filter(l => !(l as any).hidden || l.code === lang).map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                </select>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('disclaimer.modal_body') }} />
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
                <button
                    onClick={onAccept}
                    className="px-5 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold"
                >
                    {t('disclaimer.modal_accept')}
                </button>
            </div>
        </div>
    </div>
</Portal>);
