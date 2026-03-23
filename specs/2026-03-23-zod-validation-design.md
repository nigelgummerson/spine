# Zod Schema Validation on Load

**Date:** 2026-03-23
**Goal:** Validate imported/loaded JSON against a Zod schema before deserialising into app state. Reject invalid files with clear error messages.

## Problem

`deserializeDocument()` currently accepts any JSON with `schema.version === 4` and silently falls back on missing/malformed fields. Corrupted or hand-edited files can produce invalid app state without warning. For clinical data, this is a safety gap.

## Design

### Library

Zod (~13KB gzipped). Smaller than Ajv, better error messages, and produces TypeScript types via `z.infer<>` for future TypeScript migration. The existing JSON Schema file at `docs/spinal-instrumentation-schema-v4.json` remains as documentation.

### Where validation runs

`validateV4(json)` is a standalone function in `schema.js` that validates JSON and throws `ValidationError` on failure. It is called **before** `deserializeDocument()` — not inside it. This keeps `deserializeDocument` unchanged and allows callers to opt in or out of validation.

**Three call sites:**

1. **File load** (`loadProjectJSON` in App.jsx) — calls `validateV4(json)` before `deserializeDocument(json)`. Catches `ValidationError`, shows error toast with a summary of issues. Does not proceed to `deserializeDocument`.
2. **Auto-load from localStorage** (`useDocumentState.js`) — calls `validateV4(parsed)` before `deserializeDocument(parsed)`. Catches `ValidationError` in the existing broad `catch` block, logs the validation details to console, starts with fresh state. No toast (app is just starting up).
3. **BroadcastChannel sync** (`useDocumentState.js`) — calls `deserializeDocument()` directly, no validation (same app version, trusted source).

### What the Zod schema validates

Structural and type validation only. Not clinical permissibility. Uses `.passthrough()` on objects to allow unknown fields (forward compatibility).

**Required top-level:**
- `schema` — `format` must be `'spinal-instrumentation'`, `version` must be `4`

**Optional top-level (all with safe defaults):**
- `document` — `id` (string), `created` (string), `modified` (string), `language` (string)
- `patient` — `name` (string), `identifier` (string)
- `case` — `date` (string), `surgeon` (string), `location` (string)
- `implantSystem` — `manufacturer` (string), `system` (string)
- `ui` — `viewMode` (string), `colourScheme` (string), `notePositions` (record of objects with `.passthrough()`)

**Plan and construct (`constructData` shape):**
- `elements[]` — each element requires:
  - `id` — string
  - `type` — enum: `screw`, `hook`, `fixation`, `cage`, `osteotomy`, `connector`
  - `level` — string matching vertebral pattern `^(Oc|C[1-7]|T([1-9]|1[0-2])|L[1-5]|S[1-5]|Pelvis)$`
  - `side` — enum: `left`, `right`, `bilateral`, `midline`
  - Type-specific sub-objects are optional and validated loosely with `.passthrough()`:
    - `screw` — `headType` (string), optional `diameter`/`length` (number)
    - `hook` — `hookType` (string)
    - `fixation` — `fixationType` (string), optional `description` (string)
    - `cage` — `approach` (string), optional `height`/`width`/`length`/`lordosis` (number)
    - `osteotomy` — `osteotomyType` (string), optional `schwabGrade` (number), `correctionAngle` (number), `reconstructionCage` (string)
    - `connector` — `connectorType` (string), optional `fraction` (number 0-1)
- `forces[]` — `id` (string), `type` (string), `level` (string), `side` (string), optional `direction` (string)
- `rods[]` — `side` (string), optional `id` (string), optional `freeText` (string). Uses `.passthrough()` for future rod fields.
- `notes[]` — `id` (string), `level` (string), `text` (string), optional `showArrow` (boolean)
- `boneGraft` — optional, `types` (string array), `notes` (string)

**What is NOT validated:**
- Clinical permissibility (handled by app logic at placement time)
- Exact enum values for sub-type fields (e.g. specific osteotomy types) — too brittle, would break on future additions
- Legacy v2/v3 formats — bypass validation entirely (deprecated path, already loaded permissively)

### Error format

`ValidationError` extends `Error`, carries an `issues` array (from Zod's error output). The toast shows a short summary:

> "Invalid file: 3 errors found. First: elements[2].type is required."

Console logs the full Zod error for debugging.

### New files

```
src/
├── state/
│   ├── documentReducer.js    (unchanged)
│   └── schema.js             (new — Zod schema, validateV4, ValidationError)
```

### Modified files

```
src/
├── App.jsx                   (loadProjectJSON — add validateV4 call before deserializeDocument)
├── hooks/
│   └── useDocumentState.js   (auto-load — add validateV4 call, log validation errors)
```

### What does NOT change

- `documentReducer.js` — no changes, deserializeDocument stays as-is
- All components, modals, data files, i18n
- The existing JSON Schema file at `docs/`
- Legacy v2/v3 loading path (no validation, permissive)
- BroadcastChannel sync (trusted, no validation)
- How valid files are loaded (identical behaviour)

### Tests

Add to existing Vitest suite in `src/state/__tests__/schema.test.js`:

**Acceptance tests:**
- Valid v4 JSON passes validation
- Valid file with all optional fields omitted passes
- Round-trip: `serializeState` output always passes validation

**Rejection tests:**
- Missing `schema.format` rejects
- Missing `schema.version` rejects
- Wrong `schema.version` (e.g. 3) rejects
- Invalid element type (e.g. `type: 'bolt'`) rejects
- Invalid vertebral level (e.g. `level: 'X9'`) rejects
- Missing required element fields (`id`, `type`, `level`, `side`) reject
- Element with `type: 'screw'` but `screw: null` rejects
- Force with non-string `level` (e.g. `null`) rejects

**Bypass tests:**
- Legacy v2/v3 files bypass validation (validateV4 only called for v4 format)
