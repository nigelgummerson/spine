import React from 'react';
import { t } from '../i18n/i18n';
import { CURRENT_VERSION } from '../data/changelog';

interface CreditsFooterProps {
    lang: string;
}

export const CreditsFooter = ({ lang }: CreditsFooterProps) => (
    <div className="mt-auto pt-3 pb-4 border-t border-slate-200 shrink-0">
        <p className="text-xs text-slate-500 leading-tight text-center">
            {t('credits.app_name')}
        </p>
        {/* Statement of origin - not translated */}
        <p className="text-[10px] text-slate-400 leading-tight text-center mt-0.5">
            Designed in Leeds · Yorkshire · England
        </p>
        {lang !== 'en' && (
            <div className="text-[10px] text-amber-600 leading-tight text-center mt-1 italic">
                <div>{t('disclaimer.text')}</div>
                <a href={`https://plan.skeletalsurgery.com/spine/review-forms/${lang}/${lang}-review.html`} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">{t('disclaimer.review')}</a>
            </div>
        )}
    </div>
);

