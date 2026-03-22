#!/usr/bin/env python3
"""
Import completed translation review JSON files and apply corrections to translations.json.

Usage:
    python tools/import-reviews.py [review-file.json ...]         # Report only
    python tools/import-reviews.py --apply [review-file.json ...]  # Apply corrections to translations.json

    If no files specified, processes all *-review-*.json files in review-forms/

Outputs:
    - Console summary of corrections per language
    - review-forms/{lang}-corrections.txt — detailed correction report
    - With --apply: updates translations.json with corrected strings
"""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
TRANSLATIONS_FILE = PROJECT_DIR / "src" / "i18n" / "translations.json"
REVIEW_DIR = PROJECT_DIR / "public" / "review-forms"


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
    lang_dir = output_dir / lang
    lang_dir.mkdir(parents=True, exist_ok=True)
    outfile = lang_dir / f"{lang}-corrections.txt"

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


def apply_corrections(corrections: list[dict], lang: str, translations: dict) -> int:
    """Apply corrections to the translations dict.

    Returns count of corrections applied.
    """
    applied = 0

    if lang not in translations:
        return 0

    for item in corrections:
        key = item["key"]
        original = item["original"]
        corrected = item["corrected"]

        if original == corrected:
            continue

        translations[lang][key] = corrected
        applied += 1

    return applied


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
        files = sorted(REVIEW_DIR.glob("*/responses/*-review-*.json"))
        if not files:
            print(f"No review JSON files found in {REVIEW_DIR}/")
            print(f"Expected files matching pattern: {{lang}}-review-{{date}}.json")
            sys.exit(1)

    if apply_mode:
        print(f"APPLY MODE — corrections will be written to {TRANSLATIONS_FILE.relative_to(PROJECT_DIR)}\n")
        with open(TRANSLATIONS_FILE, encoding="utf-8") as f:
            translations = json.load(f)
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
                applied = apply_corrections(result["corrected"], lang, translations)
                print(f"    Applied:   {applied}/{n_corrected} corrections to translations.json")
                total_applied += applied

        print()

    if apply_mode and total_applied > 0:
        with open(TRANSLATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(translations, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"Wrote {total_applied} correction(s) to {TRANSLATIONS_FILE.relative_to(PROJECT_DIR)}")
        print(f"Run 'python tools/generate-review-forms.py' to regenerate review forms with updated translations.")
    elif apply_mode:
        print("No corrections to apply.")
    elif len(files) > 1:
        print("Done. Correction reports written to review-forms/")
        print("Re-run with --apply to write corrections to translations.json.")


if __name__ == "__main__":
    main()
