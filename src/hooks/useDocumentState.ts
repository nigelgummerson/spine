// src/hooks/useDocumentState.ts
import { useReducer, useState, useRef, useEffect, useCallback } from 'react';
import { createInitialState, serializeState, deserializeDocument } from '../state/documentReducer';
import { undoReducer, createInitialUndoState } from '../state/undoReducer';
import { CURRENT_VERSION } from '../data/changelog';
import { acceptDisclaimer } from '../components/modals/DisclaimerModal';
import { validateV4, validateLegacy, ValidationError } from '../state/schema';
import { migrateStoredData } from '../state/migrations';
import { t } from '../i18n/i18n';
import type { DocumentState, DocumentAction } from '../types';

/** Validate sync payload using the same Zod checks as file load */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON boundary: untrusted data from BroadcastChannel
function validateSyncPayload(payload: Record<string, any>): void {
    if (payload?.schema?.version === 4) {
        validateV4(payload);
    } else if (payload?.formatVersion >= 2) {
        validateLegacy(payload);
    } else {
        throw new Error('Unrecognised sync payload format');
    }
}

interface UseDocumentStateParams {
    viewMode: string;
    colourScheme: string;
    changeTheme: (scheme: string) => void;
    changeLang: (lang: string) => void;
    incognitoMode: boolean;
    currentLang: string;
    setViewMode: (mode: string) => void;
    showToast?: (message: string, level?: string) => void;
    showPelvis: boolean;
    useRegionDefaults: boolean;
    confirmAndNext: boolean;
    setShowPelvis: (v: boolean) => void;
    setUseRegionDefaults: (v: boolean) => void;
    setConfirmAndNext: (v: boolean) => void;
}

interface UseDocumentStateReturn {
    state: DocumentState;
    dispatch: React.Dispatch<DocumentAction>;
    serialize: () => ReturnType<typeof serializeState>;
    syncChannelRef: React.MutableRefObject<BroadcastChannel | null>;
    syncConnected: boolean;
    hasLoaded: boolean;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
}

export function useDocumentState({ viewMode, colourScheme, changeTheme, changeLang, incognitoMode, currentLang, setViewMode, showToast, showPelvis, useRegionDefaults, confirmAndNext, setShowPelvis, setUseRegionDefaults, setConfirmAndNext }: UseDocumentStateParams): UseDocumentStateReturn {
    const [undoState, dispatch] = useReducer(undoReducer, undefined, createInitialUndoState);
    const state = undoState.present;
    const canUndo = undoState.past.length > 0;
    const canRedo = undoState.future.length > 0;
    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [syncConnected, setSyncConnected] = useState(false);

    const syncChannelRef = useRef<BroadcastChannel | null>(null);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPongRef = useRef(0);
    const syncVersionRef = useRef(0);
    const syncVersionMismatchRef = useRef(false);
    // Sync bounce prevention: two guards working together.
    // 1. lastSyncReceiveRef: suppress outgoing broadcasts for 500ms after receiving
    // 2. localChangeRef: suppress incoming sync while local changes are pending render
    const lastSyncReceiveRef = useRef(0);
    const localChangePendingRef = useRef(false);
    // When true, suppress localStorage persist for current state (peer is in incognito)
    const peerIncognitoRef = useRef(false);

    // Stable refs for values needed in sync callbacks
    const stateRef = useRef(state);
    stateRef.current = state;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const colourSchemeRef = useRef(colourScheme);
    colourSchemeRef.current = colourScheme;
    const currentLangRef = useRef(currentLang);
    currentLangRef.current = currentLang;
    const changeLangRef = useRef(changeLang);
    changeLangRef.current = changeLang;
    const showPelvisRef = useRef(showPelvis);
    showPelvisRef.current = showPelvis;
    const useRegionDefaultsRef = useRef(useRegionDefaults);
    useRegionDefaultsRef.current = useRegionDefaults;
    const confirmAndNextRef = useRef(confirmAndNext);
    confirmAndNextRef.current = confirmAndNext;
    const setShowPelvisRef = useRef(setShowPelvis);
    setShowPelvisRef.current = setShowPelvis;
    const setUseRegionDefaultsRef = useRef(setUseRegionDefaults);
    setUseRegionDefaultsRef.current = setUseRegionDefaults;
    const setConfirmAndNextRef = useRef(setConfirmAndNext);
    setConfirmAndNextRef.current = setConfirmAndNext;
    const incognitoRef = useRef(incognitoMode);
    incognitoRef.current = incognitoMode;

    const serialize = useCallback(() => {
        return serializeState(stateRef.current, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current, {
            showPelvis: showPelvisRef.current, useRegionDefaults: useRegionDefaultsRef.current, confirmAndNext: confirmAndNextRef.current,
        });
    }, []);

    // AUTO-LOAD from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('spine_planner_v2');
        if (saved) {
            try {
                const parsed = migrateStoredData(JSON.parse(saved));
                if (parsed.schema?.version === 4) {
                    validateV4(parsed);
                    const result = deserializeDocument(parsed);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                    // Stale data warning — check document.modified timestamp
                    const modified = parsed.document?.modified;
                    if (modified && !incognitoMode) {
                        const ageMs = Date.now() - new Date(modified).getTime();
                        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
                        if (ageDays >= 7) {
                            showToast?.(t('alert.stale_data', { days: ageDays }), 'warn');
                        }
                    }
                } else if (parsed.formatVersion >= 2) {
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
                localStorage.setItem('spine_planner_v2', JSON.stringify(
                    serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang, {
                        showPelvis, useRegionDefaults, confirmAndNext,
                    })
                ));
            } catch (e) {
                // QuotaExceededError on locked-down hospital machines — data still in memory
                console.warn('localStorage save failed:', e);
            }
        }
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');

        // Broadcast to other windows (skip if recently received a sync — guard window prevents bounce)
        const sinceSyncReceive = Date.now() - lastSyncReceiveRef.current;
        if (sinceSyncReceive < 500) {
            // State changed from an incoming sync — don't echo back, but clear the pending flag
            localChangePendingRef.current = false;
            return;
        }
        // Local change — mark as authoritative until broadcast completes
        if (hasLoaded) localChangePendingRef.current = true;
        peerIncognitoRef.current = false;
        if (hasLoaded && syncChannelRef.current) {
            syncVersionRef.current++;
            clearTimeout(syncTimerRef.current!);
            syncTimerRef.current = setTimeout(() => {
                if (syncChannelRef.current) {
                    syncChannelRef.current.postMessage({
                        type: 'state', appVersion: CURRENT_VERSION,
                        payload: serializeState(stateRef.current, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current, {
                            showPelvis: showPelvisRef.current, useRegionDefaults: useRegionDefaultsRef.current, confirmAndNext: confirmAndNextRef.current,
                        }),
                        version: syncVersionRef.current,
                        incognito: incognitoRef.current,
                    });
                    localChangePendingRef.current = false;
                }
            }, 200);
        }
    }, [state, viewMode, colourScheme, hasLoaded, incognitoMode, showPelvis, useRegionDefaults, confirmAndNext]);

    const applyPrefs = (prefs?: { showPelvis?: boolean; useRegionDefaults?: boolean; confirmAndNext?: boolean }) => {
        if (!prefs) return;
        if (prefs.showPelvis !== undefined && prefs.showPelvis !== showPelvisRef.current) {
            setShowPelvisRef.current(prefs.showPelvis);
            localStorage.setItem('spine_planner_pelvis', String(prefs.showPelvis));
        }
        if (prefs.useRegionDefaults !== undefined && prefs.useRegionDefaults !== useRegionDefaultsRef.current) {
            setUseRegionDefaultsRef.current(prefs.useRegionDefaults);
            localStorage.setItem('spine_planner_region_defaults', String(prefs.useRegionDefaults));
        }
        if (prefs.confirmAndNext !== undefined && prefs.confirmAndNext !== confirmAndNextRef.current) {
            setConfirmAndNextRef.current(prefs.confirmAndNext);
            localStorage.setItem('spine_planner_confirm_next_default', String(prefs.confirmAndNext));
        }
    };

    // BROADCAST CHANNEL SYNC
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch = new BroadcastChannel('spine-planner-sync');
        syncChannelRef.current = ch;

        ch.onmessage = (e: MessageEvent) => {
            const msg = e.data;
            if (!msg.appVersion) return;
            if (msg.appVersion !== CURRENT_VERSION) {
                if (!syncVersionMismatchRef.current) {
                    syncVersionMismatchRef.current = true;
                    showToast?.(`Another window is running ${msg.appVersion} — please reload all windows to sync.`, 'error');
                }
                return;
            }
            if (msg.type === 'ping') {
                ch.postMessage({ type: 'pong', appVersion: CURRENT_VERSION, payload: serialize(), incognito: incognitoRef.current });
            } else if (msg.type === 'pong') {
                lastPongRef.current = Date.now();
                setSyncConnected(true);
                if (msg.payload) {
                    try {
                        validateSyncPayload(msg.payload);
                        clearTimeout(syncTimerRef.current!);
                        lastSyncReceiveRef.current = Date.now();
                        if (msg.incognito) peerIncognitoRef.current = true;
                        const result = deserializeDocument(msg.payload);
                        dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                        if (result.viewMode) setViewMode(result.viewMode);
                        if (result.colourScheme) changeTheme(result.colourScheme);
                        applyPrefs(result.preferences);
                    } catch (e) {
                        console.warn('Sync pong data failed validation — ignoring:', e);
                    }
                }
            } else if (msg.type === 'state') {
                if (msg.payload) {
                    // Reject incoming sync if we have local changes pending broadcast
                    if (localChangePendingRef.current) return;
                    try {
                        validateSyncPayload(msg.payload);
                        clearTimeout(syncTimerRef.current!);
                        lastSyncReceiveRef.current = Date.now();
                        if (msg.incognito) peerIncognitoRef.current = true;
                        const result = deserializeDocument(msg.payload);
                        dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                        if (result.viewMode) setViewMode(result.viewMode);
                        if (result.colourScheme) changeTheme(result.colourScheme);
                        applyPrefs(result.preferences);
                    } catch (e) {
                        console.warn('Sync state data failed validation — ignoring:', e);
                    }
                }
            } else if (msg.type === 'lang_accepted') {
                if (msg.lang) {
                    acceptDisclaimer(msg.lang);
                    changeLangRef.current(msg.lang);
                }
            }
        };

        ch.postMessage({ type: 'ping', appVersion: CURRENT_VERSION });

        const heartbeat = setInterval(() => {
            ch.postMessage({ type: 'ping', appVersion: CURRENT_VERSION });
            if (lastPongRef.current > 0 && Date.now() - lastPongRef.current > 10000) {
                setSyncConnected(false);
                lastPongRef.current = 0;
            }
        }, 5000);

        const handleUnload = () => ch.postMessage({ type: 'bye' });
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleUnload);
            ch.postMessage({ type: 'bye' });
            ch.close();
            syncChannelRef.current = null;
        };
    }, [hasLoaded]);

    return { state, dispatch, serialize, syncChannelRef, syncConnected, hasLoaded, canUndo, canRedo, undo, redo };
}
