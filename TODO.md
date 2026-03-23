# TODO — Spinal Instrumentation Plan & Record

Task list for spine-planner. SPEC.md phases map to the construct record features from `~/Projects/spine-surgery/instrumentation/spine-construct-record/SPEC.md`. JSON v4 status at `docs/json-v4-status.md`.

## Active

- [ ] Fix corpectomy render crash — `t()` not imported in SpineVertebra.jsx (found 2026-03-22, fix applied but not yet committed/deployed)
- [ ] i18n Tier C — awaiting feedback from native-speaking reviewers (surgeons & industry professionals)
- [ ] User testing — get feedback from theatre staff on current workflow

## SPEC.md Phase 1 — Rods (target v0.8.0-alpha)

The single most impactful addition. Transforms the planner from a screw map into a construct record.

- [ ] Rod data model (standard round rods — material, diameter, contour, span)
- [ ] RodModal UI (side, material, diameter, contour, upper/lower level)
- [ ] Visual rendering as vertical lines connecting screw levels
- [ ] "Auto-generate rods" quick action (bilateral rods spanning full construct)
- [ ] Rod entries in implant inventory
- [ ] Rod state arrays (`plannedRods`, `completedRods`) — replacing current free-text fields
- [ ] Rods in JSON export/import (structured rod objects, not just freeText)
- [ ] Copy-plan-to-actual includes rods
- [ ] New "Longitudinal" tool category in sidebar

## SPEC.md Phase 2 — Rod Variants & Connectors (target v0.9.0-alpha)

- [ ] Rail profile option (round/rail toggle, profileDimensions field)
- [ ] Satellite rod role (primary/satellite toggle)
- [ ] Transition rod support (transition level, proximal/distal diameters)
- [ ] Growing rod support (traditional/MAGEC, distraction domain)
- [ ] Domino and side-to-side connectors (extend current crosslink tool)
- [ ] Offset and tandem connectors
- [ ] Connector `connectsRods` — link connectors to specific rod IDs
- [ ] Visual rendering for variants (double-line rails, offset satellites, dashed growing)

## SPEC.md Phase 3 — Extended Fixation & Recording (target v1.0.0-alpha)

- [ ] Additional screw types in UI (fenestrated, cortical, cannulated, revision, S2AI icons)
- [ ] Screw trajectory field in ScrewModal (pedicle/cortical/s2ai)
- [ ] Per-implant notes UI — collapsible annotation field on all modals
- [ ] Bone graft as structured array (type, location, volume, notes per entry)
- [ ] Wire/cable/band UI (currently schema-only — universal-clamp needs tool mapping)
- [ ] VBR cage properties (expandable/static/mesh, expandedHeight)
- [ ] Structured implant inventory with full specifications

## SPEC.md Phase 4 — Export & Documentation (target v1.1.0-alpha)

- [ ] Enhanced PDF report — level-by-level implant table with all specifications
- [ ] Planned vs actual comparison table in PDF
- [ ] SVG export of diagram
- [ ] Print-optimised CSS
- [ ] Procedure codes in export

## SPEC.md Phase 5 — Future (v1.2+/v2.0)

- [ ] Barcode scanning — html5-qrcode for GS1 DataMatrix from implant packaging
- [ ] GUDID catalogue lookup — auto-complete from spine-implant-id database
- [ ] BSR-compatible data export
- [ ] Cost tracking per implant (GIRFT alignment)
- [ ] Bulk entry for deformity constructs
- [ ] Procedure templates
- [ ] Multi-case management (IndexedDB)

## Backlog (not SPEC-related)

- [ ] Cervical spine proportions — extend VERTEBRA_ANATOMY to cervical levels
- [ ] Specification sync — SPECIFICATION.md is outdated (last synced v0.9.0)

## Done (recent)

- [x] JSON v4 schema updated to cover all SPEC.md features (2026-03-22)
- [x] Comprehensive test file — 153 checks, all SPEC.md requirements validated (2026-03-22)
- [x] Ukrainian and Russian translations — 16 languages total (2026-03-22)
- [x] Hindi and Arabic translations with RTL support — 18 languages total (2026-03-23)
- [x] Vite build system — modular source, single-file output, GitHub Actions deploy (2026-03-22)
- [x] i18n review tooling — Python generator + import pipeline (2026-03-22)
- [x] Offline bundling — Vite + vite-plugin-singlefile (2026-03-22)
- [x] Ghost placements — plan as confirmable ghosts on construct view (2026-03-21)
- [x] Portrait/tablet mode — responsive layout with tab-based columns (2026-03-20)
- [x] Internationalisation — 14 European languages (2026-03-20)
