# Releasing

## Version Bump Checklist

Every version bump requires updating these files:

### 1. Source of truth
- **`src/data/changelog.ts`** — update `CURRENT_VERSION` string and add a new entry to the `CHANGE_LOG` array with version, date, and bullet points. **Keep entries brief and user-facing** — this is shown in the app's Version History modal. No technical jargon, no internal architecture details. Focus on what the surgeon can now do.

### 2. Changelogs (two audiences)
- **`src/data/changelog.ts`** — user-facing changelog (in-app Version History modal). Brief, non-technical, what the surgeon can now do.
- **`CHANGELOG-DEV.md`** — developer/agent changelog (comprehensive, technical, includes architecture and test details). Referenced from CLAUDE.md but kept separate to avoid context bloat.
- **`CLAUDE.md`** — update version/date in "Current Status". Version History (Recent) section has one-line summaries per version that point to CHANGELOG-DEV.md for detail.

### 3. Documentation
- **`CLAUDE.md`** — update version/date in "Current Status" (line 7–8) and add a new entry to "Version History (Recent)"
- **`README.md`** — update version badge (line 5)

### 3a. Specification & review docs (check on major releases)
- **`docs/SPECIFICATION.md`** (Dropbox symlink) — update version header, add new features/sections, update test count and system counts. Must reflect the current app accurately.
- **`docs/expert-reviews/REVIEW-SUMMARY.md`** (Dropbox) — update item statuses (DONE/OPEN/OUT OF SCOPE), add new items from this release. This is the single source of truth for expert review decisions — future reviewers read it first.

### 4. Static pages
- **`public/quick-reference.html`** — find/replace all version strings (22 `version:` entries, one per translated language block). Also check that `SUPPORTED_LANGUAGES` array matches current language count.
- **Language count** — check `credits.quick_reference` in `src/i18n/translations.json` matches the actual language count

### 5. Generated files
- **Review forms** — run `python3 tools/generate-review-forms.py` to regenerate all language review HTMLs (reads version from changelog.ts automatically)

### 6. Tests
- Run `npm test` to verify all tests pass

### 7. Verify on dev server
- `npm run dev` and check the changes render correctly before pushing

## Auto-updated (no action needed)
All source files that display the version (`App.tsx`, `CreditsFooter.tsx`, `ChangeLogModal.tsx`, `HelpModal.tsx`, `useDocumentState.ts`) import `CURRENT_VERSION` from `src/data/changelog.ts`.

`package.json` version is decoupled from the app version (npm package version).

## Deploying to GitHub Pages (web build)
Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) automatically runs tests, builds the code-split web output, and deploys to GitHub Pages.

Live at: https://plan.skeletalsurgery.com/spine/

## Creating a Standalone Release (offline HTML)
The standalone single-file build is for offline distribution (USB, email, intranet).

1. Tag the commit: `git tag v2.7.33-beta` (must match pattern `v*.*.*` or `v*.*.*-*`)
2. Push the tag: `git push origin v2.7.33-beta`
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
1. Edit src/data/changelog.ts            # CURRENT_VERSION + user-facing CHANGE_LOG
2. Edit CHANGELOG-DEV.md                 # technical changelog for developers/agents
3. Edit CLAUDE.md                        # version header + one-line history entry
4. Edit README.md                        # version badge
5. Edit public/quick-reference.html      # find/replace version (22 entries)
6. python3 tools/generate-review-forms.py  # regenerate review forms
7. npm test                              # verify tests pass
8. npm run dev                           # visual check
9. Check docs/SPECIFICATION.md           # update if features added (major releases)
10. Check docs/expert-reviews/REVIEW-SUMMARY.md  # update item statuses
11. git add && git commit && git push    # deploys web build to Pages
12. git tag v2.7.XX-beta && git push origin v2.7.XX-beta  # triggers standalone release
13. Update skeletalsurgery-landing if needed
```
