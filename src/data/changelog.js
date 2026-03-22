import { getCurrentLang, LOCALE_MAP } from '../i18n/i18n';

export const CURRENT_VERSION = "v2.1.4-beta";

export const CHANGE_LOG = [
    { version: "v2.1.4-beta", date: "2026-03-22", changes: [
        "Added Ukrainian and Russian translations (263 keys each) - 16 languages now supported.",
        "Clinical glossary extended with Ukrainian (AO Spine Ukraine) and Russian (RASS/AO Spine) terminology.",
        "Review forms generated for Ukrainian and Russian native-speaker review.",
    ]},
    { version: "v2.1.3-beta", date: "2026-03-22", changes: [
        "Vite build system — modular source code (26 files), pre-compiled JSX, single-file output via vite-plugin-singlefile. No more in-browser Babel transpilation.",
        "Fully offline — all fonts (Inter, Source Serif 4) and dependencies embedded. No CDN calls in production build.",
        "Translations externalised to JSON — simpler tooling, easier review workflow. Python tools and i18n tests updated.",
        "GitHub Actions deployment — automated build and deploy to GitHub Pages on push to main. Review forms auto-regenerated on deploy.",
        "Custom domain — app now served at plan.skeletalsurgery.com/spine/. Old URLs redirect automatically.",
        "Landing page at plan.skeletalsurgery.com with SEO, structured data, and full disclaimer.",
        "Important Notice modal on startup — must accept before use, re-prompts each half-day (AM/PM session). Acceptance timestamp recorded on PDF/JPG exports. Language selector in modal. Changing language re-prompts the modal. Language syncs to other window only after acceptance.",
        "Version number shown in portrait mode toolbar.",
        "Force column headers widened for longer translations (Greek, Spanish). Left/right alignment prevents overflow.",
        "Stale sync messages from cached code silently ignored instead of showing error toast.",
    ]},
    { version: "v2.0.3-beta", date: "2026-03-22", changes: [
        "Translation disclaimer now links to language-specific review form on GitHub Pages. Reviewers always see the latest translations.",
        "Review forms: persistent backup banner after first edit, 50% milestone prompt to download progress backup.",
        "Review forms: larger Correct/Corrected touch targets, auto-scroll to next unreviewed item, Next unreviewed button.",
        "Review forms: guide page linked from header for reviewer instructions.",
        "Removed em dashes throughout all UI strings, help text, and changelog across all 14 languages.",
    ]},
    { version: "v2.0.2-beta", date: "2026-03-22", changes: [
        "Audit and correction of clinical translations across 14 languages - fixed Greek distraction/derotation terms and Polish surgical terminology.",
        "Localized 'Ghost placements' to more idiomatic clinical terms (Phantomplatzierungen, Pozycje widmo, etc.).",
        "Updated translation glossary and regenerated clinical review forms.",
    ]},
    { version: "v2.0.1-beta", date: "2026-03-21", changes: [
        "Translated 8 hardcoded English UI strings across all 14 languages - rod inventory labels, cervical cage hint, osteotomy fallback, corpectomy label, sync tooltips, whole-spine button.",
        "Fixed dual-window sync race condition - stale state no longer overwrites deletions. Incoming sync cancels pending outbound debounce.",
        "One-implant-per-zone enforced at state level - rapid clicks can no longer create duplicates.",
        "App version check on sync - mismatched versions block data exchange with a warning toast.",
    ]},
    { version: "v2.0.0-beta", date: "2026-03-21", changes: [
        "JSON format v4 - spinal-instrumentation schema for clinical records, research, and data exchange. Structured screw sizes, typed elements, separated forces/rods, document metadata (UUID, timestamps), barcode-ready.",
        "Apple HIG design overhaul - light sidebar with corporate brand accents (Medtronic, DePuy, Stryker, VB Spine, Globus). Osteotomy colour amber (red reserved for destructive actions). Uniform vertebral body fill.",
        "Dual-window sync - BroadcastChannel for theatre dual displays. Export picker (Plan or Final Record). Export timestamp footer.",
        "Osteotomies at correct anatomical level - Schwab 1-2 at disc level, Schwab 3+ on vertebral body. Optional correction angles.",
        "Accessibility - WCAG contrast, toast notifications, modal focus trapping, prefers-reduced-motion, ARIA roles, 10px font floor, enlarged touch targets.",
        "Sidebar and toolbar reordered by workflow frequency. Click inactive chart to switch editing side. Help modal two-column landscape. Linked Screens help entry.",
        "Pedicle proportions at full anatomical scale with height-based vertical positioning.",
    ]},
    { version: "v1.1.0-beta", date: "2026-03-20", changes: [
        "Portrait/tablet mode - responsive layout detects screen orientation. Toolbar, tab-based columns, swipe gestures. View-only on phones (<600px).",
        "Internationalisation - 14 European languages with auto-detection. Clinical terminology verified against national spine society glossaries.",
        "Renamed to Spinal Instrumentation Plan & Record.",
        "3 new colour schemes (Forest Green, Teal & Coral, Steel & Ice). Theme picker redesigned as colour swatches.",
    ]},
    { version: "v0.9.7-beta", date: "2026-03-14", changes: [
        "Rod fields added to Plan side with length estimate placeholders.",
        "Rods section added to inventory.",
    ]},
    { version: "v0.9.6-beta", date: "2026-03-04", changes: [
        "Note tool - level-anchored text annotations with optional arrow, draggable positioning, preset label chips.",
        "Sidebar reorganised: Implants and Annotations categories.",
    ]},
    { version: "v0.9.5-beta", date: "2026-03-03", changes: [
        "Fixed duplicate ID generation and hover jitter on implant icons.",
    ]},
    { version: "v0.9.3-alpha", date: "2026-03-01", changes: [
        "Data-driven vertebral body proportions (T1-S1) from X-ray calibration data.",
        "Pixel-perfect PDF/JPG export via html-to-image (replacing html2canvas).",
        "Hooks (5 types), bands/wires/cables, screw annotations, osteotomy reconstruction cages, bone graft section.",
        "Keyboard shortcuts in all modals (Enter/Escape/Delete).",
        "7 colour themes. JSON format v3 with plan/construct separation.",
    ]},
    { version: "v0.8.0-alpha", date: "2026-02-28", changes: [
        "Sidebar-only UI - all controls moved from header to sidebar.",
        "16 implant manufacturers with auto-theme switching.",
        "Cage permissibility by surgical approach and anatomical level.",
        "Draggable crosslinks, auto-scaling views, Inter font throughout.",
    ]},
    { version: "v0.7.0-alpha", date: "2025-12-05", changes: [
        "Interbody cage support with disc zones and corpectomy tool.",
        "Strict cage permissibility logic. T10-Pelvis view mode.",
    ]},
    { version: "v0.5.6-alpha", date: "2025-12-04", changes: [
        "Initial release with isotropic scaling.",
    ]}
];

export const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(LOCALE_MAP[getCurrentLang()] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
