import { describe, it, expect } from 'vitest';
import { validateV4 } from '../../state/schema';
import { deserializeDocument } from '../../state/documentReducer';
import demoCase from './demo-case.json';

describe('demo-case.json', () => {
  it('passes Zod v4 schema validation', () => {
    const result = validateV4(demoCase);
    expect(result).toBeDefined();
    expect(result.schema.format).toBe('spinal-instrumentation');
    expect(result.schema.version).toBe(4);
  });

  it('deserializes into valid DocumentState', () => {
    const { state } = deserializeDocument(demoCase as Record<string, unknown>);
    expect(state.documentId).toBe('d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f80');
    expect(state.patientData.name).toBe('Demo Patient');
    expect(state.patientData.id).toBe('DEMO-001');
    expect(state.patientData.surgeon).toBe('Mr A Smith');
    expect(state.patientData.location).toBe('Leeds General Infirmary');
    expect(state.patientData.company).toBe('Stryker');
    expect(state.patientData.screwSystem).toBe('Xia 3');
  });

  it('has all plan element types represented', () => {
    const elements = demoCase.plan.elements;
    const types = new Set(elements.map(e => e.type));
    expect(types).toContain('screw');
    expect(types).toContain('hook');
    expect(types).toContain('fixation');
    expect(types).toContain('osteotomy');
    expect(types).toContain('cage');
    expect(types).toContain('connector');
  });

  it('has forces in the plan', () => {
    const forces = demoCase.plan.forces;
    const types = new Set(forces.map(f => f.type));
    expect(types).toContain('distraction');
    expect(types).toContain('compression');
    expect(types).toContain('translation');
  });

  it('has plan rods including a transition rod', () => {
    const rods = demoCase.plan.rods;
    expect(rods).toHaveLength(2);
    const transitionRod = rods.find(r => r.profile === 'transition');
    expect(transitionRod).toBeDefined();
    expect(transitionRod!.transitionFrom).toBe(3.5);
    expect(transitionRod!.transitionTo).toBe(5.5);
  });

  it('has plan notes', () => {
    expect(demoCase.plan.notes).toHaveLength(5);
    const texts = demoCase.plan.notes.map(n => n.text);
    expect(texts).toContain('UIV');
    expect(texts).toContain('LIV');
    expect(texts).toContain('Rod transition');
    expect(texts).toContain('Decompression');
  });

  it('has bone graft data', () => {
    expect(demoCase.plan.boneGraft.types).toContain('local-bone');
    expect(demoCase.plan.boneGraft.types).toContain('allograft');
    expect(demoCase.plan.boneGraft.types).toContain('BMP');
    expect(demoCase.plan.boneGraft.notes).toBe('Posterior fusion T4-S1');
  });

  it('has partial construct (ghost placement demo)', () => {
    const constElements = demoCase.construct.elements;
    expect(constElements.length).toBeGreaterThan(0);
    expect(constElements.length).toBeLessThan(demoCase.plan.elements.length);
    // Verify specific confirmed levels
    const levels = new Set(constElements.map(e => e.level));
    expect(levels).toContain('T4');
    expect(levels).toContain('L5');
    expect(levels).toContain('S1');
  });

  it('has a cortical trajectory screw', () => {
    const cbtScrew = demoCase.plan.elements.find(e => e.trajectory === 'cortical');
    expect(cbtScrew).toBeDefined();
    expect(cbtScrew!.level).toBe('L3');
    expect(cbtScrew!.screw?.diameter).toBe(5.0);
  });

  it('has pelvic fixation (S2AI)', () => {
    const s2ai = demoCase.plan.elements.filter(e => e.level === 'S2AI');
    expect(s2ai).toHaveLength(2); // bilateral
  });

  it('has osteotomies with reconstruction cage', () => {
    const pso = demoCase.plan.elements.find(
      e => e.type === 'osteotomy' && e.osteotomy?.osteotomyType === 'PSO'
    );
    expect(pso).toBeDefined();
    expect(pso!.osteotomy!.reconstructionCage).toBe('VBR mesh');
    expect(pso!.osteotomy!.schwabGrade).toBe(3);
    expect(pso!.osteotomy!.correctionAngle).toBe(30);
  });

  it('round-trips through deserialize without errors', () => {
    const { state, colourScheme } = deserializeDocument(demoCase as Record<string, unknown>);

    // Check plan has all placement types
    const planTools = new Set(state.plannedPlacements.map(p => p.tool));
    expect(planTools).toContain('polyaxial');
    expect(planTools).toContain('pedicle_hook');
    expect(planTools).toContain('band');
    expect(planTools).toContain('osteotomy');

    // Check cages deserialized
    expect(state.plannedCages.length).toBe(2);
    const tlifCage = state.plannedCages.find(c => c.tool === 'tlif');
    expect(tlifCage).toBeDefined();

    // Check connectors deserialized
    expect(state.plannedConnectors.length).toBe(2);

    // Check notes deserialized
    expect(state.plannedNotes.length).toBe(5);

    // Check construct partial
    expect(state.completedPlacements.length).toBe(6);

    // Check rod data
    expect(state.patientData.planLeftRod.material).toBe('titanium');
    expect(state.patientData.planRightRod.profile).toBe('transition');

    // Check UI prefs
    expect(colourScheme).toBe('stryker');
  });
});
