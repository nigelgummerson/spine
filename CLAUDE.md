# Leeds Spinal Planner

## What This Project Is
A single-file HTML application for pre-operative spinal surgery planning. Designed to run offline on hospital computers without installation. Generates professional surgical plans with inventory tracking, procedural details, and PDF export.

## Current Status
- **Version:** v0.8.2-alpha (released on main branch)
- **Last Updated:** 2026-02-28
- **License:** GNU GPLv3

## Project Structure
```
spine-surgery/planning/spine-planner/
├── index.html          # Single-file app (React 18 + Tailwind via CDN)
├── alpha-notes.txt     # Development context and version notes
├── CLAUDE.md           # This file (Claude-specific collaboration tracking)
├── README.md           # GitHub README
├── SPECIFICATION.md    # Retrospective spec (v0.5.6 baseline)
├── PHASE-0-SPEC.md     # Cage implementation spec and permissibility matrix
└── .git/               # Git repository
```

## GitHub & Deployment
- **Repository:** github.com/nigelgummerson/spine-planner
- **Live Site:** nigelgummerson.github.io/spine-planner (GitHub Pages)
- **Branch:** `main` only (feature/cages merged)

## Tech Stack
- React 18 (via CDN - unpkg)
- Tailwind CSS (via CDN)
- html2canvas (screenshot/preview)
- jsPDF (PDF export)
- All dependencies loaded via CDN for offline hospital use

## Version History (Recent)
- **v0.8.2-alpha** (2026-02-28): Company/screw system fields, auto-theme from company, rod text fields, screw size compact format, cage label repositioning, UI polish
- **v0.8.1-alpha** (2026-02-28): Sans-serif throughout, flex ratio fix, auto-scale cap, draggable crosslinks, JSON v2 format, colour schemes, two-column inventory
- **v0.8.0-alpha** (2026-02-28): Sidebar-only layout, auto-scaling spine height, interbody cages merged, session mode, export panel redesign
- **v0.7.0-alpha**: Interbody cage support (ACDF, PLIF, TLIF, XLIF, OLIF, ALIF) with permissibility engine
- **v0.5.6-alpha**: Last version before cage support

## Key Architecture (v0.8.2)
- **Export container:** Fixed 1485x1050px, 3 columns: patient info (340px) + Plan (flex-4) + Construct (flex-3)
- **Sidebar:** w-64, colour-themed per company (7 schemes), tool palette, export controls
- **Colour schemes:** Sidebar only; printed form unaffected. `AUTO_THEME_FROM_COMPANY` flag controls auto-switching
- **Company/Screw data:** `IMPLANT_COMPANIES` (16 manufacturers), `SCREW_SYSTEMS` (per-company product lists), `COMPANY_THEME_MAP` (5 mapped companies)
- **JSON v2 format:** `formatVersion: 2`, plan/construct separation, `patient` includes company/screwSystem/leftRod/rightRod
- **yNorm coordinates:** Connectors use 0-1000 normalised positioning (view-independent)
- **Session cache:** localStorage key `spine_planner_v2`

## Next Steps
- [ ] **Barcode scanning:** Integrate html5-qrcode for GS1 DataMatrix scanning from implant packages
- [ ] **Offline bundling:** Embed all JS libraries directly into HTML to bypass hospital firewalls
- [ ] **User testing:** Get feedback from theatre staff on current workflow
- [ ] **Specification sync:** Update SPECIFICATION.md to reflect v0.8.x architecture

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
