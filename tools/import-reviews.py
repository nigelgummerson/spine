#!/usr/bin/env python3
"""
Import completed translation review JSON files and apply corrections to index.html.

Usage:
    python tools/import-reviews.py [review-file.json ...]         # Report only
    python tools/import-reviews.py --apply [review-file.json ...]  # Apply corrections to index.html

    If no files specified, processes all *-review-*.json files in tools/review-forms/

Outputs:
    - Console summary of corrections per language
    - tools/review-forms/{lang}-corrections.txt — detailed correction report
    - With --apply: updates TRANSLATIONS in index.html with corrected strings
"""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
INDEX_HTML = PROJECT_DIR / "index.html"
REVIEW_DIR = SCRIPT_DIR / "review-forms"


def process_review(filepath: Path) -> dict:
    """Process a single review JSON file and return a summary."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    lang = data.get("lang", "??")
    date = data.get("date", "unknown")
    reviewer = data.get("reviewer", {})
    items = data.get("items", {})

    correct = []
    corrected = []
    pending = []
    commented = []

    for key, entry in items.items():
        status = entry.get("status")
        original = entry.get("original", "")
        translation = entry.get("translation", "")
        comment = entry.get("comment")

        if status == "correct":
            correct.append(key)
        elif status == "corrected":
            corrected.append({
                "key": key,
                "original": original,
                "corrected": translation,
                "comment": comment,
            })
        else:
            pending.append(key)

        if comment:
            commented.append({"key": key, "comment": comment, "status": status})

    return {
        "lang": lang,
        "date": date,
        "file": filepath.name,
        "reviewer": reviewer,
        "total": len(items),
        "correct": correct,
        "corrected": corrected,
        "pending": pending,
        "commented": commented,
    }


def write_correction_report(result: dict, output_dir: Path):
    """Write a detailed correction report for a single language."""
    lang = result["lang"]
    outfile = output_dir / f"{lang}-corrections.txt"

    reviewer = result.get("reviewer", {})
    lines = []
    lines.append(f"Translation Corrections — {lang.upper()}")
    lines.append(f"Review date: {result['date']}")
    lines.append(f"Source file: {result['file']}")
    if reviewer.get("name"):
        parts = [reviewer["name"]]
        if reviewer.get("role"):
            parts.append(f"({reviewer['role']})")
        if reviewer.get("institution"):
            parts.append(f"— {reviewer['institution']}")
        if reviewer.get("country"):
            parts.append(f"[{reviewer['country']}]")
        if reviewer.get("anonymous"):
            parts.append("(prefers not to be credited)")
        lines.append(f"Reviewer: {' '.join(parts)}")
    lines.append(f"")
    lines.append(f"Summary: {len(result['correct'])} correct, {len(result['corrected'])} corrected, {len(result['pending'])} pending")
    lines.append(f"{'=' * 70}")
    lines.append("")

    if result["corrected"]:
        lines.append("CORRECTIONS")
        lines.append("-" * 40)
        for item in result["corrected"]:
            lines.append(f"  Key:       {item['key']}")
            lines.append(f"  Original:  {item['original']}")
            lines.append(f"  Corrected: {item['corrected']}")
            if item.get("comment"):
                lines.append(f"  Comment:   {item['comment']}")
            lines.append("")

    if result["commented"]:
        lines.append("ALL COMMENTS")
        lines.append("-" * 40)
        for item in result["commented"]:
            status_label = item["status"] or "pending"
            lines.append(f"  [{status_label}] {item['key']}: {item['comment']}")
        lines.append("")

    if result["pending"]:
        lines.append(f"PENDING ({len(result['pending'])} items)")
        lines.append("-" * 40)
        for key in result["pending"]:
            lines.append(f"  {key}")
        lines.append("")

    outfile.write_text("\n".join(lines), encoding="utf-8")
    return outfile


def escape_js_single_quote(s: str) -> str:
    """Escape a string for use inside single-quoted JS string literal."""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def apply_corrections(corrections: list[dict], lang: str, html: str) -> tuple[str, int]:
    """Apply corrections to the TRANSLATIONS object in index.html.

    For each correction, finds the exact line `'key': 'old_value'` within
    the target language block and replaces the value.

    Returns (updated_html, count_applied).
    """
    applied = 0

    for item in corrections:
        key = item["key"]
        original = item["original"]
        corrected = item["corrected"]

        if original == corrected:
            continue

        # Build the pattern to find this specific key-value pair.
        # Match: 'key': 'original_value'  (with possible whitespace variations)
        escaped_key = re.escape(escape_js_single_quote(key))
        escaped_original = re.escape(escape_js_single_quote(original))

        pattern = (
            rf"('{escaped_key}'\s*:\s*')"
            rf"{escaped_original}"
            rf"(')"
        )

        # We need to only match within the correct language block.
        # Find the language block boundaries first.
        lang_marker = re.search(rf"^\s+{lang}\s*:\s*\{{", html, re.MULTILINE)
        if not lang_marker:
            continue

        lang_start = lang_marker.start()

        # Find the end of this language block by brace matching
        depth = 0
        in_string = False
        string_char = ""
        escaped = False
        lang_end = lang_start
        found_open = False

        for i in range(lang_start, len(html)):
            ch = html[i]
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if in_string:
                if ch == string_char:
                    in_string = False
                continue
            if ch in ("'", '"'):
                in_string = True
                string_char = ch
                continue
            if ch == "{":
                depth += 1
                found_open = True
            elif ch == "}":
                depth -= 1
                if found_open and depth == 0:
                    lang_end = i + 1
                    break

        lang_block = html[lang_start:lang_end]

        match = re.search(pattern, lang_block)
        if match:
            escaped_corrected = escape_js_single_quote(corrected)
            new_block = lang_block[:match.start()] + match.group(1) + escaped_corrected + match.group(2) + lang_block[match.end():]
            html = html[:lang_start] + new_block + html[lang_end:]
            applied += 1

    return html, applied


def main():
    apply_mode = "--apply" in sys.argv
    file_args = [a for a in sys.argv[1:] if a != "--apply"]

    # Find review files
    if file_args:
        files = [Path(f) for f in file_args]
    else:
        if not REVIEW_DIR.exists():
            print(f"No review-forms directory found at {REVIEW_DIR}")
            sys.exit(1)
        files = sorted(REVIEW_DIR.glob("*-review-*.json"))
        if not files:
            print(f"No review JSON files found in {REVIEW_DIR}/")
            print(f"Expected files matching pattern: {{lang}}-review-{{date}}.json")
            sys.exit(1)

    if apply_mode:
        print(f"APPLY MODE — corrections will be written to {INDEX_HTML.name}\n")
        html = INDEX_HTML.read_text(encoding="utf-8")
        total_applied = 0
    else:
        print(f"Processing {len(files)} review file(s)...\n")

    for filepath in files:
        if not filepath.exists():
            print(f"  Skipping {filepath} — file not found")
            continue

        try:
            result = process_review(filepath)
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  Error processing {filepath.name}: {e}")
            continue

        lang = result["lang"]
        total = result["total"]
        n_correct = len(result["correct"])
        n_corrected = len(result["corrected"])
        n_pending = len(result["pending"])
        n_comments = len(result["commented"])

        reviewed = n_correct + n_corrected
        pct = round(reviewed / total * 100) if total else 0

        reviewer = result.get("reviewer", {})
        reviewer_str = ""
        if reviewer.get("name"):
            role_str = f" ({reviewer['role']})" if reviewer.get("role") else ""
            inst_str = f", {reviewer['institution']}" if reviewer.get("institution") else ""
            reviewer_str = f" — {reviewer['name']}{role_str}{inst_str}"

        print(f"  {lang.upper()} ({result['file']}){reviewer_str}")
        print(f"    Reviewed:  {reviewed}/{total} ({pct}%)")
        print(f"    Correct:   {n_correct}")
        print(f"    Corrected: {n_corrected}")
        print(f"    Pending:   {n_pending}")
        if n_comments:
            print(f"    Comments:  {n_comments}")

        if n_corrected > 0:
            report_file = write_correction_report(result, REVIEW_DIR)
            print(f"    Report:    {report_file.name}")

            if apply_mode:
                html, applied = apply_corrections(result["corrected"], lang, html)
                print(f"    Applied:   {applied}/{n_corrected} corrections to {INDEX_HTML.name}")
                total_applied += applied

        print()

    if apply_mode and total_applied > 0:
        INDEX_HTML.write_text(html, encoding="utf-8")
        print(f"Wrote {total_applied} correction(s) to {INDEX_HTML.name}")
        print(f"Run 'python tools/generate-review-forms.py' to regenerate review forms with updated translations.")
    elif apply_mode:
        print("No corrections to apply.")
    elif len(files) > 1:
        print("Done. Correction reports written to tools/review-forms/")
        print("Re-run with --apply to write corrections to index.html.")


if __name__ == "__main__":
    main()
