# Cervical Spine & Occiput Rendering Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic cervical vertebra shapes with anatomically proportioned silhouettes using a discriminated union data model, with lateral mass screw zones for C1-C6.

**Architecture:** Refactor `VertAnatomyEntry` into a discriminated union with region-specific interfaces. Add cervical measurement data (Oc-C7) to `VERTEBRA_ANATOMY`. Update `getVertSvgGeometry()` to return region-typed geometry for all levels. Update SpineVertebra with 5 distinct cervical shapes and LevelRow with lateral-mass-based click zones.

**Tech Stack:** TypeScript (strict), React 19, SVG, Vitest

**Spec:** `specs/2026-03-25-cervical-spine-redesign.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/anatomy.ts` | Modify | Discriminated union types, cervical measurement data, updated `getVertSvgGeometry()` and `getLevelHeight()` |
| `src/components/chart/SpineVertebra.tsx` | Modify | 5 new cervical SVG shapes (Oc, C1, C2, C3-C6, C7), type narrowing on geom |
| `src/components/chart/LevelRow.tsx` | Modify | Lateral mass click zone positioning for cervical, type narrowing on geom |
| `src/components/chart/CageVisualization.tsx` | Modify | Type narrowing on geom (uses `geom.left`/`geom.right` — in GeomBase, minimal change) |
| `src/components/chart/PelvisRegion.tsx` | Modify | Type narrowing on S1/S2 geom (accesses `pedLeftCx`/`pedRightCx`/`pedRy`) |
| `src/App.tsx` | Modify | Remove unused `getVertSvgGeometry` import if confirmed unused, or add type narrowing |
| `src/data/__tests__/clinical-anatomy.test.ts` | Modify | Update null-return tests for Oc/C1, add cervical anatomy tests |

### Consumer Impact Summary

These files call `getVertSvgGeometry()` and access properties on the result:

1. **SpineVertebra.tsx** (line 15): Calls `geom = getVertSvgGeometry(label)`, accesses `.left`, `.right` for corpectomy and T/L/S body rendering. Cervical paths don't use geom currently — they'll use it after this change.
2. **LevelRow.tsx** (lines 117, 124): Calls for current level and S1. Accesses `.pedLeftCx`, `.pedRightCx`, `.pedRy`. Cervical levels currently get `null` and fall back.
3. **CageVisualization.tsx** (line 15): Accesses `.left`, `.right` (in GeomBase — safe across all union members). Falls back to constants if null. Minimal change needed.
4. **PelvisRegion.tsx** (lines 243-244): Calls for S1/S2 specifically. Accesses `.pedLeftCx`, `.pedRightCx`, `.pedRy`. These are always sacral — type narrowing straightforward.
5. **App.tsx** (line 13): Imports but never calls `getVertSvgGeometry` directly. Can remove from import.

---

### Task 1: Refactor anatomy types to discriminated union

**Files:**
- Modify: `src/data/anatomy.ts:1-8` (type definitions)
- Test: `src/data/__tests__/clinical-anatomy.test.ts`

This task changes the type system only. No measurement data yet — existing T1-S2 entries get `region` tags. Cervical entries come in Task 2.

- [ ] **Step 1: Write failing tests for region discriminant on existing levels**

Add to `clinical-anatomy.test.ts`, in the `getVertSvgGeometry` describe block:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `region` property doesn't exist on current return type.

- [ ] **Step 3: Replace flat VertAnatomyEntry with discriminated union**

In `src/data/anatomy.ts`, replace the `VertAnatomyEntry` interface (lines 3-8) with:

```typescript
interface AnatomyBase {
    bodyW: number;
    bodyH: number;
}

interface OccipitAnatomy extends AnatomyBase {
    region: 'occiput';
    foramenMagnumW: number;
    condyleW: number;
}

interface CervicalUpperAnatomy extends AnatomyBase {
    region: 'cervical-upper';
    latMassW: number;
    latMassH: number;
    totalWidth: number;
}

interface CervicalSubaxialAnatomy extends AnatomyBase {
    region: 'cervical-subaxial';
    latMassW: number;
    latMassH: number;
    pedW?: number;
    pedH?: number;
}

interface ThoracicAnatomy extends AnatomyBase {
    region: 'thoracic';
    pedW: number;
    pedH: number;
}

interface LumbarAnatomy extends AnatomyBase {
    region: 'lumbar';
    pedW: number;
    pedH: number;
}

interface SacralAnatomy extends AnatomyBase {
    region: 'sacral';
    pedW: number;
    pedH: number;
}

type VertAnatomyEntry =
    | OccipitAnatomy
    | CervicalUpperAnatomy
    | CervicalSubaxialAnatomy
    | ThoracicAnatomy
    | LumbarAnatomy
    | SacralAnatomy;
```

- [ ] **Step 4: Add region tags to existing VERTEBRA_ANATOMY entries**

Add `region: 'thoracic'` to T1-T12, `region: 'lumbar'` to L1-L5, `region: 'sacral'` to S1-S2. Example:

```typescript
T1:  { region: 'thoracic', bodyW: 33.1, bodyH: 18.9, pedW: 9.3, pedH:  9.0 },
// ... all T entries get region: 'thoracic'
L1:  { region: 'lumbar', bodyW: 45.0, bodyH: 24.5, pedW: 7.5, pedH: 15.4 },
// ... all L entries get region: 'lumbar'
S1:  { region: 'sacral', bodyW: 100.0, bodyH: 28.0, pedW: 20.0, pedH: 14.0 },
S2:  { region: 'sacral', bodyW: 83.0, bodyH: 22.0, pedW: 18.0, pedH: 11.0 },
```

- [ ] **Step 5: Define geometry return union and update getVertSvgGeometry**

Add these types before `getVertSvgGeometry` in `src/data/anatomy.ts`:

```typescript
interface GeomBase {
    region: string;
    left: number;
    right: number;
    cx: number;
    bw: number;
}

interface OccipitGeom extends GeomBase {
    region: 'occiput';
    condyleLeftCx: number;
    condyleRightCx: number;
    condyleRx: number;
    condyleRy: number;
    foramenRx: number;
    foramenRy: number;
    screwLeftCx: number;
    screwRightCx: number;
}

interface CervicalUpperGeom extends GeomBase {
    region: 'cervical-upper';
    latMassLeftCx: number;
    latMassRightCx: number;
    latMassRx: number;
    latMassRy: number;
    latMassCy: number;
}

interface CervicalSubaxialGeom extends GeomBase {
    region: 'cervical-subaxial';
    latMassLeftCx: number;
    latMassRightCx: number;
    latMassRx: number;
    latMassRy: number;
    latMassCy: number;
    pedLeftCx?: number;
    pedRightCx?: number;
    pedRx?: number;
    pedRy?: number;
}

interface ThoracicGeom extends GeomBase {
    region: 'thoracic';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

interface LumbarGeom extends GeomBase {
    region: 'lumbar';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

interface SacralGeom extends GeomBase {
    region: 'sacral';
    pedLeftCx: number;
    pedRightCx: number;
    pedRx: number;
    pedRy: number;
    pedCy: number;
}

export type VertSvgGeometry =
    | OccipitGeom
    | CervicalUpperGeom
    | CervicalSubaxialGeom
    | ThoracicGeom
    | LumbarGeom
    | SacralGeom;
```

Update `getVertSvgGeometry` to return `VertSvgGeometry | null` and add `region` and `pedCy` to the return object. The existing T/L/S branch becomes:

```typescript
export const getVertSvgGeometry = (levelId: string): VertSvgGeometry | null => {
    const a = VERTEBRA_ANATOMY[levelId];
    if (!a) return null;
    const scale = 130 / 54.0;
    const bw = a.bodyW * scale;
    const cx = 80;
    const left = cx - bw / 2;
    const right = cx + bw / 2;

    if (a.region === 'thoracic' || a.region === 'lumbar' || a.region === 'sacral') {
        const pedInset = (a.pedW * scale) * 0.5;
        const pedLeftCx = left + pedInset + 5;
        const pedRightCx = right - pedInset - 5;
        const pedScale = 1.0;
        const pedRx = Math.max(1.5, (a.pedW * scale / 2) * pedScale);
        const pedRy = Math.max(2, (a.pedH * scale / 2) * pedScale);
        const pedCy = VERT_PAD + pedRy + 5;
        return { region: a.region, left, right, cx, bw, pedLeftCx, pedRightCx, pedRx, pedRy, pedCy };
    }

    // Cervical branches added in Task 2
    return null;
};
```

Note: `isLumbar` is removed from the return object — it had no external consumers.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --reporter verbose 2>&1 | tail -30`
Expected: All existing tests pass, plus the 3 new region tests pass. The null-return tests for Oc/C1 still pass (no cervical data yet).

- [ ] **Step 7: Run type-check**

Run: `npm run type-check 2>&1 | tail -20`
Expected: Type errors in consumer files (LevelRow, SpineVertebra, PelvisRegion) because they access `.pedLeftCx` etc. without narrowing the union. These are expected and will be fixed in Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/data/anatomy.ts src/data/__tests__/clinical-anatomy.test.ts
git commit -m "refactor: discriminated union for VertAnatomyEntry with region tags"
```

---

### Task 2: Add cervical measurement data (Oc-C7)

**Files:**
- Modify: `src/data/anatomy.ts` (VERTEBRA_ANATOMY entries + getVertSvgGeometry cervical branches)
- Test: `src/data/__tests__/clinical-anatomy.test.ts`

- [ ] **Step 1: Write failing tests for cervical anatomy data**

Add to `clinical-anatomy.test.ts`:

```typescript
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
            // Screw zones within 30 SVG units of midline (80)
            expect(geom.screwLeftCx).toBeGreaterThan(50);
            expect(geom.screwLeftCx).toBeLessThan(80);
            expect(geom.screwRightCx).toBeGreaterThan(80);
            expect(geom.screwRightCx).toBeLessThan(110);
        }
    });

    it('getLevelHeight returns per-level heights for cervical (not flat 24)', () => {
        const c1H = getLevelHeight({ id: 'C1', type: 'C' });
        const c7H = getLevelHeight({ id: 'C7', type: 'C' });
        // C1 body ~10mm, C7 body ~17mm — heights should differ
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — VERTEBRA_ANATOMY has no Oc/C1-C7 entries.

- [ ] **Step 3: Update existing null-return tests**

The tests at lines 192-202 that assert `getVertSvgGeometry('Oc')` and `getVertSvgGeometry('C1')` return null need updating. Change them to:

```typescript
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
```

- [ ] **Step 4: Add cervical entries to VERTEBRA_ANATOMY**

Add before the T1 entry in `VERTEBRA_ANATOMY`:

```typescript
// Cervical: Panjabi et al. (1991), An et al. (1991), Tan et al. (2004),
// Gupta & Goel (2000), Xu et al. (1999), Ebraheim et al. (1996, 1997),
// Naderi et al. (2005)
Oc:  { region: 'occiput', bodyW: 78, bodyH: 12, foramenMagnumW: 35, condyleW: 22 },
C1:  { region: 'cervical-upper', bodyW: 22, bodyH: 10, latMassW: 16, latMassH: 12, totalWidth: 80 },
C2:  { region: 'cervical-upper', bodyW: 18, bodyH: 20, latMassW: 12, latMassH: 14, totalWidth: 54 },
C3:  { region: 'cervical-subaxial', bodyW: 16.5, bodyH: 14.5, latMassW: 12.5, latMassH: 12 },
C4:  { region: 'cervical-subaxial', bodyW: 17, bodyH: 14.5, latMassW: 13, latMassH: 12.5 },
C5:  { region: 'cervical-subaxial', bodyW: 18, bodyH: 14.5, latMassW: 14, latMassH: 13 },
C6:  { region: 'cervical-subaxial', bodyW: 19, bodyH: 15.5, latMassW: 14, latMassH: 13 },
C7:  { region: 'cervical-subaxial', bodyW: 21.5, bodyH: 16.5, latMassW: 12, latMassH: 11, pedW: 5.5, pedH: 7 },
```

Note: `bodyW` for C1 is the anterior arch width (~22mm) used for scaling reference; the actual transverse span is `totalWidth` (80mm). For Oc, `bodyW` represents the total occipital width (~78mm).

Note: `getLevelHeight()` already derives height from `VERTEBRA_ANATOMY` when an entry exists, falling back to `REGIONS` only when it doesn't. Adding these entries is sufficient — no code change to `getLevelHeight()` is needed.

- [ ] **Step 5: Add cervical branches to getVertSvgGeometry**

Replace the `// Cervical branches added in Task 2` comment with:

```typescript
if (a.region === 'occiput') {
    const condyleOffset = a.condyleW * scale;
    const fmRx = (a.foramenMagnumW * scale) / 2;
    // Parasagittal screw zones ~9mm from midline
    const screwOffset = 9 * scale;
    return {
        region: 'occiput', left, right, cx, bw,
        condyleLeftCx: cx - condyleOffset, condyleRightCx: cx + condyleOffset,
        condyleRx: (a.condyleW * scale) / 2, condyleRy: fmRx * 0.4,
        foramenRx: fmRx, foramenRy: fmRx * 0.7,
        screwLeftCx: cx - screwOffset, screwRightCx: cx + screwOffset,
    };
}

if (a.region === 'cervical-upper') {
    const lmRx = (a.latMassW * scale) / 2;
    const lmRy = (a.latMassH * scale) / 2;
    // Lateral masses positioned at edges of totalWidth
    const halfTotal = (a.totalWidth * scale) / 2;
    const lmLeftCx = cx - halfTotal + lmRx;
    const lmRightCx = cx + halfTotal - lmRx;
    const height = Math.round(a.bodyH * scale) + VERT_PAD * 2;
    return {
        region: 'cervical-upper', left, right, cx, bw,
        latMassLeftCx: lmLeftCx, latMassRightCx: lmRightCx,
        latMassRx: lmRx, latMassRy: lmRy,
        latMassCy: height / 2,
    };
}

if (a.region === 'cervical-subaxial') {
    const lmRx = (a.latMassW * scale) / 2;
    const lmRy = (a.latMassH * scale) / 2;
    // Lateral masses sit just outside body edges
    const lmLeftCx = left - lmRx - 2;
    const lmRightCx = right + lmRx + 2;
    const height = Math.round(a.bodyH * scale) + VERT_PAD * 2;
    const latMassCy = height / 2;
    const base: CervicalSubaxialGeom = {
        region: 'cervical-subaxial', left, right, cx, bw,
        latMassLeftCx: lmLeftCx, latMassRightCx: lmRightCx,
        latMassRx: lmRx, latMassRy: lmRy,
        latMassCy,
    };
    // C7 has usable pedicles
    if (a.pedW && a.pedH) {
        const pedRx = Math.max(1.5, (a.pedW * scale / 2));
        const pedRy = Math.max(2, (a.pedH * scale / 2));
        const pedInset = (a.pedW * scale) * 0.5;
        base.pedLeftCx = left + pedInset + 3;
        base.pedRightCx = right - pedInset - 3;
        base.pedRx = pedRx;
        base.pedRy = pedRy;
    }
    return base;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --reporter verbose 2>&1 | tail -40`
Expected: All tests pass, including all new cervical anatomy tests.

- [ ] **Step 7: Run type-check**

Run: `npm run type-check 2>&1 | tail -20`
Expected: Same consumer type errors as before (Task 3 fixes these).

- [ ] **Step 8: Commit**

```bash
git add src/data/anatomy.ts src/data/__tests__/clinical-anatomy.test.ts
git commit -m "feat: add cervical anatomy data (Oc-C7) with lateral mass measurements"
```

---

### Task 3: Fix type narrowing in all getVertSvgGeometry consumers

**Files:**
- Modify: `src/components/chart/LevelRow.tsx:116-130`
- Modify: `src/components/chart/SpineVertebra.tsx:13-15`
- Modify: `src/components/chart/CageVisualization.tsx:15-17`
- Modify: `src/components/chart/PelvisRegion.tsx:243-256`
- Modify: `src/App.tsx:13` (remove unused import)

This task makes the existing code compile with the new union types. No visual changes — just type narrowing so existing T/L/S rendering works exactly as before. Cervical rendering comes in Tasks 4-5.

- [ ] **Step 1: Fix CageVisualization.tsx**

CageVisualization accesses `geom.left` and `geom.right` — these are on `GeomBase`, available on all union members. The only change needed is handling the case where `getVertSvgGeometry` now returns geometry for cervical levels too (previously null). The existing fallback pattern `geom ? geom.left : 30` still works. No change needed if types compile.

Check: `npm run type-check 2>&1 | grep CageVisualization`

If there are errors, the fix is just to ensure the null check is sufficient. The `.left`/`.right` fields are on `GeomBase` so all union members have them.

- [ ] **Step 2: Fix PelvisRegion.tsx**

PelvisRegion calls `getVertSvgGeometry('S1')` and `getVertSvgGeometry('S2')` and accesses `.pedLeftCx`, `.pedRightCx`, `.pedRy`. Add type narrowing:

```typescript
const s1Geom = getVertSvgGeometry('S1');
const s2Geom = getVertSvgGeometry('S2');
const medialShift = screwPx * 1.75;

// Type narrow to sacral geometry for pedicle coordinates
const s1Ped = s1Geom && s1Geom.region === 'sacral' ? s1Geom : null;
const s2Ped = s2Geom && s2Geom.region === 'sacral' ? s2Geom : null;

const s1PedLeftX = s1Ped ? vertX + (s1Ped.pedLeftCx / 160) * scaledWidth + medialShift : cx - 20;
const s1PedRightX = s1Ped ? vertX + (s1Ped.pedRightCx / 160) * scaledWidth - medialShift : cx + 20;
// ... similar for s1PedViewY using s1Ped.pedRy
```

- [ ] **Step 3: Fix LevelRow.tsx screw zone positioning**

The current code at lines 117-130 accesses `geom.pedLeftCx`, `geom.pedRightCx`, `geom.pedRy` without narrowing. Refactor to handle cervical regions:

```typescript
// Compute screw zone position in chart coordinates from anatomy data
const geom = getVertSvgGeometry(level.id);
const viewBoxHeight = getLevelHeight(level);

// Determine screw zone vertical centre based on region
let viewBoxScrewCy: number;
if (geom && (geom.region === 'thoracic' || geom.region === 'lumbar' || geom.region === 'sacral')) {
    viewBoxScrewCy = geom.pedCy;
} else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
    viewBoxScrewCy = geom.latMassCy;
} else {
    viewBoxScrewCy = viewBoxHeight / 2;
}
const chartPedCy = (viewBoxScrewCy / viewBoxHeight) * rowHeight;

// Screw zone X positions
const isSacral = level.type === 'S';
const s1Geom = getVertSvgGeometry('S1');
const s1Ped = s1Geom && s1Geom.region === 'sacral' ? s1Geom : null;
const s1MedialShift = screwPx * 1.75;
const s1LeftX = s1Ped ? vertX + (s1Ped.pedLeftCx / 160) * scaledWidth + s1MedialShift : undefined;
const s1RightX = s1Ped ? vertX + (s1Ped.pedRightCx / 160) * scaledWidth - s1MedialShift : undefined;

// Determine left/right screw X based on region
let chartScrewLeftCx: number | undefined;
let chartScrewRightCx: number | undefined;
if (isSacral) {
    chartScrewLeftCx = s1LeftX;
    chartScrewRightCx = s1RightX;
} else if (geom && (geom.region === 'thoracic' || geom.region === 'lumbar')) {
    chartScrewLeftCx = vertX + (geom.pedLeftCx / 160) * scaledWidth;
    chartScrewRightCx = vertX + (geom.pedRightCx / 160) * scaledWidth;
} else if (geom && geom.region === 'occiput') {
    chartScrewLeftCx = vertX + (geom.screwLeftCx / 160) * scaledWidth;
    chartScrewRightCx = vertX + (geom.screwRightCx / 160) * scaledWidth;
} else if (geom && (geom.region === 'cervical-upper' || geom.region === 'cervical-subaxial')) {
    chartScrewLeftCx = vertX + (geom.latMassLeftCx / 160) * scaledWidth;
    chartScrewRightCx = vertX + (geom.latMassRightCx / 160) * scaledWidth;
}
```

Then update `renderZoneContent` to use `chartScrewLeftCx`/`chartScrewRightCx` instead of `chartPedLeftCx`/`chartPedRightCx` (rename the variables throughout).

- [ ] **Step 4: Fix SpineVertebra.tsx**

SpineVertebra accesses `geom.left`/`geom.right` for corpectomy rendering (line 18-19) and in the T/L/S body path. For the corpectomy fallback: `geom.left`/`geom.right` are on GeomBase, so no narrowing needed for that access. For the T/L rendering block (lines 41-64), add narrowing:

```typescript
{(type === 'T' || type === 'L') && geom && (geom.region === 'thoracic' || geom.region === 'lumbar') && (() => {
    // existing body path code unchanged — geom is now narrowed
    const pedCy = geom.pedCy;  // replaces inline calculation
    // ... rest of existing code
})()}
```

Similarly for the sacral block (line 66):
```typescript
{type === 'S' && geom && geom.region === 'sacral' && (() => {
    // existing sacral code unchanged
})()}
```

- [ ] **Step 5: Clean up App.tsx import**

Remove `getVertSvgGeometry` from the App.tsx import line (it's imported but never called in App.tsx). Also remove `VERTEBRA_ANATOMY` and `VERT_SVG_SCALE` and `VERT_PAD` if they are also unused in App.tsx (verify with grep first).

- [ ] **Step 6: Run type-check — should pass clean**

Run: `npm run type-check 2>&1 | tail -20`
Expected: No type errors.

- [ ] **Step 7: Run full test suite**

Run: `npm test -- --reporter verbose 2>&1 | tail -30`
Expected: All tests pass. No visual changes — thoracolumbar rendering is identical.

- [ ] **Step 8: Commit**

```bash
git add src/components/chart/LevelRow.tsx src/components/chart/SpineVertebra.tsx \
  src/components/chart/CageVisualization.tsx src/components/chart/PelvisRegion.tsx src/App.tsx
git commit -m "refactor: add type narrowing for VertSvgGeometry union in all consumers"
```

---

### Task 4: Render cervical vertebra shapes in SpineVertebra

**Files:**
- Modify: `src/components/chart/SpineVertebra.tsx`

This task adds the 5 new SVG shape groups for cervical levels. No click zone changes — just visual rendering.

- [ ] **Step 1: Add occiput shape**

Replace the existing `type === 'Oc'` path (line 33) with a geometry-driven shape. The occiput renders:
- Wide convex arc (skull base curvature)
- Two condyle ellipses from `geom.condyleLeftCx`/`condyleRightCx`
- Foramen magnum dashed ellipse at centre

```typescript
{type === 'Oc' && geom && geom.region === 'occiput' && (() => {
    const g = geom;
    const t = VERT_PAD;
    const b = height - VERT_PAD;
    const m = (t + b) / 2;
    return (
        <g>
            {/* Skull base — wide convex arc */}
            <path d={`M${g.left},${b} Q${g.cx},${t - 8} ${g.right},${b} L${g.right},${b} Q${g.cx},${m + 4} ${g.left},${b} Z`}
                {...common} />
            {/* Occipital condyles */}
            <ellipse cx={g.condyleLeftCx} cy={b - g.condyleRy} rx={g.condyleRx} ry={g.condyleRy}
                fill="#e8ecf0" stroke="#94a3b8" strokeWidth="1" />
            <ellipse cx={g.condyleRightCx} cy={b - g.condyleRy} rx={g.condyleRx} ry={g.condyleRy}
                fill="#e8ecf0" stroke="#94a3b8" strokeWidth="1" />
            {/* Foramen magnum */}
            <ellipse cx={g.cx} cy={m} rx={g.foramenRx} ry={g.foramenRy}
                fill="white" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
        </g>
    );
})()}
```

- [ ] **Step 2: Add C1 (Atlas) shape**

Replace the `type === 'C'` block for C1. The atlas renders as a ring with lateral masses and posterior tubercle:

```typescript
{type === 'C' && geom && geom.region === 'cervical-upper' && label === 'C1' && (() => {
    const g = geom;
    const t = VERT_PAD;
    const b = height - VERT_PAD;
    const m = (t + b) / 2;
    const archStroke = { fill: common.fill, stroke: common.stroke, strokeWidth: "1" };
    return (
        <g>
            {/* Posterior arch — left and right arcs */}
            <path d={`M${g.latMassLeftCx + g.latMassRx},${m} Q${g.cx},${t} ${g.cx - 6},${m}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            <path d={`M${g.latMassRightCx - g.latMassRx},${m} Q${g.cx},${t} ${g.cx + 6},${m}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Posterior tubercle */}
            <rect x={g.cx - 5} y={m - 5} width={10} height={10} rx={3} {...archStroke} />
            {/* Lateral masses — rounded rectangles */}
            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
        </g>
    );
})()}
```

- [ ] **Step 3: Add C2 (Axis) shape**

C2 has a central body with pars interarticularis corridors:

```typescript
{type === 'C' && geom && geom.region === 'cervical-upper' && label === 'C2' && (() => {
    const g = geom;
    const t = VERT_PAD;
    const b = height - VERT_PAD;
    const c = 3;
    return (
        <g>
            {/* Vertebral body */}
            <rect x={g.left} y={t} width={g.bw} height={b - t} rx={c} {...common} />
            {/* Pars interarticularis — rounded rectangles */}
            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={3}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={3}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
        </g>
    );
})()}
```

- [ ] **Step 4: Add C3-C6 (subaxial) shape**

Subaxial cervical vertebrae with body and lateral masses:

```typescript
{type === 'C' && geom && geom.region === 'cervical-subaxial' && !geom.pedRx && (() => {
    const g = geom;
    const t = VERT_PAD;
    const b = height - VERT_PAD;
    const c = 3;
    const w = 1.5; // waist indent
    const m = (t + b) / 2;
    const endCurve = 1.5;
    // Biconcave body (matching T/L style)
    const bodyPath = `M${g.left},${t+c} Q${g.left},${t} ${g.left+c},${t} Q${g.cx},${t+endCurve} ${g.right-c},${t} Q${g.right},${t} ${g.right},${t+c} Q${g.right-w},${m} ${g.right},${b-c} Q${g.right},${b} ${g.right-c},${b} Q${g.cx},${b-endCurve} ${g.left+c},${b} Q${g.left},${b} ${g.left},${b-c} Q${g.left+w},${m} ${g.left},${t+c} Z`;
    return (
        <g>
            <path d={bodyPath} {...common} />
            {/* Lateral masses — rounded rectangles */}
            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1" />
            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1" />
        </g>
    );
})()}
```

- [ ] **Step 5: Add C7 (transitional) shape**

C7 has a wider body, smaller dashed lateral masses, and visible pedicle ellipses:

```typescript
{type === 'C' && geom && geom.region === 'cervical-subaxial' && !!geom.pedRx && (() => {
    const g = geom;
    const t = VERT_PAD;
    const b = height - VERT_PAD;
    const c = 3;
    const w = 2;
    const m = (t + b) / 2;
    const endCurve = 1.5;
    const bodyPath = `M${g.left},${t+c} Q${g.left},${t} ${g.left+c},${t} Q${g.cx},${t+endCurve} ${g.right-c},${t} Q${g.right},${t} ${g.right},${t+c} Q${g.right-w},${m} ${g.right},${b-c} Q${g.right},${b} ${g.right-c},${b} Q${g.cx},${b-endCurve} ${g.left+c},${b} Q${g.left},${b} ${g.left},${b-c} Q${g.left+w},${m} ${g.left},${t+c} Z`;
    return (
        <g>
            <path d={bodyPath} {...common} />
            {/* Lateral masses — dashed (borderline usable at C7) */}
            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                fill={common.fill} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
            {/* Pedicles — ellipses (thoracic style) */}
            {g.pedLeftCx && g.pedRx && g.pedRy && (
                <>
                    <ellipse cx={g.pedLeftCx} cy={m} rx={g.pedRx} ry={g.pedRy}
                        fill="none" stroke="#94a3b8" strokeWidth="1" />
                    <ellipse cx={g.pedRightCx} cy={m} rx={g.pedRx} ry={g.pedRy}
                        fill="none" stroke="#94a3b8" strokeWidth="1" />
                </>
            )}
        </g>
    );
})()}
```

- [ ] **Step 6: Remove old generic cervical paths**

Delete the old `type === 'Oc'` path (the convex bulge) and the old `type === 'C'` block (the generic convex path). These are fully replaced by the region-specific shapes above.

- [ ] **Step 7: Run type-check and tests**

Run: `npm run type-check && npm test -- --reporter verbose 2>&1 | tail -30`
Expected: No type errors, all tests pass.

- [ ] **Step 8: Visual verification on dev server**

Run: `npm run dev`

Check in browser:
1. Occiput shows curved skull base with condyles and foramen magnum
2. C1 shows ring shape with lateral masses (widest cervical)
3. C2 shows body with pars corridors
4. C3-C6 show progressive width increase with lateral masses flanking body
5. C7 shows dashed lateral masses plus pedicle ellipses
6. Thoracolumbar spine unchanged
7. Whole-spine view: vertical proportions look reasonable, no overlapping
8. Cervical-only construct: auto-scale produces readable layout

- [ ] **Step 9: Commit**

```bash
git add src/components/chart/SpineVertebra.tsx
git commit -m "feat: anatomically distinct cervical vertebra SVG shapes (Oc, C1, C2, C3-C6, C7)"
```

---

### Task 5: Update LevelRow click zones for lateral mass positioning

**Files:**
- Modify: `src/components/chart/LevelRow.tsx`

Task 3 already refactored the screw zone X/Y calculations to use lateral mass coordinates for cervical levels. This task verifies the click zones work correctly and the ghost targets render at the right positions.

- [ ] **Step 1: Verify ghost target rendering at lateral mass positions**

The `renderGhostTarget` function uses `zoneCx`/`zoneCy` which are now derived from lateral mass coordinates for cervical levels (set in Task 3). Check that `renderZoneContent` passes the correct `zoneCx` for cervical levels.

In `renderZoneContent`, the `zoneCx` calculation needs to use `chartScrewLeftCx`/`chartScrewRightCx` (from Task 3) instead of the old zone-edge fallback for cervical levels:

```typescript
const zoneCx = isForceZone ? zoneX + zoneW / 2
    : isSacral && zone === 'left' && chartScrewLeftCx !== undefined ? chartScrewLeftCx
    : isSacral && zone === 'right' && chartScrewRightCx !== undefined ? chartScrewRightCx
    : chartScrewLeftCx !== undefined && zone === 'left' ? chartScrewLeftCx
    : chartScrewRightCx !== undefined && zone === 'right' ? chartScrewRightCx
    : zone === 'left' ? zoneX + zoneW - screwPx / 2 - 4
    : zone === 'right' ? zoneX + screwPx / 2 + 4
    : zoneX + zoneW / 2;
```

This ensures all levels with geometry data (cervical included) position icons at the anatomical screw entry point rather than the zone edge.

- [ ] **Step 2: Verify icon positioning uses zoneCx for cervical**

The `iconX` calculation (around line 196) positions placed screw icons. For non-sacral levels it currently uses zone edge (`zoneX + zoneW - iW - 4` or `zoneX + 4`). Update to use `zoneCx` when anatomy data is available, matching the ghost target position:

```typescript
let iconX: number;
const iconY = zoneCy - iH / 2;
if (align === 'center') {
    iconX = zoneCx - iW / 2;
} else if (chartScrewLeftCx !== undefined || chartScrewRightCx !== undefined || isSacral) {
    // Anatomically-positioned icon at screw entry point
    iconX = zoneCx - iW / 2;
} else if (align === 'left') {
    iconX = zoneX + zoneW - iW - 4;
} else {
    iconX = zoneX + 4;
}
```

- [ ] **Step 3: Adjust Oc-C1 and C1-C2 spacer rendering**

Check that the non-clickable gaps between Oc-C1 and C1-C2 render correctly. `getDiscHeight()` already returns 0 for Oc and C1 (line 102 of anatomy.ts), and the `hasDisc` check (line 83 of LevelRow) already excludes them. The small visual gap comes from the 1px border between levels. Verify this looks acceptable — if the gap is too tight, we can add a small explicit spacer via a CSS margin or minimum height, but try without first.

- [ ] **Step 4: Run full test suite and type-check**

Run: `npm run type-check && npm test -- --reporter verbose 2>&1 | tail -30`
Expected: All pass.

- [ ] **Step 5: Visual verification on dev server**

Run: `npm run dev`

Check:
1. Click a cervical left/right zone — ScrewModal opens (existing behaviour)
2. Ghost targets (dashed circles) appear at lateral mass positions, not zone edges
3. Placed screw icons appear at lateral mass positions
4. Screw size labels positioned correctly next to icons
5. Occiput screw zones are parasagittal (close to midline)
6. C1-C6 screw zones are on lateral masses
7. C7 screw zone works (single zone, surgeon picks type in modal)
8. Thoracolumbar screw placement unchanged
9. Sacral/pelvic screw placement unchanged
10. Portrait mode: cervical levels render correctly with tab switching

- [ ] **Step 6: Commit**

```bash
git add src/components/chart/LevelRow.tsx
git commit -m "feat: lateral mass click zones for cervical screw placement"
```

---

### Task 6: Final integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --reporter verbose 2>&1 | tail -40`
Expected: All tests pass.

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`
Expected: Clean.

- [ ] **Step 3: Build web output**

Run: `npm run build 2>&1 | tail -10`
Expected: Builds successfully with no errors or warnings.

- [ ] **Step 4: Build standalone output**

Run: `npm run build:standalone 2>&1 | tail -10`
Expected: Builds successfully.

- [ ] **Step 5: Full visual walkthrough on dev server**

Run: `npm run dev`

Comprehensive check:
1. **Whole spine view**: All levels render, proportions look natural from Oc to Pelvis
2. **Cervical close-up**: Place screws at C3-C6 (lateral mass), C1 (lateral mass), C2 (pars), Oc (parasagittal plate)
3. **C7 transition**: Screw placement works, icon positions sensible
4. **Ghost placements**: Plan → Construct ghost flow works for cervical
5. **ACDF cages**: Place at C3-C6, verify cage visualization spans correct width
6. **Osteotomies**: Disc-level osteotomies between C-levels still work
7. **Dual-window sync**: Cervical placements sync between Plan and Construct
8. **Export**: JPG and PDF export includes cervical shapes correctly
9. **Portrait mode**: All 3 tabs work, cervical levels readable
10. **Dark theme**: Cervical shapes respect theme colours

- [ ] **Step 6: Verify no regressions in thoracolumbar/sacral/pelvic**

Place screws at T5, L4, S1, and pelvic zones. Confirm icon positions, sizes, labels all unchanged.
