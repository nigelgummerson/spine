// src/state/undoReducer.ts
// Wraps documentReducer with an undo/redo history stack.
// Session-only — not persisted to localStorage or synced via BroadcastChannel.

import { documentReducer, createInitialState } from './documentReducer';
import type { DocumentState, DocumentAction } from '../types';

const MAX_HISTORY = 20;

export interface UndoState {
    past: DocumentState[];
    present: DocumentState;
    future: DocumentState[];
}

export function createInitialUndoState(): UndoState {
    return { past: [], present: createInitialState(), future: [] };
}

/** Actions that should NOT create undo entries — too granular or non-document */
const NON_UNDOABLE_ACTIONS: Set<string> = new Set([
    'SET_PATIENT_FIELD',
    'SET_RECON_LABEL_POSITION',
    'UPDATE_NOTE_POSITION',
]);

/** Actions that reset the undo stack entirely */
const STACK_RESET_ACTIONS: Set<string> = new Set([
    'LOAD_DOCUMENT',
    'NEW_PATIENT',
]);

export function undoReducer(state: UndoState, action: DocumentAction): UndoState {
    switch (action.type) {
        case 'UNDO': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            return {
                past: state.past.slice(0, -1),
                present: previous,
                future: [state.present, ...state.future],
            };
        }

        case 'REDO': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            return {
                past: [...state.past, state.present],
                present: next,
                future: state.future.slice(1),
            };
        }

        default: {
            const newPresent = documentReducer(state.present, action);

            // If the reducer returned the same reference, nothing changed
            if (newPresent === state.present) return state;

            // Reset stack on load/new patient
            if (STACK_RESET_ACTIONS.has(action.type)) {
                return { past: [], present: newPresent, future: [] };
            }

            // Non-undoable actions: update present without touching history
            if (NON_UNDOABLE_ACTIONS.has(action.type)) {
                return { ...state, present: newPresent };
            }

            // Undoable action: push current to past, clear future
            const past = [...state.past, state.present];
            if (past.length > MAX_HISTORY) past.splice(0, past.length - MAX_HISTORY);
            return { past, present: newPresent, future: [] };
        }
    }
}
