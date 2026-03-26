// src/state/__tests__/undoReducer.test.ts
import { describe, it, expect } from 'vitest';
import { undoReducer, createInitialUndoState } from '../undoReducer';
import { createInitialState } from '../documentReducer';
import type { Placement, Cage } from '../../types';

// --- Helpers ---

function makePlacement(id: string, levelId = 'T5', zone = 'left'): Placement {
    return { id, levelId, zone, tool: 'polyaxial', data: '6.5x45', annotation: '' } as Placement;
}

function makeCage(id: string, levelId = 'L4'): Cage {
    return { id, levelId, tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } } as Cage;
}

// --- 1. UNDO ---

describe('UNDO', () => {
    it('pops from past and pushes present to future', () => {
        const state = createInitialUndoState();
        // Add a placement to create a past entry
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        expect(s1.past).toHaveLength(1);
        expect(s1.present.plannedPlacements).toHaveLength(1);

        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.past).toHaveLength(0);
        expect(s2.present.plannedPlacements).toHaveLength(0);
        expect(s2.future).toHaveLength(1);
        expect(s2.future[0].plannedPlacements).toHaveLength(1);
    });

    it('returns same state when past is empty', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, { type: 'UNDO' });
        expect(result).toBe(state);
    });
});

// --- 2. REDO ---

describe('REDO', () => {
    it('pops from future and pushes present to past', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.future).toHaveLength(1);

        const s3 = undoReducer(s2, { type: 'REDO' });
        expect(s3.past).toHaveLength(1);
        expect(s3.present.plannedPlacements).toHaveLength(1);
        expect(s3.future).toHaveLength(0);
    });

    it('returns same state when future is empty', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, { type: 'REDO' });
        expect(result).toBe(state);
    });
});

// --- 3. Undoable actions ---

describe('undoable actions', () => {
    it('ADD_PLACEMENT pushes present to past and clears future', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        expect(result.past).toHaveLength(1);
        expect(result.past[0]).toBe(state.present);
        expect(result.present.plannedPlacements).toHaveLength(1);
        expect(result.future).toEqual([]);
    });

    it('REMOVE_PLACEMENT pushes present to past and clears future', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, {
            type: 'REMOVE_PLACEMENT', chart: 'plan', id: 'p1',
        });
        expect(s2.past).toHaveLength(2);
        expect(s2.present.plannedPlacements).toHaveLength(0);
    });

    it('ADD_CAGE pushes present to past', () => {
        const state = createInitialUndoState();
        // SET_CAGE is the action name for adding cages
        const result = undoReducer(state, {
            type: 'SET_CAGE', chart: 'plan', cage: makeCage('c1'),
        });
        expect(result.past).toHaveLength(1);
        expect(result.present.plannedCages).toHaveLength(1);
    });

    it('REMOVE_CAGE pushes present to past', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'SET_CAGE', chart: 'plan', cage: makeCage('c1'),
        });
        const s2 = undoReducer(s1, {
            type: 'REMOVE_CAGE', chart: 'plan', levelId: 'L4',
        });
        expect(s2.past).toHaveLength(2);
        expect(s2.present.plannedCages).toHaveLength(0);
    });

    it('CLEAR_CONSTRUCT pushes present to past', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'construct', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'CLEAR_CONSTRUCT' });
        expect(s2.past).toHaveLength(2);
        expect(s2.present.completedPlacements).toHaveLength(0);
    });

    it('COPY_PLAN_TO_CONSTRUCT pushes present to past', () => {
        let counter = 0;
        const genId = () => `gen-${++counter}`;
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'COPY_PLAN_TO_CONSTRUCT', genId });
        expect(s2.past).toHaveLength(2);
        expect(s2.present.completedPlacements).toHaveLength(1);
    });

    it('SET_BONE_GRAFT pushes present to past', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, {
            type: 'SET_BONE_GRAFT', types: ['Local Bone'], notes: 'test',
        });
        expect(result.past).toHaveLength(1);
        expect(result.present.patientData.boneGraft.types).toEqual(['Local Bone']);
    });
});

// --- 4. Non-undoable actions ---

describe('non-undoable actions', () => {
    it('SET_PATIENT_FIELD updates present without touching past/future', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, {
            type: 'SET_PATIENT_FIELD', field: 'name', value: 'John',
        });
        expect(result.present.patientData.name).toBe('John');
        expect(result.past).toHaveLength(0);
        expect(result.future).toHaveLength(0);
    });

    it('SET_RECON_LABEL_POSITION updates present without touching past/future', () => {
        const state = createInitialUndoState();
        const result = undoReducer(state, {
            type: 'SET_RECON_LABEL_POSITION', id: 'recon-L3', offsetX: 50, offsetY: -20,
        });
        expect(result.present.reconLabelPositions['recon-L3']).toEqual({ offsetX: 50, offsetY: -20 });
        expect(result.past).toHaveLength(0);
        expect(result.future).toHaveLength(0);
    });

    it('UPDATE_NOTE_POSITION updates present without touching past/future', () => {
        const state = createInitialUndoState();
        // First add a note (undoable)
        const note = { id: 'n1', tool: 'note', levelId: 'T5', text: 'Check', offsetX: -140, offsetY: 0, showArrow: false };
        const s1 = undoReducer(state, { type: 'ADD_NOTE', chart: 'plan', note });
        // Now move it (non-undoable)
        const s2 = undoReducer(s1, {
            type: 'UPDATE_NOTE_POSITION', chart: 'plan', id: 'n1', offsetX: -200, offsetY: 10,
        });
        expect(s2.present.plannedNotes[0].offsetX).toBe(-200);
        expect(s2.past).toHaveLength(1); // only from ADD_NOTE, not from position update
        expect(s2.future).toHaveLength(0);
    });

    it('non-undoable actions preserve existing past and future', () => {
        const state = createInitialUndoState();
        // Create a past entry via undoable action
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        // Undo to create a future entry
        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.past).toHaveLength(0);
        expect(s2.future).toHaveLength(1);
        // Non-undoable action should not touch past or future
        const s3 = undoReducer(s2, {
            type: 'SET_PATIENT_FIELD', field: 'name', value: 'Test',
        });
        expect(s3.past).toHaveLength(0);
        expect(s3.future).toHaveLength(1);
        expect(s3.present.patientData.name).toBe('Test');
    });
});

// --- 5. Stack reset actions ---

describe('stack reset actions', () => {
    it('LOAD_DOCUMENT clears past and future, sets new present', () => {
        const state = createInitialUndoState();
        // Build up some history
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.past).toHaveLength(0);
        expect(s2.future).toHaveLength(1);

        const loadedDoc = createInitialState();
        loadedDoc.patientData.name = 'Loaded Patient';
        const s3 = undoReducer(s2, { type: 'LOAD_DOCUMENT', document: loadedDoc });
        expect(s3.past).toHaveLength(0);
        expect(s3.future).toHaveLength(0);
        expect(s3.present.patientData.name).toBe('Loaded Patient');
    });

    it('NEW_PATIENT clears past and future, sets fresh present', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p2', 'T6', 'right'),
        });
        expect(s2.past).toHaveLength(2);

        const s3 = undoReducer(s2, { type: 'NEW_PATIENT' });
        expect(s3.past).toHaveLength(0);
        expect(s3.future).toHaveLength(0);
        expect(s3.present.plannedPlacements).toHaveLength(0);
        expect(s3.present.patientData.name).toBe('');
    });
});

// --- 6. MAX_HISTORY cap (20) ---

describe('MAX_HISTORY cap', () => {
    it('trims past to 20 entries when exceeding limit', () => {
        let state = createInitialUndoState();
        // Perform 25 undoable actions
        for (let i = 0; i < 25; i++) {
            state = undoReducer(state, {
                type: 'ADD_PLACEMENT',
                chart: 'plan',
                placement: makePlacement(`p${i}`, `T${i + 1}`, i % 2 === 0 ? 'left' : 'right'),
            });
        }
        expect(state.past).toHaveLength(20);
        // The oldest entries should have been trimmed — the first entry in past
        // should correspond to the state after the 5th action (0-indexed: actions 0-4 trimmed)
        expect(state.present.plannedPlacements).toHaveLength(25);
    });

    it('past never exceeds 20 even with many actions', () => {
        let state = createInitialUndoState();
        for (let i = 0; i < 50; i++) {
            state = undoReducer(state, {
                type: 'SET_BONE_GRAFT',
                types: [`Type${i}`],
                notes: `Note ${i}`,
            });
        }
        expect(state.past).toHaveLength(20);
    });
});

// --- 7. No-op passthrough ---

describe('no-op passthrough', () => {
    it('returns same state when documentReducer returns same reference', () => {
        const state = createInitialUndoState();
        // Adding a duplicate to an occupied zone — documentReducer returns same reference
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const result = undoReducer(s1, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p2'),
        });
        expect(result).toBe(s1);
    });

    it('returns same state for unknown action type', () => {
        const state = createInitialUndoState();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally testing unknown action type
        const result = undoReducer(state, { type: 'NONSENSE' } as any);
        expect(result).toBe(state);
    });

    it('returns same state when adding duplicate placement to occupied zone', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p2'),
        });
        expect(s2).toBe(s1);
    });
});

// --- 8. Undo-redo round-trip ---

describe('undo-redo round-trip', () => {
    it('action then undo restores original state', () => {
        const state = createInitialUndoState();
        const originalPresent = state.present;
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.present).toBe(originalPresent);
        expect(s2.present.plannedPlacements).toHaveLength(0);
    });

    it('action then undo then redo restores post-action state', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const postActionPresent = s1.present;
        const s2 = undoReducer(s1, { type: 'UNDO' });
        const s3 = undoReducer(s2, { type: 'REDO' });
        expect(s3.present).toBe(postActionPresent);
        expect(s3.present.plannedPlacements).toHaveLength(1);
    });

    it('multiple undo then redo steps restore correctly', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p2', 'T6', 'right'),
        });
        const s3 = undoReducer(s2, {
            type: 'SET_BONE_GRAFT', types: ['Allograft'], notes: '',
        });

        // Undo all three
        const u1 = undoReducer(s3, { type: 'UNDO' });
        expect(u1.present.patientData.boneGraft.types).toEqual([]);
        const u2 = undoReducer(u1, { type: 'UNDO' });
        expect(u2.present.plannedPlacements).toHaveLength(1);
        const u3 = undoReducer(u2, { type: 'UNDO' });
        expect(u3.present.plannedPlacements).toHaveLength(0);

        // Redo all three
        const r1 = undoReducer(u3, { type: 'REDO' });
        expect(r1.present.plannedPlacements).toHaveLength(1);
        const r2 = undoReducer(r1, { type: 'REDO' });
        expect(r2.present.plannedPlacements).toHaveLength(2);
        const r3 = undoReducer(r2, { type: 'REDO' });
        expect(r3.present.patientData.boneGraft.types).toEqual(['Allograft']);
    });
});

// --- 9. Future cleared on new action ---

describe('future cleared on new action', () => {
    it('performing a new undoable action after undo clears future', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'UNDO' });
        expect(s2.future).toHaveLength(1);

        // New action should clear future
        const s3 = undoReducer(s2, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p2', 'T6', 'right'),
        });
        expect(s3.future).toHaveLength(0);
        expect(s3.past).toHaveLength(1);
        expect(s3.present.plannedPlacements).toHaveLength(1);
        expect(s3.present.plannedPlacements[0].id).toBe('p2');
    });

    it('redo is no longer possible after a new action', () => {
        const state = createInitialUndoState();
        const s1 = undoReducer(state, {
            type: 'ADD_PLACEMENT', chart: 'plan', placement: makePlacement('p1'),
        });
        const s2 = undoReducer(s1, { type: 'UNDO' });
        const s3 = undoReducer(s2, {
            type: 'SET_BONE_GRAFT', types: ['DBM'], notes: '',
        });
        const s4 = undoReducer(s3, { type: 'REDO' });
        expect(s4).toBe(s3); // no-op — future is empty
    });
});
