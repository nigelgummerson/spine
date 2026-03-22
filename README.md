# Spinal Instrumentation Plan & Record

A digital surgical planning tool for spinal surgeons. Replaces hand-drawn instrumentation diagrams with a visual, exportable chart that documents the pre-operative plan and post-operative construct. Runs offline on hospital computers as a single HTML file — no installation required.

**Version:** v2.0.2-beta | **License:** GNU GPLv3
**Live:** [plan.skeletalsurgery.com/spine](https://plan.skeletalsurgery.com/spine/)

## Features

- **14 languages:** English, German, French, Spanish, Italian, Portuguese, Swedish, Norwegian, Danish, Finnish, Dutch, Polish, Greek, Turkish — auto-detects browser locale
- **Screws:** Monoaxial, polyaxial, uniplanar with diameter/length sizing and free-text annotations
- **Hooks:** Pedicle, TP (down/up), supra-laminar, infra-laminar with annotations
- **Fixation:** Bands, wires, cables with free-text descriptions
- **Interbody cages:** ACDF, PLIF, TLIF, XLIF/LLIF, OLIF, ALIF with anatomical permissibility engine and approach grouping
- **Osteotomies:** Schwab grade 1–6 + Corpectomy, with disc-level vs vertebral body placement and optional correction angles
- **Bone graft:** Multi-select types (Local Bone, Autograft, Allograft, Synthetics, DBM, BMP) with notes
- **Deformity forces:** Translate, compress, distract, derotate — shown on the plan chart only
- **Company/screw system:** 16 implant manufacturers, 90+ screw systems, searchable dropdown
- **10 colour themes:** 6 light (including 5 corporate-branded) + 4 dark; auto-switch from selected implant company
- **Four views:** Cervical (Oc–T4), Thoracolumbar (T1–Pelvis), Lumbar (T10–Pelvis), Whole Spine
- **Dual chart:** Pre-operative Plan and Final Surgical Construct side by side, with copy-plan-to-construct
- **Ghost placements:** Plan data shown as confirmable ghosts on the Construct (portrait mode) — tap to review and confirm
- **Dual-window sync:** Two browser windows on the same machine synchronise in real time for theatre dual-display setups
- **Responsive:** Landscape (sidebar + two columns), portrait/tablet (toolbar + three tabs with swipe), view-only on phones
- **Accessibility:** WCAG AA contrast, toast notifications, modal focus trapping, prefers-reduced-motion, enlarged touch targets
- **Rod recording:** Free-text rod descriptions for plan and construct, auto-generated inventory
- **Implant inventory:** Auto-generated from placed instruments with rod section
- **Export:** JPG, PDF (print quality 1485x1050px), and JSON v4 (spinal-instrumentation schema with UUID, timestamps, schema self-description)
- **Session Privacy Mode:** Prevents patient data being stored on the computer — for GDPR/Caldicott compliance on shared machines

## Requirements

- **No install required** — single HTML file, runs in any modern browser
- **Offline capable** — works without internet once loaded (CDN dependencies cached)
- **Hospital friendly** — designed for locked-down NHS workstations

## Tech Stack

React 18, Tailwind CSS, html-to-image, jsPDF — all via CDN. No build process, no npm, no installation.

## Usage

Open `index.html` in a browser, or visit the [live site](https://plan.skeletalsurgery.com/spine/).

See the [Quick Reference Guide](https://plan.skeletalsurgery.com/spine/quick-reference.html) for a translated quick-start guide (14 languages).

## Author

Nigel Gummerson, Spinal Surgeon, Leeds Teaching Hospitals NHS Trust
