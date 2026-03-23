# Extract App.jsx State Management + Add Vitest

**Date:** 2026-03-23
**Branch:** `refactor/extract-app-state`
**Goal:** Extract clinical/document state from App.jsx (~1,466 lines) into a dedicated reducer and hook, then add unit tests with Vitest.

## Problem

App.jsx contains 35 `useState` calls, ~600 lines of state mutation handlers, ~200 lines of serialization/deserialization, and ~100 lines of sync logic, mixed in with ~500 lines of JSX rendering. This makes it hard to reason about, test, or modify safely.

## Design

### State split

Three categories of state, each handled differently:

**1. Document state (useReducer)**

Everything that belongs to a patient. Cleared on "New Patient". Saved/loaded from JSON. Synced between windows. Cached in localStorage.

```
documentId, documentCreated
patientData: { name, id, surgeon, location, date, company, screwSystem,
               leftRod, rightRod, planLeftRod, planRightRod,
               boneGraft: { types, notes } }
plannedPlacements, plannedCages, plannedConnectors, plannedNotes
completedPlacements, completedCages, completedConnectors, completedNotes
reconLabelPositions
```

**2. User preferences (useState in App.jsx)**

Persist across patients via localStorage. NOT cleared on "New Patient". Still written into JSON export for convenience, passed to `serializeState()` when saving.

```
viewMode        (localStorage: spine_planner_view)
colourScheme    (localStorage: spine_planner_theme)
```

**3. Transient UI state (useState in App.jsx)**

Never saved, never synced. Stays in App.jsx unchanged.

```
selectedTool, lastUsedScrewType, activeChart
screwModalOpen, osteoModalOpen, cageModalOpen, forceModalOpen
helpModalOpen, changeLogOpen, noteModalOpen
editingPlacementId, editingData, editingTool, editingCageLevel
editingAnnotation, pendingPlacement, pendingNoteTool, editingNote
discPickerLevel, pendingForceZone
defaultDiameter, defaultLength, defaultScrewMode, defaultCustomText
defaultOsteoType, defaultOsteoAngle, osteoDiscLevel
portraitTab, portraitScale, portraitExporting
toasts, themeOpen, showFinalInventory
incognitoMode, isEditingDate, hasLoaded
confirmNewPatient, confirmClearConstruct
exportPicker, disclaimerTick, syncConnected
scale (landscape resize)
```

### New files

```
src/
├── state/
│   └── documentReducer.js     (~250 lines)
├── hooks/
│   ├── useDocumentState.js    (~120 lines)
│   └── usePortrait.js         (existing, unchanged)
└── App.jsx                    (~600 lines, down from 1,466)
```

### documentReducer.js

Pure function, no React imports, no side effects. Contains:

- `createInitialState()` — factory for blank document state
- `documentReducer(state, action)` — the reducer function
- V4 mapping tables (`TOOL_TO_V4_HOOK`, `V4_HOOK_TO_TOOL`, `TOOL_TO_V4_FIXATION`, `V4_FIXATION_TO_TOOL`, `OSTEO_TO_V4`, `V4_OSTEO_TO_TOOL`, `FORCE_TO_V4`, `V4_FORCE_TO_TOOL`, `BONEGRAFT_TO_V4`, `V4_BONEGRAFT_TO_TOOL`, `ZONE_TO_SIDE`)
- `internalToV4Chart(placements, cages, connectors, notes, rodText)` — pure function, converts internal arrays to v4 format (remove unused 6th parameter `planRodText` from current code)
- `serializeState(state, viewMode, colourScheme)` — pure function, returns v4 JSON object. `viewMode` and `colourScheme` are passed in from App.jsx since they're user preferences, not document state. They're written into `ui.*` in the JSON for convenience.
- `deserializeDocument(json)` — pure function, returns document state from v4 or v3/v2 JSON
- `migrateConnectors(connectors)` — pure function, v3 yNorm to level-based migration

**Reducer actions:**

Placement CRUD:
- `ADD_PLACEMENT { chart, placement }` — adds to plan or construct (enforces one-per-zone for left/right)
- `UPDATE_PLACEMENT { chart, id, tool, data, annotation }` — edits existing placement
- `REMOVE_PLACEMENT { chart, id }` — deletes by ID

Cage CRUD:
- `SET_CAGE { chart, levelId, cage }` — adds or replaces at disc level
- `REMOVE_CAGE { chart, levelId }` — deletes by level

Connector CRUD:
- `ADD_CONNECTOR { chart, connector }` — adds crosslink
- `UPDATE_CONNECTOR { chart, id, levelId, fraction }` — moves crosslink
- `REMOVE_CONNECTOR { chart, id }` — deletes crosslink

Note CRUD:
- `ADD_NOTE { chart, note }` — creates note
- `UPDATE_NOTE { chart, id, text, showArrow }` — edits note content
- `UPDATE_NOTE_POSITION { chart, id, offsetX, offsetY }` — drags note
- `REMOVE_NOTE { chart, id }` — deletes note

Patient data:
- `SET_PATIENT_FIELD { field, value }` — updates a single field
- `SET_BONE_GRAFT { types, notes }` — updates bone graft
- `SET_RECON_LABEL_POSITION { id, offsetX, offsetY }` — drags reconstruction label

Bulk operations:
- `NEW_PATIENT` — resets entire document to blank state (new UUID, new timestamp)
- `COPY_PLAN_TO_CONSTRUCT` — filters planned arrays, strips annotations/angles, appends to construct
- `CLEAR_CONSTRUCT` — empties all construct arrays
- `LOAD_DOCUMENT { document }` — replaces entire state from deserialized JSON/sync/localStorage

The `chart` parameter on CRUD actions is either `'plan'` or `'construct'`. App.jsx resolves this from `activeChart` before dispatching.

### useDocumentState.js

React hook wrapping the reducer with side effects:

- Calls `useReducer(documentReducer, createInitialState())`
- Auto-load from localStorage on mount (`spine_planner_v2`), dispatches `LOAD_DOCUMENT`
- Auto-save to localStorage when state changes (same dependency list as current `useEffect` at App.jsx:436)
- BroadcastChannel sync: ping/pong heartbeat, incoming state handling, version mismatch detection
- Exposes `{ state, dispatch, serializeState, syncChannelRef, syncConnected, hasLoaded }`

`syncConnected` and `hasLoaded` are managed as `useState` inside this hook (not in the reducer — they're lifecycle state, not document data). Moved from App.jsx because they're tied to the sync and auto-load effects that this hook owns.

### App.jsx changes

- Replace 12 clinical `useState` calls with `const { state, dispatch, ... } = useDocumentState()`
- Handler functions stay in App.jsx (they need transient UI state like `activeChart`, `editingPlacementId`, `pendingPlacement`) but become thinner — translate UI context into dispatch calls
- Delete: serialization code, v4 mapping tables, `migrateConnectors`, sync effects, auto-save effect
- Update JSX references: `plannedPlacements` becomes `state.plannedPlacements`, etc.
- Export logic stays (reads DOM refs)
- All JSX rendering unchanged

### What does NOT change

- All component files (ChartPaper, ScrewModal, etc.)
- All data files (anatomy.js, implants.js, clinical.js, themes.js)
- All i18n files
- usePortrait.js
- Component prop interfaces
- User-visible behaviour

## Vitest

After the extraction, add Vitest to test the pure functions in `documentReducer.js`:

**Setup:**
- `npm install -D vitest` (zero config with Vite)
- Add `"test": "vitest"` to package.json scripts
- Test files in `src/state/__tests__/documentReducer.test.js`

**Test coverage:**

Reducer actions:
- ADD_PLACEMENT (including one-per-zone enforcement for left/right)
- UPDATE_PLACEMENT, REMOVE_PLACEMENT
- SET_CAGE, REMOVE_CAGE
- ADD_CONNECTOR, UPDATE_CONNECTOR, REMOVE_CONNECTOR
- ADD_NOTE, UPDATE_NOTE, UPDATE_NOTE_POSITION, REMOVE_NOTE
- SET_PATIENT_FIELD, SET_BONE_GRAFT, SET_RECON_LABEL_POSITION
- NEW_PATIENT (resets everything, generates new UUID/timestamp)
- COPY_PLAN_TO_CONSTRUCT (filtering, annotation stripping, deduplication)
- CLEAR_CONSTRUCT
- LOAD_DOCUMENT

Serialization round-trip:
- serializeState → deserializeDocument produces equivalent state
- v3/v2 legacy format loading
- migrateConnectors (yNorm to level-based)

Edge cases:
- One-per-zone: adding to occupied left/right zone is no-op
- COPY_PLAN_TO_CONSTRUCT with existing construct placements (deduplication)
- COPY_PLAN_TO_CONSTRUCT excludes forces
- LOAD_DOCUMENT with v4 vs v3 vs v2 format
- Empty state serialization round-trip

## Implementation steps

1. **Create the reducer and serialization** — write `documentReducer.js` and `useDocumentState.js` (new files only, App.jsx unchanged, nothing breaks)
2. **Wire App.jsx to the new hook** — replace useState calls with useDocumentState, update handlers to dispatch, update JSX references, delete moved code
3. **Verify manually** — `npm run build`, test load/save/sync/export/new-patient
4. **Add Vitest** — install, write tests for reducer actions and serialization round-trip
