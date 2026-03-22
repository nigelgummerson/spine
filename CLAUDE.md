# Spinal Instrumentation Plan & Record

## What This Project Is
A single-file HTML application for pre-operative spinal surgery planning. Designed to run offline on hospital computers without installation. Generates professional surgical plans with inventory tracking, procedural details, and PDF export. Supports 14 European languages.

## Current Status
- **Version:** v2.1.0-beta
- **Last Updated:** 2026-03-22
- **License:** GNU GPLv3

## Project Structure
```
spine-planner/
├── index.html              # Vite entry point (minimal)
├── vite.config.js          # Vite + vite-plugin-singlefile config
├── postcss.config.js       # Tailwind v4 PostCSS
├── package.json            # npm dependencies and scripts
├── src/
│   ├── main.jsx            # React root mount + font imports
│   ├── App.jsx             # Main app component (~1,370 lines)
│   ├── styles.css          # Global CSS + Tailwind import
│   ├── inter-subset.css    # Inter font (WOFF2, Latin/Greek subsets)
│   ├── source-serif-4-subset.css  # Source Serif 4 (WOFF2, Latin/Greek)
│   ├── i18n/
│   │   ├── translations.json    # All translations (14 languages × 253 keys)
│   │   ├── languages.json       # SUPPORTED_LANGUAGES array
│   │   └── i18n.js              # t(), detectLanguage(), lang state
│   ├── data/
│   │   ├── anatomy.js           # VERTEBRA_ANATOMY, REGIONS, coordinate functions
│   │   ├── implants.js          # IMPLANT_COMPANIES, SCREW_SYSTEMS, sizing
│   │   ├── clinical.js          # CAGE_PERMISSIBILITY, osteotomy/force types
│   │   ├── themes.js            # COLOUR_SCHEMES, company theme mapping
│   │   └── changelog.js         # CURRENT_VERSION, CHANGE_LOG
│   ├── components/
│   │   ├── icons.jsx            # 13 SVG icon components
│   │   ├── ImplantInventory.jsx # Grouped inventory counts
│   │   ├── ScrewSystemCombo.jsx # Manufacturer screw system dropdown
│   │   ├── CreditsFooter.jsx    # Version, credits, license footer
│   │   ├── modals/              # ScrewModal, CageModal, OsteotomyModal,
│   │   │                        # ForceModal, NoteModal, HelpModal, ChangeLogModal
│   │   └── chart/               # ChartPaper, LevelRow, SpineVertebra,
│   │                            # InstrumentIcon, CageVisualization
│   ├── hooks/
│   │   └── usePortrait.js       # Orientation detection hook
│   └── utils/
│       └── id.js                # Unique ID generator
├── dist/                   # Build output (single index.html, ~1.9MB)
├── tests/                  # i18n verification (read from src/i18n/*.json)
├── tools/                  # Translation review tools (read/write src/i18n/translations.json)
├── review-forms/           # Per-language review HTML + responses
├── .github/workflows/deploy.yml  # GitHub Actions: build + deploy to Pages
├── data/ -> Dropbox        # Symlink: PDFs, reference images, rod data
├── docs/ -> Dropbox        # Symlink: specs, plans
└── .gitignore              # + node_modules/, dist/
```

## GitHub & Deployment
- **Repository:** github.com/nigelgummerson/spine-planner
- **Live Site:** nigelgummerson.github.io/spine-planner (GitHub Pages)
- **Deployment:** GitHub Actions — `npm ci && npm run build`, deploys `dist/` on push to main

## Tech Stack
- **Build:** Vite + vite-plugin-singlefile (outputs single HTML file with everything inlined)
- **Framework:** React 19 (npm, pre-compiled JSX — no in-browser transpilation)
- **Styling:** Tailwind CSS v4 (PostCSS)
- **Fonts:** Inter + Source Serif 4 via fontsource (WOFF2, Latin/Greek subsets, embedded as base64)
- **Export:** html-to-image (SVG foreignObject) + jsPDF
- **All dependencies bundled** — no CDN calls, fully offline

## Version History (Recent)
- **v2.1.0-beta** (2026-03-22): Vite build system — modular source (26 files), pre-compiled JSX, single-file output via vite-plugin-singlefile. Fully offline with embedded fonts (Inter, Source Serif 4). Translations externalised to JSON. Translation tools and tests updated to read JSON directly. GitHub Actions deployment.
- **v2.0.3-beta** (2026-03-22): Review form UX — persistent backup banner, auto-scroll to next unreviewed, larger touch targets, guide page.
- **v2.0.2-beta** (2026-03-22): Clinical translation audit — Greek, Polish fixes. Localised ghost placement terminology.
- **v2.0.1-beta** (2026-03-21): Translated 8 hardcoded strings. Sync race condition fix. One-implant-per-zone enforcement. App version check on sync.
- **v2.0.0-beta** (2026-03-21): JSON format v4 — spinal-instrumentation schema. Unified elements array with typed sub-objects (screw, hook, cage, osteotomy, fixation, connector). Forces separated from implants. Structured screw data (diameter/length as numbers). Rod objects with material/diameter/profile fields. Document metadata (UUID, timestamps, institution, language). Schema self-description for interoperability. Clinical terminology throughout. Backward-compatible — loads v2/v3 files. JSON Schema spec at docs/spinal-instrumentation-schema-v4.json.
- **v1.3.1-beta** (2026-03-21): Expert review polish. Active chart accent border + 20% inactive overlay. Uniform vertebral body fill (#f1f5f9). Osteotomy colour red→amber (red reserved for destructive actions). Custom New Patient confirmation modal (replaces browser confirm). Export picker — choose Plan or Final Record before JPG/PDF. Export timestamp footer. Pedicle vertical position based on pedicle height. Force zones always open ForceModal regardless of tool. Note preset labels sentence case. Linked Screens help entry (14 languages). Dark theme button borders improved.
- **v1.3.0-beta** (2026-03-21): Major design overhaul following Apple HIG review. Light sidebar with corporate brand accents — Medtronic (navy title bar, electric blue), DePuy (dark red, crimson), Stryker (black, gold), VB Spine (purple), Globus (midnight blue, red). Dark themes available for preference. Sidebar and portrait toolbar reordered by workflow frequency (tools first). Click inactive chart to switch editing side in landscape. 10px minimum font size (Inter). Help and Changelog modals: two-column landscape layout, wider, Escape to close. Changelog consolidated to date-based entries. Pedicle proportions at full anatomical scale. Theme swatch borders and tool palette icons adapt to light/dark themes.
- **v1.2.6-beta** (2026-03-21): Design review — accessibility and UX improvements. Colour contrast fixed: placeholder text, chart headers, sidebar labels all now meet WCAG AA (4.5:1 minimum). Toast notifications replace all browser alert() dialogs — non-blocking, auto-dismiss for info, persist for errors. Modal focus trapping — Tab/Shift+Tab cycle within modal, cannot escape to background (manually managed focus with preventDefault). Portrait touch targets enlarged for tablet/gloved use (toolbar icons 28→36px, view/tool buttons, privacy indicator). prefers-reduced-motion support disables all animations. ARIA roles on all modals. Visible focus ring on editable fields. Bone graft checkboxes enlarged.
- **v1.2.5-beta** (2026-03-21): Osteotomy placement reworked to match Schwab classification anatomy. Schwab 1-2 (Facet, Ponte) now placed at disc level — clicking between vertebrae shows a picker offering Interbody Cage or Osteotomy. Schwab 3+ (PSO, VCR, etc.) placed on the vertebral body — clicking midline always opens the osteotomy modal regardless of tool selection. Correction angle now optional — defaults to empty with placeholder hints showing typical values. Disc-level osteotomies render as labelled tags in the disc space. Ghost placement support for all osteotomy types.
- **v1.2.4-beta** (2026-03-21): One implant per zone — clicking an occupied left/right zone opens the edit modal instead of creating a duplicate. Demographics inventory shows Plan by default with a "View Final" / "View Plan" toggle button (translated, 14 languages). Sync fixes: New Patient and Load now broadcast state immediately, preventing the other window from sending stale data back during the 200ms debounce window.
- **v1.2.3-beta** (2026-03-21): Force colour scheme changed from emerald to blue (biomechanics convention for corrective vectors). Demographics panel now shows both Plan and Construct inventories simultaneously — fixes live inventory updates during dual-window sync. Construct title bar properly centred with "Forces — edit in Plan" hint below in blue italic. Portrait tab selection persists across page reloads via localStorage. Force modal, icons, zone backgrounds all consistently blue.
- **v1.2.2-beta** (2026-03-21): Dual-window sync via BroadcastChannel. Two browser windows on the same machine stay synchronised in real time — designed for dual-display use in operating theatres. One screen can show the Plan while the other shows Demographics with live inventory. Heartbeat-based peer detection with automatic reconnect. Green link icon in sidebar indicates active sync. Debounced at 200ms with echo prevention. No new dependencies.
- **v1.2.1-beta** (2026-03-21): Translate chart column headers (Left/Right/Force) in all 14 languages — previously hardcoded English. Portrait Construct tab shows "Forces — edit in Plan" hint below title when force columns are displayed read-only. Dropbox symlinks created for data/ and docs/; stray PDF moved to Dropbox. Project structure in CLAUDE.md updated.
- **v1.2.0-beta** (2026-03-21): Ghost placements on construct view (portrait mode). Plan data shown at 0.40 opacity as ghost placements — tap to open pre-filled modal and confirm. Plan forces shown at full opacity (read-only). Construct column widened to 637px to accommodate force columns. "Confirm Plan" button with tooltip — accepts all remaining unconfirmed placements, excludes forces. Ghost notes, connectors, and cages all supported. New "Portrait & Tablet Mode" help section. Updated "Confirm Plan" help section describing ghost workflow. Export and landscape mode unchanged. No JSON format changes.
- **v1.1.0-beta** (2026-03-20): Portrait/tablet responsive mode. Orientation-aware layout: sidebar becomes horizontal toolbar, columns shown one at a time via tab bar with swipe gestures. Each column scaled to fit viewport at export proportions. Edit mode auto-syncs with active tab. View-only mode on phones (<600px short dimension). Language selector reordered (English first, then alphabetical by native name). Export always landscape 1485x1050.
- **v1.0.1-beta** (2026-03-20): Fixed screw type translations — Turkish -aksiyal corrected to -aksiyel per manufacturer literature, removed spurious ü from Turkish uniplanar, Polish adjective gender corrected to feminine (matching śruba), Swedish/Norwegian/Danish uniplanar reverted to English form (unattested localised forms removed).
- **v1.0.0-beta** (2026-03-20): Internationalisation — 14 European languages. ~220 translation keys, t() function, language auto-detection, sidebar language selector, clinical terminology verification. App renamed to "Spinal Instrumentation Plan & Record". Theme picker redesigned as colour swatches. 3 new colour schemes (Forest Green, Teal & Coral, Steel & Ice). Theme/language persist in localStorage exempt from privacy mode. Sidebar widened to 340px, export left panel to 370px. Tool categories merged. Plan/Construct toggle labelled "Editing".
- **v0.9.7-beta** (2026-03-14): Rod fields added to Plan side with length estimate placeholders. Rods section added to inventory. New patient data fields: planLeftRod, planRightRod.
- **v0.9.6-beta** (2026-03-04): Note tool, sidebar reorganisation, hover/UX fixes.
- **v0.9.5-beta** (2026-03-03): Fixed duplicate ID generation. Fixed hover jitter on implant icons. Code formatting cleanup.
- **v0.9.4-alpha** (2026-03-01): Replaced html2canvas with html-to-image for pixel-perfect export.
- **v0.9.3-alpha** (2026-03-01): Anatomical proportions (T1-S1), pedicle data, variable disc heights, auto-scale solver.

## Key Architecture (v2.1.0)
- **i18n:** `src/i18n/translations.json` (~253 keys × 14 languages), `t(key, replacements)` function with `??` fallback chain in `src/i18n/i18n.js`. Module-level `_currentLang` synced with React state via `changeLang()`.
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
- **JSON v4 format:** `schema.format: 'spinal-instrumentation'`, `schema.version: 4`. Unified `elements` array with typed sub-objects. Forces, rods, notes, boneGraft as separate arrays within plan/construct. Document metadata (UUID, timestamps). UI state separated. Loads v2/v3 legacy files. Schema: `docs/spinal-instrumentation-schema-v4.json`
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
- [x] **Offline bundling:** Vite + vite-plugin-singlefile embeds all JS, CSS, and fonts into single HTML file (v2.1.0)
- [ ] **User testing:** Get feedback from theatre staff on current workflow
- [ ] **Specification sync:** SPECIFICATION.md updated to v0.9.0
- [x] **i18n review tooling:** Python generator + import pipeline for native-speaker translation review
- [ ] **i18n Tier C:** Awaiting feedback from native-speaking reviewers (surgeons & industry professionals)

## Key Constraints
- **Must remain single .html file** - Vite build produces one self-contained HTML file via vite-plugin-singlefile
- **Offline-first** - All dependencies and fonts embedded, no network required
- **Hospital environment** - Assumes locked-down Windows machines with restricted permissions
- **Print-friendly** - PDF export must be high quality for clinical records

## Related Projects
- **Implant Branding:** `~/Projects/spine-surgery/planning/implant-branding/` — company colour/font data (companies.json)
- **Construct Record Spec:** `~/Projects/spine-surgery/instrumentation/spine-construct-record/SPEC.md`

## Development Workflow
```bash
# Development (hot module replacement)
npm run dev                   # Starts Vite dev server (http://localhost:5173)

# Build single-file output
npm run build                 # Produces dist/index.html (~1.9MB, fully offline)
open dist/index.html          # Test built output from file://

# Deploy to GitHub Pages
git push origin main          # GitHub Actions builds and deploys automatically

# Run i18n verification tests (start dev server first, or use any HTTP server)
open tests/i18n-completeness.html   # Check all keys present
open tests/i18n-clinical.html       # Check against glossary
open tests/i18n-overflow.html       # Check string lengths

# Translation review workflow
python tools/generate-review-forms.py           # Generate HTML review forms (review-forms/)
# Email {lang}-review.html + TRANSLATION-REVIEW-GUIDE.md to reviewers
# Reviewer exports JSON, emails to skeletalsurgery@icloud.com
python tools/import-reviews.py review-file.json          # Report corrections
python tools/import-reviews.py --apply review-file.json  # Apply corrections to translations.json
python tools/generate-review-forms.py                     # Regenerate forms with updated translations
```

## Related Resources
- **Obsidian Notes:** [[spine-planner]] in vault
- **Context File:** alpha-notes.txt (version history and feature notes)
- **User Guide:** Built into app (Help button)
- **i18n Design Spec:** docs/superpowers/specs/2026-03-20-i18n-european-languages-design.md (local only, gitignored)
