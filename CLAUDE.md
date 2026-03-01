# Leeds Spinal Planner

## What This Project Is
A single-file HTML application for pre-operative spinal surgery planning. Designed to run offline on hospital computers without installation. Generates professional surgical plans with inventory tracking, procedural details, and PDF export.

## Current Status
- **Version:** v0.9.1-alpha (released on main branch)
- **Last Updated:** 2026-03-01
- **License:** GNU GPLv3

## Project Structure
```
spine-surgery/planning/spine-planner/
├── index.html          # Single-file app (React 18 + Tailwind via CDN), ~1574 lines
├── alpha-notes.txt     # Development context and version notes
├── CLAUDE.md           # This file (Claude-specific collaboration tracking)
├── README.md           # GitHub README
├── SPECIFICATION.md    # Retrospective spec (updated to v0.9.0)
├── PHASE-0-SPEC.md     # Cage implementation spec and permissibility matrix
└── .git/               # Git repository
```

## GitHub & Deployment
- **Repository:** github.com/nigelgummerson/spine-planner
- **Live Site:** nigelgummerson.github.io/spine-planner (GitHub Pages)
- **Branch:** `main` only

## Tech Stack
- React 18 (via CDN - unpkg)
- Tailwind CSS (via CDN)
- html2canvas (screenshot/preview)
- jsPDF (PDF export)
- All dependencies loaded via CDN for offline hospital use

## Version History (Recent)
- **v0.9.1-alpha** (2026-03-01): Session Privacy Mode rename, JSON v3 format with shared serialiser, help modal rewrite, theme renames
- **v0.9.0-alpha** (2026-03-01): Up-going TP hook, bands/wires/cables, screw annotations, reconstruction cage text, bone graft section, left panel restructure, XLIF fix (T5-L4), corpectomy rendering fix
- **v0.8.2-alpha** (2026-02-28): Company/screw system fields, auto-theme from company, rod text fields, screw size compact format, cage label repositioning, UI polish
- **v0.8.1-alpha** (2026-02-28): Sans-serif throughout, flex ratio fix, auto-scale cap, draggable crosslinks, JSON v2 format, colour schemes, two-column inventory
- **v0.8.0-alpha** (2026-02-28): Sidebar-only layout, auto-scaling spine height, interbody cages merged, session mode, export panel redesign
- **v0.7.0-alpha**: Interbody cage support (ACDF, PLIF, TLIF, XLIF, OLIF, ALIF) with permissibility engine
- **v0.5.6-alpha**: Last version before cage support

## Key Architecture (v0.9.1)
- **Export container:** Fixed 1485x1050px, 3 columns: patient info (340px) + Plan (flex-4) + Construct (flex-3)
- **Sidebar:** w-64, colour-themed per company (7 schemes), tool palette, export controls
- **Colour schemes:** Sidebar only; printed form unaffected. `AUTO_THEME_FROM_COMPANY` flag controls auto-switching. Themes: Slate & Amber (default), NHS Blue, Deep Navy, Gold & Black, Red, Purple, Midnight
- **Company/Screw data:** `IMPLANT_COMPANIES` (16 manufacturers), `SCREW_SYSTEMS` (per-company product lists), `COMPANY_THEME_MAP` (5 mapped companies)
- **Implant types:** 3 screws (mono/poly/uni), 5 hooks (pedicle, TP down, TP up, supra-lam, infra-lam), 3 fixation (band, wire, cable)
- **Constants:** `HOOK_TYPES` (5 hook IDs), `NO_SIZE_TYPES` (hooks + band/wire/cable — no diameter/length sizing)
- **ScrewModal:** Three-tier visual hierarchy (SCREWS > HOOKS > BANDS & OTHERS), annotations for screws and hooks, free-text description for fixation
- **Osteotomies:** Schwab 1-6 + Corpectomy, grouped into Posterior/Anterior optgroups. VCR/ML-VCR/Corpectomy show reconstruction cage text input
- **Bone graft:** Multi-select checkboxes (Local Bone, Autograft, Allograft, Synthetics, DBM, BMP) + free-text notes
- **JSON v3 format:** `formatVersion: 3`, plan/construct separation, `patient` includes company/screwSystem/leftRod/rightRod/boneGraft
- **yNorm coordinates:** Connectors use 0-1000 normalised positioning (view-independent)
- **Session cache:** localStorage key `spine_planner_v2`, formatVersion 3
- **Save/load:** Shared `serializeState()` / `deserializeState()` functions; loads formatVersion >= 2

## Data Model (v0.9.1)

**Placement object:**
```
{ id, levelId, zone, tool, data, annotation }
```
- `annotation`: free text (screws/hooks only), e.g. "fenestrated, cortical"
- `data`: screw size string "6.5x45" | osteotomy object {type, angle, shortLabel, reconstructionCage} | null (hooks) | free text (band/wire/cable)

**Patient data:**
```
{ name, id, surgeon, location, date, company, screwSystem, leftRod, rightRod, boneGraft: { types: [], notes: '' } }
```

## Next Steps
- [ ] **Anatomical accuracy:** Pedicle width/height and vertebral body width/height data to improve vertebra rendering
- [ ] **Barcode scanning:** Integrate html5-qrcode for GS1 DataMatrix scanning from implant packages
- [ ] **Offline bundling:** Embed all JS libraries directly into HTML to bypass hospital firewalls
- [ ] **User testing:** Get feedback from theatre staff on current workflow
- [ ] **Specification sync:** SPECIFICATION.md updated to v0.9.0

## Key Constraints
- **Must remain single .html file** - No build process, no npm, no installation
- **Offline-first** - Should work without internet access
- **Hospital environment** - Assumes locked-down Windows machines with restricted permissions
- **Print-friendly** - PDF export must be high quality for clinical records

## Related Projects
- **Implant Branding:** `~/Projects/spine-surgery/planning/implant-branding/` — company colour/font data (companies.json)
- **Construct Record Spec:** `~/Projects/spine-surgery/instrumentation/spine-construct-record/SPEC.md`

## Development Workflow
```bash
# Test locally
open index.html                # Opens in browser

# Deploy to GitHub Pages
git push origin main          # Auto-deploys via GitHub Pages
```

## Related Resources
- **Obsidian Notes:** [[spine-planner]] in vault
- **Context File:** alpha-notes.txt (version history and feature notes)
- **User Guide:** Built into app (Help button)
