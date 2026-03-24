# Releasing

## Version Bump Checklist

Every version bump requires updating these files:

### 1. Source of truth
- **`src/data/changelog.ts`** — update `CURRENT_VERSION` string and add a new entry to the `CHANGE_LOG` array with version, date, and bullet points

### 2. Documentation
- **`CLAUDE.md`** — update version/date in "Current Status" (line 7–8) and add a new entry to "Version History (Recent)"
- **`README.md`** — update version badge (line 5)

### 3. Static pages
- **`public/quick-reference.html`** — find/replace all version strings (16 `version:` entries, one per translated language block). Also check that `SUPPORTED_LANGUAGES` array matches current language count.
  - **Known gap:** quick-reference only has 16 translated language blocks (missing he, hi, ar, ja, ko, zh-Hans). Adding these is a separate task.
- **Language count** — check `credits.quick_reference` in `src/i18n/translations.json` matches the actual language count

### 4. Generated files
- **Review forms** — run `python3 tools/generate-review-forms.py` to regenerate all language review HTMLs (reads version from changelog.ts automatically)

### 5. Tests
- Run `npm test` to verify all tests pass

### 6. Verify on dev server
- `npm run dev` and check the changes render correctly before pushing

## Auto-updated (no action needed)
All source files that display the version (`App.tsx`, `CreditsFooter.tsx`, `ChangeLogModal.tsx`, `HelpModal.tsx`, `useDocumentState.ts`) import `CURRENT_VERSION` from `src/data/changelog.ts`.

`package.json` version is decoupled from the app version (npm package version).

## Deploying to GitHub Pages (web build)
Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) automatically runs tests, builds the code-split web output, and deploys to GitHub Pages.

Live at: https://plan.skeletalsurgery.com/spine/

## Creating a Standalone Release (offline HTML)
The standalone single-file build is for offline distribution (USB, email, intranet).

1. Tag the commit: `git tag v2.5.20-beta` (must match pattern `v*.*.*` or `v*.*.*-*`)
2. Push the tag: `git push origin v2.5.20-beta`
3. GitHub Actions (`.github/workflows/release.yml`) automatically:
   - Runs tests
   - Builds standalone HTML via `npm run build:standalone`
   - Creates a GitHub Release with the standalone file attached

The release appears at: https://github.com/nigelgummerson/spine/releases

## Updating the Landing Page
The landing page at plan.skeletalsurgery.com is a separate repo:

- **Repo:** `nigelgummerson/nigelgummerson.github.io`
- **Local path:** `/Users/nigel/Projects/spine-surgery/planning/skeletalsurgery-landing`

After a version bump, update the landing page if the version number, feature list, or language count has changed. Push to that repo to deploy.

## Quick Reference
```bash
# Full release workflow
1. Edit src/data/changelog.ts          # CURRENT_VERSION + CHANGE_LOG
2. Edit CLAUDE.md                       # version header + history entry
3. Edit README.md                       # version badge
4. Edit public/quick-reference.html     # find/replace version (16 entries)
5. python3 tools/generate-review-forms.py  # regenerate review forms
6. npm test                             # verify tests pass
7. npm run dev                          # visual check
8. git add && git commit && git push    # deploys web build to Pages
9. git tag v2.5.XX-beta && git push origin v2.5.XX-beta  # triggers standalone release
10. Update skeletalsurgery-landing if needed
```
