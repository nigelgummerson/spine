# Developer Changelog

Detailed technical changes by version. For user-facing changes see the in-app changelog (`src/data/changelog.ts`).

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
