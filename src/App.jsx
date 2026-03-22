import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { t, detectLanguage, getCurrentLang, setCurrentLang, SUPPORTED_LANGUAGES, LOCALE_MAP } from './i18n/i18n';
import { genId } from './utils/id';
import usePortrait from './hooks/usePortrait';
import { CURRENT_VERSION, CHANGE_LOG, formatDate } from './data/changelog';
import { BONE_GRAFT_OPTIONS, BONE_GRAFT_LABEL_KEYS, IMPLANT_COMPANIES, SCREW_SYSTEMS,
         DIAMETER_OPTIONS, LENGTH_OPTIONS } from './data/implants';
import { _light, _dark, COLOUR_SCHEMES, AUTO_THEME_FROM_COMPANY, COMPANY_THEME_MAP } from './data/themes';
import { CAGE_PERMISSIBILITY, HOOK_TYPES, NO_SIZE_TYPES, NOTE_PRESET_KEYS, CAGE_TYPES,
         APPROACH_GROUPS, getDiscLabel, FORCE_TYPES, INVENTORY_CATEGORIES } from './data/clinical';
import { REGIONS, VERTEBRA_ANATOMY, VERT_SVG_SCALE, VERT_PAD, getLevelHeight, getVertSvgGeometry,
         ALL_LEVELS, DISC_MIN_PX, getDiscHeight, buildHeightMap, WHOLE_SPINE_MAP,
         levelToYNorm, yNormToRenderedY, renderedYToYNorm, CHART_CONTENT_HEIGHT,
         calculateAutoScale } from './data/anatomy';
import { IconTrash, IconDownload, IconImage, IconCopy, IconUpload, IconSave,
         IconCC, IconX, IconPDF, IconHelp, IconLink, IconHistory, IconCardinal } from './components/icons';
import { ChangeLogModal } from './components/modals/ChangeLogModal';
import { HelpModal } from './components/modals/HelpModal';
import { ScrewModal } from './components/modals/ScrewModal';
import { CageModal } from './components/modals/CageModal';
import { OsteotomyModal } from './components/modals/OsteotomyModal';
import { ForceModal } from './components/modals/ForceModal';
import { NoteModal } from './components/modals/NoteModal';
import { ScrewSystemCombo } from './components/ScrewSystemCombo';
import { CreditsFooter } from './components/CreditsFooter';
import { ImplantInventory } from './components/ImplantInventory';
import { ChartPaper } from './components/chart/ChartPaper';
import { InstrumentIcon } from './components/chart/InstrumentIcon';
import { DisclaimerModal, isDisclaimerAccepted, acceptDisclaimer, getDisclaimerTimestamp } from './components/modals/DisclaimerModal';

const App = () => {
    const [selectedTool, setSelectedTool] = useState('implant');
    const [lastUsedScrewType, setLastUsedScrewType] = useState('polyaxial');
    const [activeChart, setActiveChart] = useState(() => {
        const savedTab = localStorage.getItem('spine_planner_tab');
        return savedTab === '2' ? 'completed' : 'planned';
    }); 
    const [plannedPlacements, setPlannedPlacements] = useState([]);
    const [completedPlacements, setCompletedPlacements] = useState([]);
    const [plannedCages, setPlannedCages] = useState([]);
    const [completedCages, setCompletedCages] = useState([]);
    const [plannedConnectors, setPlannedConnectors] = useState([]);
    const [completedConnectors, setCompletedConnectors] = useState([]);
    const [plannedNotes, setPlannedNotes] = useState([]);
    const [completedNotes, setCompletedNotes] = useState([]);
    const [documentId, setDocumentId] = useState(() => crypto.randomUUID());
    const [documentCreated, setDocumentCreated] = useState(() => new Date().toISOString());
    const [colourScheme, setColourScheme] = useState(() => {
        const stored = localStorage.getItem('spine_planner_theme');
        return (stored && COLOUR_SCHEMES.some(s => s.id === stored)) ? stored : 'default';
    });
    const [themeOpen, setThemeOpen] = useState(false);
    const [showFinalInventory, setShowFinalInventory] = useState(false);
    const [currentLang, setCurrentLangState] = useState(detectLanguage());

    const changeLang = (code) => {
        setCurrentLang(code);
        setCurrentLangState(code);
        document.documentElement.lang = code;
        localStorage.setItem('spine_planner_lang', code);
    };

    const changeTheme = (id) => {
        setColourScheme(id);
        localStorage.setItem('spine_planner_theme', id);
    };
    const [patientData, setPatientData] = useState({ name: '', id: '', surgeon: '', location: '', date: new Date().toISOString().split('T')[0], company: '', screwSystem: '', leftRod: '', rightRod: '', planLeftRod: '', planRightRod: '', boneGraft: { types: [], notes: '' } });
    const [viewMode, setViewMode] = useState('thoracolumbar'); 
    const [scale, setScale] = useState(1);
    const [incognitoMode, setIncognitoMode] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [syncConnected, setSyncConnected] = useState(false);
    const receivingSync = useRef(false);
    const syncChannelRef = useRef(null);
    const syncTimerRef = useRef(null);
    const lastPongRef = useRef(0);
    const syncVersionRef = useRef(0);
    const syncVersionMismatchRef = useRef(false);
    const serializeRef = useRef(null);
    const deserializeRef = useRef(null);
    const changeLangRef = useRef(null);

    // MODALS
    const [screwModalOpen, setScrewModalOpen] = useState(false);
    const [osteoModalOpen, setOsteoModalOpen] = useState(false);
    const [cageModalOpen, setCageModalOpen] = useState(false);
    const [forceModalOpen, setForceModalOpen] = useState(false);
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [changeLogOpen, setChangeLogOpen] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [pendingNoteTool, setPendingNoteTool] = useState(null); // { tool: 'note', levelId, offsetX, offsetY }
    const [editingNote, setEditingNote] = useState(null); // full note object when editing
    
    const [confirmNewPatient, setConfirmNewPatient] = useState(false);
    const [exportPicker, setExportPicker] = useState(null); // 'jpg' or 'pdf'
    // Disclaimer: derive from sessionStorage on every render, use counter to force re-render on accept
    const [disclaimerTick, setDisclaimerTick] = useState(0);
    const disclaimerAccepted = isDisclaimerAccepted(currentLang);

    // Re-check disclaimer at half-day boundary (AM/PM)
    useEffect(() => {
        const interval = setInterval(() => setDisclaimerTick(n => n + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    // TOAST NOTIFICATIONS
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);
    const showToast = useCallback((message, type = 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        if (type !== 'error') setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);
    const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    // EDITING STATE
    const [pendingPlacement, setPendingPlacement] = useState(null);
    const [editingPlacementId, setEditingPlacementId] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [editingTool, setEditingTool] = useState(null);
    const [editingCageLevel, setEditingCageLevel] = useState(null);
    const [discPickerLevel, setDiscPickerLevel] = useState(null);
    const [editingAnnotation, setEditingAnnotation] = useState('');

    const [defaultDiameter, setDefaultDiameter] = useState('6.5');
    const [defaultLength, setDefaultLength] = useState('45');
    const [defaultScrewMode, setDefaultScrewMode] = useState('standard');
    const [defaultCustomText, setDefaultCustomText] = useState('');
    const [defaultOsteoType, setDefaultOsteoType] = useState('PSO');
    const [defaultOsteoAngle, setDefaultOsteoAngle] = useState('25');
    const [osteoDiscLevel, setOsteoDiscLevel] = useState(undefined); // true=disc only, false=vertebral only, undefined=all
    const [pendingForceZone, setPendingForceZone] = useState(null);
    
    const exportRef = useRef(null);
    const containerWrapperRef = useRef(null);
    const fileInputRef = useRef(null);

    // PORTRAIT MODE
    const isPortrait = usePortrait();
    const isSmallScreen = useMemo(() => Math.min(window.screen.width, window.screen.height) < 600, []);
    const isViewOnly = isPortrait && isSmallScreen;
    const [portraitExporting, setPortraitExporting] = useState(false);
    const [portraitTab, setPortraitTab] = useState(() => {
        const saved = localStorage.getItem('spine_planner_tab');
        const n = saved ? parseInt(saved, 10) : 0;
        return (n >= 0 && n <= 2) ? n : 0;
    });
    const switchPortraitTab = useCallback((tab) => {
        setPortraitTab(tab);
        localStorage.setItem('spine_planner_tab', String(tab));
        if (tab === 1) setActiveChart('planned');
        else if (tab === 2) setActiveChart('completed');
    }, []);
    const PORTRAIT_TABS = ['portrait.tab.demographics', 'portrait.tab.plan', 'portrait.tab.construct'];
    const portraitContentRef = useRef(null);
    const touchStartRef = useRef(null);
    const [portraitScale, setPortraitScale] = useState(1);
    // Fixed column sizes matching the export container proportions
    const PORTRAIT_COL_W = [370, 637, 637]; // demographics, plan, construct (construct widened for ghost forces)
    const PORTRAIT_COL_H = 1050;

    // Swipe gesture detection for portrait tab switching
    const handleTouchStart = useCallback((e) => {
        if (!isPortrait) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, [isPortrait]);

    const handleTouchEnd = useCallback((e) => {
        if (!isPortrait || !touchStartRef.current) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const elapsed = Date.now() - touchStartRef.current.time;
        touchStartRef.current = null;
        // Only trigger on predominantly horizontal swipes with min 50px threshold
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
            if (dx < 0 && portraitTab < 2) switchPortraitTab(portraitTab + 1);
            else if (dx > 0 && portraitTab > 0) switchPortraitTab(portraitTab - 1);
        }
    }, [isPortrait, portraitTab]);

    const levels = useMemo(() => {
        const lvls = [];
        // VIEW LOGIC
        if (viewMode === 'whole' || viewMode === 'cervical') { lvls.push({ id: 'Oc', type: 'Oc' }); ['C1','C2','C3','C4','C5','C6','C7'].forEach(l => lvls.push({ id:l, type:'C' })); }
        
        if (viewMode === 'cervical') { ['T1','T2','T3','T4'].forEach(l => lvls.push({ id:l, type:'T' })); }
        else if (viewMode === 't10_pelvis') { ['T10','T11','T12'].forEach(l => lvls.push({ id:l, type:'T' })); }
        else { ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].forEach(l => lvls.push({ id:l, type:'T' })); }

        if (viewMode !== 'cervical') { ['L1','L2','L3','L4','L5'].forEach(l => lvls.push({ id:l, type:'L' })); lvls.push({ id:'S1', type:'S' }); lvls.push({ id:'Pelvis', type:'Pelvis' }); }
        return lvls;
    }, [viewMode]);

    const scheme = COLOUR_SCHEMES.find(s => s.id === colourScheme) || COLOUR_SCHEMES[0];

    // SERIALISE / DESERIALISE - v4 spinal-instrumentation format
    // Mapping tables: internal tool IDs ↔ v4 schema types
    const TOOL_TO_V4_HOOK = { pedicle_hook: 'pedicle', tp_hook: 'transverse-process-down', tp_hook_up: 'transverse-process-up', sl_hook: 'supralaminar', il_hook: 'infralaminar', supra_laminar_hook: 'supralaminar', infra_laminar_hook: 'infralaminar' };
    const V4_HOOK_TO_TOOL = Object.fromEntries(Object.entries(TOOL_TO_V4_HOOK).map(([k,v]) => [v, k]));
    const TOOL_TO_V4_FIXATION = { band: 'sublaminar-band', wire: 'sublaminar-wire', cable: 'cable' };
    const V4_FIXATION_TO_TOOL = Object.fromEntries(Object.entries(TOOL_TO_V4_FIXATION).map(([k,v]) => [v, k]));
    const OSTEO_TO_V4 = { Facet: { t: 'facetectomy', g: 1 }, Ponte: { t: 'ponte', g: 2 }, PSO: { t: 'PSO', g: 3 }, ExtPSO: { t: 'extended-PSO', g: 4 }, VCR: { t: 'VCR', g: 5 }, 'ML-VCR': { t: 'multilevel-VCR', g: 6 }, Corpectomy: { t: 'corpectomy', g: null } };
    const V4_OSTEO_TO_TOOL = Object.fromEntries(Object.entries(OSTEO_TO_V4).map(([k,v]) => [v.t, k]));
    const FORCE_TO_V4 = { translate_left: { type: 'translation', direction: 'left' }, translate_right: { type: 'translation', direction: 'right' }, compression: { type: 'compression' }, distraction: { type: 'distraction' }, derotate_cw: { type: 'derotation', direction: 'clockwise' }, derotate_ccw: { type: 'derotation', direction: 'anticlockwise' } };
    const V4_FORCE_TO_TOOL = { 'translation-left': 'translate_left', 'translation-right': 'translate_right', compression: 'compression', distraction: 'distraction', 'derotation-clockwise': 'derotate_cw', 'derotation-anticlockwise': 'derotate_ccw' };
    const ZONE_TO_SIDE = { left: 'left', right: 'right', mid: 'midline', disc: 'midline', force_left: 'left', force_right: 'right' };
    const BONEGRAFT_TO_V4 = { 'Local Bone': 'local-bone', 'Autograft': 'iliac-crest-autograft', 'Allograft': 'allograft', 'Synthetics': 'synthetic', 'DBM': 'DBM', 'BMP': 'BMP' };
    const V4_BONEGRAFT_TO_TOOL = Object.fromEntries(Object.entries(BONEGRAFT_TO_V4).map(([k,v]) => [v, k]));

    // Convert internal placements/cages/connectors/notes/forces → v4 elements/forces/notes
    const internalToV4Chart = (placements, cages, connectors, notes, rodText, planRodText) => {
        const elements = [];
        const forces = [];
        // Placements → elements or forces
        (placements || []).forEach(p => {
            const fv4 = FORCE_TO_V4[p.tool];
            if (fv4) {
                forces.push({ id: p.id, type: fv4.type, direction: fv4.direction || undefined, level: p.levelId, side: ZONE_TO_SIDE[p.zone] || 'left' });
                return;
            }
            if (p.tool === 'unstable') return; // UI-only marker
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
        // Cages → elements
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
        // Connectors → elements
        (connectors || []).forEach(cn => {
            elements.push({ id: cn.id, type: 'connector', level: cn.levelId, side: 'midline', connector: { connectorType: 'crosslink', fraction: cn.fraction } });
        });
        // Rods from free text
        const rods = [];
        if (rodText?.left) rods.push({ id: 'rod-left', side: 'left', freeText: rodText.left });
        if (rodText?.right) rods.push({ id: 'rod-right', side: 'right', freeText: rodText.right });
        // Notes (strip pixel offsets)
        const v4Notes = (notes || []).map(n => ({ id: n.id, level: n.levelId, text: n.text, showArrow: n.showArrow || false }));
        const notePositions = {};
        (notes || []).forEach(n => { if (n.offsetX !== undefined) notePositions[n.id] = { offsetX: n.offsetX, offsetY: n.offsetY }; });
        return { elements, forces, rods, notes: v4Notes, notePositions };
    };

    // Convert v4 elements/forces/notes → internal state arrays
    const v4ChartToInternal = (chartData, notePositions) => {
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
                placements.push({ id: el.id, levelId: el.level, zone: isDisc ? 'disc' : 'mid', tool: 'osteotomy', data: { type: v3Type, shortLabel: el.osteotomy?.osteotomyType === 'facetectomy' ? 'Facet' : (v3Type.length <= 6 ? v3Type : v3Type.substring(0,3).toUpperCase()), angle: el.osteotomy?.correctionAngle ?? null, reconstructionCage: el.osteotomy?.reconstructionCage || '' }, annotation: '' });
            } else if (el.type === 'cage') {
                cages.push({ id: el.id, levelId: el.level, tool: (el.cage?.approach || 'TLIF').toLowerCase(), data: { height: String(el.cage?.height || ''), lordosis: String(el.cage?.lordosis || ''), side: el.side || 'bilateral', width: el.cage?.width ? String(el.cage.width) : undefined, length: el.cage?.length ? String(el.cage.length) : undefined } });
            } else if (el.type === 'connector') {
                connectors.push({ id: el.id, levelId: el.level, fraction: el.connector?.fraction || 0.5, tool: 'connector' });
            }
        });
        // Forces → placements
        (chartData.forces || []).forEach(f => {
            const key = f.direction ? `${f.type}-${f.direction}` : f.type;
            const tool = V4_FORCE_TO_TOOL[key] || 'compression';
            const zone = f.side === 'right' ? 'force_right' : 'force_left';
            placements.push({ id: f.id, levelId: f.level, zone, tool, data: null, annotation: '' });
        });
        // Notes - restore pixel offsets
        (chartData.notes || []).forEach(n => {
            const pos = notePositions?.[n.id] || { offsetX: -100, offsetY: 0 };
            notes.push({ id: n.id, tool: 'note', levelId: n.level, text: n.text, offsetX: pos.offsetX, offsetY: pos.offsetY, showArrow: n.showArrow || false });
        });
        // Rod free text
        const rodLeft = (chartData.rods || []).find(r => r.side === 'left');
        const rodRight = (chartData.rods || []).find(r => r.side === 'right');
        return { placements, cages, connectors, notes, rodLeft: rodLeft?.freeText || '', rodRight: rodRight?.freeText || '' };
    };

    const serializeState = () => {
        const planChart = internalToV4Chart(plannedPlacements, plannedCages, plannedConnectors, plannedNotes, { left: patientData.planLeftRod, right: patientData.planRightRod });
        const constChart = internalToV4Chart(completedPlacements, completedCages, completedConnectors, completedNotes, { left: patientData.leftRod, right: patientData.rightRod });
        return {
            schema: { format: 'spinal-instrumentation', version: 4, schemaUrl: 'https://spine-planner.org/schema/v4/spinal-instrumentation.json', generator: { name: 'Spinal Instrumentation Plan & Record', version: CURRENT_VERSION, url: 'https://plan.skeletalsurgery.com/spine' } },
            document: { id: documentId, created: documentCreated, modified: new Date().toISOString(), language: currentLang },
            patient: { name: patientData.name, identifier: patientData.id },
            case: { date: patientData.date, surgeon: patientData.surgeon, location: patientData.location || '' },
            implantSystem: { manufacturer: patientData.company, system: patientData.screwSystem },
            plan: { elements: planChart.elements, rods: planChart.rods, forces: planChart.forces, boneGraft: { types: (patientData.boneGraft?.types || []).map(t => BONEGRAFT_TO_V4[t] || t), notes: patientData.boneGraft?.notes || '' }, notes: planChart.notes },
            construct: { elements: constChart.elements, rods: constChart.rods, forces: constChart.forces, boneGraft: { types: [], notes: '' }, notes: constChart.notes },
            ui: { colourScheme, viewMode, notePositions: { ...planChart.notePositions, ...constChart.notePositions } }
        };
    };

    // Migrate v3 → internal state (legacy support)
    const migrateConnectors = (conns) => {
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
    };

    const deserializeState = (json) => {
        // v4 format
        if (json.schema?.version === 4) {
            if (json.document?.id) setDocumentId(json.document.id);
            if (json.document?.created) setDocumentCreated(json.document.created);
            // Patient data - reconstruct internal format
            const pd = {
                name: json.patient?.name || '', id: json.patient?.identifier || '',
                surgeon: json.case?.surgeon || '', location: json.case?.location || '',
                date: json.case?.date || new Date().toISOString().split('T')[0],
                company: json.implantSystem?.manufacturer || '', screwSystem: json.implantSystem?.system || '',
                leftRod: '', rightRod: '', planLeftRod: '', planRightRod: '',
                boneGraft: { types: (json.plan?.boneGraft?.types || []).map(t => V4_BONEGRAFT_TO_TOOL[t] || t), notes: json.plan?.boneGraft?.notes || '' }
            };
            const notePos = json.ui?.notePositions || {};
            if (json.plan) {
                const p = v4ChartToInternal(json.plan, notePos);
                setPlannedPlacements(p.placements); setPlannedCages(p.cages); setPlannedConnectors(p.connectors); setPlannedNotes(p.notes);
                pd.planLeftRod = p.rodLeft; pd.planRightRod = p.rodRight;
            }
            if (json.construct) {
                const c = v4ChartToInternal(json.construct, notePos);
                setCompletedPlacements(c.placements); setCompletedCages(c.cages); setCompletedConnectors(c.connectors); setCompletedNotes(c.notes);
                pd.leftRod = c.rodLeft; pd.rightRod = c.rodRight;
            }
            setPatientData(pd);
            if (json.ui?.viewMode) setViewMode(json.ui.viewMode);
            if (json.ui?.colourScheme) changeTheme(json.ui.colourScheme);
            return;
        }
        // v3 / v2 legacy format
        if (json.patient) setPatientData(json.patient);
        if (json.plan) {
            if (json.plan.implants) setPlannedPlacements(json.plan.implants);
            if (json.plan.cages) setPlannedCages(json.plan.cages);
            if (json.plan.connectors) setPlannedConnectors(migrateConnectors(json.plan.connectors));
            if (json.plan.notes) setPlannedNotes(json.plan.notes);
        }
        if (json.construct) {
            if (json.construct.implants) setCompletedPlacements(json.construct.implants);
            if (json.construct.cages) setCompletedCages(json.construct.cages);
            if (json.construct.connectors) setCompletedConnectors(migrateConnectors(json.construct.connectors));
            if (json.construct.notes) setCompletedNotes(json.construct.notes);
        }
        if (json.preferences?.viewMode) setViewMode(json.preferences.viewMode);
        if (json.preferences?.colourScheme) changeTheme(json.preferences.colourScheme);
    };
    serializeRef.current = serializeState;
    deserializeRef.current = deserializeState;
    changeLangRef.current = changeLang;

    // AUTO-LOAD
    // SYNC LANGUAGE ON MOUNT
    useEffect(() => {
        setCurrentLang(currentLang);
        document.documentElement.lang = currentLang;
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('spine_planner_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.schema?.version === 4 || parsed.formatVersion >= 2) deserializeState(parsed);
            } catch (e) { console.error("Data load error"); }
        }
        setHasLoaded(true);
    }, []);

    // AUTO-SAVE + BROADCAST SYNC
    useEffect(() => {
        if (hasLoaded && !incognitoMode) {
            localStorage.setItem('spine_planner_v2', JSON.stringify(serializeState()));
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
                    syncChannelRef.current.postMessage({ type: 'state', appVersion: CURRENT_VERSION, payload: serializeState(), version: syncVersionRef.current });
                }
            }, 200);
        }
    }, [plannedPlacements, completedPlacements, plannedCages, completedCages, plannedConnectors, completedConnectors, plannedNotes, completedNotes, patientData, viewMode, colourScheme, hasLoaded, incognitoMode]);

    // BROADCAST CHANNEL SYNC
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch = new BroadcastChannel('spine-planner-sync');
        syncChannelRef.current = ch;

        ch.onmessage = (e) => {
            const msg = e.data;
            // Version mismatch - ignore sync from older/newer app versions
            if (msg.appVersion !== CURRENT_VERSION) {
                if (!syncVersionMismatchRef.current) {
                    syncVersionMismatchRef.current = true;
                    console.warn('Sync version mismatch:', { received: msg.appVersion, expected: CURRENT_VERSION, msgType: msg.type, msg });
                    showToast(`Another window is running ${msg.appVersion || 'an unknown version'} — please reload all windows to sync.`, 'error');
                }
                return;
            }
            if (msg.type === 'ping') {
                ch.postMessage({ type: 'pong', appVersion: CURRENT_VERSION, payload: serializeRef.current() });
            } else if (msg.type === 'pong') {
                lastPongRef.current = Date.now();
                setSyncConnected(true);
                if (msg.payload) {
                    clearTimeout(syncTimerRef.current);
                    receivingSync.current = true;
                    deserializeRef.current(msg.payload);
                }
            } else if (msg.type === 'state') {
                if (msg.payload) {
                    // Cancel any pending outbound sync - the incoming state supersedes it
                    clearTimeout(syncTimerRef.current);
                    receivingSync.current = true;
                    deserializeRef.current(msg.payload);
                }
            } else if (msg.type === 'lang_accepted') {
                // Other window accepted disclaimer in a new language — apply language + acceptance
                if (msg.lang) {
                    acceptDisclaimer(msg.lang);
                    changeLangRef.current(msg.lang);
                    setDisclaimerTick(n => n + 1);
                }
            }
        };

        // Initial ping to discover existing peers
        ch.postMessage({ type: 'ping', appVersion: CURRENT_VERSION });

        // Heartbeat: ping every 5s, disconnect if no pong in 10s
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

    // RESIZE OBSERVER - portrait mode: scale active column to fit
    useEffect(() => {
        if (!isPortrait || !portraitContentRef.current) return;
        const recalc = () => {
            if (!portraitContentRef.current) return;
            const availW = portraitContentRef.current.clientWidth;
            const availH = portraitContentRef.current.clientHeight;
            const colW = PORTRAIT_COL_W[portraitTab];
            const colH = PORTRAIT_COL_H;
            const pad = 16; // small margin
            setPortraitScale(Math.min((availW - pad) / colW, (availH - pad) / colH));
        };
        recalc();
        const observer = new ResizeObserver(recalc);
        observer.observe(portraitContentRef.current);
        return () => observer.disconnect();
    }, [isPortrait, portraitTab]);

    // RESIZE OBSERVER - landscape mode: scale export container
    useEffect(() => {
        if (isPortrait || !containerWrapperRef.current) return;
        const observer = new ResizeObserver(() => {
            if (containerWrapperRef.current && exportRef.current) {
                const wrapperH = containerWrapperRef.current.clientHeight;
                const wrapperW = containerWrapperRef.current.clientWidth;
                setScale(Math.min((wrapperW - 40) / 1485, (wrapperH - 40) / 1050));
            }
        });
        observer.observe(containerWrapperRef.current);
        return () => observer.disconnect();
    }, [isPortrait]);

    // ALL TOOL DEFINITIONS (for rendering and lookup)
    const allTools = [
        { id: 'monoaxial', labelKey: 'tool.monoaxial', icon: 'monoaxial', needsSize: true, type: 'implant' },
        { id: 'polyaxial', labelKey: 'tool.polyaxial', icon: 'polyaxial', needsSize: true, type: 'implant' },
        { id: 'uniplanar', labelKey: 'tool.uniplanar', icon: 'uniplanar', needsSize: true, type: 'implant' },
        { id: 'pedicle_hook', labelKey: 'tool.pedicle_hook', icon: 'pedicle_hook', type: 'implant' },
        { id: 'tp_hook', labelKey: 'tool.tp_hook', icon: 'tp_hook', type: 'implant' },
        { id: 'tp_hook_up', labelKey: 'tool.tp_hook_up', icon: 'tp_hook_up', type: 'implant' },
        { id: 'sl_hook', labelKey: 'tool.sl_hook', icon: 'sl_hook', type: 'implant' },
        { id: 'il_hook', labelKey: 'tool.il_hook', icon: 'il_hook', type: 'implant' },
        { id: 'band', labelKey: 'tool.band', icon: 'band', type: 'implant' },
        { id: 'wire', labelKey: 'tool.wire', icon: 'wire', type: 'implant' },
        { id: 'cable', labelKey: 'tool.cable', icon: 'cable', type: 'implant' },
        { id: 'implant', labelKey: 'tool.implant', icon: 'implant', type: 'mode' },
        { id: 'connector', labelKey: 'tool.connector', icon: 'connector', type: 'mid' },
        { id: 'unstable', labelKey: 'tool.unstable', icon: 'unstable', type: 'mid' },
        { id: 'osteotomy', labelKey: 'tool.osteotomy', icon: 'osteotomy', isOsteotomy: true, type: 'mid' },
        { id: 'Corpectomy', labelKey: 'tool.corpectomy', icon: 'cage', isOsteotomy: true, type: 'mid' },
        { id: 'translate_left', labelKey: 'tool.translate_left', icon: 'translate_left', type: 'force' },
        { id: 'translate_right', labelKey: 'tool.translate_right', icon: 'translate_right', type: 'force' },
        { id: 'compression', labelKey: 'tool.compression', icon: 'compression', type: 'force' },
        { id: 'distraction', labelKey: 'tool.distraction', icon: 'distraction', type: 'force' },
        { id: 'derotate_cw', labelKey: 'tool.derotate_cw', icon: 'derotate_cw', type: 'force' },
        { id: 'derotate_ccw', labelKey: 'tool.derotate_ccw', icon: 'derotate_ccw', type: 'force' },
        { id: 'note', labelKey: 'tool.note', icon: 'note', type: 'annotation' },
    ];

    // SIDEBAR PALETTE
    const tools = [
        { categoryKey: 'sidebar.category.tools', items: allTools.filter(item => ['implant','connector','unstable','osteotomy','Corpectomy','note'].includes(item.id)) },
    ];

    // LOGIC HANDLERS - zone determines behaviour
    const handleZoneClick = (levelId, zone) => {
        const isForceZone = zone.startsWith('force');

        // Force zones → always open ForceModal, regardless of selected tool
        if (isForceZone) {
            setPendingForceZone({ levelId, zone });
            setForceModalOpen(true);
            return;
        }

        // ANNOTATION MODE: when note/pin selected, non-force clicks place notes
        if (selectedTool === 'note') {
            const hs = calculateAutoScale(levels);
            const levelObj = levels.find(l => l.id === levelId);
            const vertH = levelObj ? getLevelHeight(levelObj) * hs : 30;
            setPendingNoteTool({ tool: selectedTool, levelId, offsetX: -100, offsetY: Math.round(vertH / 2) });
            setEditingNote(null);
            setNoteModalOpen(true);
            return;
        }

        // Left/right zones - one implant per zone
        if (zone === 'left' || zone === 'right') {
            const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
            const existing = currentPlacements.find(p => p.levelId === levelId && p.zone === zone);
            if (existing) {
                // Zone occupied → edit existing implant
                handlePlacementClick(existing);
                return;
            }
            setPendingPlacement({ levelId, zone, tool: lastUsedScrewType });
            setEditingPlacementId(null);
            setEditingData(undefined);
            setEditingTool(lastUsedScrewType);
            setEditingAnnotation('');
            setScrewModalOpen(true);
            return;
        }

        // Mid zone - check for existing osteotomy first
        const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
        const existingOsteo = currentPlacements.find(p => p.levelId === levelId && p.zone === 'mid' && p.tool === 'osteotomy');
        if (existingOsteo) {
            handlePlacementClick(existingOsteo);
            return;
        }
        // Connector/unstable tools still work when selected
        const tool = allTools.find(item => item.id === selectedTool);
        if (tool && selectedTool === 'connector') {
            addConnector(levelId);
        } else if (tool && !tool.isOsteotomy && tool.type !== 'mode' && selectedTool !== 'implant') {
            addPlacement(levelId, zone, selectedTool, null);
        } else {
            // Default: open osteotomy modal (Schwab 3+)
            setPendingPlacement({ levelId, zone, tool: 'osteotomy' });
            setEditingPlacementId(null);
            setEditingData(undefined);
            setOsteoDiscLevel(false);
            setOsteoModalOpen(true);
        }
    };

    const handleForceConfirm = (forceType) => {
        if (pendingForceZone) {
            addPlacement(pendingForceZone.levelId, pendingForceZone.zone, forceType, null);
            setPendingForceZone(null);
        }
    };

    const handleDiscClick = (levelId) => {
        if (levelId === 'Oc' || levelId === 'C1' || levelId === 'S1' || levelId === 'Pelvis') return showToast(t('alert.no_disc_space'), 'error');

        // If disc-level osteotomy exists, edit it
        const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
        const existingOsteo = currentPlacements.find(p => p.levelId === levelId && p.zone === 'disc');
        if (existingOsteo) { handlePlacementClick(existingOsteo); return; }

        // If cage exists, edit it
        const currentCages = activeChart === 'planned' ? plannedCages : completedCages;
        const existingCage = currentCages.find(c => c.levelId === levelId);
        if (existingCage) { setEditingCageLevel(levelId); setEditingData(existingCage); setCageModalOpen(true); return; }

        // Nothing exists - show picker (cage vs osteotomy)
        setDiscPickerLevel(levelId);
    };
    const handleDiscPickCage = () => {
        const levelId = discPickerLevel;
        setDiscPickerLevel(null);
        const anyPermitted = Object.values(CAGE_PERMISSIBILITY).some(arr => arr.includes(levelId));
        if (!anyPermitted) return showToast(t('alert.no_cage_types', { level: getDiscLabel(levelId, levels) }), 'error');
        setEditingCageLevel(levelId);
        setEditingData(undefined);
        setCageModalOpen(true);
    };
    const handleDiscPickOsteo = () => {
        const levelId = discPickerLevel;
        setDiscPickerLevel(null);
        setPendingPlacement({ levelId, zone: 'disc', tool: 'osteotomy' });
        setEditingPlacementId(null);
        setEditingData(undefined);
        setOsteoDiscLevel(true);
        setOsteoModalOpen(true);
    };

    const handleCageConfirm = (data) => {
        const lvl = editingCageLevel;
        const permitted = CAGE_PERMISSIBILITY[data.type] || [];
        if (!permitted.includes(lvl)) {
            const cageType = CAGE_TYPES.find(ct => ct.id === data.type);
            return showToast(t('alert.cage_not_permitted', { cageType: cageType?.label || data.type.toUpperCase(), level: getDiscLabel(lvl, levels) }), 'error');
        }

        const newCage = { levelId: editingCageLevel, tool: data.type, data: { height: data.height, width: data.width, length: data.length, lordosis: data.lordosis, side: data.side } };
        const setter = activeChart === 'planned' ? setPlannedCages : setCompletedCages;
        setter(prev => {
            const filtered = prev.filter(c => c.levelId !== editingCageLevel);
            return [...filtered, newCage];
        });
    };

    const handleDeleteCage = () => {
        const setter = activeChart === 'planned' ? setPlannedCages : setCompletedCages;
        setter(prev => prev.filter(c => c.levelId !== editingCageLevel));
        setCageModalOpen(false);
    };

    const handlePlacementClick = (p) => {
        const tool = allTools.find(item => item.id === p.tool);
        const isHookType = NO_SIZE_TYPES.includes(p.tool);
        if (tool.needsSize || isHookType) { setEditingPlacementId(p.id); setEditingData(p.data); setEditingTool(p.tool); setEditingAnnotation(p.annotation || ''); setScrewModalOpen(true); }
        else if (tool.isOsteotomy) { setEditingPlacementId(p.id); setEditingData(p.data); setOsteoDiscLevel(p.zone === 'disc' ? true : false); setOsteoModalOpen(true); }
        else { removePlacement(p.id); }
    };

    const handleGhostClick = (ghost) => {
        // Ensure we're editing construct side
        setActiveChart('completed');

        const tool = allTools.find(item => item.id === ghost.tool);
        const isHookType = NO_SIZE_TYPES.includes(ghost.tool);

        if (tool.needsSize || isHookType) {
            // Screws, hooks, fixation - open ScrewModal pre-filled
            setPendingPlacement({ levelId: ghost.levelId, zone: ghost.zone, tool: ghost.tool });
            setEditingPlacementId(null);
            setEditingData(ghost.data);
            setEditingTool(ghost.tool);
            setEditingAnnotation(ghost.annotation || '');
            setScrewModalOpen(true);
        } else if (tool.isOsteotomy) {
            // Osteotomies - open OsteotomyModal pre-filled
            setPendingPlacement({ levelId: ghost.levelId, zone: ghost.zone, tool: ghost.tool });
            setEditingPlacementId(null);
            setEditingData(ghost.data);
            setOsteoDiscLevel(ghost.zone === 'disc' ? true : false);
            setOsteoModalOpen(true);
        }
    };

    const handleScrewConfirm = (sizeData, components, finalType, annotation) => {
        if (components) { setDefaultDiameter(components.diameter); setDefaultLength(components.length); setDefaultScrewMode(components.mode); setDefaultCustomText(components.customText || ''); }
        setLastUsedScrewType(finalType);
        if (editingPlacementId) { updatePlacement(editingPlacementId, finalType, sizeData, annotation); setEditingPlacementId(null); }
        else if (pendingPlacement) { addPlacement(pendingPlacement.levelId, pendingPlacement.zone, finalType, sizeData, annotation); setPendingPlacement(null); }
    };

    const handleOsteoConfirm = (data) => {
        setDefaultOsteoType(data.type);
        if (editingPlacementId) { updatePlacement(editingPlacementId, 'osteotomy', data); setEditingPlacementId(null); } 
        else if (pendingPlacement) { addPlacement(pendingPlacement.levelId, pendingPlacement.zone, 'osteotomy', data); setPendingPlacement(null); }
    };

    const addPlacement = (levelId, zone, tool, data, annotation) => {
        const newP = { id: genId(), levelId, zone, tool, data, annotation: annotation || '' };
        const setter = activeChart === 'planned' ? setPlannedPlacements : setCompletedPlacements;
        // One implant per left/right zone - use functional update to check latest state
        if (zone === 'left' || zone === 'right') {
            setter(prev => prev.some(p => p.levelId === levelId && p.zone === zone) ? prev : [...prev, newP]);
        } else {
            setter(prev => [...prev, newP]);
        }
    };
    const updatePlacement = (id, tool, data, annotation) => {
        const updater = (prev) => prev.map(p =>
            p.id === id ? { ...p, tool, data, annotation: annotation !== undefined ? annotation : (p.annotation || '') } : p
        );
        if (activeChart === 'planned') setPlannedPlacements(updater);
        else setCompletedPlacements(updater);
    };
    const removePlacement = (id) => {
        const filter = prev => prev.filter(p => p.id !== id);
        if (activeChart === 'planned') setPlannedPlacements(filter);
        else setCompletedPlacements(filter);
        setScrewModalOpen(false);
        setOsteoModalOpen(false);
    };

    // CONNECTOR HANDLERS
    const addConnector = (levelId) => {
        const newConn = { id: genId(), levelId, fraction: 0.5, tool: 'connector' };
        const setter = activeChart === 'planned' ? setPlannedConnectors : setCompletedConnectors;
        setter(prev => [...prev, newConn]);
    };
    const updateConnector = (connId, { levelId, fraction }) => {
        const updater = prev => prev.map(c => c.id === connId ? { ...c, levelId, fraction } : c);
        if (activeChart === 'planned') setPlannedConnectors(updater); else setCompletedConnectors(updater);
    };
    const removeConnector = (connId) => {
        const filter = prev => prev.filter(c => c.id !== connId);
        if (activeChart === 'planned') setPlannedConnectors(filter); else setCompletedConnectors(filter);
    };

    // NOTE HANDLERS
    const handleNoteConfirm = (text, showArrow) => {
        if (editingNote) {
            const currentNotes = activeChart === 'planned' ? plannedNotes : completedNotes;
            const exists = currentNotes.some(n => n.id === editingNote.id);
            if (exists) {
                const updater = prev => prev.map(n => n.id === editingNote.id ? { ...n, text, showArrow } : n);
                if (activeChart === 'planned') setPlannedNotes(updater); else setCompletedNotes(updater);
            } else {
                const newNote = { id: genId(), tool: 'note', levelId: editingNote.levelId, text, offsetX: editingNote.offsetX, offsetY: editingNote.offsetY, showArrow };
                setCompletedNotes(prev => [...prev, newNote]);
            }
            setEditingNote(null);
        } else if (pendingNoteTool) {
            const newNote = { id: genId(), tool: pendingNoteTool.tool, levelId: pendingNoteTool.levelId, text, offsetX: pendingNoteTool.offsetX, offsetY: pendingNoteTool.offsetY, showArrow };
            const setter = activeChart === 'planned' ? setPlannedNotes : setCompletedNotes;
            setter(prev => [...prev, newNote]);
            setPendingNoteTool(null);
        }
    };
    const handleNoteDelete = () => {
        if (editingNote) {
            const filter = prev => prev.filter(n => n.id !== editingNote.id);
            if (activeChart === 'planned') setPlannedNotes(filter); else setCompletedNotes(filter);
            setEditingNote(null);
            setNoteModalOpen(false);
        }
    };
    const handleNoteClick = (note) => {
        setEditingNote(note);
        setPendingNoteTool(null);
        setNoteModalOpen(true);
    };
    const handleGhostNoteClick = (ghostNote) => {
        setActiveChart('completed');
        setEditingNote({ ...ghostNote });
        setPendingNoteTool(null);
        setNoteModalOpen(true);
    };

    const handleGhostConnectorClick = (ghostConn) => {
        setCompletedConnectors(prev => [...prev, { id: genId(), levelId: ghostConn.levelId, fraction: ghostConn.fraction, tool: 'connector' }]);
    };

    const handleGhostCageClick = (ghostCage) => {
        setActiveChart('completed');
        setEditingCageLevel(ghostCage.levelId);
        setEditingData(ghostCage);
        setCageModalOpen(true);
    };
    const updateNotePosition = (noteId, { offsetX, offsetY }) => {
        const updater = prev => prev.map(n => n.id === noteId ? { ...n, offsetX, offsetY } : n);
        if (activeChart === 'planned') setPlannedNotes(updater); else setCompletedNotes(updater);
    };
    const removeNote = (noteId) => {
        const filter = prev => prev.filter(n => n.id !== noteId);
        if (activeChart === 'planned') setPlannedNotes(filter); else setCompletedNotes(filter);
    };

    // EXPORT
    const prepareExportCanvas = async () => {
        await document.fonts.ready;
        // In portrait mode, mount the off-screen export container temporarily
        if (isPortrait) {
            setPortraitExporting(true);
            // Wait for React to render the export container
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        }
        const element = exportRef.current;
        // Sync DOM properties to attributes so cloneNode preserves them
        element.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.checked) cb.setAttribute('checked', 'checked');
            else cb.removeAttribute('checked');
        });
        element.querySelectorAll('select').forEach(sel => {
            Array.from(sel.options).forEach((opt, i) => {
                if (i === sel.selectedIndex) opt.setAttribute('selected', 'selected');
                else opt.removeAttribute('selected');
            });
        });
        const canvas = await htmlToImage.toCanvas(element, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            width: 1485,
            height: 1050,
            filter: (node) => !node.dataset?.exportHide
        });
        return canvas;
    };
    const promptExportJPG = () => setExportPicker('jpg');
    const promptExportPDF = () => setExportPicker('pdf');
    const runExportWithChoice = async (format, useFinal) => {
        setExportPicker(null);
        setActiveChart(useFinal ? 'completed' : 'planned');
        setShowFinalInventory(useFinal);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (format === 'jpg') await runExportJPG();
        else await runExportPDF();
    };
    const runExportJPG = async () => {
        const canvas = await prepareExportCanvas();
        const link = document.createElement('a');
        link.download = `SpinePlan_${patientData.name || 'Patient'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');
        setPortraitExporting(false);
    };
    const runExportPDF = async () => {
        const canvas = await prepareExportCanvas();
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1485, 1050] });
        pdf.addImage(imgData, 'JPEG', 0, 0, 1485, 1050);
        pdf.save(`SpinePlan_${patientData.name || 'Patient'}.pdf`);
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');
        setPortraitExporting(false);
    };
    const saveProjectJSON = () => {
        const data = serializeState();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SpineProject_${patientData.name || 'Unnamed'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (incognitoMode) localStorage.removeItem('spine_planner_v2');
    };
    const loadProjectJSON = (e) => {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if (json.schema?.version === 4 || json.formatVersion >= 2) {
                    deserializeState(json);
                    // Broadcast loaded state immediately so synced windows update
                    if (syncChannelRef.current) {
                        clearTimeout(syncTimerRef.current);
                        syncChannelRef.current.postMessage({ type: 'state', payload: json });
                    }
                } else {
                    showToast(t('alert.unsupported_format'), 'error');
                    return;
                }
                showToast(t('alert.loaded'));
            } catch(err) { showToast(t('alert.invalid_file'), 'error'); }
        };
        reader.readAsText(file); e.target.value = null;
    };

    const copyPlanToCompleted = () => {
        if (plannedPlacements.length === 0 && plannedConnectors.length === 0 && plannedNotes.length === 0 && plannedCages.length === 0) return showToast(t('alert.no_plan'));

        // Filter out plan placements that already have a construct placement at the same levelId + zone
        // Also exclude force placements (force_left, force_right) - forces are plan-only
        const newPlacements = plannedPlacements.filter(p =>
            !p.zone.startsWith('force') &&
            !completedPlacements.some(cp => cp.levelId === p.levelId && cp.zone === p.zone)
        );
        const newConnectors = plannedConnectors.filter(pc =>
            !completedConnectors.some(cc => cc.levelId === pc.levelId)
        );
        const newNotes = plannedNotes.filter(pn =>
            !completedNotes.some(cn => cn.levelId === pn.levelId)
        );
        const newCages = plannedCages.filter(pc =>
            !completedCages.some(cc => cc.levelId === pc.levelId)
        );

        if (newPlacements.length === 0 && newConnectors.length === 0 && newNotes.length === 0 && newCages.length === 0) {
            return showToast(t('alert.all_confirmed'));
        }

        setCompletedPlacements(prev => [...prev, ...newPlacements.map(p => ({...p, id: genId()}))]);
        setCompletedCages(prev => [...prev, ...newCages.map(c => ({...c}))]);
        setCompletedConnectors(prev => [...prev, ...newConnectors.map(c => ({...c, id: genId()}))]);
        setCompletedNotes(prev => [...prev, ...newNotes.map(n => ({...n, id: genId()}))]);
        setActiveChart('completed');
    };

    // --- Shared sub-elements (used in both portrait and landscape) ---
    const demographicsContent = (
        <React.Fragment>
            <h2 className="font-bold text-2xl text-slate-900 mb-4 border-b-4 border-slate-900 pb-2">{t('export.title')}</h2>
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
                <div className="space-y-1 shrink-0">
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.name')}</label><div className="editable-field w-full text-xs font-semibold" contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, name: e.target.innerText})} placeholder={t('patient.click_to_enter')}>{patientData.name}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.id')}</label><div className="editable-field w-full text-xs font-mono" contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, id: e.target.innerText})} placeholder={t('patient.click_to_enter')}>{patientData.id}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.surgeon')}</label><div className="editable-field w-full text-xs" contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, surgeon: e.target.innerText})} placeholder={t('patient.click_to_enter')}>{patientData.surgeon}</div></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.date')}</label><div className="editable-field w-full text-xs cursor-pointer" onClick={() => setIsEditingDate(true)}>{isEditingDate ? <input type="date" className="w-full text-xs border-b border-slate-800 bg-transparent outline-none py-0" value={patientData.date} autoFocus onBlur={()=>setIsEditingDate(false)} onChange={e=>setPatientData({...patientData, date:e.target.value})} /> : formatDate(patientData.date)}</div></div>
                </div>
                <div className="border-t border-slate-200 my-3"></div>
                <div className="space-y-1 shrink-0">
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.supplier')}</label><select className="editable-field w-full text-xs bg-white cursor-pointer" value={patientData.company} onChange={e => { const v = e.target.value; setPatientData({...patientData, company: v}); if (AUTO_THEME_FROM_COMPANY && COMPANY_THEME_MAP[v]) { changeTheme(COMPANY_THEME_MAP[v]); } }}><option value="">{t('patient.select_supplier')}</option>{IMPLANT_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}<option value="__other">{t('patient.other')}</option></select>{patientData.company === '__other' && <div className="editable-field w-full text-xs mt-0.5" contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, company: e.target.innerText})} placeholder={t('patient.enter_company')}></div>}</div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-0">{t('patient.screw_system')}</label><ScrewSystemCombo value={patientData.screwSystem} onChange={v => setPatientData({...patientData, screwSystem: v})} company={patientData.company} placeholder={t('patient.screw_system_placeholder')} /></div>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className="shrink-0">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t('patient.bone_graft')}</h3>
                    <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
                        {BONE_GRAFT_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-1 text-[10px] text-slate-700 cursor-pointer hover:text-slate-900 leading-tight">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 shrink-0" checked={(patientData.boneGraft?.types || []).includes(opt)} onChange={e => { const types = patientData.boneGraft?.types || []; setPatientData({...patientData, boneGraft: { ...patientData.boneGraft, types: e.target.checked ? [...types, opt] : types.filter(v => v !== opt) }}); }} />
                                <span className="truncate">{BONE_GRAFT_LABEL_KEYS[opt] ? t(BONE_GRAFT_LABEL_KEYS[opt]) : opt}</span>
                            </label>
                        ))}
                    </div>
                    <div className="editable-field w-full text-[10px] mt-1" contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, boneGraft: { ...(patientData.boneGraft || {}), notes: e.target.innerText }})} placeholder={t('patient.bone_graft_notes_placeholder')}>{patientData.boneGraft?.notes || ''}</div>
                </div>
                <ImplantInventory placements={[...(showFinalInventory ? completedPlacements : plannedPlacements), ...(showFinalInventory ? completedCages : plannedCages).map(c => ({...c, tool: c.tool})), ...(showFinalInventory ? completedConnectors : plannedConnectors).map(c => ({...c, levelId: levels[0]?.id || 'T1', zone: 'mid'}))]} tools={[...allTools, {id: 'tlif', labelKey: 'inventory.cage.tlif'}, {id: 'plif', labelKey: 'inventory.cage.plif'}, {id: 'acdf', labelKey: 'inventory.cage.acdf'}, {id: 'xlif', labelKey: 'inventory.cage.xlif'}, {id: 'olif', labelKey: 'inventory.cage.olif'}, {id: 'alif', labelKey: 'inventory.cage.alif'}]} title={showFinalInventory ? t('inventory.title_construct') : t('inventory.title_plan')} visibleLevelIds={levels.map(l => l.id)} levels={levels} rods={showFinalInventory ? { left: patientData.leftRod, right: patientData.rightRod } : { left: patientData.planLeftRod, right: patientData.planRightRod }} />
                <button onClick={() => setShowFinalInventory(!showFinalInventory)} className="mt-1 w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">{showFinalInventory ? t('inventory.view_plan') : t('inventory.view_final')}</button>
            </div>
            <CreditsFooter lang={currentLang} />
        </React.Fragment>
    );

    const planChart = <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={handleZoneClick} onPlacementClick={handlePlacementClick} tools={allTools} readOnly={isViewOnly || activeChart !== 'planned'} levels={levels} showForces={true} heightScale={calculateAutoScale(levels)} cages={plannedCages} onDiscClick={handleDiscClick} connectors={plannedConnectors} onConnectorUpdate={updateConnector} onConnectorRemove={removeConnector} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={updateNotePosition} onNoteRemove={removeNote} onNoteClick={handleNoteClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-right" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, planLeftRod: e.target.innerText})} placeholder={t('patient.plan_rod_left_placeholder')}>{patientData.planLeftRod}</div></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-left" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, planRightRod: e.target.innerText})} placeholder={t('patient.plan_rod_right_placeholder')}>{patientData.planRightRod}</div></div></React.Fragment>} />;

    const constructChart = <ChartPaper title={t('export.construct')} placements={completedPlacements} ghostPlacements={isPortrait ? plannedPlacements : undefined} onGhostClick={handleGhostClick} onZoneClick={handleZoneClick} onPlacementClick={handlePlacementClick} tools={allTools} readOnly={isViewOnly || activeChart !== 'completed'} levels={levels} showForces={isPortrait} forcePlacements={isPortrait ? plannedPlacements : undefined} heightScale={calculateAutoScale(levels)} cages={completedCages} onDiscClick={handleDiscClick} connectors={completedConnectors} onConnectorUpdate={updateConnector} onConnectorRemove={removeConnector} viewMode={viewMode} notes={completedNotes} onNoteUpdate={updateNotePosition} onNoteRemove={removeNote} onNoteClick={handleNoteClick} ghostNotes={isPortrait ? plannedNotes : undefined} onGhostNoteClick={handleGhostNoteClick} ghostConnectors={isPortrait ? plannedConnectors : undefined} onGhostConnectorClick={handleGhostConnectorClick} ghostCages={isPortrait ? plannedCages : undefined} onGhostCageClick={handleGhostCageClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-right" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, leftRod: e.target.innerText})} placeholder={t('patient.rod_left_placeholder')}>{patientData.leftRod}</div></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-left" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onBlur={e => setPatientData({...patientData, rightRod: e.target.innerText})} placeholder={t('patient.rod_right_placeholder')}>{patientData.rightRod}</div></div></React.Fragment>} />;

    const newPatientAction = () => setConfirmNewPatient(true);
    const executeNewPatient = () => {
        setConfirmNewPatient(false);
        setPlannedPlacements([]); setCompletedPlacements([]);
        setPlannedCages([]); setCompletedCages([]);
        setPlannedConnectors([]); setCompletedConnectors([]);
        setPlannedNotes([]); setCompletedNotes([]);
        const emptyPatient = { name: '', id: '', surgeon: '', location: '', date: new Date().toISOString().split('T')[0], company: '', screwSystem: '', leftRod: '', rightRod: '', planLeftRod: '', planRightRod: '', boneGraft: { types: [], notes: '' } };
        setPatientData(emptyPatient);
        setActiveChart('planned');
        setDocumentId(crypto.randomUUID());
        setDocumentCreated(new Date().toISOString());
        if (syncChannelRef.current) {
            clearTimeout(syncTimerRef.current);
            const emptyV4 = serializeState();
            syncChannelRef.current.postMessage({ type: 'state', payload: {
                formatVersion: 3, patient: emptyPatient, preferences: { viewMode, colourScheme },
                plan: { implants: [], cages: [], connectors: [], notes: [] },
                construct: { implants: [], cages: [], connectors: [], notes: [] },
            }});
        }
    };

    const modals = (
        <React.Fragment>
            <ScrewModal isOpen={screwModalOpen} onClose={() => setScrewModalOpen(false)} onConfirm={handleScrewConfirm} onDelete={() => removePlacement(editingPlacementId)} initialData={editingData} initialTool={editingTool} defaultDiameter={defaultDiameter} defaultLength={defaultLength} defaultMode={defaultScrewMode} defaultCustomText={defaultCustomText} initialAnnotation={editingAnnotation} />
            <OsteotomyModal isOpen={osteoModalOpen} onClose={() => { setOsteoModalOpen(false); setOsteoDiscLevel(undefined); }} onConfirm={handleOsteoConfirm} onDelete={() => removePlacement(editingPlacementId)} initialData={editingData} defaultType={defaultOsteoType} defaultAngle={defaultOsteoAngle} discLevelOnly={osteoDiscLevel} />
            <CageModal isOpen={cageModalOpen} onClose={() => setCageModalOpen(false)} onConfirm={handleCageConfirm} onDelete={handleDeleteCage} initialData={editingData} levelId={editingCageLevel} levels={levels} />
            <ForceModal isOpen={forceModalOpen} onClose={() => setForceModalOpen(false)} onConfirm={handleForceConfirm} />
            <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
            <ChangeLogModal isOpen={changeLogOpen} onClose={() => setChangeLogOpen(false)} />
            {exportPicker && <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" onClick={() => setExportPicker(null)}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-center">{exportPicker.toUpperCase()}</div>
                    <div className="p-3 flex flex-col gap-2">
                        <button onClick={() => runExportWithChoice(exportPicker, false)} className="w-full px-4 py-3 rounded text-sm font-bold border transition-colors hover:brightness-95" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{t('export.plan')}</button>
                        <button onClick={() => runExportWithChoice(exportPicker, true)} className="w-full px-4 py-3 rounded text-sm font-bold text-white bg-slate-800 hover:bg-slate-700">{t('export.construct')}</button>
                    </div>
                </div>
            </div>}
            {confirmNewPatient && <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" onClick={() => setConfirmNewPatient(false)}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold">{t('sidebar.new_patient')}</div>
                    <div className="p-5 text-sm text-slate-600">{t('alert.new_patient')}</div>
                    <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                        <button onClick={() => setConfirmNewPatient(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={executeNewPatient} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-bold">{t('button.confirm')}</button>
                    </div>
                </div>
            </div>}
            {discPickerLevel && <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" onClick={() => setDiscPickerLevel(null)}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-[200px] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-3 py-2 text-center text-xs font-bold uppercase tracking-wider">{getDiscLabel(discPickerLevel, levels)}</div>
                    <div className="p-2 flex flex-col gap-1">
                        <button onClick={handleDiscPickCage} className="w-full px-3 py-2 rounded text-sm font-bold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors">{t('help.cages.title')}</button>
                        <button onClick={handleDiscPickOsteo} className="w-full px-3 py-2 rounded text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">{t('help.osteotomies.title')}</button>
                    </div>
                </div>
            </div>}
            <NoteModal isOpen={noteModalOpen} onClose={() => { setNoteModalOpen(false); setEditingNote(null); setPendingNoteTool(null); }} onConfirm={handleNoteConfirm} onDelete={handleNoteDelete} initialText={editingNote?.text || ''} initialShowArrow={editingNote?.showArrow || false} isEditing={!!editingNote} />
        </React.Fragment>
    );

    const themeDropdown = (
        <div className="relative">
            <button onClick={() => setThemeOpen(!themeOpen)} className="flex items-center gap-0.5 p-1 rounded hover:bg-white/10">
                {[scheme.sidebarBg, '#FFFFFF', scheme.activeBg, scheme.activeText].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: c, borderColor: scheme.sidebarBorder }}></div>
                ))}
            </button>
            {themeOpen && (
                <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl border p-1.5 z-50" style={{ backgroundColor: scheme.sidebarTitleBg, borderColor: scheme.sidebarBorder }}>
                    {COLOUR_SCHEMES.map(s => (
                        <button key={s.id} onClick={() => { changeTheme(s.id); setThemeOpen(false); }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${colourScheme === s.id ? 'ring-1 ring-white/50' : 'hover:bg-white/10'}`}>
                            <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.sidebarBg }}></div>
                            <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: '#FFFFFF' }}></div>
                            <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeBg }}></div>
                            <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeText }}></div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    // ============================================================
    // PORTRAIT LAYOUT
    // ============================================================
    if (isPortrait) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                {modals}
                <input type="file" ref={fileInputRef} onChange={loadProjectJSON} className="hidden" accept=".json" />

                {/* Portrait Toolbar */}
                <div className="portrait-toolbar flex flex-col z-20 no-print shadow-xl shrink-0" style={{ backgroundColor: scheme.sidebarBg, color: scheme.textPrimary }}>
                    {/* Row 1: Title, Theme, Language, Action icons */}
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <span className="font-bold text-sm tracking-tight shrink-0">{t('sidebar.title')}</span>
                        <button onClick={() => setChangeLogOpen(true)} className="text-[9px] font-mono opacity-50 shrink-0">{CURRENT_VERSION}</button>
                        <div className="flex-1"></div>
                        {themeDropdown}
                        <select value={currentLang} onChange={e => changeLang(e.target.value)}
                            className="bg-transparent text-[10px] border-none outline-none cursor-pointer w-14" style={{ color: scheme.textSecondary }}>
                            {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} style={{color: '#1e293b'}}>{l.code.toUpperCase()}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-0">
                            <button onClick={() => fileInputRef.current.click()} className="p-2.5 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.load')}><IconUpload /></button>
                            <button onClick={saveProjectJSON} className="p-2.5 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.save')}><IconSave /></button>
                            <button onClick={promptExportJPG} className="p-2.5 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.jpg')}><IconImage /></button>
                            <button onClick={promptExportPDF} className="p-2.5 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.pdf')}><IconPDF /></button>
                            <button onClick={() => setHelpModalOpen(true)} className="p-2.5 rounded hover:bg-white/10 hover:brightness-125" title={t('sidebar.help')}><IconHelp /></button>
                            <div className="p-2.5 rounded" style={{ color: syncConnected ? '#34d399' : scheme.textMuted }} title={syncConnected ? t('sync.linked') : t('sync.no_peer')}><IconLink />{syncConnected && <span className="inline-block ml-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}</div>
                        </div>
                    </div>

                    {/* Row 2: Editing tools (tablet+) or view-only banner (phone) */}
                    {isViewOnly ? (
                        <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                            <div className="flex-1 text-[10px] italic" style={{ color: scheme.textMuted }}>{t('portrait.view_only')}</div>
                            <div className="flex gap-0.5 shrink-0">
                                {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                                    const shortLabels = { cervical: 'C', thoracolumbar: 'T', t10_pelvis: 'L', whole: t('sidebar.view.whole_short') };
                                    const active = viewMode === vm;
                                    return <button key={vm} onClick={() => setViewMode(vm)} title={t('sidebar.view.' + vm)} className={`px-3 py-2 text-[10px] rounded border font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{shortLabels[vm]}</button>;
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                            <div className="flex gap-0.5 overflow-x-auto flex-1 min-w-0">
                                {tools[0].items.map(item => {
                                    const active = selectedTool === item.id;
                                    return <button key={item.id} onClick={() => setSelectedTool(item.id)} title={t(item.labelKey)} className={`shrink-0 px-2.5 py-2 rounded border flex items-center gap-1 text-[10px] font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                                        <InstrumentIcon type={item.icon} className="w-3 h-3" color={active ? scheme.activeText : scheme.textSecondary} />
                                    </button>;
                                })}
                            </div>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <div className="flex gap-0.5 shrink-0">
                                {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                                    const shortLabels = { cervical: 'C', thoracolumbar: 'T', t10_pelvis: 'L', whole: t('sidebar.view.whole_short') };
                                    const active = viewMode === vm;
                                    return <button key={vm} onClick={() => setViewMode(vm)} title={t('sidebar.view.' + vm)} className={`px-3 py-2 text-[10px] rounded border font-bold ${active ? '' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{shortLabels[vm]}</button>;
                                })}
                            </div>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => { copyPlanToCompleted(); switchPortraitTab(2); }} className="flex items-center gap-1 px-2.5 py-2 rounded text-[10px] font-bold hover:bg-white/10 hover:brightness-125 shrink-0 border" style={{ borderColor: 'rgba(255,255,255,0.2)' }} title={t('sidebar.confirm_plan_tooltip')}><IconCopy /> {t('sidebar.confirm_all')}</button>
                            <div className={`shrink-0 w-5 h-5 rounded-full cursor-pointer ${incognitoMode ? 'bg-red-500' : 'bg-white/20'}`} onClick={() => setIncognitoMode(!incognitoMode)} title={t('sidebar.session_privacy')}></div>
                            <button onClick={newPatientAction} className="p-2.5 rounded shrink-0" style={{ color: '#dc2626' }} title={t('sidebar.new_patient')}><IconTrash /></button>
                        </div>
                    )}
                </div>

                {/* Portrait Tab Bar */}
                <div className="portrait-tabs flex shrink-0 z-10" style={{ backgroundColor: scheme.sidebarTitleBg, color: scheme.titleText }}>
                    {PORTRAIT_TABS.map((tabKey, i) => {
                        const active = portraitTab === i;
                        return (
                            <button key={tabKey} onClick={() => switchPortraitTab(i)}
                                className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${active ? '' : 'opacity-60 hover:opacity-80 border-transparent'}`}
                                style={active ? { color: scheme.activeText, backgroundColor: scheme.activeBg, borderColor: scheme.activeText } : undefined}>
                                {t(tabKey)}
                            </button>
                        );
                    })}
                </div>

                {/* Portrait Content - swipeable tabs */}
                <div ref={portraitContentRef} className="flex-1 overflow-hidden relative bg-slate-300"
                    onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div style={{ width: PORTRAIT_COL_W[portraitTab], height: PORTRAIT_COL_H, transform: `scale(${portraitScale})`, transformOrigin: 'center center' }}>
                            {portraitTab === 0 && (
                                <div className="w-full h-full overflow-y-auto bg-white p-8 flex flex-col">
                                    {demographicsContent}
                                </div>
                            )}
                            {portraitTab === 1 && (
                                <div className="w-full h-full flex flex-col bg-white">
                                    {planChart}
                                </div>
                            )}
                            {portraitTab === 2 && (
                                <div className="w-full h-full flex flex-col bg-white">
                                    {constructChart}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hidden off-screen export container for PDF/JPG - only mounted during export to avoid duplicate React elements */}
                {portraitExporting && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                        <div id="export-container" ref={exportRef}>
                            <div className="w-[370px] bg-white border-r border-slate-300 flex flex-col p-8">
                                <CreditsFooter lang={currentLang} />
                            </div>
                            <div className="flex-[4] flex flex-col h-full">
                                <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={true} heightScale={calculateAutoScale(levels)} cages={plannedCages} onDiscClick={() => {}} connectors={plannedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{patientData.planLeftRod}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{patientData.planRightRod}</span></div></React.Fragment>} />
                            </div>
                            <div className="flex-[3] flex flex-col h-full">
                                <ChartPaper title={t('export.construct')} placements={completedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={false} heightScale={calculateAutoScale(levels)} cages={completedCages} onDiscClick={() => {}} connectors={completedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={completedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{patientData.leftRod}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{patientData.rightRod}</span></div></React.Fragment>} />
                            </div>
                            <div className="absolute bottom-1 right-2 text-[8px] text-slate-300 font-mono">{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                )}
            {!disclaimerAccepted && <DisclaimerModal lang={currentLang} onLangChange={changeLang} onAccept={() => { acceptDisclaimer(currentLang); setDisclaimerTick(n => n + 1); if (syncChannelRef.current) syncChannelRef.current.postMessage({ type: 'lang_accepted', appVersion: CURRENT_VERSION, lang: currentLang }); }} />}
            </div>
        );
    }

    // ============================================================
    // LANDSCAPE LAYOUT (unchanged)
    // ============================================================
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {modals}

            <div className="flex-1 overflow-hidden bg-slate-200 flex relative">
                <aside className="w-[340px] flex flex-col z-20 overflow-y-auto no-print shadow-xl" style={{ backgroundColor: scheme.sidebarBg, borderRight: `1px solid ${scheme.sidebarBorder}`, color: scheme.textPrimary }}>
                    {/* 1. Tool Palette - most used, top position */}
                    <div className="p-3 space-y-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        {tools.map((g,i) => (
                            <div key={i}>
                                <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t(g.categoryKey)}</h3>
                                <div className="grid grid-cols-2 gap-1">
                                    {g.items.map(item => {
                                        const active = selectedTool === item.id;
                                        return <button key={item.id} onClick={() => setSelectedTool(item.id)} className={`p-1 h-10 rounded border flex flex-col items-center justify-center gap-0.5 transition-all text-xs ${active ? 'font-bold' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                                            <InstrumentIcon type={item.icon} className="w-3.5 h-3.5" color={active ? scheme.activeText : scheme.textSecondary} />
                                            <span className="text-center text-[10px] leading-tight">{t(item.labelKey)}</span>
                                        </button>;
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 2. Plan/Construct Toggle + Confirm Plan - workflow controls */}
                    <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.editing')}</h3>
                        <div className="flex rounded p-1 border" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>
                            <button onClick={() => setActiveChart('planned')} className={`flex-1 px-3 py-1.5 rounded transition-all text-xs ${activeChart==='planned'?'font-bold':'hover:brightness-125'}`} style={activeChart==='planned' ? { backgroundColor: scheme.activeBg, color: scheme.activeText } : undefined}>{t('sidebar.plan')}</button>
                            <button onClick={() => setActiveChart('completed')} className={`flex-1 px-3 py-1.5 rounded transition-all text-xs ${activeChart==='completed'?'font-bold':'hover:brightness-125'}`} style={activeChart==='completed' ? { backgroundColor: scheme.activeBg, color: scheme.activeText } : undefined}>{t('sidebar.construct')}</button>
                        </div>
                        <button onClick={copyPlanToCompleted} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold border transition-colors hover:brightness-125 mt-2" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder, color: scheme.textSecondary }} title={t('sidebar.confirm_plan_tooltip')}><IconCopy /> {t('sidebar.confirm_all')}</button>
                    </div>

                    {/* 3. Region View */}
                    <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <h3 className="text-[10px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.region_view')}</h3>
                        <div className="grid grid-cols-2 gap-1">
                            {['cervical','thoracolumbar','t10_pelvis','whole'].map(vm => {
                                const labels = { cervical: t('sidebar.view.cervical'), thoracolumbar: t('sidebar.view.thoracolumbar'), t10_pelvis: t('sidebar.view.t10_pelvis'), whole: t('sidebar.view.whole') };
                                const active = viewMode === vm;
                                return <button key={vm} onClick={() => setViewMode(vm)} className={`py-1.5 px-1 text-[10px] rounded border font-bold transition-all ${active ? 'border-transparent' : 'hover:brightness-125'}`} style={active ? { backgroundColor: scheme.activeBg, color: scheme.activeText, borderColor: scheme.activeBorder } : { backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{labels[vm]}</button>;
                            })}
                        </div>
                    </div>

                    {/* 4. File Operations */}
                    <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <input type="file" ref={fileInputRef} onChange={loadProjectJSON} className="hidden" accept=".json" />
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconUpload /> {t('sidebar.load')}</button>
                            <button onClick={saveProjectJSON} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconSave /> {t('sidebar.save')}</button>
                            <button onClick={promptExportJPG} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconImage /> {t('sidebar.jpg')}</button>
                            <button onClick={promptExportPDF} className="flex items-center justify-center gap-1 hover:brightness-125 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconPDF /> {t('sidebar.pdf')}</button>
                        </div>
                    </div>

                    {/* 5. Session Privacy */}
                    <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <div className={`flex items-center gap-2 px-2 py-2 rounded border cursor-pointer transition-colors ${incognitoMode ? 'bg-red-900/30 border-red-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`} onClick={() => setIncognitoMode(!incognitoMode)}>
                            <div className="relative inline-block w-10 h-5 align-middle select-none shrink-0"><input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300" style={{ top: 0, left: 0 }} checked={incognitoMode} onChange={(e) => setIncognitoMode(e.target.checked)}/><label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer border ${incognitoMode ? 'bg-red-600 border-red-600' : 'bg-slate-600 border-slate-600'}`}></label></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: incognitoMode ? '#dc2626' : scheme.textMuted }}>{t('sidebar.session_privacy')}</span>
                        </div>
                    </div>

                    {/* 6. Theme & Language - preferences, rarely changed */}
                    <div className="p-3" style={{ borderBottom: `1px solid ${scheme.sidebarBorder}` }}>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button onClick={() => setThemeOpen(!themeOpen)} className="flex items-center gap-1.5 hover:brightness-125 py-1 rounded transition-colors">
                                    <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: scheme.textMuted }}>{t('sidebar.theme')}</span>
                                    <div className="flex gap-0.5">
                                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.sidebarBg, borderColor: scheme.sidebarBorder }}></div>
                                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#FFFFFF', borderColor: scheme.sidebarBorder }}></div>
                                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.activeBg, borderColor: scheme.sidebarBorder }}></div>
                                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: scheme.activeText, borderColor: scheme.sidebarBorder }}></div>
                                    </div>
                                </button>
                                {themeOpen && (
                                    <div className="absolute left-0 bottom-full mb-1 rounded-lg shadow-xl border p-1.5 z-50" style={{ backgroundColor: scheme.sidebarTitleBg, borderColor: scheme.sidebarBorder }}>
                                        {COLOUR_SCHEMES.map(s => (
                                            <button key={s.id} onClick={() => { changeTheme(s.id); setThemeOpen(false); }}
                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${colourScheme === s.id ? 'ring-1 ring-white/50' : 'hover:bg-white/10'}`}>
                                                <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.sidebarBg }}></div>
                                                <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: '#FFFFFF' }}></div>
                                                <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeBg }}></div>
                                                <div className="w-4 h-4 rounded-full border shrink-0" style={{ borderColor: scheme.sidebarBorder, backgroundColor: s.activeText }}></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="font-bold text-[10px] uppercase tracking-widest shrink-0" style={{ color: scheme.textMuted }}>{t('sidebar.language')}</span>
                                <select value={currentLang} onChange={e => changeLang(e.target.value)}
                                    className="flex-1 min-w-0 bg-transparent text-[10px] border-none outline-none cursor-pointer" style={{ color: scheme.textSecondary }}>
                                    {SUPPORTED_LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code} style={{color: '#1e293b'}}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Spacer to push bottom items down */}
                    <div className="flex-1"></div>

                    {/* 7. Help - prominent, bottom right */}
                    <div className="p-3" style={{ borderTop: `1px solid ${scheme.sidebarBorder}` }}>
                        <button onClick={() => setHelpModalOpen(true)} className="w-full flex items-center justify-center gap-2 hover:brightness-125 px-3 py-2 rounded text-xs font-bold border transition-colors hover:brightness-125" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}><IconHelp /> {t('sidebar.help')}</button>
                    </div>

                    {/* 8. Utility row - version, new patient, sync */}
                    <div className="px-3 pb-1 flex items-center gap-1">
                        <div className="flex items-center justify-center px-1.5 py-1.5 rounded text-[10px]" style={{ color: syncConnected ? '#34d399' : scheme.textMuted }} title={syncConnected ? t('sync.linked') : t('sync.no_peer')}><IconLink />{syncConnected && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}</div>
                        <button onClick={() => setChangeLogOpen(true)} className="flex items-center justify-center px-2 py-1.5 rounded text-[10px] font-mono" style={{ color: scheme.textMuted }}>{CURRENT_VERSION}</button>
                        <div className="flex-1"></div>
                        <button onClick={newPatientAction} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold" style={{ color: '#dc2626' }}>
                            <IconTrash /> {t('sidebar.new_patient')}
                        </button>
                    </div>

                    <CreditsFooter lang={currentLang} />
                </aside>

                <div ref={containerWrapperRef} id="print-wrapper" className="flex-1 flex items-center justify-center p-8 bg-slate-300 overflow-hidden relative">
                    <div style={{ transform: `scale(${scale})` }}>
                        <div id="export-container" ref={exportRef}>
                            <div className="w-[370px] bg-white border-r border-slate-300 flex flex-col p-8">{demographicsContent}</div>
                            <div className="flex-[4] flex flex-col h-full relative" style={activeChart === 'planned' ? { borderTop: `3px solid ${scheme.activeBg}` } : undefined} onClick={() => activeChart !== 'planned' && setActiveChart('planned')}>
                                {planChart}
                                {activeChart !== 'planned' && !isPortrait && <div className="absolute inset-0 bg-slate-400/20 cursor-pointer z-20" data-export-hide="true" />}
                            </div>
                            <div className="flex-[3] flex flex-col h-full relative" style={activeChart === 'completed' ? { borderTop: `3px solid ${scheme.activeBg}` } : undefined} onClick={() => activeChart !== 'completed' && setActiveChart('completed')}>
                                {constructChart}
                                {activeChart !== 'completed' && !isPortrait && <div className="absolute inset-0 bg-slate-400/20 cursor-pointer z-20" data-export-hide="true" />}
                            </div>
                            <div className="absolute bottom-1 right-2 text-[8px] text-slate-300 font-mono">{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Toast notifications */}
            {toasts.length > 0 && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-[fadeIn_0.2s_ease-out] ${toast.type === 'error' ? 'bg-red-800 text-white' : 'bg-slate-800 text-white'}`}>
                        <span>{toast.message}</span>
                        <button onClick={() => dismissToast(toast.id)} className="ml-1 hover:brightness-125 text-xs font-bold">✕</button>
                    </div>
                ))}
            </div>}
            {!disclaimerAccepted && <DisclaimerModal lang={currentLang} onLangChange={changeLang} onAccept={() => { acceptDisclaimer(currentLang); setDisclaimerTick(n => n + 1); if (syncChannelRef.current) syncChannelRef.current.postMessage({ type: 'lang_accepted', appVersion: CURRENT_VERSION, lang: currentLang }); }} />}
        </div>
    );
};

export default App;
