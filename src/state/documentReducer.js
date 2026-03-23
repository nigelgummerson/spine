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
