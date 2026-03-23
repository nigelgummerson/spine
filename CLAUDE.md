# Spinal Instrumentation Plan & Record

## What This Project Is
A web application for pre-operative spinal surgery planning. Deployed as a code-split web build to GitHub Pages for connected hospital computers, with a standalone single-file download for offline use. Generates professional surgical plans with inventory tracking, procedural details, and PDF export. Supports 18 languages (16 European + Hindi and Arabic with RTL support).

## Current Status
- **Version:** v2.4.0-beta
- **Last Updated:** 2026-03-23
- **License:** GNU GPLv3
- **Language:** TypeScript (strict)

## Project Structure
```
spine-planner/
├── index.html              # Vite entry point (minimal)
├── vite.config.js          # Vite web build config (code-split)
├── vite.config.singlefile.js # Vite single-file build config (standalone)
├── tsconfig.json           # TypeScript strict config
├── postcss.config.js       # Tailwind v4 PostCSS
├── package.json            # npm dependencies and scripts
├── src/
│   ├── main.tsx            # React root mount + font imports
│   ├── App.tsx             # Main app component
│   ├── types.ts            # Shared TypeScript types
│   ├── react-augments.d.ts # React type augmentations
│   ├── styles.css          # Global CSS + Tailwind import
│   ├── inter-subset.css    # Inter font (WOFF2, Latin/Greek subsets)
│   ├── source-serif-4-subset.css  # Source Serif 4 (WOFF2, Latin/Greek)
│   ├── i18n/
│   │   ├── translations.json    # All translations (18 languages × 274 keys)
│   │   ├── languages.json       # SUPPORTED_LANGUAGES array
│   │   ├── i18n.ts              # t(), detectLanguage(), lang state
│   │   └── __tests__/i18n.test.ts
│   ├── data/
│   │   ├── anatomy.ts           # VERTEBRA_ANATOMY, REGIONS, coordinate functions
│   │   ├── implants.ts          # IMPLANT_COMPANIES, SCREW_SYSTEMS, sizing
│   │   ├── clinical.ts          # CAGE_PERMISSIBILITY, osteotomy/force types
│   │   ├── themes.ts            # COLOUR_SCHEMES, company theme mapping
│   │   ├── changelog.ts         # CURRENT_VERSION, CHANGE_LOG
│   │   └── __tests__/clinical-anatomy.test.ts
│   ├── state/
│   │   ├── documentReducer.ts   # useReducer actions + reducer for all document state
│   │   ├── schema.ts            # Zod schema — validates v4 JSON on load
│   │   └── __tests__/
│   │       ├── documentReducer.test.ts
│   │       └── schema.test.ts
│   ├── components/
│   │   ├── icons.tsx            # SVG icon components
│   │   ├── ImplantInventory.tsx # Grouped inventory counts (balanced columns by line count)
│   │   ├── ScrewSystemCombo.tsx # Manufacturer screw system dropdown
│   │   ├── CreditsFooter.tsx    # Version, credits, license footer
│   │   ├── modals/              # ScrewModal, CageModal, OsteotomyModal,
│   │   │                        # ForceModal, NoteModal, HelpModal, ChangeLogModal,
│   │   │                        # DisclaimerModal
│   │   └── chart/               # ChartPaper (SVG), LevelRow (SVG), SpineVertebra,
│   │                            # InstrumentIcon, CageVisualization
│   ├── hooks/
│   │   ├── usePortrait.ts       # Orientation detection hook
│   │   └── useDocumentState.ts  # Wraps documentReducer — primary state hook for App
│   └── utils/
│       ├── id.ts                # Unique ID generator
│       └── svgExport.ts         # SVG-based export utilities
├── specs/                  # Design docs for major refactors (gitignored)
│   ├── 2026-03-23-extract-app-state-design.md
│   ├── 2026-03-23-extract-app-state-plan.md
│   ├── 2026-03-23-zod-validation-design.md
│   └── 2026-03-23-zod-validation-plan.md
├── dist/                   # Build output (single index.html, ~1.99MB)
├── tests/                  # i18n verification (read from src/i18n/*.json)
├── tools/                  # Translation review tools (read/write src/i18n/translations.json)
├── public/review-forms/    # Per-language review HTML + responses (auto-generated)
├── _archive/               # Historical notes and prompts (alpha-notes.txt, design-review.md)
├── .github/workflows/deploy.yml  # GitHub Actions: build + deploy to Pages
├── .github/workflows/release.yml  # GitHub Actions: standalone build on v*.*.0 tags
├── data/ -> Dropbox        # Symlink: reference PDFs, rod data, anatomical images
├── docs/ -> Dropbox        # Symlink: SPECIFICATION.md, JSON v4 schema
└── .gitignore              # + node_modules/, dist/
```

## GitHub & Deployment
- **Repository:** github.com/nigelgummerson/spine
- **Live Site:** plan.skeletalsurgery.com/spine (GitHub Pages, custom domain)
- **Deployment:** GitHub Actions — `npm ci && npm run build`, deploys `dist/` on push to main
- **Standalone Releases:** GitHub Releases — standalone HTML attached on `v*.*.0` tags

## Tech Stack
- **Build:** Vite — code-split web build (default) + vite-plugin-singlefile for standalone offline HTML
- **Language:** TypeScript (strict mode) — all source files .tsx/.ts
- **Framework:** React 19 (npm, pre-compiled JSX — no in-browser transpilation)
- **Styling:** Tailwind CSS v4 (PostCSS)
- **Fonts:** Inter + Source Serif 4 via fontsource (WOFF2, Latin/Greek subsets, embedded as base64)
- **Validation:** Zod — validates v4 JSON schema on file load
- **Testing:** Vitest — 191 tests across 4 test files
- **Export:** html-to-image (SVG foreignObject) + jsPDF (JPEG quality 0.85)
- **All dependencies bundled** — no CDN calls, fully offline

## Version History (Recent)
- **v2.4.0-beta** (2026-03-23): Hindi and Arabic translations (274 keys each, 18 languages total). Arabic is the first RTL language — dynamic `dir` attribute on `<html>`, CSS logical properties (margin-inline-start, border-inline-end, etc.), anatomical chart containers isolated with `dir="ltr"` to prevent Left/Right column mirroring. Font stack extended with Tahoma (Arabic) and Nirmala UI (Devanagari). Hindi uses transliterated English clinical terms per Indian medical convention (ASSI). Arabic uses Saudi Spine Society / Pan Arab Spine Society terminology with Western numerals. 191 tests across 4 files.
- **v2.3.1-beta** (2026-03-23): Dual-build output — code-split web build (default) deployed to GitHub Pages for fast cached loading on connected hospital computers. Standalone single-file build preserved via `vite.config.singlefile.js` and `npm run build:standalone`. GitHub Actions release workflow (`.github/workflows/release.yml`) auto-builds standalone HTML on `v*.*.0` tags. Help modal "Offline Use" section with GitHub Releases download link. Landing page updated for web-first messaging. Quick reference and review forms version-synced. Fixed `generate-review-forms.py` regex for TypeScript type annotations.
- **v2.3.0-beta** (2026-03-23): TypeScript migration — all .jsx/.js renamed to .tsx/.ts, strict tsconfig. State extracted from App into useReducer (documentReducer.ts) wrapped by useDocumentState.ts hook. Zod validation of v4 JSON on load (schema.ts). SVG chart rendering — ChartPaper and LevelRow now render SVG content instead of HTML flexbox. Vitest test suite — 191 tests across 4 files (documentReducer, schema, i18n, clinical-anatomy). Note \n line breaks supported. Disclaimer uses sessionStorage, resets on New Patient. Cervical screw defaults: C3-C7 default 3.5×14, Oc/C1/C2 no default. Inventory balanced columns by line count with diameter grouping. JPEG export quality 0.85 (halved PDF size). New files: types.ts, svgExport.ts, react-augments.d.ts, tsconfig.json, specs/ design docs.
- **v2.2.0-beta** (2026-03-23): JSON v4 schema — full SPEC.md coverage (transition rods, growing rods, VBR cages, structured bone graft, connector-to-rod refs). PDF export at A4 300 DPI. Major UI polish: screw sizes enlarged, annotation text consistent 9px with edge alignment, LEFT/RIGHT headers prominent, inventory tightened with summary totals and units. Z-index rendering stack reordered (notes > implants > cages > osteotomies > crosslinks > vertebral bodies). Draggable reconstruction cage labels with persistent positions. Copy-plan-to-construct strips annotations/notes/angles. Clear Construct button. Unified ScrewModal (annotation field for all types). Crosslinks lighter. Transparent label backgrounds. Pelvis zone enlarged. ACDF midline. 270 translation keys across 18 languages.
- **v2.1.4-beta** (2026-03-22): Ukrainian and Russian translations (274 keys each, 18 languages total). Clinical glossary extended with AO Spine Ukraine and RASS terminology. Review forms generated for native-speaker review. Language count updated across all existing translations.
- **v2.1.3-beta** (2026-03-22): Vite build system — modular source, single-file output, embedded fonts, GitHub Actions deployment with auto-regenerated review forms. Custom domain plan.skeletalsurgery.com/spine/. Important Notice disclaimer modal on startup (half-day session expiry, language-aware, syncs acceptance between dual windows). Version shown in portrait toolbar. Force columns widened for i18n. Landing page with SEO and structured data.
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

## Key Architecture (v2.3.0)
- **State management:** `useDocumentState.ts` hook wraps a `useReducer` backed by `src/state/documentReducer.ts`. All document mutations go through typed actions. App.tsx consumes the hook — no longer manages raw state directly.
- **Types:** Shared TypeScript interfaces in `src/types.ts`. Strict mode enforced via `tsconfig.json`.
- **Zod validation:** `src/state/schema.ts` validates v4 JSON on file load. Invalid files are rejected with a typed error rather than silently corrupting state.
- **Chart rendering:** `ChartPaper` and `LevelRow` render SVG content (not HTML flexbox). Enables crisp export at any scale without html-to-image layout quirks.
- **i18n:** `src/i18n/translations.json` (~274 keys × 18 languages), `t(key, replacements)` function with `??` fallback chain in `src/i18n/i18n.ts`. Module-level `_currentLang` synced with React state via `changeLang()`.
- **Supported languages:** en, ar, de, fr, es, hi, it, pt, sv, nb, da, fi, nl, pl, el, tr, ru, uk
- **Language detection:** `detectLanguage()` checks `localStorage('spine_planner_lang')` → `navigator.language` → `'en'`. `LANG_ALIASES` maps `no`/`nn` → `nb`.
- **Disclaimer:** `DisclaimerModal` — shown on first load and on New Patient. Uses `sessionStorage` (not a timer). Resets when New Patient clears state.
- **Notes:** Support `\n` line breaks in note text (rendered as multi-line in SVG).
- **Screw defaults:** C3-C7 pre-fill 3.5×14mm; Oc/C1/C2 have no default size.
- **Export container:** Fixed 1485x1050px, 3 columns: patient info (370px) + Plan (flex-4) + Construct (flex-3). JPEG quality 0.85.
- **Sidebar:** w-[340px] in landscape, colour-themed per company (10 schemes), tool palette, export controls
- **Portrait mode:** `usePortrait()` hook via `matchMedia('(orientation: portrait)')`. Sidebar becomes 2-row horizontal toolbar. Three tabs (Demographics/Plan/Construct) with `switchPortraitTab()` syncing `portraitTab` and `activeChart`. Each column rendered at fixed export dimensions and CSS-scaled via `portraitScale` (ResizeObserver). Swipe gestures for tab switching (50px threshold, horizontal-dominant). Export mounts off-screen container temporarily via `portraitExporting` state.
- **View-only mode:** `isSmallScreen` = `Math.min(screen.width, screen.height) < 600`. On phones: tool palette hidden, ChartPaper `readOnly=true`, informational banner shown. Load/Save/Export/Help remain accessible.
- **Colour schemes:** 10 themes, swatch-only picker (no text labels). `changeTheme()` wrapper persists to `localStorage('spine_planner_theme')`, exempt from privacy mode.
- **Company/Screw data:** `IMPLANT_COMPANIES` (16 manufacturers), `SCREW_SYSTEMS` (per-company product lists), `COMPANY_THEME_MAP` (5 mapped companies)
- **Implant types:** 3 screws (mono/poly/uni), 5 hooks (pedicle, TP down, TP up, supra-lam, infra-lam), 3 fixation (band, wire, cable)
- **Data arrays:** `allTools`, `INVENTORY_CATEGORIES`, `OSTEOTOMY_TYPES`, `FORCE_TYPES`, `APPROACH_GROUPS` use `labelKey` pattern — data stays English, `t()` called at render time
- **Inventory:** Balanced columns by line count; screws grouped by diameter.
- **ScrewModal:** Three-tier visual hierarchy (SCREWS > HOOKS > BANDS & OTHERS), annotations for screws and hooks, free-text description for fixation
- **Osteotomies:** Schwab 1-6 + Corpectomy, grouped into Posterior/Anterior optgroups. VCR/ML-VCR/Corpectomy show reconstruction cage text input
- **Bone graft:** Multi-select checkboxes (Local Bone, Autograft, Allograft, Synthetics, DBM, BMP) + free-text notes
- **JSON v4 format:** `schema.format: 'spinal-instrumentation'`, `schema.version: 4`. Unified `elements` array with typed sub-objects. Forces, rods, notes, boneGraft as separate arrays within plan/construct. Document metadata (UUID, timestamps). UI state separated. Loads v2/v3 legacy files. Schema: `docs/spinal-instrumentation-schema-v4.json`
- **Connectors:** Level-anchored `{levelId, fraction}` (branch); legacy `{yNorm}` migrated on load
- **Session cache:** localStorage key `spine_planner_v2`, formatVersion 3
- **Save/load:** Shared `serializeState()` / `deserializeState()` functions; loads formatVersion >= 2. Zod validates on load.
- **Export:** html-to-image (SVG foreignObject) + `svgExport.ts`. `prepareExportCanvas()` syncs checkbox `checked` and select `selected` attributes before capture. jsPDF for PDF generation from canvas.
- **Translation disclaimer:** Shown in footer and export when language is not English. Feedback email for native-speaker corrections.

## i18n Translation Quality
- **Tier B (current):** Machine translation verified against clinical glossary (~48 terms × 13 languages)
- **Tier C (future):** Native-speaker review via disclaimer feedback email
- **Verification tests:** 3 browser-based HTML test suites in `tests/`
- **Glossary sources:** AO Spine, DWG, SFCR, GEER, SICV&GIS, SPP, NVWC, NOV, PTOiTr, HOA, TOTBİD, AO Spine Ukraine, RASS, Saudi Spine Society, Pan Arab Spine Society, ASSI
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

## Task Tracking
See **TODO.md** for the full task list, organised by SPEC.md implementation phases.

## Key Constraints
- **Dual build** - Web build (default) produces code-split assets deployed to GitHub Pages. Standalone build produces a single self-contained HTML file via vite-plugin-singlefile for offline distribution (USB, email, intranet). CJK fonts can be added to the web build without bloating the standalone.
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

# Build code-split web output (default — deployed to GitHub Pages)
npm run build                 # Produces dist/ with index.html + assets/

# Build standalone single-file output (for offline distribution)
npm run build:standalone      # Produces dist/index.html (~2.0MB, fully offline)
open dist/index.html          # Test standalone build from file://

# Type checking
npm run type-check            # tsc --noEmit (no emit, just check types)

# Run tests
npm test                      # Vitest — 191 tests across 4 files

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
