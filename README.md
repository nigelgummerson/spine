# Spinal Instrumentation Plan & Record

A digital surgical planning tool for spinal surgeons. Replaces hand-drawn instrumentation diagrams with a visual, exportable chart that documents the pre-operative plan and post-operative construct. Runs offline on hospital computers as a single HTML file — no installation required.

**Version:** v2.7.34-beta | **License:** GNU GPLv3
**Live:** [plan.skeletalsurgery.com/spine](https://plan.skeletalsurgery.com/spine/)

## Features

- **22 languages:** English, Arabic (RTL), Chinese Simplified, Danish, German, Greek, Spanish, Finnish, French, Hebrew (RTL), Hindi, Italian, Japanese, Korean, Norwegian, Dutch, Polish, Portuguese, Russian, Swedish, Turkish, Ukrainian — auto-detects browser locale
- **Screws:** Monoaxial, polyaxial, uniplanar with diameter/length sizing and free-text annotations
- **Hooks:** Pedicle, TP (down/up), supra-laminar, infra-laminar with annotations
- **Fixation:** Bands, wires, cables with annotations
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
- **Implant inventory:** Auto-generated with summary totals and units
- **Clear Construct:** Reset the surgical record without affecting the plan
- **Export:** JPG, PDF (A4 300 DPI), and JSON v4 (spinal-instrumentation schema with UUID, timestamps, schema self-description)
- **Session Privacy Mode:** Prevents patient data being stored on the computer — for GDPR/Caldicott compliance on shared machines

## Requirements

- **No install required** — runs in any modern browser, distributable as a single HTML file
- **Fully offline** — all dependencies and fonts embedded, no network required. CJK fonts (Chinese, Japanese, Korean) included in the web build; Hebrew RTL fully supported
- **Hospital friendly** — designed for locked-down NHS workstations

## Tech Stack

Built with Vite, React 19, Tailwind CSS v4, html-to-image, jsPDF. All dependencies bundled into a single HTML file via vite-plugin-singlefile.

## Usage

Open `index.html` in a browser, or visit the [live site](https://plan.skeletalsurgery.com/spine/).

See the [Quick Reference Guide](https://plan.skeletalsurgery.com/spine/quick-reference.html) for a translated quick-start guide (22 languages).

## Disclaimer

This tool is a documentation and communication aid for surgical planning. It is not a medical device and has not been approved, cleared, or certified by any regulatory body (including MHRA, EU MDR, or FDA). It does not provide clinical decision support, diagnostic information, or treatment recommendations.

The operating surgeon bears full responsibility for all clinical decisions, including implant selection, placement, and verification at the point of use (WHO Surgical Safety Checklist). The surgical record produced by this tool is only as accurate as the information entered.

All patient data remains on the local device. No data is transmitted to any server. There is no analytics or telemetry.

This software is provided as-is under the GNU GPLv3 licence, with no warranty of any kind.

## Author

Nigel Gummerson FRCS (Tr & Orth), Spinal Surgeon, Leeds, UK

## Contributors

- **Gemini** — co-developed the initial prototype through v0.7.0-alpha (V12 to cage permissibility), and v2.0.2-beta clinical translation audit
- **Claude** — co-developed from v0.8.0-alpha onwards (company/screw systems, internationalisation, portrait mode, accessibility, JSON v4, Vite migration)
