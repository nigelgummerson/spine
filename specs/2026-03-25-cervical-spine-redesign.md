# Cervical Spine & Occiput Rendering Redesign

**Date:** 2026-03-25
**Status:** Design approved, pending implementation
**Scope:** Anatomy data model refactor (discriminated union) + cervical/occiput SVG rendering + lateral mass screw zones

## Problem

The cervical spine (Oc, C1-C7) is drawn as rough approximations:
- All C1-C7 levels use an identical generic convex path with no anatomical variation
- The occiput is a simple convex bulge with no recognisable skull-base features
- No anatomy data exists for any cervical level (`getVertSvgGeometry()` returns null)
- Screw click zones fall back to the vertical midpoint of a generic shape
- Lateral masses -- the primary fixation target for C3-C6 screws -- are not represented at all
- C1 (atlas), C2 (axis), and C3-C7 (subaxial) are anatomically very different structures but render identically

## Goals

1. Distinct, anatomically proportioned silhouettes for Oc, C1, C2, C3-C6, and C7
2. Lateral mass representation as the primary screw placement zone for C1-C6
3. Correct per-level proportions based on published morphometric data
4. A refactored anatomy data model (discriminated union) that supports future additions (thoracic ribs, lumbar transverse processes)
5. Consistent visual language with the existing thoracolumbar rendering style

## Non-Goals

- Anatomically detailed rendering (staying schematic, matching thoracolumbar style)
- Changes to the JSON v4 schema or saved document format
- Changes to screw defaults, clinical rules, or modal behaviour
- New translation keys
- Changes to icon scaling (cervicalFactor = 0.75 stays uniform)

## Design

### 1. Anatomy Data Model

Replace the flat `VertAnatomyEntry` interface with a discriminated union. Every level from Oc to S2 gets an entry -- no more null returns.

```typescript
// Base fields shared by all levels
interface AnatomyBase {
  bodyW: number;   // mm, total transverse width used for SVG scaling
  bodyH: number;   // mm, vertebral body height (or equivalent)
}

interface OccipitAnatomy extends AnatomyBase {
  region: 'occiput';
  foramenMagnumW: number;  // mm
  condyleW: number;        // mm, each side
}

interface CervicalUpperAnatomy extends AnatomyBase {
  region: 'cervical-upper';  // C1, C2
  latMassW: number;   // mm, each side (C1: lateral mass; C2: pars interarticularis)
  latMassH: number;   // mm
  totalWidth: number;  // mm, overall transverse span
}

interface CervicalSubaxialAnatomy extends AnatomyBase {
  region: 'cervical-subaxial';  // C3-C7
  latMassW: number;   // mm, each side
  latMassH: number;   // mm
  pedW?: number;       // mm, present for C7 (transitional pedicle screws)
  pedH?: number;       // mm
}

interface ThoracicAnatomy extends AnatomyBase {
  region: 'thoracic';
  pedW: number;   // mm
  pedH: number;   // mm
  // Future: ribArticulationAngle, transverseProcessW
}

interface LumbarAnatomy extends AnatomyBase {
  region: 'lumbar';
  pedW: number;   // mm
  pedH: number;   // mm
  // Future: transverseProcessW, transverseProcessL
}

interface SacralAnatomy extends AnatomyBase {
  region: 'sacral';
  pedW: number;   // mm
  pedH: number;   // mm
}

type VertAnatomyEntry =
  | OccipitAnatomy
  | CervicalUpperAnatomy
  | CervicalSubaxialAnatomy
  | ThoracicAnatomy
  | LumbarAnatomy
  | SacralAnatomy;
```

**Measurement sources for cervical data:**
- **Oc:** Naderi et al. (2005) occipital condyle morphometry; Ebraheim et al. (1996) foramen magnum dimensions
- **C1:** Gupta & Goel (2000) atlas lateral mass; Tan et al. (2004) cervical vertebral dimensions
- **C2:** Xu et al. (1999) pars interarticularis; Ebraheim et al. (1997) axis morphometry
- **C3-C7:** Panjabi et al. (1991) cervical vertebral dimensions; An et al. (1991) lateral mass morphometry

**Representative cervical measurements (mm):**

| Level | Total Width | Body Width | Lat Mass W (each) | Body Height | Key Feature |
|-------|-------------|------------|-------------------|-------------|-------------|
| Oc    | 75-80       | FM ~35     | Condyles ~22      | --          | Curved skull base |
| C1    | 78-82       | No body    | 15-18             | ~10 (ring)  | Widest cervical, ring shape |
| C2    | 52-56       | 17-19      | ~12 (pars)        | ~20         | Pars interarticularis |
| C3    | 50-54       | 16-17      | 12-13             | 14-15       | Smallest subaxial |
| C4    | 52-56       | 16-18      | 12-14             | 14-15       | Slightly wider than C3 |
| C5    | 55-60       | 17-19      | 13-15             | 14-15       | Largest lateral masses |
| C6    | 56-62       | 18-20      | 13-15             | 15-16       | Similar to C5 |
| C7    | 58-65       | 20-23      | 11-13             | 16-17       | Transitional, smaller lat mass, bigger pedicles |

### 2. Geometry Return Type

`getVertSvgGeometry()` returns a discriminated union matching the anatomy regions:

```typescript
interface GeomBase {
  region: string;
  left: number;    // SVG x of body left edge
  right: number;   // SVG x of body right edge
  cx: number;      // SVG x centre (always 80)
  bw: number;      // SVG body width
}

interface OccipitGeom extends GeomBase {
  region: 'occiput';
  condyleLeftCx: number;   // SVG x, for rendering condyle shapes
  condyleRightCx: number;
  condyleRx: number;
  condyleRy: number;
  foramenRx: number;
  foramenRy: number;
  // Screw click zones: parasagittal, close to midline (not on condyles)
  // Positioned ~8-10mm either side of midline keel, matching occipital plate hole rows
  screwLeftCx: number;     // SVG x, left parasagittal click zone
  screwRightCx: number;    // SVG x, right parasagittal click zone
}

interface CervicalUpperGeom extends GeomBase {
  region: 'cervical-upper';
  latMassLeftCx: number;
  latMassRightCx: number;
  latMassRx: number;      // half-width for rounded rect
  latMassRy: number;      // half-height for rounded rect
  latMassCy: number;      // vertical centre within level
}

interface CervicalSubaxialGeom extends GeomBase {
  region: 'cervical-subaxial';
  latMassLeftCx: number;
  latMassRightCx: number;
  latMassRx: number;
  latMassRy: number;
  latMassCy: number;
  pedLeftCx?: number;     // C7 only
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

type VertSvgGeometry =
  | OccipitGeom
  | CervicalUpperGeom
  | CervicalSubaxialGeom
  | ThoracicGeom
  | LumbarGeom
  | SacralGeom;
```

**Coordinate system:** Same 160-unit viewBox, same `VERT_SVG_SCALE` (anchored to L5 = 130 SVG units). Cervical lateral masses are positioned lateral to the body edges. C1 (~80mm) is wider than subaxial cervical but fits within the viewBox.

The function signature changes from `(levelId: string) => {...} | null` to `(levelId: string) => VertSvgGeometry | null` where null is only returned for Pelvis. The current return object has no `region` discriminant and includes an `isLumbar` field with no external consumers -- both are replaced by the discriminated union. Every existing call site will need type narrowing via `geom.region`.

### 3. SVG Rendering (SpineVertebra)

Five distinct shape groups replace the current two cervical paths. All use the same fill (#f1f5f9) and stroke (#94a3b8) as existing vertebrae.

**Occiput** -- curved skull base:
- Wide convex arc across the top (skull curvature)
- Two occipital condyle ellipses projecting inferolaterally (filled, slightly darker)
- Foramen magnum as a dashed-stroke ellipse at centre
- Matches the reference diagram from the brainstorming session

**C1 (Atlas)** -- ring with prominent lateral masses:
- Two lateral arcs (posterior arch segments) connecting to a small posterior tubercle at midline
- Two large rounded rectangles for lateral masses (same stroke style as pedicle ellipses)
- No central body rectangle -- the ring shape is the defining feature
- Widest cervical level

**C2 (Axis)** -- body with pars corridors:
- Central rectangular body (narrower than C1)
- Two rounded rectangles for the pars interarticularis, lateral to the body
- Narrower overall than C1

**C3-C6 (Subaxial)** -- body flanked by lateral masses:
- Central rectangular body with mild endplate concavity (matching thoracolumbar style)
- Two rounded rectangles for lateral masses, positioned lateral to body edges
- Progressive width increase: C3 (smallest) to C6 (widest subaxial)
- Lateral mass size increases from C3-C4 (smaller) to C5-C6 (largest)

**C7 (Transitional)** -- bridging cervical and thoracic:
- Wider body approaching T1 proportions
- Smaller lateral mass rounded rectangles (dashed stroke -- borderline usable)
- Pedicle ellipses also drawn (thoracolumbar style) since pedicle screws are common at C7
- Visual bridge between cervical and thoracic appearance

**Rendering conventions:**
- Lateral masses drawn as `<rect rx={rounded}>` with standard stroke colour (no special colour coding)
- Lateral mass rounded rectangles serve dual role: anatomical landmark + visual screw zone indicator (same as pedicle ellipses do for thoracolumbar)
- Labels centred in the vertebral body (or at midline for C1)
- Heights derived from anatomy data via `getLevelHeight()` instead of flat REGIONS fallback

### 4. LevelRow Click Zone Changes

LevelRow checks `geom.region` to determine click zone positioning:

**Occiput:** Left/right zones positioned at `screwLeftCx`/`screwRightCx` -- parasagittal, close together either side of midline (~8-10mm offset, matching occipital plate hole rows). These are distinct from the condyle positions which are more lateral. Keeps the existing left/right data model paradigm -- no special-casing needed.

**C1-C6 (cervical-upper, cervical-subaxial):** Left/right zones positioned on `latMassLeftCx`/`latMassRightCx` from the geometry. Vertical position from `latMassCy`.

**C7:** Same as C3-C6 (lateral mass zones). The surgeon chooses screw type (lateral mass vs pedicle) in the modal -- the click target is the same.

**T1-S2 (thoracic, lumbar, sacral):** Unchanged -- `pedLeftCx`/`pedRightCx` and `pedCy`.

**Joint gaps:**
- Oc-C1: Non-clickable spacer, ~3-4 SVG units (no disc, no interaction)
- C1-C2: Non-clickable spacer, ~3-4 SVG units (no disc, no interaction)
- C2-C3 onwards: Normal cervical disc zones (clickable for cages/osteotomies, already working)

### 5. Migration & Backwards Compatibility

**No schema or data migration required.** This is a rendering and data model refactor only.

**What changes:**
- `VertAnatomyEntry` type becomes a discriminated union
- `getVertSvgGeometry()` return type becomes a union (no more null for cervical)
- `getLevelHeight()` returns anatomy-derived heights for cervical levels
- SpineVertebra renders new shapes for Oc, C1, C2, C3-C6, C7
- LevelRow reads lateral mass coordinates from geometry for cervical click zones
- `REGIONS` object kept for colour lookup; height field becomes a fallback only for Pelvis

**What doesn't change:**
- JSON v4 schema, localStorage format, placement data structure
- Export dimensions, scaling, or PDF output
- Translation keys
- cervicalFactor (0.75) for instrument icon scaling
- ScrewModal, CageModal, or any other modal behaviour
- Screw defaults (C3-C7 = 3.5x14, Oc/C1/C2 = no default)
- Force zones, note zones, connector attachment

### 6. Testing

**Existing tests affected:**
- `clinical-anatomy.test.ts` -- may test `getVertSvgGeometry()` null returns for cervical; update to expect geometry objects

**New tests:**
- Every level Oc-S2 has an entry in `VERTEBRA_ANATOMY`
- `getVertSvgGeometry()` returns correct region discriminant per level
- Lateral mass coordinates are lateral to body edges for C1-C6
- C1 total width > C3-C6 total width (widest cervical)
- C7 geometry includes both lateral mass and pedicle coordinates
- `getLevelHeight()` returns per-level heights (not flat 24 for all cervical)
- Height progression: C1 body is shortest (~10mm), C7 is tallest (~17mm)
- `calculateAutoScale()` still produces reasonable scale factors for whole-spine and cervical-only views
- `getDiscHeight()` returns 0 for Oc and C1 (non-clickable spacer behaviour preserved)

### 7. Risks

**Auto-scale impact:** Cervical level heights will change from flat 24/25 SVG units to per-level anatomy-derived values. This affects `calculateAutoScale()` and `buildHeightMap()`, shifting the vertical spacing of the entire spine. The auto-scale solver should handle this (total height is redistributed, not increased dramatically), but whole-spine views need visual verification on the dev server before pushing.

**Thoracolumbar/sacral regression:** The `VertAnatomyEntry` union refactor touches the type that existing thoracolumbar data uses. TypeScript exhaustive checks will catch any missed cases, and existing tests cover thoracolumbar geometry. The T/L/S rendering paths in SpineVertebra are unchanged -- they just need to narrow the union type.

**Existing thoracolumbar consumers of `getVertSvgGeometry()`:** Any code that reads `pedLeftCx` etc. from the return value will need to check `geom.region` first or use a type guard. This is the main refactor cost -- grep for all call sites.
