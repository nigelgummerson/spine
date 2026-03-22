#!/usr/bin/env python3
"""
Generate per-language HTML review forms from the TRANSLATIONS object in index.html.

Each form has two parts:
  1. Translation Review: verify/correct every translated string
  2. Bug Reports: report any technical issues found while testing

Usage:
    python tools/generate-review-forms.py

Outputs:
    review-forms/{lang}/{lang}-review.html  (one per non-English language)
"""

import json
import os
import re
import sys
from html import escape
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
INDEX_HTML = PROJECT_DIR / "index.html"
OUTPUT_DIR = PROJECT_DIR / "review-forms"

# Language metadata: code -> (English name, native name)
LANG_NAMES = {
    "da": ("Danish", "Dansk"),
    "de": ("German", "Deutsch"),
    "el": ("Greek", "Ελληνικά"),
    "es": ("Spanish", "Español"),
    "fi": ("Finnish", "Suomi"),
    "fr": ("French", "Français"),
    "it": ("Italian", "Italiano"),
    "nb": ("Norwegian", "Norsk bokmål"),
    "nl": ("Dutch", "Nederlands"),
    "pl": ("Polish", "Polski"),
    "pt": ("Portuguese", "Português"),
    "sv": ("Swedish", "Svenska"),
    "tr": ("Turkish", "Türkçe"),
}

# Keys to exclude from review: untranslatable proper nouns, universal abbreviations,
# and strings that are intentionally identical across all languages.
SKIP_KEYS = {
    "credits.developer_name",       # Proper name: "Nigel Gummerson FRCS (Tr & Orth)"
    "sidebar.jpg",                   # Universal abbreviation: "JPG"
    "sidebar.pdf",                   # Universal abbreviation: "PDF"
    "clinical.osteotomy.ponte.label",  # Eponymous procedure: "Ponte / Smith Petersen"
    "clinical.osteotomy.vcr.label",    # International abbreviation: "VCR"
    "clinical.screw.uniplanar.short",  # Universal abbreviation: "Uni"
    "patient.plan_rod_left_placeholder",   # Example measurements: "e.g. 5.5mm CoCr 120mm"
    "patient.plan_rod_right_placeholder",  # Example measurements: "e.g. 5.5mm TiAlV 120mm"
    "disclaimer.review",                   # UI link text: "Help improve this translation"
}

# UI workflow sections: keys grouped by where they appear in the app.
# Each entry: (section_title, guidance_text, list_of_key_prefixes)
# Keys are matched by prefix in order; first match wins.
SECTIONS = [
    (
        "App Header & Sidebar",
        "These strings appear in the left sidebar (landscape) or top toolbar (portrait/tablet mode). "
        "The sidebar contains: language selector, region view buttons (Cervical, Thoracolumbar, Lumbar, "
        "Whole Spine), Plan/Construct editing toggle, tool palette (Implants, Annotations, Tools), "
        "action buttons (Copy Plan, Confirm Plan, Load, Save, JPG, PDF, Help, New Patient), "
        "session privacy toggle, and theme colour swatches. In portrait mode, the sidebar becomes "
        "a compact horizontal toolbar with Demographics/Plan/Construct tabs.",
        ["sidebar.", "portrait."],
    ),
    (
        "Patient Demographics",
        "The left column of the main view. Fill in patient details to see all fields: "
        "Patient Name, Patient ID, Surgeon, Date, Implant Supplier (dropdown of 16 manufacturers "
        "plus 'Other'), Screw System, Rod fields (left/right for both Plan and Construct), "
        "and Bone Graft section with checkboxes (Local Bone, Autograft, Allograft, Synthetics) "
        "plus a free-text notes field. The rod placeholder text shows example measurements.",
        ["patient.", "clinical.bone_graft."],
    ),
    (
        "Implant Modal: Screws, Hooks & Bands",
        "Click any pedicle marker (small circle on either side of a vertebra) to open this modal. "
        "It has a three-tier visual hierarchy: SCREWS (top, with Monoaxial/Polyaxial/Uniplanar buttons), "
        "HOOKS (middle, with 5 hook types: Pedicle, TP Down, TP Up, Supra-laminar, Infra-laminar), "
        "and BANDS & OTHERS (bottom, with Band/Wire/Cable). "
        "Screws offer three sizing modes: Standard (dropdown), Custom (free text), and No Size. "
        "Screws and hooks have an Annotation field (e.g. fenestrated, cortical, revision). "
        "Bands/wires/cables have a free-text Description field. "
        "Clicking an occupied zone opens the edit modal (not a duplicate).",
        ["modal.screw.", "clinical.screw.", "clinical.hook.", "clinical.fixation."],
    ),
    (
        "Cage Modal: Interbody Cages",
        "Click a disc space (gap between vertebrae) on the spine diagram to open this modal. "
        "Cage types are grouped by surgical approach: Posterior (PLIF, TLIF), Anterior (ACDF, ALIF), "
        "Lateral (XLIF/LLIF, OLIF). Important: ALIF only appears at L4-S1 disc spaces; ACDF only "
        "at cervical levels (C2-C7). Switch the Region View to 'Cervical' or 'Lumbar' to access all types. "
        "Each cage type shows Side (Left/Right/Bilateral/Midline), Height, Lordosis, Length, and Width fields. "
        "At disc levels that support osteotomies (Schwab 1-2), a picker offers Interbody Cage or Osteotomy.",
        ["modal.cage.", "clinical.cage.", "clinical.approach."],
    ),
    (
        "Osteotomy Modal",
        "Schwab 1-2 (Facet, Ponte) are placed at the disc level: click between vertebrae. "
        "Schwab 3+ (PSO, VCR, etc.) are placed on the vertebral body: click midline. "
        "The dropdown shows two groups: Posterior (Schwab Grades 1-6: Facet release, Ponte, "
        "Standard PSO, Extended PSO, VCR, Multi-level VCR) and Anterior (Corpectomy). "
        "Each osteotomy type has a label, Schwab grade, and description. "
        "VCR, Multi-level VCR, and Corpectomy also show a Reconstruction Cage text field. "
        "Correction angle is optional, defaults to empty with placeholder hints showing typical values. "
        "Osteotomies render as amber-coloured markers (red is reserved for destructive actions).",
        ["modal.osteotomy.", "clinical.osteotomy."],
    ),
    (
        "Force Modal",
        "Click the left or right edge zone of a vertebral level to open the Force modal. "
        "Six force/correction types are shown as clickable buttons: Translate Left, Translate Right, "
        "Compression, Distraction, Derotate CW, Derotate CCW. "
        "Forces use blue colour scheme (biomechanics convention for corrective vectors). "
        "Forces can only be placed on the Plan. On the Construct tab they appear read-only. "
        "Force zones always open the ForceModal regardless of which tool is selected.",
        ["modal.force.", "clinical.force."],
    ),
    (
        "Note Modal",
        "Select the Note tool from the sidebar, then click anywhere on the spine diagram. "
        "The modal shows preset chips (last visible rib, end-vertebra, apex, transitional level, "
        "stable vertebra, neutral vertebra), a free-text field, and a 'Show arrow' checkbox. "
        "Preset labels use sentence case.",
        ["modal.note.", "clinical.note."],
    ),
    (
        "Tool Palette Labels",
        "These are the labels on tool buttons in the sidebar (landscape) or horizontal toolbar (portrait). "
        "They include screw types (Monoaxial, Polyaxial, Uniplanar), hook types (Pedicle, TP Hook, "
        "TP Hook Up, Supra-laminar, Infra-laminar), fixation (Band, Wire, Cable), annotations "
        "(Crosslink, Unstable, Osteotomy, Corpectomy), forces (Trans Left/Right, Compress, Distract, "
        "Derotate), and the Note tool.",
        ["tool."],
    ),
    (
        "Inventory Panel",
        "The inventory summary appears below each spine diagram in the Plan and Construct columns. "
        "Add implants, cages, and osteotomies to the diagram to see the inventory category headers "
        "and item labels. The Rods section appears at the bottom. "
        "Demographics panel shows Plan inventory by default with a 'View Final' / 'View Plan' toggle. "
        "Rod left/right use 'L:' and 'R:' prefixes. Cage inventory items are labelled by type "
        "(TLIF Cage, PLIF Cage, ACDF Cage, etc.).",
        ["inventory."],
    ),
    (
        "Chart Headers & Diagram Labels",
        "The column headers on each spine chart: Left, Right, and Force. "
        "'Forces - edit in Plan' appears as a hint on the Construct chart (in portrait mode and "
        "in the export) indicating that forces are read-only on the Construct side. "
        "The cervical cage hint and corpectomy label appear on the diagram itself. "
        "Region view short label ('All') appears in compact contexts.",
        ["chart."],
    ),
    (
        "Linked Screens (Sync)",
        "Open the app in two windows of the same browser on a dual-screen setup. "
        "Changes sync automatically via BroadcastChannel. One screen can show the Plan while "
        "the other shows Demographics with live inventory. A green link icon in the sidebar "
        "indicates active sync. These strings are the tooltip text for the sync status indicator.",
        ["sync."],
    ),
    (
        "Export & Column Headers",
        "These appear at the top of the exported PDF/JPG image. The three columns are: "
        "patient info (left), Plan (middle), and Final Surgical Construct (right). "
        "An export picker lets you choose Plan or Final Record before JPG/PDF export. "
        "Export timestamp appears in the footer.",
        ["export."],
    ),
    (
        "Help Modal",
        "Click the Help button (? icon) in the sidebar Actions section. The help modal has "
        "multiple sections: Session Privacy, Screws & Hooks, Interbody Cages, Osteotomies, "
        "Confirm Plan, Portrait & Tablet Mode, Save/Load/Export, Linked Screens, and Keyboard Shortcuts. "
        "Bodies may contain HTML markup. Please preserve any HTML tags "
        "(<strong>, <br>, <ul>, <li>, etc.) and only translate the text content. "
        "The help modal uses a two-column layout in landscape and closes with Escape.",
        ["help."],
    ),
    (
        "Common Buttons & Shortcuts",
        "These appear at the bottom of every modal dialog. The four buttons are: Confirm (green), "
        "Cancel (grey), Remove (red, only in edit mode), and Close (help/changelog modals). "
        "Shortcut tooltips appear on hover. The New Patient action uses a custom confirmation modal "
        "(not a browser dialog).",
        ["button.", "shortcut."],
    ),
    (
        "Alerts & Confirmations",
        "These appear as toast notifications or custom modals during specific actions: "
        "loading invalid files, starting a new patient, copying plan to construct, "
        "and cage permissibility warnings. Info toasts auto-dismiss; error toasts persist. "
        "Some contain {placeholder} replacements: "
        "keep the {braces} intact and only translate the surrounding text.",
        ["alert."],
    ),
    (
        "Credits & Disclaimer",
        "The app name, developer credit, and license link appear in the Help modal footer. "
        "The translation disclaimer appears in the main app footer and on exported documents. "
        "The license text contains an HTML link. Preserve the <a> tag and only translate surrounding text.",
        ["credits.", "disclaimer."],
    ),
    (
        "Version History Modal",
        "The Version History / Changelog modal title. Opened from the version number link "
        "in the Help modal footer. Changelog uses date-based entries.",
        ["modal.changelog."],
    ),
]


def parse_translations(html: str) -> dict:
    """Extract the TRANSLATIONS object from index.html using direct JS parsing.

    Parses the nested { lang: { key: value, ... }, ... } structure character by
    character, handling single-quoted strings that may contain double quotes (from
    embedded HTML attributes).
    """
    marker = "const TRANSLATIONS = {"
    start = html.find(marker)
    if start == -1:
        raise ValueError("TRANSLATIONS object not found in HTML")

    pos = start + len(marker) - 1  # points at the opening {

    def skip_ws_and_comments():
        nonlocal pos
        while pos < len(html):
            # Skip whitespace
            if html[pos] in " \t\n\r":
                pos += 1
                continue
            # Skip single-line comments
            if html[pos : pos + 2] == "//":
                end = html.find("\n", pos)
                pos = end + 1 if end != -1 else len(html)
                continue
            # Skip multi-line comments
            if html[pos : pos + 2] == "/*":
                end = html.find("*/", pos)
                pos = end + 2 if end != -1 else len(html)
                continue
            break

    def read_string() -> str:
        """Read a single- or double-quoted JS string, returning unescaped content."""
        nonlocal pos
        quote = html[pos]
        pos += 1  # skip opening quote
        chars = []
        while pos < len(html):
            ch = html[pos]
            if ch == "\\" and pos + 1 < len(html):
                nxt = html[pos + 1]
                if nxt == "n":
                    chars.append("\n")
                elif nxt == "t":
                    chars.append("\t")
                elif nxt == "\\":
                    chars.append("\\")
                elif nxt == quote:
                    chars.append(quote)
                elif nxt == '"':
                    chars.append('"')
                elif nxt == "'":
                    chars.append("'")
                else:
                    chars.append(nxt)
                pos += 2
                continue
            if ch == quote:
                pos += 1  # skip closing quote
                return "".join(chars)
            chars.append(ch)
            pos += 1
        raise ValueError(f"Unterminated string starting near position {pos}")

    def read_value():
        """Read a JS value (string, number, boolean, null, object, array)."""
        nonlocal pos
        skip_ws_and_comments()
        ch = html[pos]
        if ch in ("'", '"'):
            return read_string()
        if ch == "{":
            return read_object()
        if ch == "[":
            return read_array()
        # Numbers, booleans, null
        m = re.match(r"(true|false|null|-?\d+\.?\d*)", html[pos:])
        if m:
            pos += len(m.group(0))
            val = m.group(0)
            if val == "true":
                return True
            if val == "false":
                return False
            if val == "null":
                return None
            return float(val) if "." in val else int(val)
        raise ValueError(f"Unexpected character '{ch}' at position {pos}")

    def read_object() -> dict:
        nonlocal pos
        pos += 1  # skip {
        obj = {}
        skip_ws_and_comments()
        while pos < len(html) and html[pos] != "}":
            skip_ws_and_comments()
            if html[pos] == "}":
                break
            # Read key: quoted or bare identifier
            if html[pos] in ("'", '"'):
                key = read_string()
            else:
                m = re.match(r"[a-zA-Z_]\w*", html[pos:])
                if not m:
                    raise ValueError(f"Expected key at position {pos}")
                key = m.group(0)
                pos += len(key)
            skip_ws_and_comments()
            if html[pos] != ":":
                raise ValueError(f"Expected ':' after key '{key}' at position {pos}")
            pos += 1  # skip :
            val = read_value()
            obj[key] = val
            skip_ws_and_comments()
            if pos < len(html) and html[pos] == ",":
                pos += 1
            skip_ws_and_comments()
        if pos < len(html):
            pos += 1  # skip }
        return obj

    def read_array() -> list:
        nonlocal pos
        pos += 1  # skip [
        arr = []
        skip_ws_and_comments()
        while pos < len(html) and html[pos] != "]":
            arr.append(read_value())
            skip_ws_and_comments()
            if pos < len(html) and html[pos] == ",":
                pos += 1
            skip_ws_and_comments()
        if pos < len(html):
            pos += 1  # skip ]
        return arr

    return read_object()


def classify_key(key: str) -> int:
    """Return the section index for a translation key, or -1 if unmatched."""
    for idx, (_, _, prefixes) in enumerate(SECTIONS):
        for prefix in prefixes:
            if key.startswith(prefix):
                return idx
    return -1


def group_keys(en_keys: list[str]) -> list[tuple[str, str, list[str]]]:
    """Group English keys into sections, excluding SKIP_KEYS. Returns list of (title, guidance, [keys])."""
    grouped = {i: [] for i in range(len(SECTIONS))}
    unmatched = []

    for key in sorted(en_keys):
        if key in SKIP_KEYS:
            continue
        idx = classify_key(key)
        if idx >= 0:
            grouped[idx].append(key)
        else:
            unmatched.append(key)

    result = []
    for i, (title, guidance, _) in enumerate(SECTIONS):
        if grouped[i]:
            result.append((title, guidance, grouped[i]))

    if unmatched:
        result.append((
            "Other",
            "These keys did not match any known UI section. They may be new additions.",
            unmatched,
        ))

    return result


def generate_html(lang: str, translations: dict) -> str:
    """Generate a self-contained HTML review form for a single language."""
    en_name, native_name = LANG_NAMES.get(lang, (lang, lang))
    en_dict = translations.get("en", {})
    lang_dict = translations.get(lang, {})

    sections = group_keys(list(en_dict.keys()))

    # Build section navigation and content
    nav_items = []
    section_blocks = []

    for sec_idx, (title, guidance, keys) in enumerate(sections):
        sec_id = f"section-{sec_idx}"
        nav_items.append(f'<a href="#{sec_id}" class="nav-link" data-section="{sec_idx}">{escape(title)} <span class="nav-count" id="nav-count-{sec_idx}">0/{len(keys)}</span></a>')

        rows = []
        for key in keys:
            en_val = en_dict.get(key, "")
            lang_val = lang_dict.get(key, "")
            has_html = bool(re.search(r"<[a-z]", en_val))
            has_placeholder = "{" in en_val

            hints = []
            if has_html:
                hints.append('<span class="hint html-hint">Contains HTML: preserve tags</span>')
            if has_placeholder:
                hints.append('<span class="hint placeholder-hint">Contains {placeholders}: keep braces intact</span>')

            hint_html = " ".join(hints)

            rows.append(f'''
        <div class="review-item" data-key="{escape(key)}" data-section="{sec_idx}" id="item-{escape(key)}">
            <div class="item-header">
                <code class="key-label">{escape(key)}</code>
                {hint_html}
            </div>
            <div class="item-grid">
                <div class="col-english">
                    <label>English</label>
                    <div class="english-text">{escape(en_val)}</div>
                </div>
                <div class="col-translation">
                    <label>{escape(native_name)}</label>
                    <textarea class="translation-field" data-key="{escape(key)}" data-original="{escape(lang_val)}">{escape(lang_val)}</textarea>
                </div>
                <div class="col-status">
                    <label>Status</label>
                    <div class="status-radios">
                        <label class="radio-label correct-label">
                            <input type="radio" name="status-{escape(key)}" value="correct" data-key="{escape(key)}">
                            <span>Correct</span>
                        </label>
                        <label class="radio-label corrected-label">
                            <input type="radio" name="status-{escape(key)}" value="corrected" data-key="{escape(key)}">
                            <span>Corrected</span>
                        </label>
                    </div>
                </div>
                <div class="col-comment">
                    <label>Comment <span class="optional">(optional)</span></label>
                    <input type="text" class="comment-field" data-key="{escape(key)}" placeholder="Any notes for the developer...">
                </div>
            </div>
        </div>''')

        section_blocks.append(f'''
    <div class="section" id="{sec_id}">
        <h2 class="section-title">{escape(title)}</h2>
        <div class="section-guidance">{escape(guidance)}</div>
        <div class="section-items">{"".join(rows)}
        </div>
    </div>''')

    total_keys = sum(len(keys) for _, _, keys in sections)
    nav_html = "\n            ".join(nav_items)
    sections_html = "\n".join(section_blocks)
    bug_section_idx = len(sections)  # index for the bug reports "section"

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Review: {escape(en_name)} ({escape(native_name)})</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: #f8f9fa; color: #1a1a2e; line-height: 1.5; }}

        /* Header */
        .header {{ background: #1a1a2e; color: white; padding: 16px 24px; position: sticky; top: 0; z-index: 100; }}
        .header-top {{ display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }}
        .header h1 {{ font-size: 18px; font-weight: 600; }}
        .header .lang-badge {{ background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 4px; font-size: 14px; }}
        .header-actions {{ display: flex; gap: 8px; align-items: center; }}
        .header-actions button {{ background: rgba(255,255,255,0.15); border: none; color: white; padding: 6px 14px;
                                  border-radius: 4px; cursor: pointer; font-size: 13px; }}
        .header-actions button:hover {{ background: rgba(255,255,255,0.25); }}
        .header-actions .btn-reset {{ background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }}
        .header-actions .btn-reset:hover {{ background: rgba(231,111,81,0.3); color: white; }}
        .header-actions .btn-export {{ background: #2d6a4f; }}
        .header-actions .btn-export:hover {{ background: #40916c; }}

        /* Progress bar */
        .progress-bar {{ margin-top: 10px; }}
        .progress-track {{ background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden; }}
        .progress-fill {{ background: #40916c; height: 100%; transition: width 0.3s ease; width: 0%; }}
        .progress-text {{ font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px; }}

        /* Layout */
        .layout {{ display: flex; min-height: calc(100vh - 80px); }}

        /* Navigation sidebar */
        .nav {{ width: 240px; background: white; border-right: 1px solid #e0e0e0;
                position: sticky; top: var(--header-h, 80px); max-height: calc(100vh - var(--header-h, 80px));
                flex-shrink: 0; align-self: flex-start;
                display: flex; flex-direction: column; }}
        .nav-link-reviewer {{ display: block; padding: 10px 16px; color: #1a1a2e; text-decoration: none;
                              font-size: 13px; font-weight: 600; flex-shrink: 0; border-left: 3px solid transparent; }}
        .nav-link-reviewer:hover {{ background: #f0f0f0; }}
        .nav-link-reviewer.active {{ border-left-color: #2d6a4f; background: #f0f8f4; }}
        .nav-divider {{ height: 1px; background: #e0e0e0; margin: 4px 16px; flex-shrink: 0; }}
        .nav-sections {{ flex: 1; overflow-y: auto; padding: 4px 0 16px; }}
        .nav-link {{ display: flex; justify-content: space-between; align-items: center;
                     padding: 8px 16px; color: #555; text-decoration: none; font-size: 13px; border-left: 3px solid transparent; }}
        .nav-link:hover {{ background: #f0f0f0; color: #1a1a2e; }}
        .nav-link.active {{ border-left-color: #2d6a4f; background: #f0f8f4; color: #1a1a2e; font-weight: 500; }}
        .nav-count {{ font-size: 11px; color: #999; white-space: nowrap; }}
        .nav-count.complete {{ color: #2d6a4f; font-weight: 600; }}

        /* Main content */
        .content {{ flex: 1; padding: 24px; max-width: 960px; }}

        /* Sections */
        .section {{ margin-bottom: 32px; scroll-margin-top: calc(var(--header-h, 80px) + 16px); }}
        .section-title {{ font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px;
                          padding-top: 12px; border-top: 2px solid #e0e0e0; }}
        .section:first-child .section-title {{ border-top: none; padding-top: 0; }}
        .section-guidance {{ font-size: 13px; color: #666; background: #f0f4f8; padding: 10px 14px;
                             border-radius: 6px; margin-bottom: 16px; line-height: 1.6; }}

        /* Review items */
        .review-item {{ background: white; border: 1px solid #e0e0e0; border-radius: 8px;
                        padding: 14px 16px; margin-bottom: 10px; transition: border-color 0.2s; }}
        .review-item.reviewed-correct {{ border-left: 4px solid #2d6a4f; }}
        .review-item.reviewed-corrected {{ border-left: 4px solid #e76f51; }}
        .item-header {{ display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }}
        .key-label {{ font-size: 11px; color: #999; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }}

        .item-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
        .item-grid label {{ font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
                            color: #888; display: block; margin-bottom: 3px; }}
        .english-text {{ font-size: 14px; color: #333; padding: 8px; background: #fafafa; border-radius: 4px;
                         min-height: 38px; white-space: pre-wrap; word-break: break-word; }}
        .translation-field {{ font-size: 14px; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;
                              resize: vertical; min-height: 38px; font-family: inherit; overflow: hidden; }}
        .translation-field:focus {{ outline: none; border-color: #2d6a4f; box-shadow: 0 0 0 2px rgba(45,106,79,0.15); }}
        .translation-field.modified {{ background: #fff8f0; border-color: #e76f51; }}

        .col-status {{ grid-column: 1; }}
        .col-comment {{ grid-column: 2; }}
        .status-radios {{ display: flex; gap: 8px; }}
        .radio-label {{ display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;
                        padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; transition: all 0.15s; }}
        .radio-label:hover {{ background: #f5f5f5; }}
        .radio-label input {{ cursor: pointer; width: 16px; height: 16px; accent-color: currentColor; }}
        .radio-label input:checked + span {{ font-weight: 600; }}
        .correct-label {{ color: #2d6a4f; }}
        .correct-label:has(input:checked) {{ background: #f0f8f4; border-color: #2d6a4f; }}
        .corrected-label {{ color: #e76f51; }}
        .corrected-label:has(input:checked) {{ background: #fff8f0; border-color: #e76f51; }}
        .comment-field {{ font-size: 13px; width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; }}
        .comment-field:focus {{ outline: none; border-color: #2d6a4f; }}

        /* Hints */
        .hint {{ font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: 500; }}
        .html-hint {{ background: #fff3cd; color: #856404; }}
        .placeholder-hint {{ background: #d1ecf1; color: #0c5460; }}
        .optional {{ font-weight: 400; text-transform: none; letter-spacing: 0; color: #aaa; }}

        /* Reviewer details */
        .reviewer-panel {{ background: white; border: 1px solid #e0e0e0; border-radius: 8px;
                           padding: 16px 20px; margin-bottom: 20px;
                           scroll-margin-top: calc(var(--header-h, 80px) + 16px); }}
        .reviewer-panel h2 {{ font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #1a1a2e; }}
        .reviewer-panel p {{ font-size: 13px; color: #666; margin-bottom: 12px; }}
        .reviewer-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
        .reviewer-grid label {{ font-size: 11px; font-weight: 600; text-transform: uppercase;
                                letter-spacing: 0.5px; color: #888; display: block; margin-bottom: 3px; }}
        .reviewer-grid input, .reviewer-grid select {{ font-size: 14px; width: 100%; padding: 8px; border: 1px solid #ddd;
                                border-radius: 4px; font-family: inherit; background: white; }}
        .reviewer-grid input:focus, .reviewer-grid select:focus {{ outline: none; border-color: #2d6a4f; box-shadow: 0 0 0 2px rgba(45,106,79,0.15); }}
        .reviewer-credit {{ grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; margin-top: 4px; }}
        .reviewer-credit label {{ font-size: 13px; font-weight: 400; text-transform: none;
                                  letter-spacing: 0; color: #555; cursor: pointer; margin: 0; }}
        .reviewer-credit input {{ width: auto; }}

        /* Filter bar */
        .filter-bar {{ display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }}
        .filter-btn {{ padding: 4px 12px; border: 1px solid #ddd; border-radius: 16px; background: white;
                       cursor: pointer; font-size: 12px; color: #666; }}
        .filter-btn:hover {{ background: #f0f0f0; }}
        .filter-btn.active {{ background: #1a1a2e; color: white; border-color: #1a1a2e; }}

        /* Bug reports */
        .bug-title {{ color: #b45309; }}
        .add-bug-btn {{ background: white; border: 2px dashed #d1d5db; border-radius: 8px; padding: 12px 20px;
                        width: 100%; cursor: pointer; font-size: 14px; color: #666; margin-top: 8px; }}
        .add-bug-btn:hover {{ border-color: #b45309; color: #b45309; background: #fffbeb; }}
        .bug-report {{ background: white; border: 1px solid #e0e0e0; border-left: 4px solid #f59e0b;
                       border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }}
        .bug-header {{ display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }}
        .bug-number {{ font-weight: 600; font-size: 13px; color: #b45309; white-space: nowrap; }}
        .bug-severity {{ font-size: 13px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;
                         background: white; flex: 1; max-width: 280px; }}
        .bug-severity:focus {{ outline: none; border-color: #b45309; }}
        .bug-remove-btn {{ background: none; border: none; font-size: 20px; color: #ccc; cursor: pointer;
                           padding: 0 4px; line-height: 1; margin-left: auto; }}
        .bug-remove-btn:hover {{ color: #e76f51; }}
        .bug-grid {{ display: grid; grid-template-columns: 1fr; gap: 10px; }}
        .bug-grid label {{ font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
                           color: #888; display: block; margin-bottom: 3px; }}
        .bug-grid input, .bug-grid textarea {{ font-size: 14px; width: 100%; padding: 8px; border: 1px solid #ddd;
                                               border-radius: 4px; font-family: inherit; }}
        .bug-grid input:focus, .bug-grid textarea:focus {{ outline: none; border-color: #b45309;
                                                           box-shadow: 0 0 0 2px rgba(180,83,9,0.15); }}
        .bug-grid textarea {{ resize: vertical; min-height: 60px; }}
        .nav-link-bugs {{ color: #b45309 !important; font-weight: 500; }}

        /* Save hint: small note under progress bar */
        .save-hint {{ font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; display: none; }}
        .save-hint.visible {{ display: block; }}

        /* Next unreviewed button */
        .next-unreviewed {{ position: fixed; bottom: 24px; left: 24px; z-index: 150;
                            background: #1a1a2e; color: white; border: none; padding: 10px 18px;
                            border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: background 0.15s; }}
        .next-unreviewed:hover {{ background: #2d3a5e; }}
        .next-unreviewed:disabled {{ opacity: 0.4; cursor: default; }}

        /* Milestone toast: 50% prompt */
        .milestone-toast {{ display: none; position: fixed; bottom: 24px; right: 24px; z-index: 200;
                            background: #1a1a2e; color: white; padding: 16px 20px; border-radius: 10px;
                            box-shadow: 0 8px 24px rgba(0,0,0,0.25); max-width: 340px; font-size: 13px;
                            line-height: 1.5; animation: toast-in 0.3s ease; }}
        .milestone-toast.visible {{ display: block; }}
        .milestone-toast .toast-title {{ font-weight: 600; margin-bottom: 4px; font-size: 14px; }}
        .milestone-toast .toast-actions {{ display: flex; gap: 8px; margin-top: 10px; }}
        .milestone-toast .toast-btn {{ padding: 5px 14px; border-radius: 5px; border: none; cursor: pointer;
                                       font-size: 12px; font-weight: 500; }}
        .milestone-toast .toast-btn-primary {{ background: #2d6a4f; color: white; }}
        .milestone-toast .toast-btn-primary:hover {{ background: #40916c; }}
        .milestone-toast .toast-btn-dismiss {{ background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }}
        .milestone-toast .toast-btn-dismiss:hover {{ background: rgba(255,255,255,0.25); }}
        @keyframes toast-in {{ from {{ opacity: 0; transform: translateY(12px); }} to {{ opacity: 1; transform: translateY(0); }} }}

        /* Responsive */
        @media (max-width: 900px) {{
            .nav {{ display: none; }}
            .item-grid {{ grid-template-columns: 1fr; }}
            .col-status, .col-comment {{ grid-column: 1; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div>
                <h1>Spinal Instrumentation Plan & Record: Translation Review</h1>
                <span class="lang-badge">{escape(en_name)} / {escape(native_name)} ({lang})</span>
            </div>
            <div class="header-actions">
                <a href="../guide.html" target="_blank" style="color: rgba(255,255,255,0.7); font-size: 13px; text-decoration: none; padding: 6px 10px;" title="How to use this form">Guide</a>
                <button onclick="resetReview()" class="btn-reset" title="Clear all progress and start over">Reset</button>
                <button onclick="importReview()" title="Load a previously saved review">Import</button>
                <button class="btn-export" onclick="exportReview()" title="Download review as JSON">Export Review</button>
                <input type="file" id="import-file" accept=".json" style="display:none" onchange="handleImport(event)">
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
            <div class="progress-text" id="progress-text">0 of {total_keys} items reviewed (0%)</div>
            <div class="save-hint" id="save-hint"></div>
        </div>
    </div>

    <div class="milestone-toast" id="milestone-toast">
        <div class="toast-title">Halfway there!</div>
        <div>You have reviewed 50% of the translations. Now is a good time to save a backup in case you switch devices or clear your browser data.</div>
        <div class="toast-actions">
            <button class="toast-btn toast-btn-primary" onclick="exportReview(); dismissMilestone()">Download backup</button>
            <button class="toast-btn toast-btn-dismiss" onclick="dismissMilestone()">Not now</button>
        </div>
    </div>

    <button class="next-unreviewed" id="next-unreviewed" onclick="goToNextUnreviewed()" title="Jump to next unreviewed item">Next unreviewed &#x2193;</button>

    <div class="layout">
        <nav class="nav" id="nav">
            <a href="#reviewer-panel" class="nav-link-reviewer">Your Details</a>
            <div class="nav-divider"></div>
            <div class="nav-sections">
                {nav_html}
                <div class="nav-divider"></div>
                <a href="#section-bugs" class="nav-link nav-link-bugs" data-section="bugs">Bug Reports <span class="nav-count" id="nav-count-bugs">0</span></a>
            </div>
        </nav>
        <main class="content">
            <div class="reviewer-panel" id="reviewer-panel">
                <h2>Your Details</h2>
                <p>So we can credit your contribution. If you prefer not to be named, tick the box below.</p>
                <div class="reviewer-grid">
                    <div>
                        <label>Name</label>
                        <input type="text" id="reviewer-name" placeholder="Your full name">
                    </div>
                    <div>
                        <label>Role</label>
                        <select id="reviewer-role">
                            <option value="">Select...</option>
                            <option value="surgeon">Spine Surgeon</option>
                            <option value="trainee">Surgical Trainee</option>
                            <option value="industry">Industry Professional</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label>Institution / Company</label>
                        <input type="text" id="reviewer-institution" placeholder="e.g. Leeds Teaching Hospitals NHS Trust">
                    </div>
                    <div>
                        <label>Country</label>
                        <input type="text" id="reviewer-country" placeholder="">
                    </div>
                    <div class="reviewer-credit">
                        <input type="checkbox" id="reviewer-anon">
                        <label for="reviewer-anon">I prefer not to be credited by name in the application</label>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">All</button>
                <button class="filter-btn" data-filter="pending" onclick="setFilter('pending')">Pending</button>
                <button class="filter-btn" data-filter="correct" onclick="setFilter('correct')">Correct</button>
                <button class="filter-btn" data-filter="corrected" onclick="setFilter('corrected')">Corrected</button>
            </div>
            {sections_html}

            <div class="section" id="section-bugs">
                <h2 class="section-title bug-title">Bug Reports</h2>
                <div class="section-guidance">
                    If you notice any technical problems while testing the app in {escape(native_name)}, please report them here.
                    This could include: layout issues (text overflow, truncation, overlapping elements), broken buttons or interactions,
                    display problems on specific screen sizes or orientations, export/PDF issues, or anything that does not work as expected.
                    You do not need to report English-only issues here. Focus on problems you see when the app is set to {escape(native_name)}.
                </div>
                <div id="bug-list"></div>
                <button class="add-bug-btn" onclick="addBugReport()">+ Add Bug Report</button>
                <template id="bug-template">
                    <div class="bug-report" data-bug-idx="">
                        <div class="bug-header">
                            <span class="bug-number"></span>
                            <select class="bug-severity">
                                <option value="">Severity...</option>
                                <option value="minor">Minor: cosmetic / wording</option>
                                <option value="moderate">Moderate: confusing or awkward</option>
                                <option value="major">Major: blocks workflow or loses data</option>
                            </select>
                            <button class="bug-remove-btn" onclick="removeBugReport(this)" title="Remove this bug report">&times;</button>
                        </div>
                        <div class="bug-grid">
                            <div>
                                <label>Where in the app?</label>
                                <input type="text" class="bug-location" placeholder="e.g. Osteotomy modal, Export PDF, Portrait toolbar...">
                            </div>
                            <div>
                                <label>What happened?</label>
                                <textarea class="bug-description" placeholder="Describe what you saw and what you expected to happen..."></textarea>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </main>
    </div>

    <script>
    (function() {{
        const LANG = "{lang}";
        const STORAGE_KEY = "spine_review_" + LANG;
        const TOTAL = {total_keys};

        // --- Reviewer details ---

        function getReviewer() {{
            return {{
                name: document.getElementById('reviewer-name').value || null,
                role: document.getElementById('reviewer-role').value || null,
                institution: document.getElementById('reviewer-institution').value || null,
                country: document.getElementById('reviewer-country').value || null,
                anonymous: document.getElementById('reviewer-anon').checked,
            }};
        }}

        function loadReviewer(r) {{
            if (!r) return;
            if (r.name) document.getElementById('reviewer-name').value = r.name;
            if (r.role) document.getElementById('reviewer-role').value = r.role;
            if (r.institution) document.getElementById('reviewer-institution').value = r.institution;
            if (r.country) document.getElementById('reviewer-country').value = r.country;
            if (r.anonymous) document.getElementById('reviewer-anon').checked = true;
        }}

        // --- State ---

        function getState() {{
            const items = document.querySelectorAll('.review-item');
            const state = {{}};
            items.forEach(item => {{
                const key = item.dataset.key;
                const textarea = item.querySelector('.translation-field');
                const comment = item.querySelector('.comment-field');
                const radio = item.querySelector('input[type="radio"]:checked');
                state[key] = {{
                    translation: textarea.value,
                    original: textarea.dataset.original,
                    status: radio ? radio.value : null,
                    comment: comment.value || null,
                }};
            }});
            return state;
        }}

        function loadState(state) {{
            Object.entries(state).forEach(([key, data]) => {{
                const item = document.getElementById('item-' + key);
                if (!item) return;
                const textarea = item.querySelector('.translation-field');
                const comment = item.querySelector('.comment-field');
                if (data.translation != null) textarea.value = data.translation;
                if (data.comment) comment.value = data.comment;
                if (data.status) {{
                    const radio = item.querySelector(`input[value="${{data.status}}"]`);
                    if (radio) radio.checked = true;
                }}
                updateItemAppearance(item);
            }});
            updateProgress();
        }}

        function autoSave() {{
            try {{
                localStorage.setItem(STORAGE_KEY, JSON.stringify({{
                    items: getState(),
                    reviewer: getReviewer(),
                    bugs: getBugReports(),
                }}));
            }} catch(e) {{}}
        }}

        function autoLoad() {{
            try {{
                const saved = localStorage.getItem(STORAGE_KEY);
                if (!saved) return;
                const data = JSON.parse(saved);
                if (data.reviewer) loadReviewer(data.reviewer);
                if (data.items) loadState(data.items);
                else loadState(data);  // backwards compat with old format
                if (data.bugs) loadBugReports(data.bugs);
                // Restore milestone dismissed state
                if (localStorage.getItem(MILESTONE_KEY)) milestoneShown = true;
            }} catch(e) {{}}
        }}

        // --- UI Updates ---

        function updateItemAppearance(item) {{
            const radio = item.querySelector('input[type="radio"]:checked');
            const textarea = item.querySelector('.translation-field');
            item.classList.remove('reviewed-correct', 'reviewed-corrected');
            textarea.classList.remove('modified');
            if (radio) {{
                item.classList.add('reviewed-' + radio.value);
            }}
            if (textarea.value !== textarea.dataset.original) {{
                textarea.classList.add('modified');
                // Auto-select "corrected" when text is changed
                const correctedRadio = item.querySelector('input[value="corrected"]');
                if (correctedRadio && !item.querySelector('input[type="radio"]:checked')) {{
                    correctedRadio.checked = true;
                    item.classList.add('reviewed-corrected');
                }}
            }}
        }}

        function updateProgress() {{
            const reviewed = document.querySelectorAll('.review-item input[type="radio"]:checked').length;
            const pct = Math.round((reviewed / TOTAL) * 100);
            document.getElementById('progress-fill').style.width = pct + '%';
            document.getElementById('progress-text').textContent = reviewed + ' of ' + TOTAL + ' items reviewed (' + pct + '%)';

            // Show save hint once any review activity exists
            if (reviewed > 0) showSaveHint();

            // Check 50% milestone
            checkMilestone(reviewed);

            // Update nav counts per section
            const sections = {{}};
            document.querySelectorAll('.review-item').forEach(item => {{
                const sec = item.dataset.section;
                if (!sections[sec]) sections[sec] = {{ total: 0, done: 0 }};
                sections[sec].total++;
                if (item.querySelector('input[type="radio"]:checked')) sections[sec].done++;
            }});
            Object.entries(sections).forEach(([sec, counts]) => {{
                const el = document.getElementById('nav-count-' + sec);
                if (el) {{
                    el.textContent = counts.done + '/' + counts.total;
                    el.classList.toggle('complete', counts.done === counts.total);
                }}
            }});
        }}

        // --- Backup banner & milestone ---

        let hintShown = false;
        let milestoneShown = false;
        const MILESTONE_KEY = STORAGE_KEY + '_milestone50';

        function showSaveHint() {{
            if (hintShown) return;
            hintShown = true;
            const hint = document.getElementById('save-hint');
            hint.textContent = 'This form does not send data to a server. Progress is saved in your browser only. Use Export Review to download and back up your work.';
            hint.classList.add('visible');
            requestAnimationFrame(syncHeaderHeight);
        }}

        function checkMilestone(reviewed) {{
            if (milestoneShown) return;
            const pct = Math.round((reviewed / TOTAL) * 100);
            if (pct >= 50) {{
                try {{ if (localStorage.getItem(MILESTONE_KEY)) return; }} catch(e) {{}}
                milestoneShown = true;
                document.getElementById('milestone-toast').classList.add('visible');
            }}
        }}

        window.dismissMilestone = function() {{
            document.getElementById('milestone-toast').classList.remove('visible');
            try {{ localStorage.setItem(MILESTONE_KEY, '1'); }} catch(e) {{}}
        }};

        // --- Next unreviewed & auto-scroll ---

        function findNextUnreviewed(afterEl) {{
            const items = Array.from(document.querySelectorAll('.review-item'));
            const startIdx = afterEl ? items.indexOf(afterEl) + 1 : 0;
            // Search from current position to end, then wrap around
            for (let i = 0; i < items.length; i++) {{
                const item = items[(startIdx + i) % items.length];
                if (item.style.display === 'none') continue;
                if (!item.querySelector('input[type="radio"]:checked')) return item;
            }}
            return null;
        }}

        function scrollToItem(item) {{
            if (!item) return;
            item.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
            item.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.3)';
            setTimeout(() => {{ item.style.boxShadow = ''; }}, 1500);
        }}

        window.goToNextUnreviewed = function() {{
            const next = findNextUnreviewed(null);
            if (next) scrollToItem(next);
        }};

        function updateNextButton() {{
            const btn = document.getElementById('next-unreviewed');
            const next = findNextUnreviewed(null);
            btn.disabled = !next;
            btn.textContent = next ? 'Next unreviewed \u2193' : 'All reviewed \u2713';
        }}

        function autoScrollToNext(currentItem) {{
            setTimeout(() => {{
                const next = findNextUnreviewed(currentItem);
                if (next) scrollToItem(next);
                updateNextButton();
            }}, 300);
        }}

        // --- Filter ---

        window.setFilter = function(filter) {{
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
            document.querySelectorAll('.review-item').forEach(item => {{
                const radio = item.querySelector('input[type="radio"]:checked');
                const status = radio ? radio.value : 'pending';
                if (filter === 'all') {{
                    item.style.display = '';
                }} else {{
                    item.style.display = (status === filter) ? '' : 'none';
                }}
            }});
        }};

        // --- Export / Import ---

        window.exportReview = function() {{
            const state = getState();
            const bugs = getBugReports();
            const output = {{
                lang: LANG,
                date: new Date().toISOString().split('T')[0],
                app: "Spinal Instrumentation Plan & Record",
                reviewer: getReviewer(),
                items: state,
                bugs: bugs.length ? bugs : undefined,
            }};
            const blob = new Blob([JSON.stringify(output, null, 2)], {{ type: 'application/json' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = LANG + '-review-' + output.date + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }};

        window.resetReview = function() {{
            if (!confirm('This will clear all your review progress, corrections, comments, bug reports, and personal details.\\n\\nThis cannot be undone. Continue?')) return;
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(MILESTONE_KEY);
            milestoneShown = false;
            document.querySelectorAll('.translation-field').forEach(ta => {{
                ta.value = ta.dataset.original;
                ta.classList.remove('modified');
            }});
            document.querySelectorAll('.comment-field').forEach(f => f.value = '');
            document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            document.querySelectorAll('.review-item').forEach(item => {{
                item.classList.remove('reviewed-correct', 'reviewed-corrected');
            }});
            document.getElementById('reviewer-name').value = '';
            document.getElementById('reviewer-role').value = '';
            document.getElementById('reviewer-institution').value = '';
            document.getElementById('reviewer-country').value = '';
            document.getElementById('reviewer-anon').checked = false;
            document.getElementById('bug-list').innerHTML = '';
            bugCounter = 0;
            updateBugCount();
            updateProgress();
        }};

        window.importReview = function() {{
            document.getElementById('import-file').click();
        }};

        window.handleImport = function(e) {{
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {{
                try {{
                    const data = JSON.parse(ev.target.result);
                    if (data.items) {{
                        if (data.reviewer) loadReviewer(data.reviewer);
                        loadState(data.items);
                        if (data.bugs) {{
                            document.getElementById('bug-list').innerHTML = '';
                            bugCounter = 0;
                            loadBugReports(data.bugs);
                        }}
                        autoSave();
                        const bugMsg = data.bugs ? ', ' + data.bugs.length + ' bug reports' : '';
                        alert('Review loaded: ' + Object.keys(data.items).length + ' items' + bugMsg + '.');
                    }} else {{
                        alert('Invalid review file: no items found.');
                    }}
                }} catch(err) {{
                    alert('Error reading file: ' + err.message);
                }}
            }};
            reader.readAsText(file);
            e.target.value = '';
        }};

        // --- Bug Reports ---

        let bugCounter = 0;

        window.addBugReport = function() {{
            bugCounter++;
            const template = document.getElementById('bug-template');
            const clone = template.content.cloneNode(true);
            const report = clone.querySelector('.bug-report');
            report.dataset.bugIdx = bugCounter;
            report.querySelector('.bug-number').textContent = 'Bug #' + bugCounter;
            document.getElementById('bug-list').appendChild(clone);
            updateBugCount();
            debouncedSave();
        }};

        window.removeBugReport = function(btn) {{
            const report = btn.closest('.bug-report');
            if (report) {{
                report.remove();
                updateBugCount();
                autoSave();
            }}
        }};

        function updateBugCount() {{
            const count = document.querySelectorAll('.bug-report').length;
            const el = document.getElementById('nav-count-bugs');
            if (el) el.textContent = count || '0';
        }}

        function getBugReports() {{
            const bugs = [];
            document.querySelectorAll('.bug-report').forEach(report => {{
                const severity = report.querySelector('.bug-severity').value || null;
                const location = report.querySelector('.bug-location').value || null;
                const description = report.querySelector('.bug-description').value || null;
                if (location || description) {{
                    bugs.push({{ severity, location, description }});
                }}
            }});
            return bugs;
        }}

        function loadBugReports(bugs) {{
            if (!bugs || !bugs.length) return;
            bugs.forEach(bug => {{
                bugCounter++;
                const template = document.getElementById('bug-template');
                const clone = template.content.cloneNode(true);
                const report = clone.querySelector('.bug-report');
                report.dataset.bugIdx = bugCounter;
                report.querySelector('.bug-number').textContent = 'Bug #' + bugCounter;
                if (bug.severity) report.querySelector('.bug-severity').value = bug.severity;
                if (bug.location) report.querySelector('.bug-location').value = bug.location;
                if (bug.description) report.querySelector('.bug-description').value = bug.description;
                document.getElementById('bug-list').appendChild(clone);
            }});
            updateBugCount();
        }}

        function debouncedSave() {{
            clearTimeout(window._saveTimer);
            window._saveTimer = setTimeout(autoSave, 1000);
        }}

        // --- Event Listeners ---

        document.addEventListener('change', function(e) {{
            if (e.target.matches('input[type="radio"]') || e.target.matches('.translation-field') || e.target.matches('.comment-field')) {{
                const item = e.target.closest('.review-item');
                if (item) updateItemAppearance(item);
                updateProgress();
                autoSave();
                // Auto-scroll to next unreviewed after marking via radio button
                if (e.target.matches('input[type="radio"]') && item) {{
                    autoScrollToNext(item);
                }}
            }}
            // Bug report fields
            if (e.target.matches('.bug-severity')) {{
                debouncedSave();
            }}
        }});

        document.addEventListener('input', function(e) {{
            if (e.target.matches('.translation-field')) {{
                const item = e.target.closest('.review-item');
                if (item) updateItemAppearance(item);
                // Debounced auto-save on text input
                clearTimeout(window._saveTimer);
                window._saveTimer = setTimeout(autoSave, 1000);
            }}
            if (e.target.matches('.comment-field')) {{
                clearTimeout(window._saveTimer);
                window._saveTimer = setTimeout(autoSave, 1000);
            }}
            // Bug report fields
            if (e.target.matches('.bug-location') || e.target.matches('.bug-description')) {{
                debouncedSave();
            }}
        }});

        // Reviewer field autosave
        document.getElementById('reviewer-panel').addEventListener('input', function() {{
            clearTimeout(window._saveTimer);
            window._saveTimer = setTimeout(autoSave, 1000);
        }});
        document.getElementById('reviewer-anon').addEventListener('change', autoSave);

        // Active nav highlighting on scroll
        const observer = new IntersectionObserver(entries => {{
            entries.forEach(entry => {{
                if (entry.isIntersecting) {{
                    const id = entry.target.id;
                    document.querySelectorAll('.nav-link').forEach(link => {{
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    }});
                }}
            }});
        }}, {{ rootMargin: '-80px 0px -70% 0px' }});
        document.querySelectorAll('.section').forEach(sec => observer.observe(sec));
        observer.observe(document.getElementById('reviewer-panel'));

        // Size each textarea to be ~25% taller than its English text
        function sizeTextareas() {{
            document.querySelectorAll('.review-item').forEach(item => {{
                const engEl = item.querySelector('.english-text');
                const ta = item.querySelector('.translation-field');
                if (engEl && ta) {{
                    const engHeight = engEl.offsetHeight;
                    const target = Math.max(38, Math.round(engHeight * 1.25));
                    ta.style.minHeight = target + 'px';
                    ta.style.height = target + 'px';
                }}
            }});
        }}

        // Measure header and set CSS variable so nav sticks below it
        function syncHeaderHeight() {{
            const h = document.querySelector('.header').offsetHeight;
            document.documentElement.style.setProperty('--header-h', h + 'px');
        }}
        syncHeaderHeight();
        window.addEventListener('resize', syncHeaderHeight);

        // Init
        autoLoad();
        updateProgress();
        updateNextButton();
        // Defer textarea sizing until layout is complete
        requestAnimationFrame(sizeTextareas);
    }})();
    </script>
</body>
</html>'''


def main():
    if not INDEX_HTML.exists():
        print(f"Error: {INDEX_HTML} not found")
        sys.exit(1)

    html = INDEX_HTML.read_text(encoding="utf-8")
    print(f"Read {len(html):,} characters from {INDEX_HTML.name}")

    translations = parse_translations(html)
    langs = [code for code in translations.keys() if code != "en"]
    en_keys = list(translations.get("en", {}).keys())
    print(f"Found {len(en_keys)} English keys, {len(langs)} target languages: {', '.join(sorted(langs))}")

    for lang in sorted(langs):
        lang_dir = OUTPUT_DIR / lang
        lang_dir.mkdir(parents=True, exist_ok=True)
        (lang_dir / "responses").mkdir(exist_ok=True)

        lang_dict = translations.get(lang, {})
        missing = [k for k in en_keys if k not in lang_dict]
        outfile = lang_dir / f"{lang}-review.html"
        html_content = generate_html(lang, translations)
        outfile.write_text(html_content, encoding="utf-8")
        status = f"({len(missing)} missing keys)" if missing else "(complete)"
        en_name = LANG_NAMES.get(lang, (lang, lang))[0]
        print(f"  {lang} ({en_name}): {lang}/{outfile.name} {status}")

    print(f"\nGenerated {len(langs)} review forms in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
