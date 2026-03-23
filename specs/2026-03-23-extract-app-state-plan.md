# Extract App.jsx State Management + Vitest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract clinical/document state from App.jsx (~1,466 lines) into a useReducer + custom hook, then add unit tests with Vitest.

**Architecture:** Document state (everything that belongs to a patient) moves into a pure reducer function in its own file. A custom hook wraps the reducer with side effects (localStorage, BroadcastChannel sync). App.jsx keeps transient UI state and rendering. Vitest tests cover the reducer and serialization as pure functions.

**Tech Stack:** React 19, Vite 8, Vitest (new), existing Tailwind/jsPDF/html-to-image stack unchanged.

**Spec:** `specs/2026-03-23-extract-app-state-design.md`

---

### Task 1: Create documentReducer.js — initial state and mapping tables

**Files:**
- Create: `src/state/documentReducer.js`

- [ ] **Step 1: Create the file with initial state factory and all v4 mapping tables**

```js
// src/state/documentReducer.js
import { WHOLE_SPINE_MAP } from '../data/anatomy';

// --- V4 mapping tables ---

export const TOOL_TO_V4_HOOK = { pedicle_hook: 'pedicle', tp_hook: 'transverse-process-down', tp_hook_up: 'transverse-process-up', sl_hook: 'supralaminar', il_hook: 'infralaminar', supra_laminar_hook: 'supralaminar', infra_laminar_hook: 'infralaminar' };
export const V4_HOOK_TO_TOOL = Object.fromEntries(Object.entries(TOOL_TO_V4_HOOK).map(([k, v]) => [v, k]));

export const TOOL_TO_V4_FIXATION = { band: 'sublaminar-band', wire: 'sublaminar-wire', cable: 'cable' };
export const V4_FIXATION_TO_TOOL = Object.fromEntries(Object.entries(TOOL_TO_V4_FIXATION).map(([k, v]) => [v, k]));

export const OSTEO_TO_V4 = { Facet: { t: 'facetectomy', g: 1 }, Ponte: { t: 'ponte', g: 2 }, PSO: { t: 'PSO', g: 3 }, ExtPSO: { t: 'extended-PSO', g: 4 }, VCR: { t: 'VCR', g: 5 }, 'ML-VCR': { t: 'multilevel-VCR', g: 6 }, Corpectomy: { t: 'corpectomy', g: null } };
export const V4_OSTEO_TO_TOOL = Object.fromEntries(Object.entries(OSTEO_TO_V4).map(([k, v]) => [v.t, k]));

export const FORCE_TO_V4 = { translate_left: { type: 'translation', direction: 'left' }, translate_right: { type: 'translation', direction: 'right' }, compression: { type: 'compression' }, distraction: { type: 'distraction' }, derotate_cw: { type: 'derotation', direction: 'clockwise' }, derotate_ccw: { type: 'derotation', direction: 'anticlockwise' } };
export const V4_FORCE_TO_TOOL = { 'translation-left': 'translate_left', 'translation-right': 'translate_right', compression: 'compression', distraction: 'distraction', 'derotation-clockwise': 'derotate_cw', 'derotation-anticlockwise': 'derotate_ccw' };

export const ZONE_TO_SIDE = { left: 'left', right: 'right', mid: 'midline', disc: 'midline', force_left: 'left', force_right: 'right' };

export const BONEGRAFT_TO_V4 = { 'Local Bone': 'local-bone', 'Autograft': 'iliac-crest-autograft', 'Allograft': 'allograft', 'Synthetics': 'synthetic', 'DBM': 'DBM', 'BMP': 'BMP' };
export const V4_BONEGRAFT_TO_TOOL = Object.fromEntries(Object.entries(BONEGRAFT_TO_V4).map(([k, v]) => [v, k]));

// --- Initial state ---

export function createInitialState() {
    return {
        documentId: crypto.randomUUID(),
        documentCreated: new Date().toISOString(),
        patientData: {
            name: '', id: '', surgeon: '', location: '',
            date: new Date().toISOString().split('T')[0],
            company: '', screwSystem: '',
            leftRod: '', rightRod: '', planLeftRod: '', planRightRod: '',
            boneGraft: { types: [], notes: '' },
        },
        plannedPlacements: [],
        completedPlacements: [],
        plannedCages: [],
        completedCages: [],
        plannedConnectors: [],
        completedConnectors: [],
        plannedNotes: [],
        completedNotes: [],
        reconLabelPositions: {},
    };
}
```

- [ ] **Step 2: Verify the file imports correctly**

Run: `npx vite build 2>&1 | head -5`
Expected: No import errors (the file is created but not yet imported by anything — just checking syntax)

- [ ] **Step 3: Commit**

```bash
git add src/state/documentReducer.js
git commit -m "refactor: add documentReducer.js with initial state and v4 mapping tables"
```

---

### Task 2: Add reducer function to documentReducer.js

**Files:**
- Modify: `src/state/documentReducer.js`

- [ ] **Step 1: Add the reducer function with all actions**

Append to `src/state/documentReducer.js`:

```js
// --- Helper: get the plan or construct array key ---

function chartKey(chart, arrayName) {
    // chart is 'plan' or 'construct'
    // arrayName is 'Placements', 'Cages', 'Connectors', 'Notes'
    return chart === 'plan' ? `planned${arrayName}` : `completed${arrayName}`;
}

// --- Reducer ---

export function documentReducer(state, action) {
    switch (action.type) {

        // --- Placement CRUD ---

        case 'ADD_PLACEMENT': {
            const key = chartKey(action.chart, 'Placements');
            const arr = state[key];
            const p = action.placement;
            // One implant per left/right zone
            if ((p.zone === 'left' || p.zone === 'right') && arr.some(x => x.levelId === p.levelId && x.zone === p.zone)) {
                return state;
            }
            return { ...state, [key]: [...arr, p] };
        }

        case 'UPDATE_PLACEMENT': {
            const key = chartKey(action.chart, 'Placements');
            return {
                ...state,
                [key]: state[key].map(p =>
                    p.id === action.id
                        ? { ...p, tool: action.tool, data: action.data, annotation: action.annotation !== undefined ? action.annotation : (p.annotation || '') }
                        : p
                ),
            };
        }

        case 'REMOVE_PLACEMENT': {
            const key = chartKey(action.chart, 'Placements');
            return { ...state, [key]: state[key].filter(p => p.id !== action.id) };
        }

        // --- Cage CRUD ---

        case 'SET_CAGE': {
            const key = chartKey(action.chart, 'Cages');
            const filtered = state[key].filter(c => c.levelId !== action.cage.levelId);
            return { ...state, [key]: [...filtered, action.cage] };
        }

        case 'REMOVE_CAGE': {
            const key = chartKey(action.chart, 'Cages');
            return { ...state, [key]: state[key].filter(c => c.levelId !== action.levelId) };
        }

        // --- Connector CRUD ---

        case 'ADD_CONNECTOR': {
            const key = chartKey(action.chart, 'Connectors');
            return { ...state, [key]: [...state[key], action.connector] };
        }

        case 'UPDATE_CONNECTOR': {
            const key = chartKey(action.chart, 'Connectors');
            return {
                ...state,
                [key]: state[key].map(c =>
                    c.id === action.id ? { ...c, levelId: action.levelId, fraction: action.fraction } : c
                ),
            };
        }

        case 'REMOVE_CONNECTOR': {
            const key = chartKey(action.chart, 'Connectors');
            return { ...state, [key]: state[key].filter(c => c.id !== action.id) };
        }

        // --- Note CRUD ---

        case 'ADD_NOTE': {
            const key = chartKey(action.chart, 'Notes');
            return { ...state, [key]: [...state[key], action.note] };
        }

        case 'UPDATE_NOTE': {
            const key = chartKey(action.chart, 'Notes');
            return {
                ...state,
                [key]: state[key].map(n =>
                    n.id === action.id ? { ...n, text: action.text, showArrow: action.showArrow } : n
                ),
            };
        }

        case 'UPDATE_NOTE_POSITION': {
            const key = chartKey(action.chart, 'Notes');
            return {
                ...state,
                [key]: state[key].map(n =>
                    n.id === action.id ? { ...n, offsetX: action.offsetX, offsetY: action.offsetY } : n
                ),
            };
        }

        case 'REMOVE_NOTE': {
            const key = chartKey(action.chart, 'Notes');
            return { ...state, [key]: state[key].filter(n => n.id !== action.id) };
        }

        // --- Patient data ---

        case 'SET_PATIENT_FIELD': {
            return { ...state, patientData: { ...state.patientData, [action.field]: action.value } };
        }

        case 'SET_BONE_GRAFT': {
            return {
                ...state,
                patientData: {
                    ...state.patientData,
                    boneGraft: { types: action.types, notes: action.notes },
                },
            };
        }

        case 'SET_RECON_LABEL_POSITION': {
            return {
                ...state,
                reconLabelPositions: {
                    ...state.reconLabelPositions,
                    [action.id]: { offsetX: action.offsetX, offsetY: action.offsetY },
                },
            };
        }

        // --- Bulk operations ---

        case 'NEW_PATIENT': {
            return createInitialState();
        }

        case 'COPY_PLAN_TO_CONSTRUCT': {
            const FIXATION_IDS = ['band', 'wire', 'cable'];

            const newPlacements = state.plannedPlacements.filter(p =>
                !p.zone.startsWith('force') &&
                !state.completedPlacements.some(cp => cp.levelId === p.levelId && cp.zone === p.zone)
            ).map(p => {
                let data = p.data;
                if (FIXATION_IDS.includes(p.tool)) data = null;
                if (p.tool === 'osteotomy' && typeof p.data === 'object') data = { ...p.data, angle: null, reconstructionCage: '' };
                return { ...p, id: action.genId(), annotation: '', data };
            });

            // Cage IDs not regenerated — matches existing App.jsx behaviour (line 1018)
            const newCages = state.plannedCages.filter(pc =>
                !state.completedCages.some(cc => cc.levelId === pc.levelId)
            ).map(c => ({ ...c }));

            const newConnectors = state.plannedConnectors.filter(pc =>
                !state.completedConnectors.some(cc => cc.levelId === pc.levelId)
            ).map(c => ({ ...c, id: action.genId() }));

            // Notes: don't copy (notes are plan-only annotations), but kept for consistency
            // with current behaviour which does filter them
            const newNotes = state.plannedNotes.filter(pn =>
                !state.completedNotes.some(cn => cn.levelId === pn.levelId)
            );

            if (newPlacements.length === 0 && newConnectors.length === 0 && newNotes.length === 0 && newCages.length === 0) {
                return state; // No changes — caller checks for this
            }

            return {
                ...state,
                completedPlacements: [...state.completedPlacements, ...newPlacements],
                completedCages: [...state.completedCages, ...newCages],
                completedConnectors: [...state.completedConnectors, ...newConnectors],
            };
        }

        case 'CLEAR_CONSTRUCT': {
            return {
                ...state,
                completedPlacements: [],
                completedCages: [],
                completedConnectors: [],
                completedNotes: [],
            };
        }

        case 'LOAD_DOCUMENT': {
            return { ...action.document };
        }

        default:
            return state;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/documentReducer.js
git commit -m "refactor: add documentReducer with all CRUD and bulk actions"
```

---

### Task 3: Add serialization and deserialization to documentReducer.js

**Files:**
- Modify: `src/state/documentReducer.js`

- [ ] **Step 1: Add internalToV4Chart function**

Append to `src/state/documentReducer.js`. This is a direct lift from `App.jsx:218-287`, with the unused 6th parameter removed:

```js
// --- Serialization helpers ---

export function internalToV4Chart(placements, cages, connectors, notes, rodText) {
    const elements = [];
    const forces = [];
    (placements || []).forEach(p => {
        const fv4 = FORCE_TO_V4[p.tool];
        if (fv4) {
            forces.push({ id: p.id, type: fv4.type, direction: fv4.direction || undefined, level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'left' });
            return;
        }
        if (p.tool === 'unstable') return;
        const screwTypes = ['monoaxial', 'polyaxial', 'uniplanar'];
        const hookTypes = Object.keys(TOOL_TO_V4_HOOK);
        const fixTypes = Object.keys(TOOL_TO_V4_FIXATION);
        if (screwTypes.includes(p.tool)) {
            const el = { id: p.id, type: 'screw', level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'left' };
            const screw = { headType: p.tool };
            if (typeof p.data === 'string' && p.data.includes('x')) {
                const parts = p.data.split('x').map(Number);
                if (!isNaN(parts[0])) screw.diameter = parts[0];
                if (!isNaN(parts[1])) screw.length = parts[1];
            }
            el.screw = screw;
            if (p.annotation) el.annotation = p.annotation;
            elements.push(el);
        } else if (hookTypes.includes(p.tool)) {
            const el = { id: p.id, type: 'hook', level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'left', hook: { hookType: TOOL_TO_V4_HOOK[p.tool] } };
            if (p.annotation) el.annotation = p.annotation;
            elements.push(el);
        } else if (fixTypes.includes(p.tool)) {
            const el = { id: p.id, type: 'fixation', level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'left', fixation: { fixationType: TOOL_TO_V4_FIXATION[p.tool] } };
            if (p.data) el.fixation.description = p.data;
            if (p.annotation) el.annotation = p.annotation;
            elements.push(el);
        } else if (p.tool === 'osteotomy' && typeof p.data === 'object') {
            const ov4 = OSTEO_TO_V4[p.data.type] || { t: p.data.type, g: null };
            const el = { id: p.id, type: 'osteotomy', level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'midline' };
            el.osteotomy = { osteotomyType: ov4.t };
            if (ov4.g) el.osteotomy.schwabGrade = ov4.g;
            if (p.data.angle != null && p.data.angle !== '') el.osteotomy.correctionAngle = Number(p.data.angle);
            if (p.data.reconstructionCage) el.osteotomy.reconstructionCage = p.data.reconstructionCage;
            elements.push(el);
        }
    });
    (cages || []).forEach(c => {
        const el = { id: c.id, type: 'cage', level: c.levelId, side: c.data?.side || 'bilateral' };
        el.cage = { approach: c.tool.toUpperCase() };
        if (c.data) {
            if (c.data.height) el.cage.height = Number(c.data.height);
            if (c.data.width) el.cage.width = Number(c.data.width);
            if (c.data.length) el.cage.length = Number(c.data.length);
            if (c.data.lordosis) el.cage.lordosis = Number(c.data.lordosis);
        }
        elements.push(el);
    });
    (connectors || []).forEach(cn => {
        elements.push({ id: cn.id, type: 'connector', level: cn.levelId, side: 'midline', connector: { connectorType: 'crosslink', fraction: cn.fraction } });
    });
    const rods = [];
    if (rodText?.left) rods.push({ id: 'rod-left', side: 'left', freeText: rodText.left });
    if (rodText?.right) rods.push({ id: 'rod-right', side: 'right', freeText: rodText.right });
    const v4Notes = (notes || []).map(n => ({ id: n.id, level: n.levelId, text: n.text, showArrow: n.showArrow || false }));
    const notePositions = {};
    (notes || []).forEach(n => { if (n.offsetX !== undefined) notePositions[n.id] = { offsetX: n.offsetX, offsetY: n.offsetY }; });
    return { elements, forces, rods, notes: v4Notes, notePositions };
}
```

- [ ] **Step 2: Add v4ChartToInternal function**

Append to `src/state/documentReducer.js`. Direct lift from `App.jsx:290-331`:

```js
export function v4ChartToInternal(chartData, notePositions) {
    const placements = [], cages = [], connectors = [], notes = [];
    (chartData.elements || []).forEach(el => {
        if (el.type === 'screw') {
            const sizeStr = (el.screw?.diameter && el.screw?.length) ? `${el.screw.diameter}x${el.screw.length}` : null;
            const zone = el.side === 'right' ? 'right' : 'left';
            placements.push({ id: el.id, levelId: el.level, zone, tool: el.screw?.headType || 'polyaxial', data: sizeStr, annotation: el.annotation || '' });
        } else if (el.type === 'hook') {
            const tool = V4_HOOK_TO_TOOL[el.hook?.hookType] || 'pedicle_hook';
            const zone = el.side === 'right' ? 'right' : 'left';
            placements.push({ id: el.id, levelId: el.level, zone, tool, data: null, annotation: el.annotation || '' });
        } else if (el.type === 'fixation') {
            const tool = V4_FIXATION_TO_TOOL[el.fixation?.fixationType] || 'band';
            const zone = el.side === 'right' ? 'right' : 'left';
            placements.push({ id: el.id, levelId: el.level, zone, tool, data: el.fixation?.description || null, annotation: el.annotation || '' });
        } else if (el.type === 'osteotomy') {
            const v3Type = V4_OSTEO_TO_TOOL[el.osteotomy?.osteotomyType] || el.osteotomy?.osteotomyType || 'PSO';
            const isDisc = ['facetectomy', 'ponte'].includes(el.osteotomy?.osteotomyType);
            placements.push({ id: el.id, levelId: el.level, zone: isDisc ? 'disc' : 'mid', tool: 'osteotomy', data: { type: v3Type, shortLabel: el.osteotomy?.osteotomyType === 'facetectomy' ? 'Facet' : (v3Type.length <= 6 ? v3Type : v3Type.substring(0, 3).toUpperCase()), angle: el.osteotomy?.correctionAngle ?? null, reconstructionCage: el.osteotomy?.reconstructionCage || '' }, annotation: '' });
        } else if (el.type === 'cage') {
            cages.push({ id: el.id, levelId: el.level, tool: (el.cage?.approach || 'TLIF').toLowerCase(), data: { height: String(el.cage?.height || ''), lordosis: String(el.cage?.lordosis || ''), side: el.side || 'bilateral', width: el.cage?.width ? String(el.cage.width) : undefined, length: el.cage?.length ? String(el.cage.length) : undefined } });
        } else if (el.type === 'connector') {
            connectors.push({ id: el.id, levelId: el.level, fraction: el.connector?.fraction || 0.5, tool: 'connector' });
        }
    });
    (chartData.forces || []).forEach(f => {
        const key = f.direction ? `${f.type}-${f.direction}` : f.type;
        const tool = V4_FORCE_TO_TOOL[key] || 'compression';
        const zone = f.side === 'right' ? 'force_right' : 'force_left';
        placements.push({ id: f.id, levelId: f.level, zone, tool, data: null, annotation: '' });
    });
    (chartData.notes || []).forEach(n => {
        const pos = notePositions?.[n.id] || { offsetX: -140, offsetY: 0 };
        notes.push({ id: n.id, tool: 'note', levelId: n.level, text: n.text, offsetX: pos.offsetX, offsetY: pos.offsetY, showArrow: n.showArrow || false });
    });
    const rodLeft = (chartData.rods || []).find(r => r.side === 'left');
    const rodRight = (chartData.rods || []).find(r => r.side === 'right');
    return { placements, cages, connectors, notes, rodLeft: rodLeft?.freeText || '', rodRight: rodRight?.freeText || '' };
}
```

- [ ] **Step 3: Add serializeState, deserializeDocument, and migrateConnectors**

Append to `src/state/documentReducer.js`:

```js
// --- Serialize ---

export function serializeState(state, viewMode, colourScheme, currentVersion, currentLang) {
    const planChart = internalToV4Chart(
        state.plannedPlacements, state.plannedCages, state.plannedConnectors, state.plannedNotes,
        { left: state.patientData.planLeftRod, right: state.patientData.planRightRod }
    );
    const constChart = internalToV4Chart(
        state.completedPlacements, state.completedCages, state.completedConnectors, state.completedNotes,
        { left: state.patientData.leftRod, right: state.patientData.rightRod }
    );
    return {
        schema: {
            format: 'spinal-instrumentation', version: 4,
            schemaUrl: 'https://spine-planner.org/schema/v4/spinal-instrumentation.json',
            generator: { name: 'Spinal Instrumentation Plan & Record', version: currentVersion, url: 'https://plan.skeletalsurgery.com/spine' },
        },
        document: { id: state.documentId, created: state.documentCreated, modified: new Date().toISOString(), language: currentLang },
        patient: { name: state.patientData.name, identifier: state.patientData.id },
        case: { date: state.patientData.date, surgeon: state.patientData.surgeon, location: state.patientData.location || '' },
        implantSystem: { manufacturer: state.patientData.company, system: state.patientData.screwSystem },
        plan: {
            elements: planChart.elements, rods: planChart.rods, forces: planChart.forces,
            boneGraft: { types: (state.patientData.boneGraft?.types || []).map(t => BONEGRAFT_TO_V4[t] || t), notes: state.patientData.boneGraft?.notes || '' },
            notes: planChart.notes,
        },
        construct: {
            elements: constChart.elements, rods: constChart.rods, forces: constChart.forces,
            boneGraft: { types: [], notes: '' },
            notes: constChart.notes,
        },
        ui: { colourScheme, viewMode, notePositions: { ...planChart.notePositions, ...constChart.notePositions, ...state.reconLabelPositions } },
    };
}

// --- Deserialize ---

export function migrateConnectors(conns) {
    if (!conns) return conns;
    return conns.map(c => {
        if (c.levelId) return c;
        if (c.yNorm === undefined) return c;
        const anatomicalY = (c.yNorm / 1000) * WHOLE_SPINE_MAP.totalHeight;
        const entry = WHOLE_SPINE_MAP.map.find(e => anatomicalY >= e.startY && anatomicalY < e.endY) || WHOLE_SPINE_MAP.map[WHOLE_SPINE_MAP.map.length - 1];
        const segLen = entry.vertEnd - entry.startY;
        const fraction = segLen > 0 ? Math.max(0, Math.min(1, (anatomicalY - entry.startY) / segLen)) : 0.5;
        return { id: c.id, levelId: entry.levelId, fraction, tool: 'connector' };
    });
}

export function deserializeDocument(json) {
    const state = createInitialState();

    // v4 format
    if (json.schema?.version === 4) {
        if (json.document?.id) state.documentId = json.document.id;
        if (json.document?.created) state.documentCreated = json.document.created;

        const pd = {
            name: json.patient?.name || '', id: json.patient?.identifier || '',
            surgeon: json.case?.surgeon || '', location: json.case?.location || '',
            date: json.case?.date || new Date().toISOString().split('T')[0],
            company: json.implantSystem?.manufacturer || '', screwSystem: json.implantSystem?.system || '',
            leftRod: '', rightRod: '', planLeftRod: '', planRightRod: '',
            boneGraft: { types: (json.plan?.boneGraft?.types || []).map(t => V4_BONEGRAFT_TO_TOOL[t] || t), notes: json.plan?.boneGraft?.notes || '' },
        };

        const notePos = json.ui?.notePositions || {};

        if (json.plan) {
            const p = v4ChartToInternal(json.plan, notePos);
            state.plannedPlacements = p.placements;
            state.plannedCages = p.cages;
            state.plannedConnectors = p.connectors;
            state.plannedNotes = p.notes;
            pd.planLeftRod = p.rodLeft;
            pd.planRightRod = p.rodRight;
        }
        if (json.construct) {
            const c = v4ChartToInternal(json.construct, notePos);
            state.completedPlacements = c.placements;
            state.completedCages = c.cages;
            state.completedConnectors = c.connectors;
            state.completedNotes = c.notes;
            pd.leftRod = c.rodLeft;
            pd.rightRod = c.rodRight;
        }
        state.patientData = pd;

        // Restore recon label positions
        const reconPos = {};
        Object.entries(notePos).forEach(([k, v]) => { if (k.startsWith('recon-')) reconPos[k] = v; });
        if (Object.keys(reconPos).length > 0) state.reconLabelPositions = reconPos;

        // Return state + UI preferences (caller applies these separately)
        return { state, viewMode: json.ui?.viewMode, colourScheme: json.ui?.colourScheme };
    }

    // v3 / v2 legacy format
    if (json.patient) state.patientData = json.patient;
    if (json.plan) {
        if (json.plan.implants) state.plannedPlacements = json.plan.implants;
        if (json.plan.cages) state.plannedCages = json.plan.cages;
        if (json.plan.connectors) state.plannedConnectors = migrateConnectors(json.plan.connectors);
        if (json.plan.notes) state.plannedNotes = json.plan.notes;
    }
    if (json.construct) {
        if (json.construct.implants) state.completedPlacements = json.construct.implants;
        if (json.construct.cages) state.completedCages = json.construct.cages;
        if (json.construct.connectors) state.completedConnectors = migrateConnectors(json.construct.connectors);
        if (json.construct.notes) state.completedNotes = json.construct.notes;
    }

    return { state, viewMode: json.preferences?.viewMode, colourScheme: json.preferences?.colourScheme };
}
```

Note: `deserializeDocument` returns `{ state, viewMode, colourScheme }` — the caller (useDocumentState) dispatches `LOAD_DOCUMENT` with the state, and applies viewMode/colourScheme separately since those are App.jsx useState.

- [ ] **Step 4: Commit**

```bash
git add src/state/documentReducer.js
git commit -m "refactor: add serialization, deserialization, and migration to documentReducer"
```

---

### Task 4: Create useDocumentState hook

**Files:**
- Create: `src/hooks/useDocumentState.js`

- [ ] **Step 1: Write the hook**

```js
// src/hooks/useDocumentState.js
import { useReducer, useState, useRef, useEffect, useCallback } from 'react';
import { documentReducer, createInitialState, serializeState, deserializeDocument } from '../state/documentReducer';
import { CURRENT_VERSION } from '../data/changelog';
import { acceptDisclaimer } from '../components/modals/DisclaimerModal';

export function useDocumentState({ viewMode, colourScheme, changeTheme, changeLang, incognitoMode, currentLang, setViewMode, showToast }) {
    const [state, dispatch] = useReducer(documentReducer, undefined, createInitialState);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [syncConnected, setSyncConnected] = useState(false);

    const receivingSync = useRef(false);
    const syncChannelRef = useRef(null);
    const syncTimerRef = useRef(null);
    const lastPongRef = useRef(0);
    const syncVersionRef = useRef(0);
    const syncVersionMismatchRef = useRef(false);

    // Stable refs for values needed in sync callbacks
    const stateRef = useRef(state);
    stateRef.current = state;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const colourSchemeRef = useRef(colourScheme);
    colourSchemeRef.current = colourScheme;
    const currentLangRef = useRef(currentLang);
    currentLangRef.current = currentLang;
    const changeLangRef = useRef(changeLang);
    changeLangRef.current = changeLang;

    const serialize = useCallback(() => {
        return serializeState(stateRef.current, viewModeRef.current, colourSchemeRef.current, CURRENT_VERSION, currentLangRef.current);
    }, []);

    // AUTO-LOAD from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('spine_planner_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.schema?.version === 4 || parsed.formatVersion >= 2) {
                    const result = deserializeDocument(parsed);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } catch (e) { console.error('Data load error'); }
        }
        setHasLoaded(true);
    }, []);

    // AUTO-SAVE to localStorage when state changes
    useEffect(() => {
        if (hasLoaded && !incognitoMode) {
            localStorage.setItem('spine_planner_v2', JSON.stringify(
                serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang)
            ));
        }
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');

        // Broadcast to other windows (skip if this update came from sync)
        if (receivingSync.current) {
            receivingSync.current = false;
            return;
        }
        if (hasLoaded && syncChannelRef.current) {
            syncVersionRef.current++;
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(() => {
                if (syncChannelRef.current) {
                    syncChannelRef.current.postMessage({
                        type: 'state', appVersion: CURRENT_VERSION,
                        payload: serializeState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang),
                        version: syncVersionRef.current,
                    });
                }
            }, 200);
        }
    }, [state, viewMode, colourScheme, hasLoaded, incognitoMode]);

    // BROADCAST CHANNEL SYNC
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch = new BroadcastChannel('spine-planner-sync');
        syncChannelRef.current = ch;

        ch.onmessage = (e) => {
            const msg = e.data;
            if (!msg.appVersion) return;
            if (msg.appVersion !== CURRENT_VERSION) {
                if (!syncVersionMismatchRef.current) {
                    syncVersionMismatchRef.current = true;
                    showToast?.(`Another window is running ${msg.appVersion} — please reload all windows to sync.`, 'error');
                }
                return;
            }
            if (msg.type === 'ping') {
                ch.postMessage({ type: 'pong', appVersion: CURRENT_VERSION, payload: serialize() });
            } else if (msg.type === 'pong') {
                lastPongRef.current = Date.now();
                setSyncConnected(true);
                if (msg.payload) {
                    clearTimeout(syncTimerRef.current);
                    receivingSync.current = true;
                    const result = deserializeDocument(msg.payload);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } else if (msg.type === 'state') {
                if (msg.payload) {
                    clearTimeout(syncTimerRef.current);
                    receivingSync.current = true;
                    const result = deserializeDocument(msg.payload);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                }
            } else if (msg.type === 'lang_accepted') {
                if (msg.lang) {
                    acceptDisclaimer(msg.lang);
                    changeLangRef.current(msg.lang);
                }
            }
        };

        ch.postMessage({ type: 'ping', appVersion: CURRENT_VERSION });

        const heartbeat = setInterval(() => {
            ch.postMessage({ type: 'ping', appVersion: CURRENT_VERSION });
            if (lastPongRef.current > 0 && Date.now() - lastPongRef.current > 10000) {
                setSyncConnected(false);
                lastPongRef.current = 0;
            }
        }, 5000);

        const handleUnload = () => ch.postMessage({ type: 'bye' });
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleUnload);
            ch.postMessage({ type: 'bye' });
            ch.close();
            syncChannelRef.current = null;
        };
    }, [hasLoaded]);

    return { state, dispatch, serialize, syncChannelRef, syncConnected, hasLoaded };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDocumentState.js
git commit -m "refactor: add useDocumentState hook with auto-save and BroadcastChannel sync"
```

---

### Task 5: Wire App.jsx to useDocumentState — state and simple references

This is the largest task. It modifies App.jsx to use the new hook. Do it in two sub-tasks: first replace state declarations and update references, then update handler functions.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace state declarations with useDocumentState**

At the top of `App.jsx`, after existing imports, add:

```js
import { useDocumentState } from './hooks/useDocumentState';
import { serializeState as serializeDocState, deserializeDocument } from './state/documentReducer';
```

Replace the 12 document-related `useState` calls (lines 40-49, 69, 99) and the sync-related state/refs (lines 74-84) with a single hook call. Keep all transient UI `useState` calls unchanged.

Remove these lines:
- `const [plannedPlacements, setPlannedPlacements] = useState([]);` (line 40)
- `const [completedPlacements, setCompletedPlacements] = useState([]);` (line 41)
- `const [plannedCages, setPlannedCages] = useState([]);` (line 42)
- `const [completedCages, setCompletedCages] = useState([]);` (line 43)
- `const [plannedConnectors, setPlannedConnectors] = useState([]);` (line 44)
- `const [completedConnectors, setCompletedConnectors] = useState([]);` (line 45)
- `const [plannedNotes, setPlannedNotes] = useState([]);` (line 46)
- `const [completedNotes, setCompletedNotes] = useState([]);` (line 47)
- `const [documentId, setDocumentId] = useState(...)` (line 48)
- `const [documentCreated, setDocumentCreated] = useState(...)` (line 49)
- `const [patientData, setPatientData] = useState(...)` (line 69)
- `const [reconLabelPositions, setReconLabelPositions] = useState({})` (line 99)
- `const [hasLoaded, setHasLoaded] = useState(false)` (line 74)
- `const [syncConnected, setSyncConnected] = useState(false)` (line 75)
- All sync refs: `receivingSync`, `syncChannelRef`, `syncTimerRef`, `lastPongRef`, `syncVersionRef`, `syncVersionMismatchRef`, `serializeRef`, `deserializeRef`, `changeLangRef` (lines 76-84)

Add after the `changeTheme` function:

```js
const { state, dispatch, serialize, syncChannelRef, syncConnected, hasLoaded } = useDocumentState({
    viewMode, colourScheme, changeTheme, changeLang, incognitoMode, currentLang, setViewMode, showToast,
});
```

Note: `showToast` is defined after the hook call currently (line 114). Move the toast `useState` and `showToast`/`dismissToast` definitions above the `useDocumentState` call so the reference is available.

- [ ] **Step 2: Add convenience destructuring for state fields**

Immediately after the hook call, add:

```js
const {
    patientData, plannedPlacements, completedPlacements,
    plannedCages, completedCages, plannedConnectors, completedConnectors,
    plannedNotes, completedNotes, reconLabelPositions,
} = state;
```

This means all existing JSX references like `plannedPlacements` continue to work without changing every template expression. The variables are now read from `state` instead of individual `useState` calls.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: wire App.jsx to useDocumentState hook — state declarations"
```

---

### Task 6: Wire App.jsx to useDocumentState — update handler functions

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update patient data handlers**

Replace all `setPatientData({...patientData, field: value})` calls in JSX with dispatch calls. Create a helper at the top of the component:

```js
const setPatientField = (field, value) => dispatch({ type: 'SET_PATIENT_FIELD', field, value });
```

Then in JSX, e.g. change:
```jsx
onBlur={e => setPatientData({...patientData, name: e.target.innerText})}
```
to:
```jsx
onBlur={e => setPatientField('name', e.target.innerText)}
```

For bone graft updates, change:
```jsx
setPatientData({...patientData, boneGraft: { ...patientData.boneGraft, types: newTypes }})
```
to:
```jsx
dispatch({ type: 'SET_BONE_GRAFT', types: newTypes, notes: patientData.boneGraft?.notes || '' })
```

For compound updates like the company/theme combo (line 1050), dispatch two actions:
```jsx
onChange={e => {
    const v = e.target.value;
    setPatientField('company', v);
    if (AUTO_THEME_FROM_COMPANY && COMPANY_THEME_MAP[v]) changeTheme(COMPANY_THEME_MAP[v]);
}}
```

- [ ] **Step 2: Update placement handlers**

Replace `addPlacement`:
```js
const addPlacement = (levelId, zone, tool, data, annotation) => {
    dispatch({
        type: 'ADD_PLACEMENT',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        placement: { id: genId(), levelId, zone, tool, data, annotation: annotation || '' },
    });
};
```

Replace `updatePlacement`:
```js
const updatePlacement = (id, tool, data, annotation) => {
    dispatch({
        type: 'UPDATE_PLACEMENT',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        id, tool, data, annotation,
    });
};
```

Replace `removePlacement`:
```js
const removePlacement = (id) => {
    dispatch({
        type: 'REMOVE_PLACEMENT',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        id,
    });
    setScrewModalOpen(false);
    setOsteoModalOpen(false);
};
```

- [ ] **Step 3: Update cage handlers**

Replace `handleCageConfirm` — change the setter logic to:
```js
dispatch({
    type: 'SET_CAGE',
    chart: activeChart === 'planned' ? 'plan' : 'construct',
    cage: { levelId: editingCageLevel, tool: data.type, data: { height: data.height, width: data.width, length: data.length, lordosis: data.lordosis, side: data.side } },
});
```

Replace `handleDeleteCage`:
```js
const handleDeleteCage = () => {
    dispatch({ type: 'REMOVE_CAGE', chart: activeChart === 'planned' ? 'plan' : 'construct', levelId: editingCageLevel });
    setCageModalOpen(false);
};
```

- [ ] **Step 4: Update connector handlers**

```js
const addConnector = (levelId) => {
    dispatch({
        type: 'ADD_CONNECTOR',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        connector: { id: genId(), levelId, fraction: 0.5, tool: 'connector' },
    });
};
const updateConnector = (connId, { levelId, fraction }) => {
    dispatch({
        type: 'UPDATE_CONNECTOR',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        id: connId, levelId, fraction,
    });
};
const removeConnector = (connId) => {
    dispatch({
        type: 'REMOVE_CONNECTOR',
        chart: activeChart === 'planned' ? 'plan' : 'construct',
        id: connId,
    });
};
```

- [ ] **Step 5: Update note handlers**

Replace `handleNoteConfirm`:
```js
const handleNoteConfirm = (text, showArrow) => {
    const chart = activeChart === 'planned' ? 'plan' : 'construct';
    if (editingNote) {
        const currentNotes = activeChart === 'planned' ? plannedNotes : completedNotes;
        const exists = currentNotes.some(n => n.id === editingNote.id);
        if (exists) {
            dispatch({ type: 'UPDATE_NOTE', chart, id: editingNote.id, text, showArrow });
        } else {
            dispatch({ type: 'ADD_NOTE', chart: 'construct', note: { id: genId(), tool: 'note', levelId: editingNote.levelId, text, offsetX: editingNote.offsetX, offsetY: editingNote.offsetY, showArrow } });
        }
        setEditingNote(null);
    } else if (pendingNoteTool) {
        dispatch({ type: 'ADD_NOTE', chart, note: { id: genId(), tool: pendingNoteTool.tool, levelId: pendingNoteTool.levelId, text, offsetX: pendingNoteTool.offsetX, offsetY: pendingNoteTool.offsetY, showArrow } });
        setPendingNoteTool(null);
    }
};
```

Replace `handleNoteDelete`:
```js
const handleNoteDelete = () => {
    if (editingNote) {
        dispatch({ type: 'REMOVE_NOTE', chart: activeChart === 'planned' ? 'plan' : 'construct', id: editingNote.id });
        setEditingNote(null);
        setNoteModalOpen(false);
    }
};
```

Replace `updateNotePosition`:
```js
const updateNotePosition = (noteId, { offsetX, offsetY }) => {
    dispatch({ type: 'UPDATE_NOTE_POSITION', chart: activeChart === 'planned' ? 'plan' : 'construct', id: noteId, offsetX, offsetY });
};
```

Replace `removeNote`:
```js
const removeNote = (noteId) => {
    dispatch({ type: 'REMOVE_NOTE', chart: activeChart === 'planned' ? 'plan' : 'construct', id: noteId });
};
```

Replace `updateReconLabelPosition`:
```js
const updateReconLabelPosition = (reconId, { offsetX, offsetY }) => {
    dispatch({ type: 'SET_RECON_LABEL_POSITION', id: reconId, offsetX, offsetY });
};
```

- [ ] **Step 6: Update ghost handlers**

Replace `handleGhostConnectorClick`:
```js
const handleGhostConnectorClick = (ghostConn) => {
    dispatch({ type: 'ADD_CONNECTOR', chart: 'construct', connector: { id: genId(), levelId: ghostConn.levelId, fraction: ghostConn.fraction, tool: 'connector' } });
};
```

- [ ] **Step 7: Update bulk operations**

Replace `copyPlanToCompleted`:
```js
const copyPlanToCompleted = () => {
    if (plannedPlacements.length === 0 && plannedConnectors.length === 0 && plannedNotes.length === 0 && plannedCages.length === 0) return showToast(t('alert.no_plan'));
    const prevState = state;
    dispatch({ type: 'COPY_PLAN_TO_CONSTRUCT', genId });
    // Check if anything actually changed (reducer returns same state if nothing to copy)
    // We can't check synchronously, so the toast for "all_confirmed" moves to the UI
    // by checking the arrays before dispatch
    const newPlacements = plannedPlacements.filter(p => !p.zone.startsWith('force') && !completedPlacements.some(cp => cp.levelId === p.levelId && cp.zone === p.zone));
    const newCages = plannedCages.filter(pc => !completedCages.some(cc => cc.levelId === pc.levelId));
    const newConnectors = plannedConnectors.filter(pc => !completedConnectors.some(cc => cc.levelId === pc.levelId));
    const newNotes = plannedNotes.filter(pn => !completedNotes.some(cn => cn.levelId === pn.levelId));
    if (newPlacements.length === 0 && newConnectors.length === 0 && newNotes.length === 0 && newCages.length === 0) {
        return showToast(t('alert.all_confirmed'));
    }
    setActiveChart('completed');
};
```

Replace `clearConstruct`:
```js
const clearConstruct = () => {
    if (completedPlacements.length === 0 && completedCages.length === 0 && completedConnectors.length === 0 && completedNotes.length === 0) return showToast(t('alert.construct_empty'));
    setConfirmClearConstruct(true);
};
const confirmClearConstructAction = () => {
    dispatch({ type: 'CLEAR_CONSTRUCT' });
    setConfirmClearConstruct(false);
    setActiveChart('planned');
    showToast(t('alert.construct_cleared'));
};
```

Replace `executeNewPatient`:
```js
const executeNewPatient = () => {
    setConfirmNewPatient(false);
    dispatch({ type: 'NEW_PATIENT' });
    setActiveChart('planned');
    // Broadcast empty state to synced windows
    if (syncChannelRef.current) {
        const emptyState = serializeDocState(state, viewMode, colourScheme, CURRENT_VERSION, currentLang);
        syncChannelRef.current.postMessage({ type: 'state', appVersion: CURRENT_VERSION, payload: emptyState });
    }
};
```

- [ ] **Step 8: Update save/load JSON handlers**

Replace `saveProjectJSON`:
```js
const saveProjectJSON = () => {
    const data = serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SpineProject_${patientData.name || 'Unnamed'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (incognitoMode) localStorage.removeItem('spine_planner_v2');
};
```

Replace `loadProjectJSON`:
```js
const loadProjectJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            if (json.schema?.version === 4 || json.formatVersion >= 2) {
                const result = deserializeDocument(json);
                dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                if (result.viewMode) setViewMode(result.viewMode);
                if (result.colourScheme) changeTheme(result.colourScheme);
                // Broadcast loaded state
                if (syncChannelRef.current) {
                    clearTimeout(syncTimerRef.current);
                    syncChannelRef.current.postMessage({ type: 'state', appVersion: CURRENT_VERSION, payload: json });
                }
            } else {
                showToast(t('alert.unsupported_format'), 'error');
                return;
            }
            showToast(t('alert.loaded'));
        } catch (err) { showToast(t('alert.invalid_file'), 'error'); }
    };
    reader.readAsText(file); e.target.value = null;
};
```

Note: `loadProjectJSON` still references `syncTimerRef` — this ref is now inside `useDocumentState`. Either expose it from the hook, or simplify: since the sync auto-save effect will fire on state change anyway, just remove the `clearTimeout` and direct broadcast. The auto-save effect handles it.

Simplified version:
```js
const loadProjectJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            if (json.schema?.version === 4 || json.formatVersion >= 2) {
                const result = deserializeDocument(json);
                dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                if (result.viewMode) setViewMode(result.viewMode);
                if (result.colourScheme) changeTheme(result.colourScheme);
            } else {
                showToast(t('alert.unsupported_format'), 'error');
                return;
            }
            showToast(t('alert.loaded'));
        } catch (err) { showToast(t('alert.invalid_file'), 'error'); }
    };
    reader.readAsText(file); e.target.value = null;
};
```

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: update all App.jsx handlers to use dispatch"
```

---

### Task 7: Delete moved code from App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Delete the following blocks from App.jsx**

Remove these sections that are now in documentReducer.js or useDocumentState.js:

1. V4 mapping tables (lines 203-215): `TOOL_TO_V4_HOOK` through `V4_BONEGRAFT_TO_TOOL`
2. `internalToV4Chart` function (lines 218-287)
3. `v4ChartToInternal` function (lines 290-331)
4. `serializeState` function (lines 333-346)
5. `migrateConnectors` function (lines 348-360)
6. `deserializeState` function (lines 362-412)
7. `serializeRef.current = ...` assignments (lines 413-415)
8. Auto-load effect (lines 417-433)
9. Auto-save + broadcast effect (lines 436-455)
10. BroadcastChannel sync effect (lines 458-527)

Also remove unused imports that were only needed by the deleted code:
- Remove `WHOLE_SPINE_MAP` from the anatomy import if no longer used in App.jsx

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes with no errors, produces `dist/index.html`

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: remove moved serialization, sync, and auto-save code from App.jsx"
```

---

### Task 8: Manual verification

No code changes — this is a testing checkpoint.

- [ ] **Step 1: Start dev server and test basic flow**

Run: `npm run dev`

Test in browser:
1. App loads, displays default empty state
2. Add a patient name, surgeon, date
3. Place screws (polyaxial, monoaxial) on left/right zones
4. Place a cage at a disc level
5. Add an osteotomy
6. Add a connector
7. Add a note
8. Switch to Construct tab
9. "Confirm Plan" copies plan to construct
10. "Clear Construct" empties construct
11. "New Patient" resets everything

- [ ] **Step 2: Test persistence**

1. Add some placements, reload the page — state should persist
2. Enable privacy mode, reload — state should be cleared
3. Save as JSON, New Patient, load the JSON — state should restore

- [ ] **Step 3: Test sync**

1. Open two browser windows on localhost:5173
2. Add a screw in window 1 — should appear in window 2
3. Load a JSON file in window 1 — window 2 should update
4. New Patient in window 1 — window 2 should clear

- [ ] **Step 4: Test export**

1. Export as JPG — check image renders correctly
2. Export as PDF — check PDF renders correctly
3. Test both Plan and Construct export options

- [ ] **Step 5: Test production build**

Run: `npm run build && open dist/index.html`
Verify: Single file loads from file://, all features work offline

---

### Task 9: Install Vitest and create test scaffold

**Files:**
- Modify: `package.json`
- Create: `src/state/__tests__/documentReducer.test.js`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add test script to package.json**

Add to the `"scripts"` section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create test file with initial test**

```js
// src/state/__tests__/documentReducer.test.js
import { describe, it, expect } from 'vitest';
import { createInitialState, documentReducer } from '../documentReducer';

describe('createInitialState', () => {
    it('returns a fresh state with empty arrays and default patient data', () => {
        const state = createInitialState();
        expect(state.plannedPlacements).toEqual([]);
        expect(state.completedPlacements).toEqual([]);
        expect(state.plannedCages).toEqual([]);
        expect(state.completedCages).toEqual([]);
        expect(state.plannedConnectors).toEqual([]);
        expect(state.completedConnectors).toEqual([]);
        expect(state.plannedNotes).toEqual([]);
        expect(state.completedNotes).toEqual([]);
        expect(state.reconLabelPositions).toEqual({});
        expect(state.patientData.name).toBe('');
        expect(state.patientData.boneGraft).toEqual({ types: [], notes: '' });
        expect(state.documentId).toBeTruthy();
        expect(state.documentCreated).toBeTruthy();
    });

    it('generates unique document IDs on each call', () => {
        const a = createInitialState();
        const b = createInitialState();
        expect(a.documentId).not.toBe(b.documentId);
    });
});
```

- [ ] **Step 4: Run test to verify setup works**

Run: `npx vitest run`
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/state/__tests__/documentReducer.test.js
git commit -m "test: add Vitest and initial documentReducer tests"
```

---

### Task 10: Test placement CRUD actions

**Files:**
- Modify: `src/state/__tests__/documentReducer.test.js`

- [ ] **Step 1: Add placement tests**

```js
describe('ADD_PLACEMENT', () => {
    it('adds a placement to the plan', () => {
        const state = createInitialState();
        const placement = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const next = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement });
        expect(next.plannedPlacements).toHaveLength(1);
        expect(next.plannedPlacements[0]).toEqual(placement);
    });

    it('adds a placement to the construct', () => {
        const state = createInitialState();
        const placement = { id: 'p1', levelId: 'T5', zone: 'right', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        const next = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'construct', placement });
        expect(next.completedPlacements).toHaveLength(1);
        expect(next.completedPlacements[0]).toEqual(placement);
    });

    it('enforces one implant per left/right zone — rejects duplicate', () => {
        const state = createInitialState();
        const p1 = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const p2 = { id: 'p2', levelId: 'T5', zone: 'left', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p1 });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p2 });
        expect(s2.plannedPlacements).toHaveLength(1);
        expect(s2).toBe(s1); // same reference — no change
    });

    it('allows same level different zones', () => {
        const state = createInitialState();
        const pL = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const pR = { id: 'p2', levelId: 'T5', zone: 'right', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pL });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: pR });
        expect(s2.plannedPlacements).toHaveLength(2);
    });

    it('allows multiple mid-zone placements at same level', () => {
        const state = createInitialState();
        const p1 = { id: 'p1', levelId: 'T5', zone: 'mid', tool: 'osteotomy', data: { type: 'PSO' }, annotation: '' };
        const p2 = { id: 'p2', levelId: 'T5', zone: 'mid', tool: 'unstable', data: null, annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p1 });
        const s2 = documentReducer(s1, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p2 });
        expect(s2.plannedPlacements).toHaveLength(2);
    });
});

describe('UPDATE_PLACEMENT', () => {
    it('updates tool, data, and annotation of an existing placement', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'p1', tool: 'monoaxial', data: '5.5x40', annotation: 'fenestrated' });
        expect(s2.plannedPlacements[0].tool).toBe('monoaxial');
        expect(s2.plannedPlacements[0].data).toBe('5.5x40');
        expect(s2.plannedPlacements[0].annotation).toBe('fenestrated');
    });

    it('preserves existing annotation when annotation is undefined', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'cortical' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'p1', tool: 'monoaxial', data: '5.5x40', annotation: undefined });
        expect(s2.plannedPlacements[0].annotation).toBe('cortical');
    });
});

describe('REMOVE_PLACEMENT', () => {
    it('removes a placement by id', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'REMOVE_PLACEMENT', chart: 'plan', id: 'p1' });
        expect(s2.plannedPlacements).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/state/__tests__/documentReducer.test.js
git commit -m "test: add placement CRUD tests for documentReducer"
```

---

### Task 11: Test cage, connector, note, and patient data actions

**Files:**
- Modify: `src/state/__tests__/documentReducer.test.js`

- [ ] **Step 1: Add remaining CRUD tests**

```js
describe('SET_CAGE / REMOVE_CAGE', () => {
    it('adds a cage', () => {
        const state = createInitialState();
        const cage = { levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const next = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage });
        expect(next.plannedCages).toHaveLength(1);
    });

    it('replaces existing cage at same level', () => {
        const state = createInitialState();
        const c1 = { levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const c2 = { levelId: 'L4', tool: 'plif', data: { height: '12', lordosis: '8', side: 'bilateral' } };
        const s1 = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage: c1 });
        const s2 = documentReducer(s1, { type: 'SET_CAGE', chart: 'plan', cage: c2 });
        expect(s2.plannedCages).toHaveLength(1);
        expect(s2.plannedCages[0].tool).toBe('plif');
    });

    it('removes a cage by level', () => {
        const state = createInitialState();
        const cage = { levelId: 'L4', tool: 'tlif', data: { height: '10' } };
        const s1 = documentReducer(state, { type: 'SET_CAGE', chart: 'plan', cage });
        const s2 = documentReducer(s1, { type: 'REMOVE_CAGE', chart: 'plan', levelId: 'L4' });
        expect(s2.plannedCages).toHaveLength(0);
    });
});

describe('Connector CRUD', () => {
    it('adds, updates, and removes a connector', () => {
        const state = createInitialState();
        const conn = { id: 'c1', levelId: 'T8', fraction: 0.5, tool: 'connector' };
        const s1 = documentReducer(state, { type: 'ADD_CONNECTOR', chart: 'plan', connector: conn });
        expect(s1.plannedConnectors).toHaveLength(1);

        const s2 = documentReducer(s1, { type: 'UPDATE_CONNECTOR', chart: 'plan', id: 'c1', levelId: 'T9', fraction: 0.3 });
        expect(s2.plannedConnectors[0].levelId).toBe('T9');
        expect(s2.plannedConnectors[0].fraction).toBe(0.3);

        const s3 = documentReducer(s2, { type: 'REMOVE_CONNECTOR', chart: 'plan', id: 'c1' });
        expect(s3.plannedConnectors).toHaveLength(0);
    });
});

describe('Note CRUD', () => {
    it('adds, updates text, updates position, and removes a note', () => {
        const state = createInitialState();
        const note = { id: 'n1', tool: 'note', levelId: 'T5', text: 'Check', offsetX: -140, offsetY: 0, showArrow: false };
        const s1 = documentReducer(state, { type: 'ADD_NOTE', chart: 'plan', note });
        expect(s1.plannedNotes).toHaveLength(1);

        const s2 = documentReducer(s1, { type: 'UPDATE_NOTE', chart: 'plan', id: 'n1', text: 'Updated', showArrow: true });
        expect(s2.plannedNotes[0].text).toBe('Updated');
        expect(s2.plannedNotes[0].showArrow).toBe(true);

        const s3 = documentReducer(s2, { type: 'UPDATE_NOTE_POSITION', chart: 'plan', id: 'n1', offsetX: -200, offsetY: 10 });
        expect(s3.plannedNotes[0].offsetX).toBe(-200);

        const s4 = documentReducer(s3, { type: 'REMOVE_NOTE', chart: 'plan', id: 'n1' });
        expect(s4.plannedNotes).toHaveLength(0);
    });
});

describe('Patient data', () => {
    it('SET_PATIENT_FIELD updates a single field', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'John' });
        expect(next.patientData.name).toBe('John');
        expect(next.patientData.surgeon).toBe(''); // unchanged
    });

    it('SET_BONE_GRAFT updates bone graft types and notes', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_BONE_GRAFT', types: ['Local Bone', 'BMP'], notes: 'Iliac crest' });
        expect(next.patientData.boneGraft.types).toEqual(['Local Bone', 'BMP']);
        expect(next.patientData.boneGraft.notes).toBe('Iliac crest');
    });

    it('SET_RECON_LABEL_POSITION stores label position', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'SET_RECON_LABEL_POSITION', id: 'recon-L3', offsetX: 50, offsetY: -20 });
        expect(next.reconLabelPositions['recon-L3']).toEqual({ offsetX: 50, offsetY: -20 });
    });
});

describe('Edge cases', () => {
    it('updating a non-existent placement returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'UPDATE_PLACEMENT', chart: 'plan', id: 'nonexistent', tool: 'polyaxial', data: '6.5x45', annotation: '' });
        expect(next.plannedPlacements).toEqual([]);
    });

    it('removing a non-existent placement returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'REMOVE_PLACEMENT', chart: 'plan', id: 'nonexistent' });
        expect(next.plannedPlacements).toEqual([]);
    });

    it('unknown action type returns unchanged state', () => {
        const state = createInitialState();
        const next = documentReducer(state, { type: 'NONSENSE' });
        expect(next).toBe(state);
    });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/state/__tests__/documentReducer.test.js
git commit -m "test: add cage, connector, note, and patient data tests"
```

---

### Task 12: Test bulk operations and serialization round-trip

**Files:**
- Modify: `src/state/__tests__/documentReducer.test.js`

- [ ] **Step 1: Add bulk operation tests**

```js
describe('NEW_PATIENT', () => {
    it('resets to fresh state with new document ID', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'John' });
        const s3 = documentReducer(s2, { type: 'NEW_PATIENT' });
        expect(s3.plannedPlacements).toEqual([]);
        expect(s3.patientData.name).toBe('');
        expect(s3.documentId).not.toBe(state.documentId);
    });
});

describe('CLEAR_CONSTRUCT', () => {
    it('empties all construct arrays', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'construct', placement: p });
        const s2 = documentReducer(s1, { type: 'CLEAR_CONSTRUCT' });
        expect(s2.completedPlacements).toEqual([]);
        expect(s2.completedCages).toEqual([]);
        expect(s2.completedConnectors).toEqual([]);
        expect(s2.completedNotes).toEqual([]);
    });

    it('does not affect plan arrays', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'CLEAR_CONSTRUCT' });
        expect(s2.plannedPlacements).toHaveLength(1);
    });
});

describe('COPY_PLAN_TO_CONSTRUCT', () => {
    let counter = 0;
    const mockGenId = () => `gen-${++counter}`;

    it('copies plan placements to construct, stripping annotations', () => {
        counter = 0;
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'fenestrated' };
        const s1 = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        const s2 = documentReducer(s1, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s2.completedPlacements).toHaveLength(1);
        expect(s2.completedPlacements[0].annotation).toBe('');
        expect(s2.completedPlacements[0].id).toBe('gen-1'); // new ID
    });

    it('excludes force placements', () => {
        counter = 0;
        const state = createInitialState();
        const screw = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const force = { id: 'f1', levelId: 'T5', zone: 'force_left', tool: 'compression', data: null, annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: screw });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'plan', placement: force });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements).toHaveLength(1);
        expect(s.completedPlacements[0].tool).toBe('polyaxial');
    });

    it('skips placements already in construct (deduplication by level+zone)', () => {
        counter = 0;
        const state = createInitialState();
        const planP = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: '' };
        const constP = { id: 'c1', levelId: 'T5', zone: 'left', tool: 'monoaxial', data: '5.5x40', annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: planP });
        s = documentReducer(s, { type: 'ADD_PLACEMENT', chart: 'construct', placement: constP });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements).toHaveLength(1);
        expect(s.completedPlacements[0].id).toBe('c1'); // original, not copied
    });

    it('returns same state when nothing to copy', () => {
        counter = 0;
        const state = createInitialState();
        const s = documentReducer(state, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s).toBe(state);
    });

    it('strips osteotomy angles and reconstruction cage text', () => {
        counter = 0;
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T10', zone: 'mid', tool: 'osteotomy', data: { type: 'PSO', angle: 30, reconstructionCage: 'mesh cage' }, annotation: '' };
        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        s = documentReducer(s, { type: 'COPY_PLAN_TO_CONSTRUCT', genId: mockGenId });
        expect(s.completedPlacements[0].data.angle).toBeNull();
        expect(s.completedPlacements[0].data.reconstructionCage).toBe('');
    });
});
```

- [ ] **Step 2: Add serialization round-trip test**

```js
import { serializeState, deserializeDocument } from '../documentReducer';

describe('Serialization round-trip', () => {
    it('serialize then deserialize produces equivalent state', () => {
        const state = createInitialState();
        const p = { id: 'p1', levelId: 'T5', zone: 'left', tool: 'polyaxial', data: '6.5x45', annotation: 'cortical' };
        const cage = { id: 'cage1', levelId: 'L4', tool: 'tlif', data: { height: '10', lordosis: '5', side: 'bilateral' } };
        const conn = { id: 'c1', levelId: 'T8', fraction: 0.5, tool: 'connector' };
        const note = { id: 'n1', tool: 'note', levelId: 'T5', text: 'Check pedicle', offsetX: -140, offsetY: 10, showArrow: true };

        let s = documentReducer(state, { type: 'ADD_PLACEMENT', chart: 'plan', placement: p });
        s = documentReducer(s, { type: 'SET_CAGE', chart: 'plan', cage });
        s = documentReducer(s, { type: 'ADD_CONNECTOR', chart: 'plan', connector: conn });
        s = documentReducer(s, { type: 'ADD_NOTE', chart: 'plan', note });
        s = documentReducer(s, { type: 'SET_PATIENT_FIELD', field: 'name', value: 'Test Patient' });
        s = documentReducer(s, { type: 'SET_PATIENT_FIELD', field: 'surgeon', value: 'Dr Smith' });

        const json = serializeState(s, 'thoracolumbar', 'default', '2.2.0', 'en');
        const result = deserializeDocument(json);

        expect(result.state.patientData.name).toBe('Test Patient');
        expect(result.state.patientData.surgeon).toBe('Dr Smith');
        expect(result.state.plannedPlacements).toHaveLength(1);
        expect(result.state.plannedPlacements[0].tool).toBe('polyaxial');
        expect(result.state.plannedPlacements[0].data).toBe('6.5x45');
        expect(result.state.plannedPlacements[0].annotation).toBe('cortical');
        expect(result.state.plannedCages).toHaveLength(1);
        expect(result.state.plannedConnectors).toHaveLength(1);
        expect(result.state.plannedNotes).toHaveLength(1);
        expect(result.state.plannedNotes[0].text).toBe('Check pedicle');
        expect(result.viewMode).toBe('thoracolumbar');
        expect(result.colourScheme).toBe('default');
    });

    it('empty state round-trips cleanly', () => {
        const state = createInitialState();
        const json = serializeState(state, 'whole', 'navy', '2.2.0', 'de');
        const result = deserializeDocument(json);
        expect(result.state.plannedPlacements).toEqual([]);
        expect(result.state.completedPlacements).toEqual([]);
        expect(result.viewMode).toBe('whole');
        expect(result.colourScheme).toBe('navy');
    });
});
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/state/__tests__/documentReducer.test.js
git commit -m "test: add bulk operation and serialization round-trip tests"
```

---

### Task 13: Final build verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: Build succeeds, `dist/index.html` produced (~1.9MB)

- [ ] **Step 3: Verify offline build works**

Run: `open dist/index.html`
Expected: App loads from `file://`, all features functional

- [ ] **Step 4: Final commit if any cleanup needed**

Only if there are loose ends from manual testing.
