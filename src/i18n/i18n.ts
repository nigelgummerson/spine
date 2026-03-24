import TRANSLATIONS from './translations.json';
import SUPPORTED_LANGUAGES from './languages.json';

export { SUPPORTED_LANGUAGES };

type TranslationDict = Record<string, string>;
type TranslationsMap = Record<string, TranslationDict>;

const TRANS = TRANSLATIONS as TranslationsMap;

export const LOCALE_MAP: Record<string, string> = {
    ar: 'ar-SA', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
    pt: 'pt-PT', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL',
    tr: 'tr-TR', nb: 'nb-NO', da: 'da-DK', sv: 'sv-SE',
    el: 'el-GR', fi: 'fi-FI', he: 'he-IL', hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU', uk: 'uk-UA',
    'zh-Hans': 'zh-CN',
    'en-YK': 'en-GB',
};

export const LANG_ALIASES: Record<string, string> = {
    no: 'nb', nn: 'nb', ua: 'uk',
    zh: 'zh-Hans', 'zh-CN': 'zh-Hans', 'zh-SG': 'zh-Hans',
};

export const detectLanguage = (): string => {
    const stored = localStorage.getItem('spine_planner_lang');
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored;

    const nav = (navigator.language || 'en').toLowerCase();

    // Check for script subtag matches first (e.g. zh-Hans, zh-Hant)
    // navigator.language can be 'zh-Hans-CN', 'zh-Hans', 'zh-CN', etc.
    for (const lang of SUPPORTED_LANGUAGES) {
        if (lang.code.includes('-') && nav.startsWith(lang.code.toLowerCase())) return lang.code;
    }

    // Fall back to two-letter code
    const short = nav.split('-')[0];
    const mapped = LANG_ALIASES[nav] || LANG_ALIASES[short] || short;
    if (SUPPORTED_LANGUAGES.some(l => l.code === mapped)) return mapped;
    return 'en';
};

let _currentLang: string = detectLanguage();

export const getCurrentLang = (): string => _currentLang;
export const setCurrentLang = (code: string): void => { _currentLang = code; };

export const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = TRANS[_currentLang] ?? TRANS.en;
    let str = dict[key] ?? TRANS.en[key] ?? key;
    if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
    }
    return str;
};
