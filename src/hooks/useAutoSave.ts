// src/hooks/useAutoSave.ts
// localStorage persistence: load on mount, save on change, incognito handling.

import { useState, useEffect, useRef } from 'react';
import { serializeState, deserializeDocument } from '../state/documentReducer';
import { validateV4, validateLegacy, ValidationError } from '../state/schema';
import { migrateStoredData } from '../state/migrations';
import { CURRENT_VERSION } from '../data/changelog';
import { t } from '../i18n/i18n';
import type { DocumentState, DocumentAction } from '../types';

const STORAGE_KEY = 'spine_planner_v2';

interface UseAutoSaveParams {
    state: DocumentState;
    dispatch: React.Dispatch<DocumentAction>;
    viewMode: string;
    colourScheme: string;
    currentLang: string;
    incognitoMode: boolean;
    showPelvis: boolean;
    useRegionDefaults: boolean;
    confirmAndNext: boolean;
    peerIncognitoRef: React.MutableRefObject<boolean>;
    changeTheme: (scheme: string) => void;
    setViewMode: (mode: string) => void;
    showToast?: (message: string, level?: string) => void;
}

interface UseAutoSaveReturn {
    hasLoaded: boolean;
}

export function useAutoSave({
    state, dispatch, viewMode, colourScheme, currentLang, incognitoMode,
    showPelvis, useRegionDefaults, confirmAndNext, peerIncognitoRef,
    changeTheme, setViewMode, showToast,
}: UseAutoSaveParams): UseAutoSaveReturn {
    const [hasLoaded, setHasLoaded] = useState(false);
    const incognitoRef = useRef(incognitoMode);
    incognitoRef.current = incognitoMode;

    // AUTO-LOAD from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = migrateStoredData(JSON.parse(saved)) as Record<string, unknown>;
                const schema = parsed.schema as Record<string, unknown> | undefined;
                const doc = parsed.document as Record<string, unknown> | undefined;
                if (schema?.version === 4) {
                    validateV4(parsed);
                    const result = deserializeDocument(parsed as Record<string, unknown>);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                    // Stale data warning — check document.modified timestamp
                    const modified = doc?.modified;
                    if (typeof modified === 'string' && !incognitoRef.current) {
                        const ageMs = Date.now() - new Date(modified).getTime();
                        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
                        if (ageDays >= 7) {
                            showToast?.(t('alert.stale_data', { days: ageDays }), 'warn');
                        }
                    }
                } else if (typeof parsed.formatVersion === 'number' && parsed.formatVersion >= 2) {
                    validateLegacy(parsed);
                    const result = deserializeDocument(parsed);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } catch (e) {
                if (e instanceof ValidationError) {
                    console.error('Cached data failed validation — starting fresh:', e.issues);
                } else {
                    console.error('Data load error');
                }
            }
        }
        setHasLoaded(true);
    }, []);

    // AUTO-SAVE to localStorage when state changes
    useEffect(() => {
        if (hasLoaded && !incognitoMode && !peerIncognitoRef.current) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(
                    serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang, {
                        showPelvis, useRegionDefaults, confirmAndNext,
                    })
                ));
            } catch (e) {
                // QuotaExceededError on locked-down hospital machines — data still in memory
                console.warn('localStorage save failed:', e);
            }
        }
        if (incognitoMode) localStorage.removeItem(STORAGE_KEY);
    }, [state, viewMode, colourScheme, hasLoaded, incognitoMode, showPelvis, useRegionDefaults, confirmAndNext]);

    return { hasLoaded };
}
