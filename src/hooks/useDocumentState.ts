// src/hooks/useDocumentState.ts
import { useReducer, useState, useRef, useEffect, useCallback } from 'react';
import { documentReducer, createInitialState, serializeState, deserializeDocument } from '../state/documentReducer';
import { CURRENT_VERSION } from '../data/changelog';
import { acceptDisclaimer } from '../components/modals/DisclaimerModal';
import { validateV4, validateLegacy, ValidationError } from '../state/schema';
import { migrateStoredData } from '../state/migrations';
import type { DocumentState, DocumentAction } from '../types';

interface UseDocumentStateParams {
    viewMode: string;
    colourScheme: string;
    changeTheme: (scheme: string) => void;
    changeLang: (lang: string) => void;
    incognitoMode: boolean;
    currentLang: string;
    setViewMode: (mode: string) => void;
    showToast?: (message: string, level?: string) => void;
}

interface UseDocumentStateReturn {
    state: DocumentState;
    dispatch: React.Dispatch<DocumentAction>;
    serialize: () => any;
    syncChannelRef: React.MutableRefObject<BroadcastChannel | null>;
    syncConnected: boolean;
    hasLoaded: boolean;
}

export function useDocumentState({ viewMode, colourScheme, changeTheme, changeLang, incognitoMode, currentLang, setViewMode, showToast }: UseDocumentStateParams): UseDocumentStateReturn {
    const [state, dispatch] = useReducer(documentReducer, undefined, createInitialState);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [syncConnected, setSyncConnected] = useState(false);

    const syncChannelRef = useRef<BroadcastChannel | null>(null);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPongRef = useRef(0);
    const syncVersionRef = useRef(0);
    const syncVersionMismatchRef = useRef(false);
    // Sync bounce prevention: track when we last received a sync update.
    // Suppress outgoing broadcasts for a guard window after receiving.
    const lastSyncReceiveRef = useRef(0);

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

    const serialize = useCallback(() => {
        return serializeState(stateRef.current, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current);
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
        if (hasLoaded && !incognitoMode) {
            localStorage.setItem('spine_planner_v2', JSON.stringify(
                serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang)
            ));
        }
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');

        // Broadcast to other windows (skip if recently received a sync — guard window prevents bounce)
        const sinceSyncReceive = Date.now() - lastSyncReceiveRef.current;
        if (sinceSyncReceive < 500) return;
        if (hasLoaded && syncChannelRef.current) {
            syncVersionRef.current++;
            clearTimeout(syncTimerRef.current!);
            syncTimerRef.current = setTimeout(() => {
                if (syncChannelRef.current) {
                    syncChannelRef.current.postMessage({
                        type: 'state', appVersion: CURRENT_VERSION,
                        payload: serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang),
                        version: syncVersionRef.current,
                    });
                }
            }, 200);
        }
    }, [state, viewMode, colourScheme, hasLoaded, incognitoMode]);

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
                ch.postMessage({ type: 'pong', appVersion: CURRENT_VERSION, payload: serialize() });
            } else if (msg.type === 'pong') {
                lastPongRef.current = Date.now();
                setSyncConnected(true);
                if (msg.payload) {
                    clearTimeout(syncTimerRef.current!);
                    lastSyncReceiveRef.current = Date.now();
                    const result = deserializeDocument(msg.payload);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } else if (msg.type === 'state') {
                if (msg.payload) {
                    clearTimeout(syncTimerRef.current!);
                    lastSyncReceiveRef.current = Date.now();
                    const result = deserializeDocument(msg.payload);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
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

    return { state, dispatch, serialize, syncChannelRef, syncConnected, hasLoaded };
}
