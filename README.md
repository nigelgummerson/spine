# Leeds Spinal Planner

A digital surgical planning tool for spinal surgeons. Replaces hand-drawn instrumentation diagrams with a visual, exportable chart that documents the pre-operative plan and post-operative construct.

**Version:** v0.8.2-alpha | **License:** GNU GPLv3
**Live:** [nigelgummerson.github.io/spine-planner](https://nigelgummerson.github.io/spine-planner)

## Features

- **Instrumentation:** Pedicle screws (mono/poly/uniplanar), hooks (pedicle, TP, supra/infra-laminar), crosslinks
- **Interbody cages:** ACDF, PLIF, TLIF, XLIF, OLIF, ALIF with anatomical permissibility engine
- **Deformity forces:** Translate, compress, distract, derotate — shown on the plan chart only
- **Osteotomies:** Schwab grade 1-6 with correction angle
- **Company/screw system:** 16 implant manufacturers with product-specific screw system suggestions
- **Colour themes:** 7 sidebar colour schemes, auto-switch from selected implant company
- **Four views:** Cervical (Oc-T4), Thoracic (T1-Pelvis), Lumbar (T10-Pelvis), Whole Spine
- **Dual chart:** Pre-operative Plan and Final Surgical Construct side by side, with copy-plan-to-construct
- **Rod recording:** Free-text rod description fields (e.g. "5.5mm CoCr Rod") under each construct column
- **Implant inventory:** Auto-generated two-column table from placed instruments
- **Export:** PDF and JPG at print quality (1485x1050px landscape), filenames include patient name
- **JSON save/load:** v2 format with plan/construct separation and full state round-trip
- **Session Mode:** Incognito mode that wipes all local storage for GDPR compliance on shared machines

## Requirements

- **No install required** — single HTML file, runs in any modern browser
- **Offline capable** — works without internet once loaded (CDN dependencies cached)
- **Hospital friendly** — designed for locked-down NHS workstations

## Tech Stack

React 18, Tailwind CSS, html2canvas, jsPDF — all via CDN. No build process, no npm, no installation.

## Usage

Open `index.html` in a browser, or visit the [live site](https://nigelgummerson.github.io/spine-planner).

## Author

Nigel Gummerson, Spinal Surgeon, Leeds Teaching Hospitals NHS Trust
