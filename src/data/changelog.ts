import { getCurrentLang, LOCALE_MAP } from '../i18n/i18n';

export const CURRENT_VERSION: string = "v2.3.0-beta";

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

export const CHANGE_LOG: ChangeLogEntry[] = [
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
