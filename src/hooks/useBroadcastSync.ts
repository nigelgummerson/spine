// src/hooks/useBroadcastSync.ts
// BroadcastChannel sync: channel lifecycle, message handling, heartbeat, bounce prevention.

import { useState, useRef, useEffect, useCallback } from 'react';
import { serializeState, deserializeDocument } from '../state/documentReducer';
import { validateV4, validateLegacy } from '../state/schema';
import { CURRENT_VERSION } from '../data/changelog';
import { acceptDisclaimer } from '../components/modals/DisclaimerModal';
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

interface UseBroadcastSyncParams {
    state: DocumentState;
    dispatch: React.Dispatch<DocumentAction>;
    hasLoaded: boolean;
    viewMode: string;
    colourScheme: string;
    currentLang: string;
    incognitoMode: boolean;
    showPelvis: boolean;
    useRegionDefaults: boolean;
    confirmAndNext: boolean;
    changeTheme: (scheme: string) => void;
    changeLang: (lang: string) => void;
    setViewMode: (mode: string) => void;
    showToast?: (message: string, level?: string) => void;
    setShowPelvis: (v: boolean) => void;
    setUseRegionDefaults: (v: boolean) => void;
    setConfirmAndNext: (v: boolean) => void;
    peerIncognitoRef: React.MutableRefObject<boolean>;
}

interface UseBroadcastSyncReturn {
    syncChannelRef: React.MutableRefObject<BroadcastChannel | null>;
    syncConnected: boolean;
    /** Broadcast current state to peers (debounced 200ms). Called by parent when state changes. */
    broadcastState: () => void;
    /** Timestamp of last sync receive — used by parent to suppress echo broadcasts */
    lastSyncReceiveRef: React.MutableRefObject<number>;
    /** True while a local change is pending broadcast — incoming sync is suppressed */
    localChangePendingRef: React.MutableRefObject<boolean>;
}

export function useBroadcastSync({
    state, dispatch, hasLoaded, viewMode, colourScheme, currentLang, incognitoMode,
    showPelvis, useRegionDefaults, confirmAndNext,
    changeTheme, changeLang, setViewMode, showToast,
    setShowPelvis, setUseRegionDefaults, setConfirmAndNext,
    peerIncognitoRef,
}: UseBroadcastSyncParams): UseBroadcastSyncReturn {
    const [syncConnected, setSyncConnected] = useState(false);

    const syncChannelRef = useRef<BroadcastChannel | null>(null);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPongRef = useRef(0);
    const syncVersionRef = useRef(0);
    const syncVersionMismatchRef = useRef(false);
    // Sync bounce prevention: two guards working together.
    // 1. lastSyncReceiveRef: suppress outgoing broadcasts for 500ms after receiving
    // 2. localChangePendingRef: suppress incoming sync while local changes are pending render
    const lastSyncReceiveRef = useRef(0);
    const localChangePendingRef = useRef(false);

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

    const applyPrefs = useCallback((prefs?: { showPelvis?: boolean; useRegionDefaults?: boolean; confirmAndNext?: boolean }) => {
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
    }, []);

    /** Broadcast current state to peers with 200ms debounce */
    const broadcastState = useCallback(() => {
        if (!syncChannelRef.current) return;
        syncVersionRef.current++;
        clearTimeout(syncTimerRef.current!);
        syncTimerRef.current = setTimeout(() => {
            if (syncChannelRef.current) {
                syncChannelRef.current.postMessage({
                    type: 'state', appVersion: CURRENT_VERSION,
                    payload: serialize(),
                    version: syncVersionRef.current,
                    incognito: incognitoRef.current,
                });
                localChangePendingRef.current = false;
            }
        }, 200);
    }, [serialize]);

    // BROADCAST CHANNEL SETUP
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
                    // Allow sync through if incoming state unlocks or re-locks (lock-exempt transition)
                    const incomingLocked = msg.payload?.document?.lockedAt;
                    if (stateRef.current.lockedAt && incomingLocked) {
                        console.warn('Rejecting sync: local record is locked');
                        showToast?.('Sync blocked — record is locked', 'error');
                        return;
                    }
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
                    // Allow sync through if incoming state unlocks or re-locks (lock-exempt transition)
                    const incomingLocked = msg.payload?.document?.lockedAt;
                    if (stateRef.current.lockedAt && incomingLocked) {
                        console.warn('Rejecting sync: local record is locked');
                        showToast?.('Sync blocked — record is locked', 'error');
                        return;
                    }
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
                peerIncognitoRef.current = false;
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

    return { syncChannelRef, syncConnected, broadcastState, lastSyncReceiveRef, localChangePendingRef };
}
