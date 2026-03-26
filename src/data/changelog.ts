import { formatDate } from '../i18n/i18n';
export { formatDate };

export const CURRENT_VERSION: string = "v2.7.33-beta";

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

// USER-FACING changelog — shown in the app's Version History modal.
// Keep entries brief, non-technical, and focused on what the surgeon can do.
// Detailed technical changelog is in CLAUDE.md for developers/agents.
export const CHANGE_LOG: ChangeLogEntry[] = [
    { version: "v2.7.33-beta", date: "2026-03-27", changes: [
        "Screw icons placed on anatomical pedicles (thoracolumbar) and lateral mass entry points (C3-C6). C7 uses pedicle positions.",
        "Click zones redesigned — vertebral body width matches anatomy per level, pedicle circles open screw modal, osteotomy click area limited to body.",
        "Size labels positioned at transverse process edge, outside the spine outline.",
        "Quick reference RTL support for Arabic and Hebrew.",
        "Offline Use help section translated into all 15 European languages.",
    ]},
    { version: "v2.7.3-beta", date: "2026-03-26", changes: [
        "Structured rod recording — material, diameter, profile, length, and contour via a dedicated modal. Transition rods supported (e.g. 3.5mm to 5.5mm).",
        "Kit-aware size validation — sizes not listed in the selected screw system catalogue are flagged in the screw modal (Xia 3 proof of concept).",
        "Record locking — Finish Case prevents accidental edits with a timestamp on exports.",
        "Expandable cage checkbox.",
        "Rod data copies from plan to construct. Ghost rods shown in teal on the construct view.",
    ]},
    { version: "v2.7.0-beta", date: "2026-03-25", changes: [
        "Undo/redo — Ctrl+Z / Cmd+Z with 20-level history.",
        "Force and cage/osteotomy pickers appear next to the click point instead of centring on screen.",
        "Cage modal shows why an approach is unavailable (e.g. ACDF limited to C2–C7).",
        "Cervical osteotomies restricted — C1/C2 blocked, C3–C7 corpectomy only.",
        "UIV and LIV added as note presets.",
        "ALIF now available at L3/4.",
        "First-run guided tour (landscape only).",
        "EDITING / LOCKED badge on the active chart column.",
        "Keyboard navigation — arrow keys to move between levels and zones.",
        "Liability disclaimer updated across all 22 languages.",
        "Report a Problem link in the Help section.",
        "Offline access after first visit (web build).",
    ]},
    { version: "v2.6.0-beta", date: "2026-03-25", changes: [
        "Cervical vertebrae — occiput, C1, C2, C3–C7 each rendered with distinct anatomy and lateral masses.",
        "Pelvic fixation — S2AI, Iliac, and SI-J as separate levels with iliac wing outlines.",
        "Whole-spine rescaled to published vertebral body proportions.",
        "Transverse processes shown on all thoracolumbar vertebrae.",
        "Level selector and Confirm & Next rapid entry in the screw modal.",
        "Evidence-based screw size defaults (opt-in via Preferences).",
        "Implant company data updated (13 manufacturers, 71 systems).",
    ]},
    { version: "v2.5.20-beta", date: "2026-03-24", changes: [
        "Portrait inventory tab with large text for theatre use.",
        "Fullscreen toggle.",
        "Ghost placements redesigned for theatre visibility — teal icons at 75% opacity.",
    ]},
    { version: "v2.5.0-beta", date: "2026-03-23", changes: [
        "4 new languages: Hebrew, Chinese Simplified, Japanese, Korean (22 total).",
        "Scroll-to-change on all modal pickers.",
    ]},
    { version: "v2.4.0-beta", date: "2026-03-23", changes: [
        "Hindi and Arabic translations. Arabic is the first right-to-left language.",
    ]},
    { version: "v2.3.1-beta", date: "2026-03-23", changes: [
        "Faster loading on connected computers. Standalone offline download available.",
    ]},
    { version: "v2.3.0-beta", date: "2026-03-23", changes: [
        "Smaller PDF/JPG exports. Notes support line breaks. Cervical screw defaults.",
    ]},
    { version: "v2.2.0-beta", date: "2026-03-23", changes: [
        "A4 300 DPI PDF exports. Larger screw sizes. Draggable reconstruction cage labels.",
        "Confirm Plan and Clear Construct buttons.",
    ]},
    { version: "v2.1.4-beta", date: "2026-03-22", changes: [
        "Ukrainian and Russian translations (16 languages).",
    ]},
    { version: "v2.1.3-beta", date: "2026-03-22", changes: [
        "Fully offline with embedded fonts. Live at plan.skeletalsurgery.com/spine.",
    ]},
    { version: "v2.0.0-beta", date: "2026-03-21", changes: [
        "Structured data format. Company brand themes. Dual-window sync for theatre displays.",
        "Accessibility improvements. Export chooser (Plan or Final Record).",
    ]},
    { version: "v1.1.0-beta", date: "2026-03-20", changes: [
        "Portrait/tablet mode. 14 European languages with auto-detection.",
    ]},
    { version: "v0.9.3-alpha", date: "2026-03-01", changes: [
        "Anatomical vertebral bodies. Hooks, bands, wires, cables, bone graft. PDF/JPG export.",
    ]},
    { version: "v0.8.0-alpha", date: "2026-02-28", changes: [
        "16 implant manufacturers. Interbody cage support.",
    ]},
    { version: "v0.5.6-alpha", date: "2025-12-04", changes: [
        "Initial release.",
    ]}
];

