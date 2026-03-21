# Translation Review Guide

## For Reviewers

Thank you for helping verify the translations in **Spinal Instrumentation Plan & Record**. All translations were initially machine-generated and need review by native-speaking clinicians to ensure accuracy — particularly for surgical terminology.

### Getting Started

1. Open the HTML review file for your language (e.g. `de-review.html` for German) in any web browser
2. Fill in your name and institution in the **Your Details** section at the top
3. If you prefer not to be credited by name in the application, tick the checkbox

### How the Form Works

The form is organised into sections that mirror the application's user interface. Each section includes a description of where to find the strings in the app, so you can see them in context.

For each translation:

- **English** — the original English text (read-only)
- **Your language** — the current translation (editable)
- **Status** — mark as **Correct** if the translation is accurate, or **Corrected** if you have edited it
- **Comment** — optional notes explaining your correction or flagging concerns

**Tips:**
- Items tagged **Contains HTML** have formatting tags like `<strong>` or `<a href="...">`. Please keep these tags intact and only change the text between them.
- Items tagged **Contains {placeholders}** have variable markers like `{level}` or `{cageType}`. Keep the `{braces}` exactly as they are — only translate the surrounding text.
- If you edit a translation, the status automatically changes to **Corrected** and the field highlights in orange.
- Your progress is saved automatically in your browser. You can close the page and come back later without losing work.

### Using the Navigation

- The **left sidebar** links to each section — click to jump directly
- The **progress bar** at the top shows your overall completion
- Use the **filter buttons** (All / Pending / Correct / Corrected) to focus on remaining work
- Each section shows a count (e.g. `12/15`) of how many items you have reviewed

### Finding Strings in the Application

Open the application alongside the review form so you can see translations in context. The guidance text at the top of each section tells you where to look. Some things to note:

- **ALIF cages** only appear when you click a disc space at L4/5 or L5/S1 — switch the Region View to "Lumbar (T10-Pelvis)" first
- **ACDF cages** only appear at cervical disc spaces — switch to "Cervical (Occ-T4)"
- **Osteotomy types** appear after selecting the Osteotomy tool and clicking a vertebral body
- **Force types** appear when clicking the left or right edge of a vertebra
- **Help text** is in the Help modal (? button in the sidebar)

### Submitting Your Review

When you have finished (or want to save a partial review to continue later):

1. Click the green **Export Review** button in the top right
2. This downloads a JSON file named like `de-review-2026-03-21.json`
3. Email this file to **nigelgummerson@mac.com** with the subject line: **Translation review — [Language]**

That's it. The JSON file contains all your corrections, comments, and reviewer details. Partial reviews are welcome — every correction helps.

---

## For Developers

### Workflow Overview

```
1. Generate review forms     →  python tools/generate-review-forms.py
2. Send HTML files to reviewers
3. Receive JSON files back via email
4. Import and review          →  python tools/import-reviews.py [files...]
5. Apply corrections          →  python tools/import-reviews.py --apply [files...]
6. Regenerate review forms    →  python tools/generate-review-forms.py
7. Commit changes
```

### Generating Review Forms

```bash
python tools/generate-review-forms.py
```

Parses the `TRANSLATIONS` object from `index.html` and generates one self-contained HTML file per non-English language in `tools/review-forms/`. Re-run this whenever translations are updated in `index.html`.

New translation keys are picked up automatically — the generator groups keys by prefix (e.g. `modal.cage.*` goes into the "Cage Modal" section). You only need to edit the generator if you introduce an entirely new key prefix that doesn't match any existing section.

### Reviewing Feedback

When a reviewer sends back a JSON file:

```bash
# Place it in tools/review-forms/ or specify the path directly

# Report mode (read-only) — see what changed:
python tools/import-reviews.py de-review-2026-03-21.json

# Output:
#   DE (de-review-2026-03-21.json) — Dr Anna Schmidt, Charite Berlin
#     Reviewed:  218/222 (98%)
#     Correct:   195
#     Corrected: 23
#     Pending:   4
#     Comments:  7
#     Report:    de-corrections.txt
```

The corrections report (`de-corrections.txt`) lists each change with the original and corrected text, plus any reviewer comments.

### Applying Corrections to index.html

```bash
# Apply all corrections from one or more review files:
python tools/import-reviews.py --apply de-review-2026-03-21.json

# Or process all review JSONs in tools/review-forms/:
python tools/import-reviews.py --apply
```

This finds each corrected translation key within the target language block in `index.html` and replaces the old value with the reviewer's correction. After applying:

1. Open `index.html` in a browser and spot-check the corrected strings
2. Run `python tools/generate-review-forms.py` to regenerate review forms with the updated translations
3. Run the i18n test suites to verify nothing is broken:
   ```bash
   open tests/i18n-completeness.html
   open tests/i18n-clinical.html
   ```
4. Commit the changes

### Crediting Reviewers

The exported JSON includes reviewer details (name, institution, anonymity preference). Reviewers who have not opted out should be credited in the application — the convention is to add them to a credits section or the translation disclaimer.

### File Structure

```
tools/
├── generate-review-forms.py       # Generates HTML review forms from index.html
├── import-reviews.py              # Imports review JSON, reports & applies corrections
├── TRANSLATION-REVIEW-GUIDE.md    # This file
└── review-forms/
    ├── {lang}-review.html         # Generated review forms (one per language)
    ├── {lang}-review-{date}.json  # Completed reviews from reviewers (emailed back)
    └── {lang}-corrections.txt     # Generated correction reports
```
