import TRANSLATIONS from './translations.json';
import SUPPORTED_LANGUAGES from './languages.json';

export { SUPPORTED_LANGUAGES };

export const LOCALE_MAP = {
    en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
    pt: 'pt-PT', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL',
    tr: 'tr-TR', nb: 'nb-NO', da: 'da-DK', sv: 'sv-SE',
    el: 'el-GR', fi: 'fi-FI', ru: 'ru-RU', uk: 'uk-UA',
};

export const LANG_ALIASES = { no: 'nb', nn: 'nb', ua: 'uk' };

export const detectLanguage = () => {
    const stored = localStorage.getItem('spine_planner_lang');
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored;
    const nav = (navigator.language || 'en').split('-')[0].toLowerCase();
    const mapped = LANG_ALIASES[nav] || nav;
    if (SUPPORTED_LANGUAGES.some(l => l.code === mapped)) return mapped;
    return 'en';
};

let _currentLang = detectLanguage();

export const getCurrentLang = () => _currentLang;
export const setCurrentLang = (code) => { _currentLang = code; };

export const t = (key, replacements) => {
    const dict = TRANSLATIONS[_currentLang] ?? TRANSLATIONS.en;
    let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
    }
    return str;
};
