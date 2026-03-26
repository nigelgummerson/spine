import { describe, it, expect } from 'vitest';
import {
  CAGE_PERMISSIBILITY,
  CAGE_TYPES,
  INVENTORY_CATEGORIES,
  HOOK_TYPES,
  getDiscLabel,
  getPermittedOsteotomyTypes,
} from '../clinical';
import { getScrewDefault, SCREW_DEFAULTS } from '../implants';
import {
  ALL_LEVELS,
  VERTEBRA_ANATOMY,
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

  it('ALIF is permitted at L3, L4 and L5', () => {
    expect(CAGE_PERMISSIBILITY.alif).toEqual(['L3','L4','L5']);
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
  it('returns geometry with region "occiput" for Oc', () => {
    const geom = getVertSvgGeometry('Oc');
    expect(geom).not.toBeNull();
    expect(geom!.region).toBe('occiput');
  });

  it('returns null for Pelvis (no anatomy entry)', () => {
    expect(getVertSvgGeometry('Pelvis')).toBeNull();
  });

  it('returns geometry with region "cervical-upper" for C1', () => {
    const geom = getVertSvgGeometry('C1');
    expect(geom).not.toBeNull();
    expect(geom!.region).toBe('cervical-upper');
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
  it('returns a value between 0.3 and 1.5 for ALL_LEVELS', () => {
    const scale = calculateAutoScale(ALL_LEVELS);
    expect(scale).toBeGreaterThanOrEqual(0.3);
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

describe('cervical anatomy data', () => {
    it('every level Oc-C7 has an entry in VERTEBRA_ANATOMY', () => {
        for (const id of ['Oc','C1','C2','C3','C4','C5','C6','C7']) {
            expect(VERTEBRA_ANATOMY[id]).toBeDefined();
        }
    });

    it('getVertSvgGeometry returns occiput region for Oc', () => {
        const geom = getVertSvgGeometry('Oc');
        expect(geom).not.toBeNull();
        expect(geom!.region).toBe('occiput');
    });

    it('getVertSvgGeometry returns cervical-upper region for C1 and C2', () => {
        for (const id of ['C1', 'C2']) {
            const geom = getVertSvgGeometry(id);
            expect(geom).not.toBeNull();
            expect(geom!.region).toBe('cervical-upper');
        }
    });

    it('getVertSvgGeometry returns cervical-subaxial region for C3-C7', () => {
        for (const id of ['C3','C4','C5','C6','C7']) {
            const geom = getVertSvgGeometry(id);
            expect(geom).not.toBeNull();
            expect(geom!.region).toBe('cervical-subaxial');
        }
    });

    it('C1 is wider than C3 (widest cervical level)', () => {
        const c1 = getVertSvgGeometry('C1')!;
        const c3 = getVertSvgGeometry('C3')!;
        expect(c1.bw).toBeGreaterThan(c3.bw);
    });

    it('lateral mass coordinates are lateral to body edges for C1-C6', () => {
        for (const id of ['C1','C2']) {
            const geom = getVertSvgGeometry(id);
            expect(geom).not.toBeNull();
            if (geom && geom.region === 'cervical-upper') {
                expect(geom.latMassLeftCx).toBeLessThan(geom.left);
                expect(geom.latMassRightCx).toBeGreaterThan(geom.right);
            }
        }
        for (const id of ['C3','C4','C5','C6']) {
            const geom = getVertSvgGeometry(id);
            expect(geom).not.toBeNull();
            if (geom && geom.region === 'cervical-subaxial') {
                expect(geom.latMassLeftCx).toBeLessThan(geom.left);
                expect(geom.latMassRightCx).toBeGreaterThan(geom.right);
            }
        }
    });

    it('C7 geometry includes pedicle coordinates', () => {
        const geom = getVertSvgGeometry('C7');
        expect(geom).not.toBeNull();
        if (geom && geom.region === 'cervical-subaxial') {
            expect(geom.pedRx).toBeDefined();
            expect(geom.pedRy).toBeDefined();
            expect(geom.pedLeftCx).toBeDefined();
            expect(geom.pedRightCx).toBeDefined();
        }
    });

    it('occiput screw zones are parasagittal (close to midline)', () => {
        const geom = getVertSvgGeometry('Oc');
        if (geom && geom.region === 'occiput') {
            expect(geom.screwLeftCx).toBeGreaterThan(50);
            expect(geom.screwLeftCx).toBeLessThan(80);
            expect(geom.screwRightCx).toBeGreaterThan(80);
            expect(geom.screwRightCx).toBeLessThan(110);
        }
    });

    it('getLevelHeight returns per-level heights for cervical (not flat 24)', () => {
        const c1H = getLevelHeight({ id: 'C1', type: 'C' });
        const c7H = getLevelHeight({ id: 'C7', type: 'C' });
        expect(c7H).toBeGreaterThan(c1H);
    });

    it('getDiscHeight returns 0 for Oc and C1', () => {
        expect(getDiscHeight({ id: 'Oc', type: 'Oc' })).toBe(0);
        expect(getDiscHeight({ id: 'C1', type: 'C' })).toBe(0);
    });

    it('calculateAutoScale returns valid range for cervical-only subset', () => {
        const cervical = ALL_LEVELS.filter(l => l.type === 'C' || l.type === 'Oc');
        const scale = calculateAutoScale(cervical);
        expect(scale).toBeGreaterThanOrEqual(0.5);
        expect(scale).toBeLessThanOrEqual(1.5);
    });
});

// ---------------------------------------------------------------------------
// QA5: Cage permissibility — modal-level disabled states
// ---------------------------------------------------------------------------

describe('CAGE_PERMISSIBILITY — disabled levels', () => {
    it('ACDF is disabled for levels outside C2-C7', () => {
        expect(CAGE_PERMISSIBILITY.acdf).not.toContain('L1');
        expect(CAGE_PERMISSIBILITY.acdf).not.toContain('T5');
        expect(CAGE_PERMISSIBILITY.acdf).not.toContain('C1');
        expect(CAGE_PERMISSIBILITY.acdf).not.toContain('Oc');
    });

    it('PLIF is disabled for levels outside T11-L5', () => {
        expect(CAGE_PERMISSIBILITY.plif).not.toContain('C5');
        expect(CAGE_PERMISSIBILITY.plif).not.toContain('T5');
        expect(CAGE_PERMISSIBILITY.plif).not.toContain('T10');
        expect(CAGE_PERMISSIBILITY.plif).not.toContain('S1');
    });

    it('TLIF is disabled for levels outside T11-L5', () => {
        expect(CAGE_PERMISSIBILITY.tlif).not.toContain('C5');
        expect(CAGE_PERMISSIBILITY.tlif).not.toContain('T5');
        expect(CAGE_PERMISSIBILITY.tlif).not.toContain('T10');
    });

    it('XLIF is disabled at L5', () => {
        expect(CAGE_PERMISSIBILITY.xlif).not.toContain('L5');
    });

    it('XLIF is disabled at cervical levels', () => {
        expect(CAGE_PERMISSIBILITY.xlif).not.toContain('C5');
    });

    it('OLIF is disabled for levels outside T12-L4', () => {
        expect(CAGE_PERMISSIBILITY.olif).not.toContain('T11');
        expect(CAGE_PERMISSIBILITY.olif).not.toContain('L5');
        expect(CAGE_PERMISSIBILITY.olif).not.toContain('C5');
    });

    it('ALIF is disabled for levels outside L3-L5', () => {
        expect(CAGE_PERMISSIBILITY.alif).not.toContain('L2');
        expect(CAGE_PERMISSIBILITY.alif).not.toContain('T12');
        expect(CAGE_PERMISSIBILITY.alif).not.toContain('C5');
    });
});

// ---------------------------------------------------------------------------
// QA6: Osteotomy restriction tests
// ---------------------------------------------------------------------------

describe('getPermittedOsteotomyTypes', () => {
    it('returns empty array for Oc (no osteotomies)', () => {
        expect(getPermittedOsteotomyTypes('Oc')).toEqual([]);
    });

    it('returns empty array for C1 (no osteotomies)', () => {
        expect(getPermittedOsteotomyTypes('C1')).toEqual([]);
    });

    it('returns empty array for C2 (no osteotomies)', () => {
        expect(getPermittedOsteotomyTypes('C2')).toEqual([]);
    });

    it('returns only Corpectomy for C5 (cervical subaxial)', () => {
        expect(getPermittedOsteotomyTypes('C5')).toEqual(['Corpectomy']);
    });

    it('returns only Corpectomy for C3', () => {
        expect(getPermittedOsteotomyTypes('C3')).toEqual(['Corpectomy']);
    });

    it('returns only Corpectomy for C7', () => {
        expect(getPermittedOsteotomyTypes('C7')).toEqual(['Corpectomy']);
    });

    it('returns null (all permitted) for T5', () => {
        expect(getPermittedOsteotomyTypes('T5')).toBeNull();
    });

    it('returns null (all permitted) for L3', () => {
        expect(getPermittedOsteotomyTypes('L3')).toBeNull();
    });

    it('returns null (all permitted) for T1', () => {
        expect(getPermittedOsteotomyTypes('T1')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// QA8: Screw defaults at modal level
// ---------------------------------------------------------------------------

describe('getScrewDefault', () => {
    it('returns { diameter: "3.5", length: "14" } for C3', () => {
        expect(getScrewDefault('C3')).toEqual({ diameter: '3.5', length: '14' });
    });

    it('returns { diameter: "3.5", length: "14" } for C7', () => {
        expect(getScrewDefault('C7')).toEqual({ diameter: '3.5', length: '14' });
    });

    it('returns null for Oc (no safe default)', () => {
        expect(getScrewDefault('Oc')).toBeNull();
    });

    it('returns null for C1 (no safe default)', () => {
        expect(getScrewDefault('C1')).toBeNull();
    });

    it('returns null for C2 (no safe default)', () => {
        expect(getScrewDefault('C2')).toBeNull();
    });

    it('returns expected thoracic default for T1', () => {
        expect(getScrewDefault('T1')).toEqual({ diameter: '4.5', length: '28' });
    });

    it('returns expected lumbar default for L3', () => {
        expect(getScrewDefault('L3')).toEqual({ diameter: '6.5', length: '45' });
    });

    it('returns expected pelvic default for S2AI', () => {
        expect(getScrewDefault('S2AI')).toEqual({ diameter: '7.5', length: '80' });
    });

    it('returns null for unknown level', () => {
        expect(getScrewDefault('X99')).toBeNull();
    });

    it('has defaults for all levels C3 through S2AI', () => {
        const expectedLevels = [
            'C3','C4','C5','C6','C7',
            'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12',
            'L1','L2','L3','L4','L5',
            'S1','S2','S2AI','Iliac','SI-J',
        ];
        for (const level of expectedLevels) {
            expect(getScrewDefault(level)).not.toBeNull();
        }
    });
});

// ---------------------------------------------------------------------------
// QA10: Chart stress test — whole spine + pelvis
// ---------------------------------------------------------------------------

describe('chart stress test — whole spine', () => {
    it('getLevelHeight returns positive values for all standard levels', () => {
        for (const level of ALL_LEVELS) {
            const height = getLevelHeight(level);
            expect(height).toBeGreaterThan(0);
        }
    });

    it('calculateAutoScale with whole spine returns a valid scale factor', () => {
        const scale = calculateAutoScale(ALL_LEVELS);
        expect(scale).toBeGreaterThan(0);
        expect(scale).toBeLessThan(2);
        expect(typeof scale).toBe('number');
        expect(Number.isFinite(scale)).toBe(true);
    });

    it('buildHeightMap handles all 28 levels without error', () => {
        const { map, totalHeight } = buildHeightMap(ALL_LEVELS, 1);
        expect(map).toHaveLength(28);
        expect(totalHeight).toBeGreaterThan(0);
    });

    it('buildHeightMap entries cover from Oc to Pelvis', () => {
        const { map } = buildHeightMap(ALL_LEVELS, 1);
        expect(map[0].levelId).toBe('Oc');
        expect(map[map.length - 1].levelId).toBe('Pelvis');
    });

    it('levelToYNorm returns valid values for all levels including pelvic', () => {
        for (const level of ALL_LEVELS) {
            const y = levelToYNorm(level.id);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(1000);
        }
    });

    it('WHOLE_SPINE_MAP covers all 28 levels', () => {
        expect(WHOLE_SPINE_MAP.map).toHaveLength(ALL_LEVELS.length);
        expect(WHOLE_SPINE_MAP.totalHeight).toBeGreaterThan(0);
    });
});
