import { getCurrentLang, LOCALE_MAP } from '../i18n/i18n';

export const CURRENT_VERSION: string = "v2.7.1-beta";

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

export const CHANGE_LOG: ChangeLogEntry[] = [
    { version: "v2.7.0-beta", date: "2026-03-25", changes: [
        "Undo/redo — Ctrl+Z / Ctrl+Shift+Z with 20-level history stack. Placement, cage, osteotomy, connector, note, and bulk operations are undoable.",
        "React Error Boundary — runtime crashes show a recovery screen instead of a blank page.",
        "BroadcastChannel sync data now Zod-validated — corrupted sync payloads are rejected instead of overwriting valid state.",
        "Privacy mode sync fix — incognito window no longer leaks patient data to a non-incognito peer's localStorage.",
        "Force picker and disc picker converted from centred modals to inline popovers positioned at the click point.",
        "Force popover shows existing force as selected, with replace and remove (Delete key) support.",
        "Cage modal shows all cage types with non-permitted types greyed out and level ranges displayed (e.g. C2–C7).",
        "Cervical osteotomy restrictions — C1/C2 blocked, C3-C7 corpectomy only, thoracolumbar unchanged.",
        "UIV and LIV added as note preset labels.",
        "ALIF now permitted at L3/4 disc level.",
        "First-run onboarding tour — 3-step guided walkthrough (landscape only, shown once).",
        "EDITING badge on active chart column — visible at theatre distance.",
        "Patient name and ID fields enlarged (text-sm bold) for clinical identification.",
        "Confirm & Next keyboard shortcuts now consistent — Enter always confirms & advances, Shift+Enter always closes.",
        "Liability disclaimer added to all 22 languages.",
        "Report a Problem help section with GitHub Issues link and email, all 22 languages.",
        "Service worker for web build — offline access after first visit.",
        "React.memo on 6 chart components + useMemo for auto-scale — reduces unnecessary re-renders.",
        "TypeScript any types reduced from ~65 to 5 (all at JSON boundaries with comments).",
        "Hover state opacity increased for better visibility in theatre lighting.",
        "Focus restored to triggering element on modal close.",
        "HTML stripped from contentEditable paste events.",
        "localStorage.setItem wrapped in try/catch for QuotaExceededError.",
        "Specification synced to v2.7.0 — 19 gaps fixed including cervical anatomy, pelvic fixation, screw defaults.",
    ]},
    { version: "v2.6.0-beta", date: "2026-03-25", changes: [
        "Cervical vertebrae rendered with distinct anatomical shapes — occiput, atlas (C1), axis (C2), subaxial (C3-C6), and C7 each have unique SVG outlines with lateral masses.",
        "Whole-spine proportions rescaled to Tan 2004 published vertebral body heights — more accurate relative sizing from C2 to L5.",
        "Transverse processes shown on all thoracolumbar vertebrae with per-level craniocaudal heights from published data.",
        "Per-level disc heights from Koeller 1986 data — cervical, thoracic, and lumbar disc spaces now proportionally accurate.",
        "Implant company audit — Zimmer Biomet renamed to Highridge Medical, SpineGuard/Aurora Spine/SI-BONE removed (not pedicle screw systems). Legacy/discontinued systems removed, new systems added (LONGITUDE II, QUARTEX OCT, LineSider, Cortium).",
        "ACDF cages now visible in whole-spine view (previously replaced by text hint). Smaller label to avoid clashing.",
        "Preferences (pelvis, region defaults, confirm behaviour) now sync between dual windows.",
        "Pelvic fixation — S2AI, Iliac, and SI-J are now separate levels with anatomical iliac wing rendering.",
        "Level selector in implant modal — see and change the target level when placing or editing screws.",
        "Confirm & Next — place screws sequentially down the spine without closing the modal.",
        "Region size defaults (opt-in) — suggested screw sizes based on vertebral level, from published data.",
        "Preferences (gear icon) — configure size defaults and confirm behaviour.",
        "Hook icons now face the spine on both sides.",
        "Unstable level markers now persist and sync between dual windows.",
        "Improved dual-window reliability — New Patient and placement changes sync correctly.",
        "Keyboard shortcuts — C/L/T/W switch view, P toggle pelvis, I implant tool, N note tool (disabled when modals are open).",
        "Pelvis toggle in portrait toolbar now shows translated Show/Hide Pelvis text instead of bare P letter.",
        "Quick reference page expanded to all 22 languages (was 16).",
    ]},
    { version: "v2.5.20-beta", date: "2026-03-24", changes: [
        "Portrait inventory tab — dedicated fourth tab with large readable text for theatre use.",
        "Fullscreen toggle in both portrait and landscape (Fullscreen API).",
        "Confirm Plan and Clear Construct buttons in portrait toolbar.",
        "Portrait row 1 height matched to row 2; sync icon inline fix.",
        "Ghost click routing — disc zone overlay now routes to correct modal (cage/osteotomy) with data pre-filled.",
        "Ghost icon click area — transparent hit rect prevents zone handler stealing clicks.",
        "Annotations no longer carry over from plan to construct on ghost confirmation.",
        "Band/wire/cable legacy annotation fallback respects empty string as deliberate.",
        "Sync bounce fix — timestamp guard (500ms) replaces fragile boolean flag.",
        "Language count in credits now dynamic from SUPPORTED_LANGUAGES.length.",
        "Release workflow triggers on all version tags (not just .0 releases).",
        "RELEASING.md — version bump checklist and release workflow documentation.",
        "1 new translation key (portrait.tab.inventory) across 22 languages.",
        "252 tests across 5 files.",
    ]},
    { version: "v2.5.10-beta", date: "2026-03-24", changes: [
        "Ghost placements (plan items on construct view) redesigned for theatre visibility — teal-coloured icons at 75% opacity, darker/larger size text, annotations suppressed.",
        "Screw size labels switched from slashed-zero monospace to Inter font — clearer 0 vs 8 distinction at distance.",
        "Thoracolumbar screw size text enlarged (19–22px, up from 15–18px); cervical unchanged.",
        "Ghost cages render in teal with teal labels to match ghost implant colour language.",
        "Teal polyaxial icon legend (= Plan) added to construct header in portrait mode.",
        "Ghost notes from plan no longer shown on portrait construct view — reduces clutter.",
        "Hover colour feedback on all clickable chart zones — grey for screw zones, blue for force zones, amber for vertebral body, blue for disc zones.",
        "Disc zone hover highlight and click target narrowed to vertebral body width.",
        "Toast notifications added to portrait layout (were missing entirely).",
        "Escape key dismisses all toast notifications.",
        "Toast dismiss button consistently positioned with shrink-0 styling.",
        "Cage modal: 'Clear dimensions' button allows placing any cage type with no size data.",
        "1 new translation key (modal.cage.clear_dimensions) across all 22 languages.",
        "252 tests across 5 files.",
    ]},
    { version: "v2.5.0-beta", date: "2026-03-23", changes: [
        "CJK + Hebrew i18n expansion — 4 new languages (Hebrew, Chinese Simplified, Japanese, Korean), bringing total to 22.",
        "Hebrew (he): 19th language, 2nd RTL — uses existing Arabic RTL infrastructure.",
        "Chinese Simplified (zh-Hans): first CJK language — Noto Sans SC font (web build), language-conditional font stacks.",
        "Japanese (ja): Noto Sans JP font, correct glyph variants via [lang] CSS selectors.",
        "Korean (ko): Noto Sans KR font, CJK expansion complete.",
        "measureText() utility replaces character-count heuristic for SVG text width — fixes note labels, osteotomy labels for CJK double-width characters.",
        "SVG export font URLs absolutified for blob context rendering.",
        "detectLanguage() updated to handle script subtags (zh-Hans, zh-Hant).",
        "Scroll-to-change on hover for all modal pickers — screw diameter/length, osteotomy type/angle, cage dimensions/lordosis.",
        "Cervical cage hint text reduced to 8px for whole-spine view.",
        "Crosslink remove button repositioned closer and vertically centred.",
        "252 tests across 5 files.",
    ]},
    { version: "v2.4.2-beta", date: "2026-03-23", changes: [
        "Component-level tests added — 27 tests covering modal rendering, keyboard handling, focus trapping, portal behaviour, overlay click, and ARIA accessibility.",
        "232 total tests now gate every deployment.",
    ]},
    { version: "v2.4.1-beta", date: "2026-03-23", changes: [
        "Tests now gate CI deployment — 205 Vitest tests run before every deploy and release build.",
        "Legacy v2/v3 JSON files validated on load via Zod (previously only v4 was validated).",
        "Schema migration framework for localStorage — ready for future schema version changes.",
        "All modals render via React portals — immune to parent CSS overflow/transform clipping.",
    ]},
    { version: "v2.4.0-beta", date: "2026-03-23", changes: [
        "Hindi and Arabic translations added (18 languages now supported).",
        "Right-to-left (RTL) layout support — Arabic is the first RTL language. Sidebar, modals, and UI chrome mirror automatically. Anatomical chart columns remain fixed.",
        "CSS converted to logical properties for direction-aware layout (margin-inline-start, border-inline-end, etc.).",
    ]},
    { version: "v2.3.1-beta", date: "2026-03-23", changes: [
        "Web build — the app now loads faster on connected hospital computers with cached fonts and libraries. Code-split assets with content-hashed filenames for efficient browser caching.",
        "Standalone offline version available as a single-file download from GitHub Releases for use without internet.",
        "Help modal includes an Offline Use section with a download link.",
    ]},
    { version: "v2.3.0-beta", date: "2026-03-23", changes: [
        "PDF and JPG exports are now half the previous file size with no loss of quality.",
        "Notes support line breaks — type \\n to split text across multiple lines.",
        "Cervical screws default to lateral mass size (3.5x14mm). Upper cervical levels (Oc, C1, C2) open without a default size.",
        "Cervical implant icons are 25% smaller, matching the anatomy.",
        "Disc spaces highlight on hover.",
        "Inventory screws grouped by diameter. Columns balance evenly.",
        "All modals support Tab key cycling with visible focus rings.",
        "Disclaimer now appears on first load and after New Patient, not on a timer.",
        "Corrupted or invalid files are rejected on load with a clear error message.",
        "Fixed a crash when clicking notes.",
    ]},
    { version: "v2.2.0-beta", date: "2026-03-23", changes: [
        "PDF exports at A4 300 DPI for high-quality clinical printing.",
        "Screw and cage sizes larger and easier to read from distance.",
        "Implant annotations now consistent across all types (screws, hooks, bands, wires, cables) with uniform small text and edge alignment.",
        "LEFT/RIGHT column headers larger and darker for laterality safety.",
        "Inventory shows summary totals (e.g. 22 Screws, 3 Hooks, 7 Cages) with units on sizes. Osteotomies removed from inventory.",
        "Chart columns no longer overflow the page on complex cases.",
        "Crosslinks lighter so they no longer obscure other elements. Osteotomy labels display in front of crosslinks.",
        "All osteotomy labels use the same amber badge style. Level names removed from cage and osteotomy labels (position is already clear from the diagram).",
        "Reconstruction cage labels (e.g. 'Mesh cage 20mm') are draggable like notes, with a dashed leader line to the osteotomy. Click to edit. Positions saved.",
        "Notes show leader lines by default (toggle renamed to 'Show leader line'). Lines stop short of the vertebral body.",
        "Confirm Plan copies only essential data to the construct (implant type, size, position). Annotations, notes, and correction angles are not carried across.",
        "New Clear Construct button to reset the surgical record without affecting the plan.",
        "All implant types now show the same Annotation field in the editing modal.",
        "ACDF cages no longer show a side selector.",
        "Cage lordosis displays 0 degrees when no lordosis is set.",
        "Force arrows centred in their columns.",
        "Keyboard shortcuts (Enter/Escape) on all modals and confirmation dialogs.",
        "Fixed a crash when loading cases with corpectomy osteotomies.",
    ]},
    { version: "v2.1.4-beta", date: "2026-03-22", changes: [
        "Ukrainian and Russian translations added (16 languages now supported).",
    ]},
    { version: "v2.1.3-beta", date: "2026-03-22", changes: [
        "Fully offline with all fonts embedded. No internet connection required.",
        "Now available at plan.skeletalsurgery.com/spine.",
        "Important Notice modal on startup with acceptance timestamp on exports.",
        "Version number shown in portrait toolbar.",
    ]},
    { version: "v2.0.3-beta", date: "2026-03-22", changes: [
        "Translation review forms for native-speaker feedback.",
    ]},
    { version: "v2.0.2-beta", date: "2026-03-22", changes: [
        "Clinical translation corrections across 14 languages.",
    ]},
    { version: "v2.0.1-beta", date: "2026-03-21", changes: [
        "All UI text translated across 14 languages.",
        "Fixed dual-window sync issues.",
        "One implant per zone enforced (no duplicates).",
    ]},
    { version: "v2.0.0-beta", date: "2026-03-21", changes: [
        "Structured data format for clinical records, research, and data exchange.",
        "Design overhaul with corporate brand themes (Medtronic, DePuy, Stryker, VB Spine, Globus).",
        "Dual-window sync for theatre dual-display setups.",
        "Osteotomies placed at correct anatomical level (disc vs vertebral body).",
        "Accessibility improvements (contrast, focus trapping, touch targets).",
        "Choose to export Plan or Final Record.",
    ]},
    { version: "v1.1.0-beta", date: "2026-03-20", changes: [
        "Portrait and tablet mode with tab-based layout and swipe gestures.",
        "14 European languages with auto-detection.",
        "3 new colour schemes.",
    ]},
    { version: "v0.9.7-beta", date: "2026-03-14", changes: [
        "Rod recording fields and inventory.",
    ]},
    { version: "v0.9.6-beta", date: "2026-03-04", changes: [
        "Draggable note annotations with preset labels.",
    ]},
    { version: "v0.9.3-alpha", date: "2026-03-01", changes: [
        "Anatomically proportioned vertebral bodies.",
        "Hooks, bands, wires, cables, bone graft, reconstruction cages.",
        "PDF and JPG export.",
    ]},
    { version: "v0.8.0-alpha", date: "2026-02-28", changes: [
        "16 implant manufacturers with auto-theme switching.",
        "Cage permissibility by surgical approach and level.",
    ]},
    { version: "v0.7.0-alpha", date: "2025-12-05", changes: [
        "Interbody cage support with corpectomy tool.",
    ]},
    { version: "v0.5.6-alpha", date: "2025-12-04", changes: [
        "Initial release.",
    ]}
];

export const formatDate = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(LOCALE_MAP[getCurrentLang()] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
