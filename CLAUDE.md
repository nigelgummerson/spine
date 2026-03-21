# Spinal Instrumentation Plan & Record

## What This Project Is
A single-file HTML application for pre-operative spinal surgery planning. Designed to run offline on hospital computers without installation. Generates professional surgical plans with inventory tracking, procedural details, and PDF export. Supports 14 European languages.

## Current Status
- **Version:** v1.2.0-beta
- **Last Updated:** 2026-03-21
- **License:** GNU GPLv3

## Project Structure
```
spine-surgery/planning/spine-planner/
├── index.html          # Single-file app (React 18 + Tailwind via CDN), ~6200 lines
├── tests/
│   ├── i18n-completeness.html    # Layer 1: translation key completeness
│   ├── i18n-clinical.html        # Layer 2: clinical terminology vs glossary
│   ├── i18n-overflow.html        # Layer 3: string length overflow detection
│   └── translation-glossary.json # Reference clinical terms with sources
├── tools/
│   ├── generate-review-forms.py    # Generates per-language HTML review forms
│   ├── import-reviews.py           # Imports reviewer JSON, reports & applies corrections
│   ├── TRANSLATION-REVIEW-GUIDE.md # Instructions for reviewers and developers
│   └── review-forms/               # Generated HTML forms and reviewer JSON (gitignored)
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
- **Branches:** `main` (v1.1.0-beta)

## Tech Stack
- React 18 production builds (via CDN - unpkg)
- Tailwind CSS (via CDN)
- html-to-image (PDF/JPG export via SVG foreignObject — pixel-perfect browser-native rendering)
- jsPDF (PDF export)
- All dependencies loaded via CDN for offline hospital use

## Version History (Recent)
- **v1.2.0-beta** (2026-03-21): Ghost placements on construct view (portrait mode). Plan data shown at 0.40 opacity as ghost placements — tap to open pre-filled modal and confirm. Plan forces shown at full opacity (read-only). Construct column widened to 637px to accommodate force columns. "Confirm Plan" button with tooltip — accepts all remaining unconfirmed placements, excludes forces. Ghost notes, connectors, and cages all supported. New "Portrait & Tablet Mode" help section. Updated "Confirm Plan" help section describing ghost workflow. Export and landscape mode unchanged. No JSON format changes.
- **v1.1.0-beta** (2026-03-20): Portrait/tablet responsive mode. Orientation-aware layout: sidebar becomes horizontal toolbar, columns shown one at a time via tab bar with swipe gestures. Each column scaled to fit viewport at export proportions. Edit mode auto-syncs with active tab. View-only mode on phones (<600px short dimension). Language selector reordered (English first, then alphabetical by native name). Export always landscape 1485x1050.
- **v1.0.1-beta** (2026-03-20): Fixed screw type translations — Turkish -aksiyal corrected to -aksiyel per manufacturer literature, removed spurious ü from Turkish uniplanar, Polish adjective gender corrected to feminine (matching śruba), Swedish/Norwegian/Danish uniplanar reverted to English form (unattested localised forms removed).
- **v1.0.0-beta** (2026-03-20): Internationalisation — 14 European languages. ~220 translation keys, t() function, language auto-detection, sidebar language selector, clinical terminology verification. App renamed to "Spinal Instrumentation Plan & Record". Theme picker redesigned as colour swatches. 3 new colour schemes (Forest Green, Teal & Coral, Steel & Ice). Theme/language persist in localStorage exempt from privacy mode. Sidebar widened to 340px, export left panel to 370px. Tool categories merged. Plan/Construct toggle labelled "Editing".
- **v0.9.7-beta** (2026-03-14): Rod fields added to Plan side with length estimate placeholders. Rods section added to inventory. New patient data fields: planLeftRod, planRightRod.
- **v0.9.6-beta** (2026-03-04): Note tool, sidebar reorganisation, hover/UX fixes.
- **v0.9.5-beta** (2026-03-03): Fixed duplicate ID generation. Fixed hover jitter on implant icons. Code formatting cleanup.
- **v0.9.4-alpha** (2026-03-01): Replaced html2canvas with html-to-image for pixel-perfect export.
- **v0.9.3-alpha** (2026-03-01): Anatomical proportions (T1-S1), pedicle data, variable disc heights, auto-scale solver.

## Key Architecture (v1.1.0)
- **i18n:** Flat `TRANSLATIONS` object (~220 keys × 14 languages), `t(key, replacements)` function with `??` fallback chain. `_currentLang` module-level variable synced with React state via `changeLang()`.
- **Supported languages:** en, de, fr, es, it, pt, sv, nb, da, fi, nl, pl, el, tr
- **Language detection:** `detectLanguage()` checks `localStorage('spine_planner_lang')` → `navigator.language` → `'en'`. `LANG_ALIASES` maps `no`/`nn` → `nb`.
- **Export container:** Fixed 1485x1050px, 3 columns: patient info (370px) + Plan (flex-4) + Construct (flex-3)
- **Sidebar:** w-[340px] in landscape, colour-themed per company (10 schemes), tool palette, export controls
- **Portrait mode:** `usePortrait()` hook via `matchMedia('(orientation: portrait)')`. Sidebar becomes 2-row horizontal toolbar. Three tabs (Demographics/Plan/Construct) with `switchPortraitTab()` syncing `portraitTab` and `activeChart`. Each column rendered at fixed export dimensions and CSS-scaled via `portraitScale` (ResizeObserver). Swipe gestures for tab switching (50px threshold, horizontal-dominant). Export mounts off-screen container temporarily via `portraitExporting` state.
- **View-only mode:** `isSmallScreen` = `Math.min(screen.width, screen.height) < 600`. On phones: tool palette hidden, ChartPaper `readOnly=true`, informational banner shown. Load/Save/Export/Help remain accessible.
- **Colour schemes:** 10 themes, swatch-only picker (no text labels). `changeTheme()` wrapper persists to `localStorage('spine_planner_theme')`, exempt from privacy mode.
- **Company/Screw data:** `IMPLANT_COMPANIES` (16 manufacturers), `SCREW_SYSTEMS` (per-company product lists), `COMPANY_THEME_MAP` (5 mapped companies)
- **Implant types:** 3 screws (mono/poly/uni), 5 hooks (pedicle, TP down, TP up, supra-lam, infra-lam), 3 fixation (band, wire, cable)
- **Data arrays:** `allTools`, `INVENTORY_CATEGORIES`, `OSTEOTOMY_TYPES`, `FORCE_TYPES`, `APPROACH_GROUPS` use `labelKey` pattern — data stays English, `t()` called at render time
- **ScrewModal:** Three-tier visual hierarchy (SCREWS > HOOKS > BANDS & OTHERS), annotations for screws and hooks, free-text description for fixation
- **Osteotomies:** Schwab 1-6 + Corpectomy, grouped into Posterior/Anterior optgroups. VCR/ML-VCR/Corpectomy show reconstruction cage text input
- **Bone graft:** Multi-select checkboxes (Local Bone, Autograft, Allograft, Synthetics, DBM, BMP) + free-text notes
- **JSON v3 format:** `formatVersion: 3`, plan/construct separation, `patient` includes company/screwSystem/leftRod/rightRod/planLeftRod/planRightRod/boneGraft
- **Connectors:** Level-anchored `{levelId, fraction}` (branch); legacy `{yNorm}` migrated on load
- **Session cache:** localStorage key `spine_planner_v2`, formatVersion 3
- **Save/load:** Shared `serializeState()` / `deserializeState()` functions; loads formatVersion >= 2
- **Export:** html-to-image (SVG foreignObject). `prepareExportCanvas()` syncs checkbox `checked` and select `selected` attributes before capture. jsPDF for PDF generation from canvas.
- **Translation disclaimer:** Shown in footer and export when language is not English. Feedback email for native-speaker corrections.

## i18n Translation Quality
- **Tier B (current):** Machine translation verified against clinical glossary (~48 terms × 13 languages)
- **Tier C (future):** Native-speaker review via disclaimer feedback email
- **Verification tests:** 3 browser-based HTML test suites in `tests/`
- **Glossary sources:** AO Spine, DWG, SFCR, GEER, SICV&GIS, SPP, NVWC, NOV, PTOiTr, HOA, TOTBİD
- **What stays English:** Vertebral labels, company/screw names, international abbreviations (ACDF, PLIF, etc.), Schwab grades, changelog, "Designed in Leeds" origin line

## Data Model (v0.9.7)

**Placement object:**
```
{ id, levelId, zone, tool, data, annotation }
```
- `annotation`: free text (screws/hooks only), e.g. "fenestrated, cortical"
- `data`: screw size string "6.5x45" | osteotomy object {type, angle, shortLabel, reconstructionCage} | null (hooks) | free text (band/wire/cable)

**Patient data:**
```
{ name, id, surgeon, location, date, company, screwSystem, leftRod, rightRod, planLeftRod, planRightRod, boneGraft: { types: [], notes: '' } }
```

## Next Steps
- [x] **Anatomical accuracy:** Data-driven vertebral proportions (T1-S1), merged to main in v0.9.3
- [x] **Export artefacts:** Fixed in v0.9.4 — replaced html2canvas with html-to-image
- [x] **Internationalisation:** 14 European languages, merged in v1.0.0-beta
- [x] **Portrait/tablet mode:** Responsive layout with tab-based columns, merged in v1.1.0-beta
- [x] **Ghost placements:** Plan data as confirmable ghosts on construct view (portrait), merged in v1.2.0-beta
- [ ] **Cervical spine proportions:** Extend VERTEBRA_ANATOMY to cervical levels (deferred)
- [ ] **Barcode scanning:** Integrate html5-qrcode for GS1 DataMatrix scanning from implant packages
- [ ] **Offline bundling:** Embed all JS libraries directly into HTML to bypass hospital firewalls
- [ ] **User testing:** Get feedback from theatre staff on current workflow
- [ ] **Specification sync:** SPECIFICATION.md updated to v0.9.0
- [x] **i18n review tooling:** Python generator + import pipeline for native-speaker translation review
- [ ] **i18n Tier C:** Awaiting feedback from native-speaking reviewers (surgeons & industry professionals)

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

# Run i18n verification tests
open tests/i18n-completeness.html   # Check all keys present
open tests/i18n-clinical.html       # Check against glossary
open tests/i18n-overflow.html       # Check string lengths

# Translation review workflow
python tools/generate-review-forms.py           # Generate HTML review forms (tools/review-forms/)
# Email {lang}-review.html + TRANSLATION-REVIEW-GUIDE.md to reviewers
# Reviewer exports JSON, emails to nigelgummerson@mac.com
python tools/import-reviews.py review-file.json          # Report corrections
python tools/import-reviews.py --apply review-file.json  # Apply corrections to index.html
python tools/generate-review-forms.py                     # Regenerate forms with updated translations
```

## Related Resources
- **Obsidian Notes:** [[spine-planner]] in vault
- **Context File:** alpha-notes.txt (version history and feature notes)
- **User Guide:** Built into app (Help button)
- **i18n Design Spec:** docs/superpowers/specs/2026-03-20-i18n-european-languages-design.md (local only, gitignored)
