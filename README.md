# Leeds Spinal Planner

A digital surgical planning tool for spinal surgeons. Replaces hand-drawn instrumentation diagrams with a visual, exportable chart that documents the pre-operative plan and post-operative construct.

**Version:** v0.9.1-alpha | **License:** GNU GPLv3
**Live:** [nigelgummerson.github.io/spine-planner](https://nigelgummerson.github.io/spine-planner)

## Features

- **Screws:** Monoaxial, polyaxial, uniplanar with diameter/length sizing and free-text annotations
- **Hooks:** Pedicle, TP (down/up), supra-laminar, infra-laminar with annotations
- **Fixation:** Bands, wires, cables with free-text descriptions
- **Interbody cages:** ACDF, PLIF, TLIF, XLIF, OLIF, ALIF with anatomical permissibility engine
- **Osteotomies:** Schwab grade 1-6 + Corpectomy, with reconstruction cage recording for VCR
- **Bone graft:** Multi-select types (Local Bone, Autograft, Allograft, Synthetics, DBM, BMP) with notes
- **Deformity forces:** Translate, compress, distract, derotate — shown on the plan chart only
- **Company/screw system:** 16 implant manufacturers with product-specific screw system suggestions
- **Colour themes:** 7 sidebar colour schemes (inc. NHS Blue), auto-switch from selected implant company
- **Four views:** Cervical (Oc-T4), Thoracic (T1-Pelvis), Lumbar (T10-Pelvis), Whole Spine
- **Dual chart:** Pre-operative Plan and Final Surgical Construct side by side, with copy-plan-to-construct
- **Rod recording:** Free-text rod description fields (e.g. "5.5mm CoCr Rod") under each construct column
- **Implant inventory:** Auto-generated two-column table from placed instruments
- **Export:** PDF and JPG at print quality (1485x1050px landscape), filenames include patient name
- **JSON save/load:** v3 format with plan/construct separation and full state round-trip
- **Session Privacy Mode:** Prevents patient data being stored on the computer — for GDPR compliance on shared machines

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
