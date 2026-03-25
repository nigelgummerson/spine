# Developer Changelog

Detailed technical changes by version. For user-facing changes see the in-app changelog (`src/data/changelog.ts`).

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
