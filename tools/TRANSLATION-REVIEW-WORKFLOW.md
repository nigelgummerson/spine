# Translation Review Workflow

## 1. Generate review forms

```bash
python tools/generate-review-forms.py
```

Produces 13 HTML files (one per non-English language) in `review-forms/{lang}/`. Each language gets its own subdirectory with a `responses/` folder for returned JSON. Re-run this any time translations in `index.html` are updated — new keys are picked up automatically.

## 2. Send to reviewers

Email each reviewer:
- Their language's `review-forms/{lang}/{lang}-review.html` file (e.g. `review-forms/de/de-review.html` for German)
- A copy of `tools/TRANSLATION-REVIEW-GUIDE.md` with instructions

Save returned JSON files into `review-forms/{lang}/responses/`.

Reviewers can be spine surgeons, surgical trainees, or industry professionals (e.g. implant company reps). The form captures their role and affiliation.

## 3. Await feedback

Reviewers open the HTML file in any browser, work through the translations, and click **Export Review** when done. They email the exported JSON file to **nigelgummerson@mac.com**.

Partial reviews are fine — progress auto-saves in the browser and they can continue later.

## 4. Process returned reviews

```bash
# Report mode — see what changed without modifying anything:
python tools/import-reviews.py review-forms/de/responses/de-review-2026-03-21.json

# Apply corrections directly to index.html:
python tools/import-reviews.py --apply review-forms/de/responses/de-review-2026-03-21.json

# Process all returned reviews at once:
python tools/import-reviews.py
```

The report shows reviewer details, correction counts, and writes a `review-forms/{lang}/{lang}-corrections.txt` with full before/after diffs.

## 5. Verify and regenerate

After applying corrections:

```bash
# Spot-check the app
open index.html

# Run i18n test suites
open tests/i18n-completeness.html
open tests/i18n-clinical.html

# Regenerate review forms with updated translations
python tools/generate-review-forms.py
```

## 6. Commit

Commit the updated `index.html` with a message referencing the reviewer and language, e.g.:

```
Apply German translation corrections from Dr Schmidt (Charite Berlin)
```

Credit reviewers who have not opted out of attribution.
