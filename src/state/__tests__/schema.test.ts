// src/state/__tests__/schema.test.js
import { describe, it, expect } from 'vitest';
import { validateV4, ValidationError } from '../schema';
import { createInitialState, serializeState } from '../documentReducer';

// Helper: minimal valid v4 JSON
function validV4() {
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

    it('accepts unknown extra fields (forward compatibility)', () => {
        const json = validV4();
        json.futureField = 'something';
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial' }, futureField: true },
        ];
        expect(() => validateV4(json)).not.toThrow();
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

    // --- Error format ---

    it('ValidationError has issues array and descriptive message', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'bolt', level: 'T5', side: 'left' },
        ];
        try {
            validateV4(json);
            expect.fail('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ValidationError);
            expect(err.issues).toBeInstanceOf(Array);
            expect(err.issues.length).toBeGreaterThan(0);
            expect(err.message).toContain('Invalid file');
            expect(err.message).toContain('error');
        }
    });
});
