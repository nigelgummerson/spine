// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createInitialState, serializeState } from '../../state/documentReducer';
import { CURRENT_VERSION } from '../../data/changelog';
import type { Placement } from '../../types';

// --- BroadcastChannel mock (jsdom doesn't implement it) ---

class MockBroadcastChannel {
    name: string;
    onmessage: ((e: MessageEvent) => void) | null = null;
    constructor(name: string) {
        this.name = name;
        MockBroadcastChannel.instances.push(this);
    }
    postMessage(data: any) {
        MockBroadcastChannel.instances.forEach(ch => {
            if (ch !== this && ch.name === this.name && ch.onmessage) {
                ch.onmessage(new MessageEvent('message', { data }));
            }
        });
    }
    close() {}
    static instances: MockBroadcastChannel[] = [];
    static reset() { MockBroadcastChannel.instances = []; }
}

globalThis.BroadcastChannel = MockBroadcastChannel as any;

// --- Helpers ---

/** Default params for useDocumentState — all stubs */
function makeParams(overrides: Record<string, any> = {}) {
    return {
        viewMode: 'plan',
        colourScheme: 'default',
        changeTheme: vi.fn(),
        changeLang: vi.fn(),
        incognitoMode: false,
        currentLang: 'en',
        setViewMode: vi.fn(),
        showToast: vi.fn(),
        showPelvis: false,
        useRegionDefaults: false,
        confirmAndNext: false,
        setShowPelvis: vi.fn(),
        setUseRegionDefaults: vi.fn(),
        setConfirmAndNext: vi.fn(),
        ...overrides,
    };
}

/** Build a valid v4 serialised state for localStorage seeding */
function makeValidV4State(patientName = 'Test Patient') {
    const state = createInitialState();
    state.patientData.name = patientName;
    return JSON.stringify(serializeState(state, 'plan', 'default', CURRENT_VERSION, 'en'));
}

// --- Setup / Teardown ---

beforeEach(() => {
    MockBroadcastChannel.reset();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

// Lazy import so BroadcastChannel mock is set before module loads
async function importHook() {
    // Clear module cache so each test gets a fresh module
    const mod = await import('../useDocumentState');
    return mod.useDocumentState;
}

// =============================================================================
// Tests
// =============================================================================

describe('useDocumentState', () => {

    // 1. Loads saved state from localStorage on mount
    it('loads saved state from localStorage on mount', async () => {
        const useDocumentState = await importHook();
        localStorage.setItem('spine_planner_v2', makeValidV4State('Alice'));

        const { result } = renderHook(() => useDocumentState(makeParams()));

        // After mount effect runs, patient name should be loaded
        expect(result.current.state.patientData.name).toBe('Alice');
    });

    // 2. Handles corrupt localStorage data gracefully
    it('handles corrupt localStorage data gracefully (starts fresh)', async () => {
        const useDocumentState = await importHook();
        localStorage.setItem('spine_planner_v2', '{"not":"valid","schema":{"version":4}}');

        const { result } = renderHook(() => useDocumentState(makeParams()));

        // Should start fresh — no crash
        expect(result.current.state.patientData.name).toBe('');
        expect(result.current.hasLoaded).toBe(true);
    });

    // 3. Handles missing localStorage (starts fresh)
    it('handles missing localStorage (starts fresh)', async () => {
        const useDocumentState = await importHook();
        // No localStorage set

        const { result } = renderHook(() => useDocumentState(makeParams()));

        expect(result.current.state.patientData.name).toBe('');
        expect(result.current.hasLoaded).toBe(true);
    });

    // 4. Saves to localStorage on state change
    it('saves to localStorage on state change', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        // Dispatch a placement action to trigger a state change
        const placement: Placement = {
            id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '',
        };
        act(() => {
            result.current.dispatch({ type: 'ADD_PLACEMENT', chart: 'plan', placement });
        });

        // Advance timers so the save effect runs
        await act(async () => {
            vi.advanceTimersByTime(300);
        });

        const saved = localStorage.getItem('spine_planner_v2');
        expect(saved).not.toBeNull();
        const parsed = JSON.parse(saved!);
        // Should have at least one element in the plan
        expect(parsed.plan.elements.length).toBeGreaterThan(0);
    });

    // 5. Does NOT save when incognitoMode is true
    it('does NOT save to localStorage when incognitoMode is true', async () => {
        const useDocumentState = await importHook();
        // Seed localStorage to verify it gets removed
        localStorage.setItem('spine_planner_v2', makeValidV4State('Bob'));

        const params = makeParams({ incognitoMode: true });
        const { result } = renderHook(() => useDocumentState(params));

        // Wait for effects
        await act(async () => {
            vi.advanceTimersByTime(300);
        });

        // Incognito mode should remove the localStorage item
        expect(localStorage.getItem('spine_planner_v2')).toBeNull();
    });

    // 6. hasLoaded flips to true after mount
    it('hasLoaded flips to true after mount', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        expect(result.current.hasLoaded).toBe(true);
    });

    // 7. canUndo is false initially
    it('canUndo is false initially', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    // 8. canUndo becomes true after an undoable action
    it('canUndo becomes true after an undoable action', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        const placement: Placement = {
            id: 'p2', levelId: 'L1', zone: 'right', tool: 'monoaxial', data: '5.5x40', annotation: '',
        };
        act(() => {
            result.current.dispatch({ type: 'ADD_PLACEMENT', chart: 'plan', placement });
        });

        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
    });

    // 9. undo() restores previous state
    it('undo() restores previous state', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        const placement: Placement = {
            id: 'p3', levelId: 'T10', zone: 'left', tool: 'polyaxial', data: '6.0x40', annotation: '',
        };
        act(() => {
            result.current.dispatch({ type: 'ADD_PLACEMENT', chart: 'plan', placement });
        });
        expect(result.current.state.plannedPlacements).toHaveLength(1);

        act(() => {
            result.current.undo();
        });

        expect(result.current.state.plannedPlacements).toHaveLength(0);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
    });

    // 10. redo() re-applies undone action
    it('redo() re-applies undone action', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        const placement: Placement = {
            id: 'p4', levelId: 'L3', zone: 'left', tool: 'polyaxial', data: '7.0x50', annotation: '',
        };
        act(() => {
            result.current.dispatch({ type: 'ADD_PLACEMENT', chart: 'plan', placement });
        });
        act(() => {
            result.current.undo();
        });
        expect(result.current.state.plannedPlacements).toHaveLength(0);

        act(() => {
            result.current.redo();
        });

        expect(result.current.state.plannedPlacements).toHaveLength(1);
        expect(result.current.canRedo).toBe(false);
    });

    // 11. serialize() returns valid v4 JSON
    it('serialize() returns valid v4 format', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        const serialized = result.current.serialize();
        expect(serialized.schema.format).toBe('spinal-instrumentation');
        expect(serialized.schema.version).toBe(4);
        expect(serialized.document.id).toBeTruthy();
    });

    // 12. LOAD_DOCUMENT resets undo stack
    it('LOAD_DOCUMENT resets undo history', async () => {
        const useDocumentState = await importHook();

        const { result } = renderHook(() => useDocumentState(makeParams()));

        // Create undo history
        const placement: Placement = {
            id: 'p5', levelId: 'T8', zone: 'left', tool: 'polyaxial', data: '5.5x35', annotation: '',
        };
        act(() => {
            result.current.dispatch({ type: 'ADD_PLACEMENT', chart: 'plan', placement });
        });
        expect(result.current.canUndo).toBe(true);

        // Load a new document — should reset undo stack
        const freshState = createInitialState();
        freshState.patientData.name = 'New Patient';
        act(() => {
            result.current.dispatch({ type: 'LOAD_DOCUMENT', document: freshState });
        });

        expect(result.current.state.patientData.name).toBe('New Patient');
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    // 13. Handles unparseable JSON in localStorage
    it('handles unparseable JSON in localStorage', async () => {
        const useDocumentState = await importHook();
        localStorage.setItem('spine_planner_v2', 'not json at all{{{');

        const { result } = renderHook(() => useDocumentState(makeParams()));

        expect(result.current.state.patientData.name).toBe('');
        expect(result.current.hasLoaded).toBe(true);
    });

    // 14. changeTheme and setViewMode are called when loading saved state with those values
    it('calls changeTheme and setViewMode from saved state', async () => {
        const useDocumentState = await importHook();
        const state = createInitialState();
        const serialized = serializeState(state, 'construct', 'navy', CURRENT_VERSION, 'en');
        localStorage.setItem('spine_planner_v2', JSON.stringify(serialized));

        const params = makeParams();
        renderHook(() => useDocumentState(params));

        expect(params.changeTheme).toHaveBeenCalledWith('navy');
        expect(params.setViewMode).toHaveBeenCalledWith('construct');
    });
});
