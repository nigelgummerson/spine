# Developer Changelog

Detailed technical changes by version. For user-facing changes see the in-app changelog (`src/data/changelog.ts`).

## v2.7.35-beta (2026-03-28)

Version bump, see v2.7.34 for technical changelog.

## v2.7.34-beta (2026-03-28)

### Screw trajectory system
- Trajectory selector in ScrewModal: pedicle, lateral mass, pars, translaminar, cortical (CBT) — per-level options from literature
- C1: lateral mass only. C2: pedicle/pars/translaminar. C3-C6: pedicle/lateral mass (default: lateral mass). C7: pedicle (default)/lateral mass. L1-L5: pedicle (default)/cortical.
- `trajectory` field on Placement type, serialised to JSON v4 element, Zod-validated
- 5 trajectory translation keys + 2 section headings (Trajectory, Size) × 22 languages
- `getTrajectoryOptions(levelId)` with `isDefault` flag and consistent button order (pedicle always first)
- `handleTrajectoryChange()` updates screw size defaults when trajectory changes
- CBT screw defaults from Matsukawa 2013/2015: L1 4.5×25, L2 4.5×30, L3 5.0×30, L4 5.0×35, L5 5.0×35
- `getScrewDefault(levelId, trajectory?)` now trajectory-aware

### Screw shank visualisation (projected PA view)
- Per-level trajectory angles in `TRAJECTORY_ANGLE_DATA` (clinical.ts):
  - Pedicle (cervical): Karaikovic et al. 1997
  - Pedicle (thoracic): Chadha et al. 2019 (Eur Spine J, PMC2200778)
  - Pedicle (lumbar): Chadha et al. 2019, Zindrick et al. 1987
  - Lateral mass: Magerl technique (An et al. 1991) — 25° lateral, 45° cephalad
  - CBT: Matsukawa et al. 2013 — ~9° lateral, 26° cephalad
  - C1 lateral mass: Bunmaprasert et al. 2021
  - C2 pedicle/pars: Abumi technique, PMC9910137
- Sign convention: positive sagittal = tip caudad (pedicle T/L), negative = tip cephalad (lateral mass, CBT)
- Projection: `dx = L × cos(θs) × sin(θt)`, `dy = L × sin(θs)` — real foreshortening
- `projectScrewShank()` and `getTrajectoryAngle()` exported from clinical.ts
- Shank rendered as SVG `<line>` behind icon: stroke-width = screw diameter × VERT_SVG_SCALE × heightScale
- Placed screws: #64748b at 60% opacity. Ghost screws: #14b8a6 at 50% opacity

### Pedicle entry point positioning
- Entry point dynamically computed from screw sagittal angle so shank midpoint passes through pedicle centre
- Entry Y = pedCy − dy/2, clamped to pedicle ellipse. Entry X = ellipse surface at that Y on lateral side
- `getEntryPointOffset(trajectory, side)` for clock-face positions: pedicle 10/2 o'clock, CBT 4:30/7:30
- Lateral mass trajectory: Magerl entry point (30% medial + 30% inferior from lateral mass centre), Y relative to `latMassCy`
- C7 lateral mass screws at lateral mass position; C7 pedicle screws at pedicle position
- Icons and shanks both start from the computed entry point

### Pedicle positions corrected (interpedicular distance)
- Added `pedCTC` (pedicle centre-to-centre distance, mm) to T1-L5 anatomy data
  - Sources: Lien et al. 2007 (Eur Spine J, PMC2200778) for pedW; Chhabra et al. (PMC4857161) for thoracic IPD; Maaly et al. (PMC10540747) for lumbar IPD
- Replaced arbitrary `left + pedInset + 5` formula with `cx ± halfCTC` — pedicle centres from published data
- T1-T4 pedicles now correctly lateral to body edge; lumbar pedicles correctly medial

### Size label alignment
- `getOuterBoundary(levelId)` in anatomy.ts — outer boundary from getVertSvgGeometry
- ChartPaper computes `labelBoundary` via useMemo: widest non-sacral level's outer boundary
- LevelRow uses `labelEdgeLeft`/`labelEdgeRight` for consistent label columns (placed + ghost)

### Visual
- Pedicle ellipse opacity reduced to 0.4 (thoracolumbar and cervical)
- Schematic notice bar: "Schematic — verify against patient anatomy and imaging" (amber, 22 languages)

## v2.7.33-beta (2026-03-27)

### Anatomical screw placement
- Screw icons positioned on anatomical pedicle ellipses (T1-L5) using published pedicle centre coordinates from `getVertSvgGeometry()`
- C7 uses pedicle positions (pedW: 5.5mm, pedH: 7mm) instead of lateral mass
- C3-C6 lateral mass screw entry point: 30% medial + 30% inferior offset from lateral mass centre (Magerl technique approximation)
- Size labels anchored at TP tip edge (T/L) or lateral mass edge (cervical), right-aligned for left side, left-aligned for right

### Click zone redesign
- Mid-zone (osteotomy) width now matches per-level vertebral body width from anatomy data, not full 160-unit scaledWidth
- Screw click zones span from body edge outward to side zone edge, covering pedicle/TP area
- Pedicle click circles overlaid on vertebral body, intercept clicks before osteotomy handler via `stopPropagation`
- Circle radius: `max(screwPx * 0.7, 14)` with grey hover highlight

### Quick reference RTL
- `dir="rtl"` set on `<html>` element for Arabic and Hebrew in `public/quick-reference.html`

### i18n: Offline Use help section translated
- `help.offline_use.title` and `help.offline_use.body` translated into all 15 European languages (de, fr, es, it, pt, sv, nb, da, fi, nl, pl, el, tr, uk, ru). These keys were added in v2.3.1 (web/standalone split) but only translated for the later language batch (hi, ar, he, zh-Hans, ja, ko).

## v2.7.32-beta (2026-03-26)

### Expert Review Implementation (5-agent, 68 findings)

**Safety (Phase 1):**
- Record lock enforced at reducer level — `LOCK_EXEMPT_ACTIONS` set (`UNLOCK_DOCUMENT`, `LOAD_DOCUMENT`, `NEW_PATIENT`); all other actions return unchanged state when `lockedAt` set
- UNDO/REDO blocked in undoReducer when `present.lockedAt` set
- BroadcastChannel sync rejected on locked records with error toast
- NEW_PATIENT broadcasts immediately (bypasses 200ms debounce, cancels pending timer)
- OsteotomyModal blocks selection at Oc/C1/C2 with translated `alert.no_osteotomy_at_level` message
- `peerIncognitoRef` resets on 10s heartbeat timeout (CS7)
- `RTL_LANGUAGES` cleaned — removed unsupported `fa`/`ur`

**Architecture (Phase 3):**
- `useDocumentState.ts` (320 lines) split into `useBroadcastSync.ts` (230 lines), `useAutoSave.ts` (100 lines), and composition layer (120 lines). Public API unchanged, App.tsx unmodified.
- `useModalState.ts` extracted from App.tsx — 21 useState declarations moved to dedicated hook
- 14 `useCallback` wrappers + `chartHandlersRef` stable ref pattern for ChartPaper callback props
- `ErrorBoundary` wraps `ModalOrchestrator` with `onReset` callback
- ~15 `any` types replaced with proper types; remaining documented with eslint-disable

**Schema & Data (Phase 4):**
- 15 `.passthrough()` replaced with `.strict()` on v4 sub-objects
- Defensive numeric validation: screw diameter/length, cage height/width/length, rod diameter/length must be positive
- `disclaimerAcceptedAt` added to DocumentState, serialised to JSON v4
- `formatDate()` consolidated in `src/i18n/i18n.ts` using `Intl.DateTimeFormat`
- 3 advisory glossary verification tests

**Tests (100 new, 1273 total across 43 files):**
- `useExport.test.ts` — 27 tests (save/load JSON, export JPG/PDF, checksum, incognito)
- `documentReducer.test.ts` — 18 new (lock enforcement on all CRUD actions)
- `undoReducer.test.ts` — 3 new (UNDO/REDO blocked when locked)
- `useDocumentState.test.ts` — 4 new (sync validation, lock rejection, privacy)
- `clinical-anatomy.test.ts` — 32 new (cage permissibility, osteotomy restrictions, screw defaults, chart stress)
- `checksum.test.ts` — 8, `id.test.ts` — 3, `measureText.test.ts` — 5

## v2.6.0-beta (2026-03-25)

### Cervical Anatomy Redesign
- `7d4ab54` Discriminated union for VertAnatomyEntry — `ThoracolumbarAnatomyEntry` and `CervicalAnatomyEntry` with region tags, enables type-safe geometry access
- `609e345` Cervical anatomy data (Oc-C7): lateral mass width/depth, articular pillar, dens dimensions, C1 anterior/posterior arch widths (sources: Panjabi 1991, Tan 2004, Yao 2015, Berry 1987)
- `8933934` Type narrowing for VertSvgGeometry union in all consumers (LevelRow, PelvisRegion, SpineVertebra)
- `ce292b8` Anatomically distinct cervical SVG shapes: occiput (foramen magnum + condyles), C1 atlas (anterior/posterior arches + lateral masses), C2 axis (dens + body), C3-C6 subaxial (body + articular pillars), C7 transitional (wider body + pillars)
- `1b5aa29` Lateral mass click zones for cervical screw placement — zones positioned over articular pillars
- `39a1126` Restrict anatomy-based icon positioning to cervical/occiput only (thoracolumbar unchanged)
- `8fdb4d2` Correct cervical bodyW to Yao EPWl White male values, zone-edge icons aligned to pillar edges
- `756bb22` C1 totalWidth 80→58mm to align lateral masses with C2 articular pillar width

### Whole-Spine Rescale (Tan 2004)
- `9f271a9` Rescale whole-spine vertebral body heights to Tan 2004 published proportions (Panjabi 1991 for cervical). Transverse processes added as constant-height rectangles at pedicle level, width from anatomy data.
- `115603f` TP shape fix: constant-height rectangles at pedicle centreline (not full vertebral height)
- `446e82b` Per-level disc heights from Koeller 1986 data — cervical (2.8-3.3mm), thoracic (3.5-5.2mm), lumbar (8.5-11.3mm)
- `2cf17a8` DISC_MIN_PX reduced from 8 to 6 for better disc height variation
- `fbcb3cc` Per-level TP craniocaudal heights from Berry 1987 data

### Implant Data Audit (web-searched 2026-03-25)
- Renamed "Zimmer Biomet" → "Highridge Medical" (spine business sold to H.I.G. Capital April 2024)
- Removed SpineGuard (instruments only, not implants), Aurora Spine (no pedicle screws), SI-BONE (SI joint fixation only)
- Removed legacy/discontinued systems: TSRH, VERTEX SELECT (Medtronic); EXPEDIUM, VIPER 2 MIS, ALTALYNE (DePuy); Armada (Globus, doesn't exist); DENALI MI (VB Spine, unverifiable); Sequoia (Highridge); Firebird (Orthofix); Zodiac (ATEC); Karma (Spinal Elements)
- Added new systems: LONGITUDE II (Medtronic MIS), QUARTEX OCT (Globus cervical), LineSider (Highridge TL), Cortium (ulrich OCT)
- Stryker retained — divestiture to VB Spine still incomplete in many territories

### ACDF Cage Visibility
- ACDF cages now render with cage graphic and label in whole-spine cervical view (previously replaced by italic text hint)
- Cervical cage label font scaled to 60% of normal (min 8px) to prevent text clashing in compressed disc spaces

### Preferences Sync (BroadcastChannel)
- Preferences (showPelvis, useRegionDefaults, confirmAndNext) added to serialized `ui` object in `serializeState()`
- `deserializeDocument()` returns `preferences` alongside viewMode/colourScheme
- `applyPrefs()` helper in useDocumentState applies incoming preferences and updates localStorage
- Preference changes trigger sync broadcast (added to effect dependency array)

---

## v2.5.30-beta (2026-03-25)

### Pelvic Region Redesign
- `583c45b` Sacral/pelvic region redesign with anatomical fixation zones — PelvisRegion compound SVG with iliac wings, SI joint gap, 5 fixation zones per side (S1 ped, S2 ped, S2AI, iliac, SI fusion), pelvis toggle, v4 schema `zone` field
- `a5ef72b` Side-aware hook icons (arrow faces spine), screw diameter 1dp formatting, iliac/SI-J labels on placed screws, pelvic screws visible when Plan is readOnly
- `7f5753f` Pelvic screw text reduced to ~75% of lumbar, S2/iliac sizes in lower-outer quadrant, S2AI shifted out+down with shorter arrow, annotation field replaced with note-tool hint for pelvic zones (22 languages)

### Pelvic Levels Refactor (zone hack -> first-class levels)
- `636bf0f` Remove 6 pelvic zone values from Zone type, add S2AI/Iliac/SI-J to SCREW_DEFAULTS
- `f09142f` Pelvic migration in deserialization (`migratePelvicPlacements`), Zod schema accepts new level IDs and marker element type
- `81cfcc8` Tests updated for new level IDs, migration test, pelvic traversal test
- `04f3036` Pelvic levels (type `'pelvic'`) in levels memo when showPelvis, handlePelvisZoneClick replaced with handleZoneClick
- `041d7eb` ScrewModal: remove showPelvis prop, side dropdown always Left/Right, isPelvic from level type
- `41076b8` PelvisRegion: onZoneClick takes (levelId, zone), findPlacement/findGhost by new levelIds, dead code cleanup (zonePositions, pelvicZones arrays)
- `56b450e` Remove 132 dead pelvic zone i18n keys
- `008f080` Add `pelvic` to REGIONS map (height: 0) — fixes blank screen crash
- `aa3532a` Remove sacral medial shift (was for old zone-cramming layout)
- `cfaab2c` S1/S2 pedicle screws aligned under L5 pedicles horizontally
- `a14a950` Exclude pelvic levels from calculateAutoScale and getDiscHeight — fixes over-shrinkage

### ScrewModal Level Selector & Rapid Entry
- `9bdfc5f` Evidence-based SCREW_DEFAULTS per level with getScrewDefault lookup (Panjabi, Zindrick, Vaccaro)
- `c2f667f` getNextEmptyLevel helper for Confirm & Next navigation
- `8f6f013` 12 new i18n keys for level selector (22 languages)
- `45f4bd3` Region defaults toggle in sidebar (localStorage `spine_planner_region_defaults`)
- `736beb4` ScrewModal: level/side dropdowns, region defaults, pelvic annotation rule, updated onConfirm signature (6 params)
- `47a7f42` ScrewModal test updates for new props
- `1def3ad` App.tsx: handleScrewConfirm accepts levelId/zone, move-on-edit via REMOVE+ADD
- `87982e0` Confirm & Next button + Shift+Enter shortcut, computeFinalSize extraction
- `0cc8671` PreferencesModal (gear icon): region defaults toggle, confirm-next-default toggle, 22 languages
- `5bc9fa6` Fix: useEffect watches levelId/zone props for Confirm & Next re-sync
- `b3e52ec` Fix: T10 default length 38->35 (38 not in LENGTH_OPTIONS)

### Utilities & Tests
- `ab46371` Extract formatScrewSize to src/utils/formatScrewSize.ts (was duplicated 3x), 7 edge-case tests, pelvic placement round-trip tests, schema round-trip test — 13 new tests

### Sync & Persistence Fixes
- `88968b4` Confirm & Next rapid press: recentPlacementsRef tracks unrendered placements
- `6250bc6` Dual-window sync: localChangePendingRef rejects incoming sync during local changes
- `071c83b` Unstable markers serialize as type:'marker' elements (were silently dropped)
- `345e075` New Patient: remove stale manual broadcast (was sending pre-dispatch state)

### Documentation
- `a1277b6` Cervical spine & occiput rendering redesign spec
- `5122215` Fix occipital click zone ambiguity in spec
- `4a036cc` Cervical spine redesign implementation plan

---

## v2.5.20-beta (2026-03-24)

See git log for details. Key changes: portrait inventory tab, fullscreen API, ghost click routing, sync bounce timestamp guard, release workflow triggers on all tags.
