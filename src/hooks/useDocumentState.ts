// src/hooks/useDocumentState.ts
// Composes undo/redo, auto-save, and broadcast sync into a single public API.
// The public interface (UseDocumentStateReturn) is consumed by App.tsx and must remain stable.

import { useReducer, useRef, useEffect, useCallback } from 'react';
import { serializeState, createInitialState } from '../state/documentReducer';
import { undoReducer, createInitialUndoState } from '../state/undoReducer';
import { CURRENT_VERSION } from '../data/changelog';
import { useAutoSave } from './useAutoSave';
import { useBroadcastSync } from './useBroadcastSync';
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
    // --- Undo/redo ---
    const [undoState, dispatch] = useReducer(undoReducer, undefined, createInitialUndoState);
    const state = undoState.present;
    const canUndo = undoState.past.length > 0;
    const canRedo = undoState.future.length > 0;
    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

    // Stable refs for serialize callback
    const stateRef = useRef(state);
    stateRef.current = state;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const colourSchemeRef = useRef(colourScheme);
    colourSchemeRef.current = colourScheme;
    const currentLangRef = useRef(currentLang);
    currentLangRef.current = currentLang;
    const showPelvisRef = useRef(showPelvis);
    showPelvisRef.current = showPelvis;
    const useRegionDefaultsRef = useRef(useRegionDefaults);
    useRegionDefaultsRef.current = useRegionDefaults;
    const confirmAndNextRef = useRef(confirmAndNext);
    confirmAndNextRef.current = confirmAndNext;

    const serialize = useCallback(() => {
        return serializeState(stateRef.current, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current, {
            showPelvis: showPelvisRef.current, useRegionDefaults: useRegionDefaultsRef.current, confirmAndNext: confirmAndNextRef.current,
        });
    }, []);

    // --- Auto-save (localStorage) — runs first to provide hasLoaded ---
    // peerIncognitoRef is created here and shared with broadcast sync
    const peerIncognitoRef = useRef(false);

    const { hasLoaded } = useAutoSave({
        state, dispatch, viewMode, colourScheme, currentLang, incognitoMode,
        showPelvis, useRegionDefaults, confirmAndNext, peerIncognitoRef,
        changeTheme, setViewMode, showToast,
    });

    // --- Broadcast sync ---
    const { syncChannelRef, syncConnected, broadcastState, lastSyncReceiveRef, localChangePendingRef } = useBroadcastSync({
        state, dispatch, hasLoaded,
        viewMode, colourScheme, currentLang, incognitoMode,
        showPelvis, useRegionDefaults, confirmAndNext,
        changeTheme, changeLang, setViewMode, showToast,
        setShowPelvis, setUseRegionDefaults, setConfirmAndNext,
        peerIncognitoRef,
    });

    // --- Bridge: broadcast state changes to peers ---
    // This effect replaces the broadcast portion that was previously combined with auto-save.
    useEffect(() => {
        // Suppress echo: if state changed from an incoming sync, don't broadcast back
        const sinceSyncReceive = Date.now() - lastSyncReceiveRef.current;
        if (sinceSyncReceive < 500) {
            localChangePendingRef.current = false;
            return;
        }
        // Local change — mark as authoritative until broadcast completes
        if (hasLoaded) localChangePendingRef.current = true;
        peerIncognitoRef.current = false;
        if (hasLoaded) {
            broadcastState();
        }
    }, [state, viewMode, colourScheme, hasLoaded, incognitoMode, showPelvis, useRegionDefaults, confirmAndNext]);

    // Wrapped dispatch: intercepts NEW_PATIENT to broadcast immediately (CS3)
    const wrappedDispatch = useCallback((action: DocumentAction) => {
        dispatch(action);
        if (action.type === 'NEW_PATIENT' && syncChannelRef.current) {
            const freshState = createInitialState();
            const freshPayload = serializeState(freshState, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current, {
                showPelvis: showPelvisRef.current, useRegionDefaults: useRegionDefaultsRef.current, confirmAndNext: confirmAndNextRef.current,
            });
            syncChannelRef.current.postMessage({ type: 'state', appVersion: CURRENT_VERSION, payload: freshPayload, version: Date.now(), incognito: incognitoMode });
        }
    }, [incognitoMode, syncChannelRef]);

    return { state, dispatch: wrappedDispatch, serialize, syncChannelRef, syncConnected, hasLoaded, canUndo, canRedo, undo, redo };
}
