import { describe, it, expect } from 'vitest';
import { getNextEmptyLevel } from '../screwNavigation';
import type { Level, Placement, Zone } from '../../types';

const levels: Level[] = [
    { id: 'T10', type: 'T' }, { id: 'T11', type: 'T' }, { id: 'T12', type: 'T' },
    { id: 'L1', type: 'L' }, { id: 'L2', type: 'L' }, { id: 'L3', type: 'L' },
    { id: 'S1', type: 'S' },
];

const mkPlacement = (levelId: string, zone: Zone): Placement => ({
    id: `${levelId}-${zone}`, levelId, zone, tool: 'polyaxial', data: '6.5x45', annotation: '',
});

describe('getNextEmptyLevel', () => {
    it('returns the next level down on the same side', () => {
        expect(getNextEmptyLevel('T10', 'left', levels, [])).toEqual({ levelId: 'T11', zone: 'left' });
    });
    it('skips occupied levels', () => {
        const placements = [mkPlacement('T11', 'left')];
        expect(getNextEmptyLevel('T10', 'left', levels, placements)).toEqual({ levelId: 'T12', zone: 'left' });
    });
    it('returns null when no more empty levels', () => {
        const placements = levels.map(l => mkPlacement(l.id, 'left'));
        expect(getNextEmptyLevel('T10', 'left', levels, placements)).toBeNull();
    });
    it('returns null when at the last level', () => {
        expect(getNextEmptyLevel('S1', 'left', levels, [])).toBeNull();
    });
    it('does not wrap — stops at end', () => {
        const placements = [mkPlacement('S1', 'left')];
        expect(getNextEmptyLevel('L3', 'left', levels, placements)).toBeNull();
    });
    it('only considers standard left/right zones, not pelvic', () => {
        const placements = [mkPlacement('S1', 's2ai_left' as Zone)];
        expect(getNextEmptyLevel('L3', 'left', levels, placements)).toEqual({ levelId: 'S1', zone: 'left' });
    });
    it('traverses into pelvic levels when present', () => {
        const withPelvic: Level[] = [
            ...levels,
            { id: 'S2AI', type: 'pelvic' }, { id: 'Iliac', type: 'pelvic' }, { id: 'SI-J', type: 'pelvic' },
        ];
        expect(getNextEmptyLevel('S1', 'left', withPelvic, [])).toEqual({ levelId: 'S2AI', zone: 'left' });
    });
});
