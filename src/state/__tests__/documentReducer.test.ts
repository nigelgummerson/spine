// src/state/__tests__/documentReducer.test.js
import { describe, it, expect } from 'vitest';
import { createInitialState, documentReducer, serializeState, deserializeDocument } from '../documentReducer';

// --- Task 9: createInitialState ---

describe('createInitialState', () => {
    it('returns a fresh state with empty arrays and default patient data', () => {
        const state = createInitialState();
        expect(state.plannedPlacements).toEqual([]);
        expect(state.completedPlacements).toEqual([]);
        expect(state.plannedCages).toEqual([]);
        expect(state.completedCages).toEqual([]);
        expect(state.plannedConnectors).toEqual([]);
        expect(state.completedConnectors).toEqual([]);
        expect(state.plannedNotes).toEqual([]);
        expect(state.completedNotes).toEqual([]);
        expect(state.reconLabelPositions).toEqual({});
        expect(state.patientData.name).toBe('');
        expect(state.patientData.boneGraft).toEqual({ types: [], notes: '' });
        expect(state.documentId).toBeTruthy();
        expect(state.documentCreated).toBeTruthy();
    });

    it('generates unique document IDs on each call', () => {
        const a = createInitialState();
        const b = createInitialState();
        expect(a.documentId).not.toBe(b.documentId);
    });
});

// --- Task 10: Placement CRUD ---

describe('ADD_PLACEMENT', () => {
    it('adds a placement to the plan', () => {
        const state = createInitialState();
        const placement = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const next = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement });
        expect(next.plannedPlacements).toHaveLength(1);
        expect(next.plannedPlacements[0]).toEqual(placement);
    });

    it('adds a placement to the construct', () => {
        const state = createInitialState();
        const placement = { id: 'p1', levelId: 'T5', zone: 'right', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        const next = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'construct', placement });
        expect(next.completedPlacements).toHaveLength(1);
        expect(next.completedPlacements[0]).toEqual(placement);
    });

    it('enforces one implant per left/right zone — rejects duplicate', () => {
        const state = createInitialState();
        const p1 = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const p2 = { id: 'p2', levelId: 'T5', zone: 'left', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p1 });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p2 });
        expect(s2.plannedPlacements).toHaveLength(1);
        expect(s2).toBe(s1); // same reference — no change
    });

    it('allows same level different zones', () => {
        const state = createInitialState();
        const pL = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const pR = { id: 'p2', levelId: 'T5', zone: 'right', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pL });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pR });
        expect(s2.plannedPlacements).toHaveLength(2);
    });

    it('allows multiple mid-zone placements at same level', () => {
        const state = createInitialState();
        const p1 = { id: 'p1', levelId: 'T5', zone: 'mid', tool: 'osteotomy', data: { type: 'PSO' }, annotation: '' };
        const p2 = { id: 'p2', levelId: 'T5', zone: 'mid', tool: 'unstable', data: null, annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p1 });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p2 });
        expect(s2.plannedPlacements).toHaveLength(2);
    });
});

describe('UPDATE_PLACEMENT', () => {
    it('updates tool, data, and annotation of an existing placement', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'p1', tool: 'monoaxial', data: '5.5x40', annotation: 'fenestrated' });
        expect(s2.plannedPlacements[0].tool).toBe('monoaxial');
        expect(s2.plannedPlacements[0].data).toBe('5.5x40');
        expect(s2.plannedPlacements[0].annotation).toBe('fenestrated');
    });

    it('preserves existing annotation when annotation is undefined', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'cortical' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'p1', tool: 'monoaxial', data: '5.5x40', annotation: undefined });
        expect(s2.plannedPlacements[0].annotation).toBe('cortical');
    });
});

describe('REMOVE_PLACEMENT', () => {
    it('removes a placement by id', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'REMOVE_PLACEMENT', chart: 'plan', id: 'p1' });
        expect(s2.plannedPlacements).toHaveLength(0);
    });
});

// --- Task 11: Cage, Connector, Note, Patient data, Edge cases ---

describe('SET_CAGE / REMOVE_CAGE', () => {
    it('adds a cage', () => {
        const state = createInitialState();
        const cage = { levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const next = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage });
        expect(next.plannedCages).toHaveLength(1);
    });

    it('replaces existing cage at same level', () => {
        const state = createInitialState();
        const c1 = { levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const c2 = { levelId: 'L4', tool: 'plif', data: { height: '12', lordosis: '8', side: 'bilateral' } };
        const s1 = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage: c1 });
        const s2 = documentReducer(s1, { type: 'SET_CAGE', chart: 'plan', cage: c2 });
        expect(s2.plannedCages).toHaveLength(1);
        expect(s2.plannedCages[0].tool).toBe('plif');
    });

    it('removes a cage by level', () => {
        const state = createInitialState();
        const cage = { levelId: 'L4', tool: 'tlif', data: { height: '10' } };
        const s1 = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage });
        const s2 = documentReducer(s1, { type: 'REMOVE_CAGE', chart: 'plan', levelId: 'L4' });
        expect(s2.plannedCages).toHaveLength(0);
    });
});

describe('Connector CRUD', () => {
    it('adds, updates, and removes a connector', () => {
        const state = createInitialState();
        const conn = { id: 'c1', levelId: 'T8', fraction: 0.5, tool: 'connector' };
        const s1 = documentReducer(state, { type: 'ADD_CONNECTOR', chart: 'plan', connector: conn });
        expect(s1.plannedConnectors).toHaveLength(1);

        const s2 = documentReducer(s1, { type: 'UPDATE_CONNECTOR', chart: 'plan', id: 'c1', levelId: 'T9', fraction: 0.3 });
        expect(s2.plannedConnectors[0].levelId).toBe('T9');
        expect(s2.plannedConnectors[0].fraction).toBe(0.3);

        const s3 = documentReducer(s2, { type: 'REMOVE_CONNECTOR', chart: 'plan', id: 'c1' });
        expect(s3.plannedConnectors).toHaveLength(0);
    });
});

describe('Note CRUD', () => {
    it('adds, updates text, updates position, and removes a note', () => {
        const state = createInitialState();
        const note = { id: 'n1', tool: 'note', levelId: 'T5', text: 'Check', offsetX: -140, offsetY: 0, showArrow: false };
        const s1 = documentReducer(state, { type: 'ADD_NOTE', chart: 'plan', note });
        expect(s1.plannedNotes).toHaveLength(1);

        const s2 = documentReducer(s1, { type: 'UPDATE_NOTE', chart: 'plan', id: 'n1', text: 'Updated', showArrow: true });
        expect(s2.plannedNotes[0].text).toBe('Updated');
        expect(s2.plannedNotes[0].showArrow).toBe(true);

        const s3 = documentReducer(s2, { type: 'UPDATE_NOTE_POSITION', chart: 'plan', id: 'n1', offsetX: -200, offsetY: 10 });
        expect(s3.plannedNotes[0].offsetX).toBe(-200);

        const s4 = documentReducer(s3, { type: 'REMOVE_NOTE', chart: 'plan', id: 'n1' });
        expect(s4.plannedNotes).toHaveLength(0);
    });
});

describe('Patient data', () => {
    it('SET_PATIENT_FIELD updates a single field', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'John' });
        expect(next.patientData.name).toBe('John');
        expect(next.patientData.surgeon).toBe(''); // unchanged
    });

    it('SET_BONE_GRAFT updates bone graft types and notes', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_BONE_GRAFT', types: ['Local Bone', 'BMP'], notes: 'Iliac crest' });
        expect(next.patientData.boneGraft.types).toEqual(['Local Bone', 'BMP']);
        expect(next.patientData.boneGraft.notes).toBe('Iliac crest');
    });

    it('SET_RECON_LABEL_POSITION stores label position', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_RECON_LABEL_POSITION', id: 'recon-L3', offsetX: 50, offsetY: -20 });
        expect(next.reconLabelPositions['recon-L3']).toEqual({ offsetX: 50, offsetY: -20 });
    });
});

describe('Edge cases', () => {
    it('updating a non-existent placement returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'nonexistent', tool: 'polyaxial', data: '6.5x45', annotation: '' });
        expect(next.plannedPlacements).toEqual([]);
    });

    it('removing a non-existent placement returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'REMOVE_PLACEMENT', chart: 'plan', id: 'nonexistent' });
        expect(next.plannedPlacements).toEqual([]);
    });

    it('unknown action type returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'NONSENSE' });
        expect(next).toBe(state);
    });
});

// --- Task 12: Bulk operations and serialization round-trip ---

describe('NEW_PATIENT', () => {
    it('resets to fresh state with new document ID', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'John' });
        const s3 = documentReducer(s2, { type: 'NEW_PATIENT' });
        expect(s3.plannedPlacements).toEqual([]);
        expect(s3.patientData.name).toBe('');
        expect(s3.documentId).not.toBe(state.documentId);
    });
});

describe('CLEAR_CONSTRUCT', () => {
    it('empties all construct arrays', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'construct', placement: p });
        const s2 = documentReducer(s1, { type: 'CLEAR_CONSTRUCT' });
        expect(s2.completedPlacements).toEqual([]);
        expect(s2.completedCages).toEqual([]);
        expect(s2.completedConnectors).toEqual([]);
        expect(s2.completedNotes).toEqual([]);
    });

    it('does not affect plan arrays', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'CLEAR_CONSTRUCT' });
        expect(s2.plannedPlacements).toHaveLength(1);
    });
});

describe('COPY_PLAN_TO_CONSTRUCT', () => {
    let counter = 0;
    const mockGenId = () => `gen-${++counter}`;

    it('copies plan placements to construct, stripping annotations', () => {
        counter = 0;
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'fenestrated' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s2.completedPlacements).toHaveLength(1);
        expect(s2.completedPlacements[0].annotation).toBe('');
        expect(s2.completedPlacements[0].id).toBe('gen-1'); // new ID
    });

    it('excludes force placements', () => {
        counter = 0;
        const state = createInitialState();
        const screw = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const force = { id: 'f1', levelId: 'T5', zone: 'force_left', tool: 'compression', data: null, annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: screw });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'plan', placement: force });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements).toHaveLength(1);
        expect(s.completedPlacements[0].tool).toBe('polyaxial');
    });

    it('skips placements already in construct (deduplication by level+zone)', () => {
        counter = 0;
        const state = createInitialState();
        const planP = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const constP = { id: 'c1', levelId: 'T5', zone: 'left', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: planP });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'construct', placement: constP });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements).toHaveLength(1);
        expect(s.completedPlacements[0].id).toBe('c1'); // original, not copied
    });

    it('returns same state when nothing to copy', () => {
        counter = 0;
        const state = createInitialState();
        const s = documentReducer(state, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s).toBe(state);
    });

    it('strips osteotomy angles and reconstruction cage text', () => {
        counter = 0;
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T10', zone: 'mid', tool: 'osteotomy', data: { type: 'PSO', angle: 30, reconstructionCage: 'mesh cage' }, annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements[0].data.angle).toBeNull();
        expect(s.completedPlacements[0].data.reconstructionCage).toBe('');
    });
});

describe('Serialization round-trip', () => {
    it('serialize then deserialize produces equivalent state', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'cortical' };
        const cage = { id: 'cage1', levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const conn = { id: 'c1', levelId: 'T8', fraction: 0.5, tool: 'connector' };
        const note = { id: 'n1', tool: 'note', levelId: 'T5', text: 'Check pedicle', offsetX: -140, offsetY: 10, showArrow: true };

        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        s = documentReducer(s, { type: 'SET_CAGE', chart: 'plan', cage });
        s = documentReducer(s, { type: 'ADD_CONNECTOR', chart: 'plan', connector: conn });
        s = documentReducer(s, { type: 'ADD_NOTE', chart: 'plan', note });
        s = documentReducer(s, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'Test Patient' });
        s = documentReducer(s, { type: 'SET_PATIENT_FIELD', field: 'surgeon', value: 'Dr Smith' });

        const json = serializeState(s, 'thoracolumbar', 'default', '2.2.0', 'en');
        const result = deserializeDocument(json);

        expect(result.state.patientData.name).toBe('Test Patient');
        expect(result.state.patientData.surgeon).toBe('Dr Smith');
        expect(result.state.plannedPlacements).toHaveLength(1);
        expect(result.state.plannedPlacements[0].tool).toBe('polyaxial');
        expect(result.state.plannedPlacements[0].data).toBe('6.5x45');
        expect(result.state.plannedPlacements[0].annotation).toBe('cortical');
        expect(result.state.plannedCages).toHaveLength(1);
        expect(result.state.plannedConnectors).toHaveLength(1);
        expect(result.state.plannedNotes).toHaveLength(1);
        expect(result.state.plannedNotes[0].text).toBe('Check pedicle');
        expect(result.viewMode).toBe('thoracolumbar');
        expect(result.colourScheme).toBe('default');
    });

    it('empty state round-trips cleanly', () => {
        const state = createInitialState();
        const json = serializeState(state, 'whole', 'navy', '2.2.0', 'de');
        const result = deserializeDocument(json);
        expect(result.state.plannedPlacements).toEqual([]);
        expect(result.state.completedPlacements).toEqual([]);
        expect(result.viewMode).toBe('whole');
        expect(result.colourScheme).toBe('navy');
    });
});
