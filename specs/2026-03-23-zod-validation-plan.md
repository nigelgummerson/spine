# Zod Schema Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod validation to reject invalid v4 JSON files on load, with clear error messages for clinical safety.

**Architecture:** A standalone `schema.js` file exports `validateV4(json)` which throws `ValidationError` on failure. Callers (`loadProjectJSON` in App.jsx, auto-load in `useDocumentState.js`) call it before `deserializeDocument`. BroadcastChannel sync skips validation (trusted source). `deserializeDocument` is unchanged.

**Tech Stack:** Zod (new dependency), Vitest (existing)

**Spec:** `specs/2026-03-23-zod-validation-design.md`

---

### Task 1: Install Zod

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Zod**

Run: `npm install zod`

- [ ] **Step 2: Verify it installed**

Run: `node -e "const { z } = require('zod'); console.log('zod', z.string().parse('ok'))"`
Expected: `zod ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zod dependency for schema validation"
```

---

### Task 2: Create schema.js with Zod schema and validateV4

**Files:**
- Create: `src/state/schema.js`

- [ ] **Step 1: Create the schema file**

```js
// src/state/schema.js
import { z } from 'zod';

// --- ValidationError ---

export class ValidationError extends Error {
    constructor(issues) {
        const first = issues[0];
        const path = first?.path?.join('.') || 'unknown';
        const msg = first?.message || 'validation failed';
        super(`Invalid file: ${issues.length} error${issues.length === 1 ? '' : 's'} found. First: ${path} — ${msg}`);
        this.name = 'ValidationError';
        this.issues = issues;
    }
}

// --- Vertebral level pattern ---
// Matches: Oc, C1-C7, T1-T12, L1-L5, S1-S5, Pelvis
const levelPattern = /^(Oc|C[1-7]|T([1-9]|1[0-2])|L[1-5]|S[1-5]|Pelvis)$/;
const level = z.string().regex(levelPattern, 'Invalid vertebral level');

// --- Side enum ---
const side = z.enum(['left', 'right', 'bilateral', 'midline']);

// --- Element type-specific sub-objects (loose validation with passthrough) ---

const screwObj = z.object({
    headType: z.string(),
    diameter: z.number().optional(),
    length: z.number().optional(),
}).passthrough().optional();

const hookObj = z.object({
    hookType: z.string(),
}).passthrough().optional();

const fixationObj = z.object({
    fixationType: z.string(),
    description: z.string().optional(),
}).passthrough().optional();

const cageObj = z.object({
    approach: z.string(),
    height: z.number().optional(),
    width: z.number().optional(),
    length: z.number().optional(),
    lordosis: z.number().optional(),
}).passthrough().optional();

const osteotomyObj = z.object({
    osteotomyType: z.string(),
    schwabGrade: z.number().optional(),
    correctionAngle: z.number().optional(),
    reconstructionCage: z.string().optional(),
}).passthrough().optional();

const connectorObj = z.object({
    connectorType: z.string(),
    fraction: z.number().min(0).max(1).optional(),
}).passthrough().optional();

// --- Element ---

const elementType = z.enum(['screw', 'hook', 'fixation', 'cage', 'osteotomy', 'connector']);

const element = z.object({
    id: z.string(),
    type: elementType,
    level,
    side,
    annotation: z.string().optional(),
    screw: screwObj,
    hook: hookObj,
    fixation: fixationObj,
    cage: cageObj,
    osteotomy: osteotomyObj,
    connector: connectorObj,
}).passthrough();

// --- Force ---

const force = z.object({
    id: z.string(),
    type: z.string(),
    level,
    side,
    direction: z.string().optional(),
}).passthrough();

// --- Rod ---

const rod = z.object({
    side: z.string(),
    id: z.string().optional(),
    freeText: z.string().optional(),
}).passthrough();

// --- Note ---

const note = z.object({
    id: z.string(),
    level,
    text: z.string(),
    showArrow: z.boolean().optional(),
}).passthrough();

// --- Bone graft ---

const boneGraft = z.object({
    types: z.array(z.string()).optional(),
    notes: z.string().optional(),
}).passthrough().optional();

// --- Construct data (plan or construct) ---

const constructData = z.object({
    elements: z.array(element).optional(),
    forces: z.array(force).optional(),
    rods: z.array(rod).optional(),
    notes: z.array(note).optional(),
    boneGraft: boneGraft,
}).passthrough().optional();

// --- Top-level v4 schema ---

export const v4Schema = z.object({
    schema: z.object({
        format: z.literal('spinal-instrumentation'),
        version: z.literal(4),
    }).passthrough(),
    document: z.object({
        id: z.string(),
        created: z.string(),
        modified: z.string().optional(),
        language: z.string().optional(),
    }).passthrough().optional(),
    patient: z.object({
        name: z.string().optional(),
        identifier: z.string().optional(),
    }).passthrough().optional(),
    case: z.object({
        date: z.string().optional(),
        surgeon: z.string().optional(),
        location: z.string().optional(),
    }).passthrough().optional(),
    implantSystem: z.object({
        manufacturer: z.string().optional(),
        system: z.string().optional(),
    }).passthrough().optional(),
    plan: constructData,
    construct: constructData,
    ui: z.object({
        viewMode: z.string().optional(),
        colourScheme: z.string().optional(),
        notePositions: z.record(z.string(), z.any()).optional(),
    }).passthrough().optional(),
}).passthrough();

// --- Validate ---

export function validateV4(json) {
    const result = v4Schema.safeParse(json);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/schema.js
git commit -m "feat: add Zod v4 schema and validateV4 function"
```

---

### Task 3: Write validation tests

**Files:**
- Create: `src/state/__tests__/schema.test.js`

- [ ] **Step 1: Create test file with all tests**

```js
// src/state/__tests__/schema.test.js
import { describe, it, expect } from 'vitest';
import { validateV4, ValidationError } from '../schema';
import { createInitialState, serializeState } from '../documentReducer';

// Helper: minimal valid v4 JSON
function validV4() {
    return {
        schema: { format: 'spinal-instrumentation', version: 4 },
        document: { id: 'test-id', created: '2026-01-01T00:00:00Z' },
        plan: { elements: [], forces: [], rods: [], notes: [] },
        construct: { elements: [], forces: [], rods: [], notes: [] },
    };
}

describe('validateV4', () => {

    // --- Acceptance tests ---

    it('accepts a minimal valid v4 file', () => {
        expect(() => validateV4(validV4())).not.toThrow();
    });

    it('accepts a valid file with all optional fields omitted', () => {
        const json = {
            schema: { format: 'spinal-instrumentation', version: 4 },
        };
        expect(() => validateV4(json)).not.toThrow();
    });

    it('accepts a file with elements of all types', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial', diameter: 6.5, length: 45 } },
            { id: 'e2', type: 'hook', level: 'T3', side: 'right', hook: { hookType: 'pedicle' } },
            { id: 'e3', type: 'fixation', level: 'T7', side: 'left', fixation: { fixationType: 'sublaminar-band' } },
            { id: 'e4', type: 'cage', level: 'L4', side: 'bilateral', cage: { approach: 'TLIF', height: 10 } },
            { id: 'e5', type: 'osteotomy', level: 'T10', side: 'midline', osteotomy: { osteotomyType: 'PSO', schwabGrade: 3 } },
            { id: 'e6', type: 'connector', level: 'T8', side: 'midline', connector: { connectorType: 'crosslink', fraction: 0.5 } },
        ];
        json.plan.forces = [
            { id: 'f1', type: 'compression', level: 'T5', side: 'left' },
        ];
        json.plan.rods = [
            { id: 'rod-left', side: 'left', freeText: 'CoCr 5.5mm' },
        ];
        json.plan.notes = [
            { id: 'n1', level: 'T5', text: 'Check pedicle', showArrow: true },
        ];
        expect(() => validateV4(json)).not.toThrow();
    });

    it('round-trip: serializeState output passes validation', () => {
        const state = createInitialState();
        const json = serializeState(state, 'thoracolumbar', 'default', '2.2.1', 'en');
        expect(() => validateV4(json)).not.toThrow();
    });

    it('accepts unknown extra fields (forward compatibility)', () => {
        const json = validV4();
        json.futureField = 'something';
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial' }, futureField: true },
        ];
        expect(() => validateV4(json)).not.toThrow();
    });

    // --- Rejection tests ---

    it('rejects missing schema.format', () => {
        const json = validV4();
        delete json.schema.format;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects missing schema.version', () => {
        const json = validV4();
        delete json.schema.version;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects wrong schema.version', () => {
        const json = validV4();
        json.schema.version = 3;
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects invalid element type', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'bolt', level: 'T5', side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects invalid vertebral level', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'X9', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required id', () => {
        const json = validV4();
        json.plan.elements = [
            { type: 'screw', level: 'T5', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required type', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', level: 'T5', side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required level', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', side: 'left', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects element missing required side', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', screw: { headType: 'polyaxial' } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects force with non-string level', () => {
        const json = validV4();
        json.plan.forces = [
            { id: 'f1', type: 'compression', level: null, side: 'left' },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects connector fraction out of range', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'connector', level: 'T8', side: 'midline', connector: { connectorType: 'crosslink', fraction: 1.5 } },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    it('rejects screw element with screw: null', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'screw', level: 'T5', side: 'left', screw: null },
        ];
        expect(() => validateV4(json)).toThrow(ValidationError);
    });

    // --- Error format ---

    it('ValidationError has issues array and descriptive message', () => {
        const json = validV4();
        json.plan.elements = [
            { id: 'e1', type: 'bolt', level: 'T5', side: 'left' },
        ];
        try {
            validateV4(json);
            expect.fail('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ValidationError);
            expect(err.issues).toBeInstanceOf(Array);
            expect(err.issues.length).toBeGreaterThan(0);
            expect(err.message).toContain('Invalid file');
            expect(err.message).toContain('error');
        }
    });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass (both existing documentReducer tests and new schema tests)

- [ ] **Step 3: Commit**

```bash
git add src/state/__tests__/schema.test.js
git commit -m "test: add Zod validation tests for v4 schema"
```

---

### Task 4: Wire validateV4 into loadProjectJSON (App.jsx)

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add import**

Add to the imports at top of App.jsx:

```js
import { validateV4, ValidationError } from './state/schema';
```

- [ ] **Step 2: Update loadProjectJSON**

Replace the current `loadProjectJSON` function (around line 633):

```js
    const loadProjectJSON = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if (json.schema?.version === 4) {
                    validateV4(json);
                    const result = deserializeDocument(json);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                } else if (json.formatVersion >= 2) {
                    // Legacy v2/v3 — no validation, permissive load
                    const result = deserializeDocument(json);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                } else {
                    showToast(t('alert.unsupported_format'), 'error');
                    return;
                }
                showToast(t('alert.loaded'));
            } catch (err) {
                if (err instanceof ValidationError) {
                    console.error('Schema validation failed:', err.issues);
                    showToast(err.message, 'error');
                } else {
                    showToast(t('alert.invalid_file'), 'error');
                }
            }
        };
        reader.readAsText(file); e.target.value = null;
    };
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: validate v4 JSON on file load, show errors in toast"
```

---

### Task 5: Wire validateV4 into useDocumentState auto-load

**Files:**
- Modify: `src/hooks/useDocumentState.js`

- [ ] **Step 1: Add import**

Add to the imports at top of useDocumentState.js:

```js
import { validateV4, ValidationError } from '../state/schema';
```

- [ ] **Step 2: Update auto-load effect**

Replace the auto-load useEffect (around line 35):

```js
    // AUTO-LOAD from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('spine_planner_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.schema?.version === 4) {
                    validateV4(parsed);
                    const result = deserializeDocument(parsed);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                } else if (parsed.formatVersion >= 2) {
                    // Legacy v2/v3 — no validation
                    const result = deserializeDocument(parsed);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } catch (e) {
                if (e instanceof ValidationError) {
                    console.error('Cached data failed validation — starting fresh:', e.issues);
                } else {
                    console.error('Data load error');
                }
            }
        }
        setHasLoaded(true);
    }, []);
```

- [ ] **Step 3: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: Build succeeds, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDocumentState.js
git commit -m "feat: validate cached v4 data on auto-load, log errors"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing documentReducer tests + new schema tests)

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Manual test — valid file loads**

1. Open `dist/index.html`
2. Add some placements
3. Save as JSON
4. New Patient
5. Load the saved JSON — should work as before

- [ ] **Step 4: Manual test — invalid file rejected**

Create a file `test-invalid.json` with:
```json
{"schema": {"format": "spinal-instrumentation", "version": 4}, "plan": {"elements": [{"type": "bolt"}]}}
```

Load it — should show error toast with validation message, not load the data.

- [ ] **Step 5: Clean up test file**

```bash
rm test-invalid.json
```
