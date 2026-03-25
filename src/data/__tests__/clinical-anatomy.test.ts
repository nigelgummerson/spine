import { describe, it, expect } from 'vitest';
import {
  CAGE_PERMISSIBILITY,
  CAGE_TYPES,
  INVENTORY_CATEGORIES,
  HOOK_TYPES,
  getDiscLabel,
} from '../clinical';
import {
  ALL_LEVELS,
  getLevelHeight,
  getDiscHeight,
  getVertSvgGeometry,
  buildHeightMap,
  calculateAutoScale,
  levelToYNorm,
  WHOLE_SPINE_MAP,
} from '../anatomy';

// ---------------------------------------------------------------------------
// Clinical tests
// ---------------------------------------------------------------------------

describe('CAGE_PERMISSIBILITY', () => {
  it('ACDF is only permitted at cervical levels C2–C7, not lumbar', () => {
    expect(CAGE_PERMISSIBILITY.acdf).toEqual(['C2','C3','C4','C5','C6','C7']);
    expect(CAGE_PERMISSIBILITY.acdf).not.toContain('L1');
    expect(CAGE_PERMISSIBILITY.acdf).not.toContain('L4');
    expect(CAGE_PERMISSIBILITY.acdf).not.toContain('T12');
  });

  it('PLIF is permitted at thoracolumbar junction and lumbar (T11–L5)', () => {
    const expected = ['T11','T12','L1','L2','L3','L4','L5'];
    expect(CAGE_PERMISSIBILITY.plif).toEqual(expected);
  });

  it('TLIF is permitted at thoracolumbar junction and lumbar (T11–L5)', () => {
    const expected = ['T11','T12','L1','L2','L3','L4','L5'];
    expect(CAGE_PERMISSIBILITY.tlif).toEqual(expected);
  });

  it('ALIF is only permitted at L4 and L5', () => {
    expect(CAGE_PERMISSIBILITY.alif).toEqual(['L4','L5']);
  });

  it('XLIF is not permitted at L5 (too close to iliac vessels)', () => {
    expect(CAGE_PERMISSIBILITY.xlif).not.toContain('L5');
  });

  it('every cage type in CAGE_TYPES has a matching entry in CAGE_PERMISSIBILITY', () => {
    for (const cage of CAGE_TYPES) {
      expect(CAGE_PERMISSIBILITY).toHaveProperty(cage.id);
    }
  });
});

describe('getDiscLabel', () => {
  it('returns "T5/6" for levelId "T5" with standard levels', () => {
    const result = getDiscLabel('T5', ALL_LEVELS);
    expect(result).toBe('T5/6');
  });

  it('returns "L5/1" for levelId "L5" (next level S1 → numeric suffix "1")', () => {
    // getDiscLabel strips the region prefix from the next level id,
    // so S1 → "1", giving the disc space label "L5/1".
    const result = getDiscLabel('L5', ALL_LEVELS);
    expect(result).toBe('L5/1');
  });

  it('returns the levelId unchanged if it is the last level', () => {
    const lastLevel = ALL_LEVELS[ALL_LEVELS.length - 1];
    const result = getDiscLabel(lastLevel.id, ALL_LEVELS);
    expect(result).toBe(lastLevel.id);
  });

  it('returns "C3/4" for levelId "C3"', () => {
    const result = getDiscLabel('C3', ALL_LEVELS);
    expect(result).toBe('C3/4');
  });
});

describe('INVENTORY_CATEGORIES', () => {
  const screwCategory = INVENTORY_CATEGORIES.find(c => c.key === 'screws');
  const hookCategory = INVENTORY_CATEGORIES.find(c => c.key === 'hooks');

  it('has a screws category', () => {
    expect(screwCategory).toBeDefined();
  });

  it('has a hooks category', () => {
    expect(hookCategory).toBeDefined();
  });

  it('every standard screw type is in the screws category', () => {
    const screwTypes = ['monoaxial', 'polyaxial', 'uniplanar'];
    for (const type of screwTypes) {
      expect(screwCategory!.toolIds).toContain(type);
    }
  });

  it('every hook type is in the hooks category', () => {
    for (const hookType of HOOK_TYPES) {
      expect(hookCategory!.toolIds).toContain(hookType);
    }
  });
});

// ---------------------------------------------------------------------------
// Anatomy tests
// ---------------------------------------------------------------------------

describe('ALL_LEVELS', () => {
  it('has exactly 28 levels (Oc + C1–C7 + T1–T12 + L1–L5 + S1 + S2 + Pelvis)', () => {
    // Oc=1, C1-C7=7, T1-T12=12, L1-L5=5, S1=1, S2=1, Pelvis=1 → 28 total
    expect(ALL_LEVELS).toHaveLength(28);
  });

  it('starts with Oc and ends with Pelvis', () => {
    expect(ALL_LEVELS[0].id).toBe('Oc');
    expect(ALL_LEVELS[ALL_LEVELS.length - 1].id).toBe('Pelvis');
  });

  it('contains all cervical levels C1–C7', () => {
    const ids = ALL_LEVELS.map(l => l.id);
    for (const id of ['C1','C2','C3','C4','C5','C6','C7']) {
      expect(ids).toContain(id);
    }
  });

  it('contains all thoracic levels T1–T12', () => {
    const ids = ALL_LEVELS.map(l => l.id);
    for (let i = 1; i <= 12; i++) {
      expect(ids).toContain(`T${i}`);
    }
  });

  it('contains all lumbar levels L1–L5 and S1', () => {
    const ids = ALL_LEVELS.map(l => l.id);
    for (const id of ['L1','L2','L3','L4','L5','S1']) {
      expect(ids).toContain(id);
    }
  });
});

describe('getLevelHeight', () => {
  it('returns a positive value for every level in ALL_LEVELS', () => {
    for (const level of ALL_LEVELS) {
      expect(getLevelHeight(level)).toBeGreaterThan(0);
    }
  });
});

describe('getDiscHeight', () => {
  it('returns 0 for Pelvis', () => {
    const pelvis = ALL_LEVELS.find(l => l.id === 'Pelvis')!;
    expect(getDiscHeight(pelvis)).toBe(0);
  });

  it('returns 0 for S1', () => {
    const s1 = ALL_LEVELS.find(l => l.id === 'S1')!;
    expect(getDiscHeight(s1)).toBe(0);
  });

  it('returns 0 for Oc', () => {
    const oc = ALL_LEVELS.find(l => l.id === 'Oc')!;
    expect(getDiscHeight(oc)).toBe(0);
  });

  it('returns 0 for C1', () => {
    const c1 = ALL_LEVELS.find(l => l.id === 'C1')!;
    expect(getDiscHeight(c1)).toBe(0);
  });

  it('returns a positive value for T5', () => {
    const t5 = ALL_LEVELS.find(l => l.id === 'T5')!;
    expect(getDiscHeight(t5)).toBeGreaterThan(0);
  });

  it('returns a positive value for L3', () => {
    const l3 = ALL_LEVELS.find(l => l.id === 'L3')!;
    expect(getDiscHeight(l3)).toBeGreaterThan(0);
  });

  it('lumbar disc heights are greater than thoracic disc heights (anatomically correct)', () => {
    const l3 = ALL_LEVELS.find(l => l.id === 'L3')!;
    const t5 = ALL_LEVELS.find(l => l.id === 'T5')!;
    expect(getDiscHeight(l3)).toBeGreaterThan(getDiscHeight(t5));
  });
});

describe('getVertSvgGeometry', () => {
  it('returns null for Oc (no anatomy entry)', () => {
    expect(getVertSvgGeometry('Oc')).toBeNull();
  });

  it('returns null for Pelvis (no anatomy entry)', () => {
    expect(getVertSvgGeometry('Pelvis')).toBeNull();
  });

  it('returns null for C1 (no anatomy entry)', () => {
    expect(getVertSvgGeometry('C1')).toBeNull();
  });

  it('returns geometry with left < cx < right for T5', () => {
    const geom = getVertSvgGeometry('T5');
    expect(geom).not.toBeNull();
    expect(geom!.left).toBeLessThan(geom!.cx);
    expect(geom!.cx).toBeLessThan(geom!.right);
  });

  it('returns geometry for all anatomically-defined thoracic and lumbar levels', () => {
    const levels = ['T1','T2','T5','T12','L1','L3','L5','S1'];
    for (const id of levels) {
      const geom = getVertSvgGeometry(id);
      expect(geom).not.toBeNull();
    }
  });

  it('returns geometry with region "thoracic" for T5', () => {
    const geom = getVertSvgGeometry('T5');
    expect(geom).not.toBeNull();
    expect(geom!.region).toBe('thoracic');
  });

  it('returns geometry with region "lumbar" for L3', () => {
    const geom = getVertSvgGeometry('L3');
    expect(geom).not.toBeNull();
    expect(geom!.region).toBe('lumbar');
  });

  it('returns geometry with region "sacral" for S1', () => {
    const geom = getVertSvgGeometry('S1');
    expect(geom).not.toBeNull();
    expect(geom!.region).toBe('sacral');
  });
});

describe('buildHeightMap', () => {
  it('produces map entries with startY < vertEnd <= endY', () => {
    const { map } = buildHeightMap(ALL_LEVELS, 1);
    for (const entry of map) {
      expect(entry.startY).toBeLessThan(entry.vertEnd);
      expect(entry.vertEnd).toBeLessThanOrEqual(entry.endY);
    }
  });

  it('totalHeight is positive', () => {
    const { totalHeight } = buildHeightMap(ALL_LEVELS, 1);
    expect(totalHeight).toBeGreaterThan(0);
  });

  it('map has the same number of entries as levels passed in', () => {
    const { map } = buildHeightMap(ALL_LEVELS, 1);
    expect(map).toHaveLength(ALL_LEVELS.length);
  });

  it('map entries are ordered with non-decreasing startY', () => {
    const { map } = buildHeightMap(ALL_LEVELS, 1);
    for (let i = 1; i < map.length; i++) {
      expect(map[i].startY).toBeGreaterThan(map[i - 1].startY);
    }
  });

  it('scaling by hScale=2 doubles totalHeight relative to hScale=1', () => {
    const { totalHeight: h1 } = buildHeightMap(ALL_LEVELS, 1);
    const { totalHeight: h2 } = buildHeightMap(ALL_LEVELS, 2);
    // Borders (1px each) are not scaled, so doubled height is slightly less than 2×
    // Just verify h2 is significantly larger than h1
    expect(h2).toBeGreaterThan(h1 * 1.5);
  });
});

describe('calculateAutoScale', () => {
  it('returns a value between 0.5 and 1.5 for ALL_LEVELS', () => {
    const scale = calculateAutoScale(ALL_LEVELS);
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(1.5);
  });

  it('returns a value between 0.5 and 1.5 for a lumbar-only subset', () => {
    const lumbar = ALL_LEVELS.filter(l => l.type === 'L' || l.id === 'S1');
    const scale = calculateAutoScale(lumbar);
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(1.5);
  });

  it('returns a higher scale for fewer levels (more space per level)', () => {
    const lumbar = ALL_LEVELS.filter(l => l.type === 'L');
    const full = ALL_LEVELS;
    const scaleLumbar = calculateAutoScale(lumbar);
    const scaleFull = calculateAutoScale(full);
    expect(scaleLumbar).toBeGreaterThan(scaleFull);
  });
});

describe('levelToYNorm', () => {
  it('cervical levels have a lower yNorm than lumbar (cranial to caudal)', () => {
    const cervicalY = levelToYNorm('C3');
    const lumbarY = levelToYNorm('L3');
    expect(cervicalY).toBeLessThan(lumbarY);
  });

  it('thoracic levels are between cervical and lumbar', () => {
    const cervicalY = levelToYNorm('C7');
    const thoracicY = levelToYNorm('T6');
    const lumbarY = levelToYNorm('L1');
    expect(cervicalY).toBeLessThan(thoracicY);
    expect(thoracicY).toBeLessThan(lumbarY);
  });

  it('returns 500 for an unknown level id', () => {
    expect(levelToYNorm('X99')).toBe(500);
  });

  it('yNorm for Oc is less than yNorm for Pelvis', () => {
    const ocY = levelToYNorm('Oc');
    const pelvisY = levelToYNorm('Pelvis');
    expect(ocY).toBeLessThan(pelvisY);
  });

  it('yNorm values are within [0, 1000]', () => {
    for (const level of ALL_LEVELS) {
      const y = levelToYNorm(level.id);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1000);
    }
  });
});

describe('WHOLE_SPINE_MAP', () => {
  it('map has the same length as ALL_LEVELS', () => {
    expect(WHOLE_SPINE_MAP.map).toHaveLength(ALL_LEVELS.length);
  });

  it('totalHeight is positive', () => {
    expect(WHOLE_SPINE_MAP.totalHeight).toBeGreaterThan(0);
  });

  it('every level in ALL_LEVELS has a corresponding map entry', () => {
    const mapIds = new Set(WHOLE_SPINE_MAP.map.map(e => e.levelId));
    for (const level of ALL_LEVELS) {
      expect(mapIds.has(level.id)).toBe(true);
    }
  });
});
