import type { Level, Placement, Zone } from '../types';

/** Finds the next empty level below currentLevelId on the given side.
 * Returns null if no more empty levels. */
export function getNextEmptyLevel(
    currentLevelId: string,
    side: 'left' | 'right',
    levels: Level[],
    placements: Placement[],
): { levelId: string; zone: Zone } | null {
    const idx = levels.findIndex(l => l.id === currentLevelId);
    if (idx === -1) return null;
    for (let i = idx + 1; i < levels.length; i++) {
        const lvl = levels[i];
        const occupied = placements.some(p => p.levelId === lvl.id && p.zone === side);
        if (!occupied) return { levelId: lvl.id, zone: side };
    }
    return null;
}
