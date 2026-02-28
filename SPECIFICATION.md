# Leeds Spinal Planner — Retrospective Specification

**Version:** v0.8.2-alpha
**Date:** 2026-02-28
**Author:** Retrospective specification derived from working application

---

## 1. Purpose

A digital surgical planning tool for spinal surgeons at Leeds Teaching Hospitals NHS Trust. Replaces hand-drawn instrumentation diagrams with a visual, exportable chart that documents the pre-operative plan and post-operative construct for spinal surgery cases.

---

## 2. User Requirements

### 2.1 Core Functional Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| UR-01 | Surgeon must be able to place instrumentation on individual vertebral levels | Core purpose — replaces hand-drawn planning |
| UR-02 | Instrument types must include pedicle screws (monoaxial, polyaxial, uniplanar), hooks (pedicle, TP, supra-laminar, infra-laminar), and midline devices (crosslinks, osteotomies) | Reflects the instrumentation vocabulary used in spinal deformity surgery |
| UR-03 | Screws must have configurable diameter (3.5–10.5 mm) and length (10–100 mm) | Screw sizing is required for implant ordering and surgical planning |
| UR-04 | Osteotomies must be classifiable by Schwab grade (1–6) with a correction angle | Schwab classification is the standard grading system for spinal osteotomies |
| UR-05 | Deformity correction forces must be representable (translate, compress, distract, derotate) | Surgeons plan force vectors when correcting spinal deformity |
| UR-06 | The app must support four anatomical views: Cervical (Oc–T4), Thoracic (T1–Pelvis), Lumbar (T10–Pelvis), and Whole Spine (Oc–Pelvis) | Different procedures involve different spinal regions |
| UR-07 | Separate Pre-Operative Plan and Post-Operative Construct charts must exist side by side | Standard surgical documentation: plan vs. what was actually done |
| UR-08 | The Pre-Op plan must be copyable to the Post-Op chart as a starting point | Reduces duplicate data entry — the construct usually mirrors the plan with modifications |
| UR-09 | Force vectors must appear on the Pre-Op chart only, not the Post-Op | Post-op documents the final construct, not the correction strategy |
| UR-10 | An implant inventory must be auto-generated from placed instruments | Required for implant ordering and operative documentation |
| UR-11 | The chart must be exportable as PDF and JPG | Surgeons need printable/attachable records for patient notes |
| UR-12 | Patient demographics (name, ID, surgeon, location, date) must be recorded on the chart | Mandatory identification for clinical documentation |
| UR-31 | Implant company and screw system must be selectable | Identifies the manufacturer and product line for the construct |
| UR-32 | Rod descriptions must be recordable for left and right sides | Documents rod material and diameter (e.g. "5.5mm CoCr Rod") |
| UR-33 | Sidebar colour theme must be selectable and optionally auto-switch from company | Visual customisation; auto-theme maps 5 major manufacturers to branded colours |

### 2.2 Interbody Cage Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| UR-13 | Interbody cages must be placeable in disc spaces between vertebrae | Cage insertion is a fundamental part of spinal fusion surgery |
| UR-14 | Cage types must include ACDF, PLIF, TLIF, XLIF, OLIF, and ALIF | These are the standard surgical approaches for interbody fusion |
| UR-15 | Cage parameters must include height and lordosis angle | These determine the biomechanical effect of the cage |
| UR-16 | Anatomically impossible cage placements must be prevented (e.g. ACDF in lumbar spine, ALIF above L4) | Safety constraint — prevents clinically meaningless plans |

### 2.3 Data Management Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| UR-17 | Work must auto-save to the browser between sessions | Prevents data loss during long planning sessions |
| UR-18 | A Session Mode (incognito) must exist that disables all local storage | NHS shared workstations must not retain patient data (GDPR / Caldicott) |
| UR-19 | Complete project state must be exportable/importable as JSON | Allows saving and transferring cases between machines |
| UR-20 | A "New Patient" action must clear all data with confirmation | Prevents accidental data loss when starting a new case |

### 2.4 Environment and Access Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| UR-21 | The application must run in a standard web browser with no installation | Hospital IT restricts software installation; browser-based tools bypass this |
| UR-22 | The application must work on NHS desktop computers (Windows/Chrome typical) | Target deployment environment |
| UR-23 | The application must be distributable as a single HTML file | Enables sharing via USB, email, or intranet without deployment infrastructure |
| UR-24 | The application must be usable without an internet connection (once loaded) | Theatre/clinic PCs may not have reliable internet |

### 2.5 Usability Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| UR-25 | Tool selection and placement must be achievable in two clicks (select tool, click level) | Speed matters — planning is done in busy pre-op clinics |
| UR-26 | Existing placements must be editable by clicking on them | Surgeons iterate on plans; re-placement from scratch is too slow |
| UR-27 | Modal dialogs must support keyboard shortcuts (Enter to confirm, Escape to cancel, Delete to remove) | Efficient interaction for power users |
| UR-28 | Vertebrae must be visually distinct by spinal region (cervical, thoracic, lumbar, sacral) | Anatomical orientation — surgeons expect recognisable vertebral morphology |
| UR-29 | The tool palette must be grouped by instrument category (Screws, Hooks, Midline, Forces) | Matches the mental model surgeons use when planning |
| UR-30 | Embedded help documentation must describe all features and workflows | Users may encounter the tool without training |

---

## 3. Technical Requirements

### 3.1 Architecture

| ID | Requirement | Implementation |
|----|-------------|----------------|
| TR-01 | Single-file HTML application | All markup, styles, and scripts in one `index.html` (~85 KB) |
| TR-02 | Client-side only — no server, no database | React 18 + Babel (JSX transpilation in browser) via CDN |
| TR-03 | Styling via utility-first CSS framework | Tailwind CSS loaded from CDN |
| TR-04 | PDF generation in browser | jsPDF 2.5.1 |
| TR-05 | Image rendering of DOM for export | html2canvas 1.4.1 |
| TR-06 | State management via React hooks | useState, useRef, useEffect, useMemo — no external state library |
| TR-07 | Persistence via browser localStorage | Key: `spine_planner_v2`; stores placements, cages, connectors, patient data (incl. company, screw system, rods), view mode, colour scheme |

### 3.2 Rendering

| ID | Requirement | Implementation |
|----|-------------|----------------|
| TR-08 | Vertebrae rendered as anatomically-styled SVG shapes | Custom SVG paths for each vertebra type (Occiput, C, T, L, S, Pelvis) |
| TR-09 | Instruments rendered as SVG icons within vertebral zones | InstrumentIcon component with per-tool SVG rendering |
| TR-10 | Export canvas must maintain fixed dimensions regardless of screen size | Reference dimensions 1485 x 1050 px, 3 columns: patient info (340px) + Plan (flex-3) + Construct (flex-4). Isotropic scaling via ResizeObserver + CSS transform |
| TR-11 | View mode scaling must auto-scale to fit available height | `calculateAutoScale` computes height ratio, capped at 1.5x. Whole spine ~0.63x, Thoracolumbar ~0.92x, Cervical/Lumbar capped at 1.5x |
| TR-12 | Colour coding by spinal region | Occiput #f8fafc, C #f1f5f9, T #e2e8f0, L #cbd5e1, S/Pelvis #94a3b8 |

### 3.3 Zone Model

Each vertebral level has five interactive zones, plus disc zones between levels:

```
| force_left | left | vertebra (mid) | right | force_right |
|            |      |  [disc zone]   |       |             |
```

| ID | Constraint | Rule |
|----|-----------|------|
| TR-13 | Screws and hooks may only be placed in `left` or `right` zones | One implant per side per level |
| TR-14 | Osteotomies may only be placed in `mid` zone | Anatomically midline structures |
| TR-15 | Force vectors may only be placed in `force_left` or `force_right` zones | Separates correction forces from implant placement |
| TR-16 | Zones on the inactive chart are read-only | Prevents accidental edits to the wrong chart |
| TR-28 | Cages may only be placed in disc zones between vertebrae | Cage permissibility engine enforces anatomical validity per cage type |
| TR-29 | Crosslinks render in an overlay layer with yNorm (0-1000) positioning | View-independent coordinates mapped to the full spine; draggable vertically |

### 3.4 Data Model

**Placement object:**
```
{
  id:      number    // timestamp-based unique ID
  levelId: string    // vertebra identifier (e.g. "L4", "T10", "C3")
  zone:    string    // "left" | "right" | "mid" | "force_left" | "force_right"
  tool:    string    // tool identifier (e.g. "polyaxial", "pedicle_hook", "osteotomy")
  data:    mixed     // screw: "6.5x45" | osteotomy: {type, angle, shortLabel} | null
}
```

**Connector object (crosslinks):**
```
{
  id:    number    // timestamp-based unique ID
  yNorm: number   // 0-1000 normalised Y coordinate (view-independent, maps to whole spine)
  tool:  string   // "connector"
}
```

**Patient data:**
```
{
  name:        string
  id:          string
  surgeon:     string
  location:    string   // defaults to "Leeds Teaching Hospitals NHS Trust"
  date:        string   // ISO date, defaults to today
  company:     string   // implant manufacturer (from IMPLANT_COMPANIES)
  screwSystem: string   // screw system name (from SCREW_SYSTEMS or free text)
  leftRod:     string   // left rod description (e.g. "5.5mm CoCr Rod")
  rightRod:    string   // right rod description (e.g. "5.5mm TiAlV Rail")
}
```

**JSON v2 save format:**
```
{
  formatVersion: 2,
  appVersion:    string,
  timestamp:     string,    // ISO 8601
  patient:       PatientData,
  preferences:   { viewMode, colourScheme },
  plan:          { implants: Placement[], cages: Cage[], connectors: Connector[] },
  construct:     { implants: Placement[], cages: Cage[], connectors: Connector[] }
}
```

**Persistence payload (localStorage key: `spine_planner_v2`):**
Stores the full JSON v2 structure plus `colourScheme` and `viewMode`.

### 3.5 Export

| ID | Requirement | Implementation |
|----|-------------|----------------|
| TR-17 | PDF export at print quality | html2canvas at 2x resolution, landscape 1485 x 1050 px |
| TR-18 | JPG export at 0.9 quality | html2canvas to JPEG data URL |
| TR-19 | Filename includes patient name | `SpinePlan_[Name].pdf` / `.jpg` |
| TR-20 | Session Mode clears localStorage after export | Defence-in-depth for GDPR compliance on shared machines |

### 3.6 Browser Compatibility

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-21 | Must work in Chrome 90+ | Primary NHS browser |
| TR-22 | Must work in Edge (Chromium) | Secondary NHS browser |
| TR-23 | ResizeObserver API required | Excludes IE11 and legacy Edge (acceptable for NHS estate) |
| TR-24 | No server-side rendering or build step | Babel transpiles JSX at runtime in the browser |

### 3.7 Licensing and Distribution

| ID | Requirement | Implementation |
|----|-------------|----------------|
| TR-25 | Open-source licence | GNU GPLv3 |
| TR-26 | Hosted via GitHub Pages | Main branch auto-deploys to nigelgummerson.github.io/spine-planner |
| TR-27 | Distributable offline | Single HTML file, copyable to USB or intranet share |

---

## 4. Non-Functional Requirements

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-01 | No patient data transmitted over any network | All processing is local; no APIs, no analytics, no telemetry |
| NF-02 | No login or authentication | The tool is a local utility, not a multi-user service |
| NF-03 | Desktop-only layout | Designed for hospital workstation monitors; mobile responsiveness is out of scope |
| NF-04 | Minimal learning curve | A surgeon unfamiliar with the tool should be productive within minutes |
| NF-05 | Export must be legible when printed on A4 landscape | Charts are designed for clinical documentation |

---

## 5. Constraints and Limitations

| Constraint | Impact |
|-----------|--------|
| CDN dependencies (React, Tailwind, Babel, html2canvas, jsPDF) | App will not load on a machine with no internet and no cached resources |
| Single-file architecture | Maintainability decreases as feature count grows; no module system |
| localStorage only (5–10 MB limit) | Cannot store large numbers of cases; no cross-device sync |
| Runtime JSX transpilation via Babel | Slower initial load than a pre-compiled build; acceptable for a planning tool |
| No TypeScript | Type errors caught only at runtime |
| No automated tests | Correctness validated manually |
| html2canvas rendering | Export fidelity depends on browser rendering engine; minor visual differences possible |

---

## 6. Future Requirements (Identified, Not Implemented)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-03 | Interbody cage support (ACDF, PLIF, TLIF, XLIF, OLIF, ALIF) | **Implemented** (v0.7.0, merged to main) |
| FR-06 | **Rods and longitudinal members** (round rods, rails, transition rods, satellite rods, growing rods) | Partially implemented — free-text rod fields in v0.8.2; visual rod rendering deferred |
| FR-07 | **Rod variants** (quad rod constructs, rail profiles, domino/side-to-side connectors) | Specified |
| FR-17 | **Company and screw system selection** with auto-theme | **Implemented** (v0.8.2) — 16 manufacturers, per-company screw system suggestions |
| FR-18 | **Colour scheme system** with company auto-switching | **Implemented** (v0.8.2) — 7 schemes, 5 company mappings, sidebar-only theming |
| FR-08 | **Additional screw types** (fenestrated, cortical, cannulated, revision, S2AI) | Specified |
| FR-09 | **Per-implant notes** (free text on all implant modals) | Specified |
| FR-10 | **Bone graft recording** (autograft, allograft, BMP, synthetic, with location) | Specified |
| FR-11 | **Wire/cable/band recording** (sublaminar wires, cables, bands) | Specified |
| FR-12 | **Enhanced VBR recording** (expandable/static/mesh, sizing) | Specified |
| FR-13 | **Enhanced PDF export** (level-by-level implant table, plan vs actual comparison) | Specified |
| FR-01 | GS1 DataMatrix barcode scanning for implant identification | Planned (html5-qrcode) |
| FR-02 | Embed all CDN dependencies into the HTML file for true offline use | Planned |
| FR-04 | Procedure templates for common surgeries | Not started |
| FR-05 | Implant cost estimation from inventory | Not started |
| FR-14 | Manufacturer/catalogue fields and GUDID lookup | Partially implemented — company/screw system fields in v0.8.2; GUDID lookup not started |
| FR-15 | BSR-compatible data export | Not started |
| FR-16 | Bulk entry for deformity constructs (level range + bilateral) | Not started |

**Detailed specification:** `~/Projects/spine-surgery/instrumentation/spine-construct-record/SPEC.md`
