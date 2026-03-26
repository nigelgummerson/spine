// src/state/__tests__/schema.test.js
import { describe, it, expect } from 'vitest';
import { validateV4, validateLegacy, ValidationError } from '../schema';
import { createInitialState, serializeState, documentReducer, deserializeDocument } from '../documentReducer';
import { migrateStoredData, LATEST_SCHEMA_VERSION } from '../migrations';
import type { Placement } from '../../types';

// Helper: minimal valid v4 JSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper: needs mutable deep property access for validation edge cases
function validV4(): Record<string, any> {
    return {
        schema: { format: 'spinal-instrumentation', version: 4 },
        document: { id: 'test-id', created: '2026-01-01T00:00:00Z' },
        plan: { elements: [], forces: [], rods: [], notes: [] },
        construct: { elements: [], forces: [], rods: [], notes: [] },
    };
}

describe('validateV4', () => {

    // --- Acceptance tests ---

    it('accepts a minimal valid v4 file', () => {
        expect(() => validateV4(validV4())).not.toThrow();
    });

    it('accepts a valid file with all optional fields omitted', () => {
        const json = {
            schema: { format: 'spinal-instrumentation', version: 4 },
        };
        expect(() => validateV4(json)).not.toThrow();
    });

    it('accepts a file with elements of all types', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', diameter: 6.5, length: 45 } },
            { id: 'e2', type: 'hook', level: 'T3', side: 'right', hook: { hookType: 'pedicle' } },
            { id: 'e3', type: 'fixation', level: 'T7', side: 'left', fixation: { fixationType: 'sublaminar-band' } },
            { id: 'e4', type: 'cage', level: 'L4', side: 'bilateral', cage: { approach: 'TLIF', height: 10 } },
            { id: 'e5', type: 'osteotomy', level: 'T10', side: 'midline', osteotomy: { osteotomyType: 'PSO', schwabGrade: 3 } },
            { id: 'e6', type: 'connector', level: 'T8', side: 'midline', connector: { connectorType: 'crosslink', fraction: 0.5 } },
        ];
        json.plan.forces = [
            { id: 'f1', type: 'compression', level: 'T5', side: 'left' },
        ];
        json.plan.rods = [
            { id: 'rod-left', side: 'left', freeText: 'CoCr 5.5mm' },
        ];
        json.plan.notes = [
            { id: 'n1', level: 'T5', text: 'Check pedicle', showArrow: true },
        ];
        expect(() => validateV4(json)).not.toThrow();
    });

    it('round-trip: serializeState output passes validation', () => {
        const state = createInitialState();
        const json = serializeState(state, 'thoracolumbar', 'default', '2.2.1', 'en');
        expect(() => validateV4(json)).not.toThrow();
    });

    it('accepts unknown extra fields at root level (forward compatibility)', () => {
        const json = validV4();
        json.futureField = 'something';
        json.futureSection = { nested: true };
        expect(() => validateV4(json)).not.toThrow();
    });

    it('rejects unknown extra fields on elements (strict sub-objects)', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial' }, futureField: true },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    // --- Rejection tests ---

    it('rejects missing schema.format', () => {
        const json = validV4();
        delete json.schema.format;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects missing schema.version', () => {
        const json = validV4();
        delete json.schema.version;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects wrong schema.version', () => {
        const json = validV4();
        json.schema.version = 3;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects invalid element type', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'bolt', level: 'T5', side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects invalid vertebral level', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'X9', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required id', () => {
        const json = validV4();
        json.plan.elements = [
            { type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required type', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', level: 'T5', side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required level', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required side', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects force with non-string level', () => {
        const json = validV4();
        json.plan.forces = [
            { id: 'f1', type: 'compression', level: null, side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects connector fraction out of range', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'connector', level: 'T8', side: 'midline', connector: { connectorType: 'crosslink', fraction: 1.5 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects screw element with screw: null', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: null },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    // --- Positive number validation ---

    it('rejects negative screw diameter', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', diameter: -3.5 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects zero screw length', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', length: 0 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects negative cage height', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'cage', level: 'L4', side: 'bilateral', cage: { approach: 'TLIF', height: -10 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects zero cage width', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'cage', level: 'L4', side: 'bilateral', cage: { approach: 'TLIF', width: 0 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects negative rod diameter', () => {
        const json = validV4();
        json.plan.rods = [
            { id: 'rod-left', side: 'left', diameter: -5.5 },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('accepts valid positive clinical measurements', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', diameter: 6.5, length: 45 } },
            { id: 'e2', type: 'cage', level: 'L4', side: 'bilateral', cage: { approach: 'TLIF', height: 10, width: 26, length: 32 } },
        ];
        json.plan.rods = [
            { id: 'rod-left', side: 'left', diameter: 5.5, length: 120 },
        ];
        expect(() => validateV4(json)).not.toThrow();
    });

    // --- Strict sub-object validation ---

    it('rejects unknown fields on screw sub-object', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', unknownField: true } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects unknown fields on force objects', () => {
        const json = validV4();
        json.plan.forces = [
            { id: 'f1', type: 'compression', level: 'T5', side: 'left', unknownField: 42 },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects unknown fields on rod objects', () => {
        const json = validV4();
        json.plan.rods = [
            { id: 'rod-left', side: 'left', freeText: 'CoCr', unknownField: true },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    // --- Error format ---

    it('ValidationError has issues array and descriptive message', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'bolt', level: 'T5', side: 'left' },
        ];
        try {
            validateV4(json);
            expect.fail('Should have thrown');
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(ValidationError);
            const ve = err as ValidationError;
            expect(ve.issues).toBeInstanceOf(Array);
            expect(ve.issues.length).toBeGreaterThan(0);
            expect(ve.message).toContain('Invalid file');
            expect(ve.message).toContain('error');
        }
    });
});

// --- Pelvic zone round-trip ---

describe('pelvic zone round-trip', () => {
    it('migrates old pelvic zone placements to new level IDs on deserialization', () => {
        const state = createInitialState();
        const pS2ai = { id: 'pv1', levelId: 'S1', zone: 's2ai_left' as Placement['zone'], tool: 'polyaxial', data: '7.0x50', annotation: '' };
        const pIliac = { id: 'pv2', levelId: 'S1', zone: 'iliac_right' as Placement['zone'], tool: 'polyaxial', data: '7.5x80', annotation: '' };
        const pSI = { id: 'pv3', levelId: 'S1', zone: 'si_left' as Placement['zone'], tool: 'monoaxial', data: '7.0x60', annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pS2ai });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pIliac });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pSI });

        const json = serializeState(s, 'thoracolumbar', 'default', '2.5.20', 'en');
        expect(() => validateV4(json)).not.toThrow();

        const result = deserializeDocument(json);
        expect(result.state.plannedPlacements).toHaveLength(3);
        // After migration, old pelvic zone placements are promoted to new level IDs with standard zones
        const placements = result.state.plannedPlacements;
        expect(placements.find((p: Placement) => p.levelId === 'S2AI' && p.zone === 'left')).toBeDefined();
        expect(placements.find((p: Placement) => p.levelId === 'Iliac' && p.zone === 'right')).toBeDefined();
        expect(placements.find((p: Placement) => p.levelId === 'SI-J' && p.zone === 'left')).toBeDefined();
    });
});

// --- Legacy v2/v3 validation ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper: needs mutable deep property access for validation edge cases
function validLegacy(): Record<string, any> {
    return {
        formatVersion: 3,
        patient: { name: 'Test Patient', id: '123' },
        plan: {
            implants: [
                { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial' },
            ],
            cages: [],
            connectors: [],
            notes: [],
        },
        construct: { implants: [], cages: [], connectors: [], notes: [] },
        preferences: { viewMode: 'thoracolumbar' },
    };
}

describe('validateLegacy', () => {

    it('accepts a valid v3 file', () => {
        expect(() => validateLegacy(validLegacy())).not.toThrow();
    });

    it('accepts a valid v2 file', () => {
        const json = validLegacy();
        json.formatVersion = 2;
        expect(() => validateLegacy(json)).not.toThrow();
    });

    it('accepts a file with no placements', () => {
        const json = { formatVersion: 3 };
        expect(() => validateLegacy(json)).not.toThrow();
    });

    it('accepts unknown extra fields', () => {
        const json = validLegacy();
        json.futureField = 'something';
        expect(() => validateLegacy(json)).not.toThrow();
    });

    it('rejects formatVersion 1', () => {
        const json = validLegacy();
        json.formatVersion = 1;
        expect(() => validateLegacy(json)).toThrow(ValidationError);
    });

    it('rejects formatVersion 4+', () => {
        const json = validLegacy();
        json.formatVersion = 4;
        expect(() => validateLegacy(json)).toThrow(ValidationError);
    });

    it('rejects missing formatVersion', () => {
        const json = validLegacy();
        delete json.formatVersion;
        expect(() => validateLegacy(json)).toThrow(ValidationError);
    });

    it('rejects placement missing id', () => {
        const json = validLegacy();
        json.plan.implants = [{ levelId: 'T5', zone: 'left', tool: 'polyaxial' }];
        expect(() => validateLegacy(json)).toThrow(ValidationError);
    });

    it('rejects placement with invalid zone', () => {
        const json = validLegacy();
        json.plan.implants = [{ id: 'p1', levelId: 'T5', zone: 'top', tool: 'polyaxial' }];
        expect(() => validateLegacy(json)).toThrow(ValidationError);
    });
});

// --- Migrations ---

describe('migrateStoredData', () => {

    it('passes v4 data through unchanged', () => {
        const json = validV4();
        const result = migrateStoredData(json);
        expect(result).toEqual(json);
    });

    it('passes legacy v2/v3 data through unchanged', () => {
        const json = validLegacy();
        const result = migrateStoredData(json);
        expect(result).toEqual(json);
    });

    it('throws on unrecognised data with no version', () => {
        expect(() => migrateStoredData({ foo: 'bar' })).toThrow('Unrecognised data format');
    });

    it('exports LATEST_SCHEMA_VERSION as 4', () => {
        expect(LATEST_SCHEMA_VERSION).toBe(4);
    });

    it('round-trip: serialised state survives migration + validation', () => {
        const state = createInitialState();
        const json = serializeState(state, 'thoracolumbar', 'default', '2.3.0', 'en');
        const migrated = migrateStoredData(json);
        expect(() => validateV4(migrated)).not.toThrow();
    });
});
