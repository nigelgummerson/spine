import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { t, detectLanguage, getCurrentLang, setCurrentLang, SUPPORTED_LANGUAGES, LOCALE_MAP } from './i18n/i18n';
import { genId } from './utils/id';
import usePortrait from './hooks/usePortrait';
import { useExport } from './hooks/useExport';
import { CURRENT_VERSION, CHANGE_LOG, formatDate } from './data/changelog';
import { BONE_GRAFT_OPTIONS, BONE_GRAFT_LABEL_KEYS, IMPLANT_COMPANIES, SCREW_SYSTEMS,
         DIAMETER_OPTIONS, LENGTH_OPTIONS } from './data/implants';
import { _light, _dark, COLOUR_SCHEMES, AUTO_THEME_FROM_COMPANY, COMPANY_THEME_MAP } from './data/themes';
import { CAGE_PERMISSIBILITY, HOOK_TYPES, NO_SIZE_TYPES, NOTE_PRESET_KEYS, CAGE_TYPES,
         APPROACH_GROUPS, getDiscLabel, FORCE_TYPES, INVENTORY_CATEGORIES, getPermittedOsteotomyTypes } from './data/clinical';
import { REGIONS, getLevelHeight,
         ALL_LEVELS, DISC_MIN_PX, getDiscHeight, buildHeightMap,
         levelToYNorm, yNormToRenderedY, renderedYToYNorm, CHART_CONTENT_HEIGHT,
         calculateAutoScale } from './data/anatomy';
import { IconTrash, IconDownload, IconImage, IconCopy, IconUpload, IconSave,
         IconCC, IconX, IconPDF, IconHelp, IconLink, IconHistory, IconCardinal, IconGear } from './components/icons';
import { ChangeLogModal } from './components/modals/ChangeLogModal';
import { HelpModal } from './components/modals/HelpModal';
import { PreferencesModal } from './components/modals/PreferencesModal';
import { ScrewModal, modalKeyHandler } from './components/modals/ScrewModal';
import { getNextEmptyLevel } from './utils/screwNavigation';
import { CageModal } from './components/modals/CageModal';
import { OsteotomyModal } from './components/modals/OsteotomyModal';
import { ForceModal } from './components/modals/ForceModal';
import { NoteModal } from './components/modals/NoteModal';
import { ScrewSystemCombo } from './components/ScrewSystemCombo';
import { CreditsFooter } from './components/CreditsFooter';
import { DemographicsPanel } from './components/DemographicsPanel';
import { ImplantInventory } from './components/ImplantInventory';
import { Sidebar } from './components/Sidebar';
import { PortraitToolbar } from './components/PortraitToolbar';
import { ChartPaper } from './components/chart/ChartPaper';
import { InstrumentIcon } from './components/chart/InstrumentIcon';
import { Portal } from './components/Portal';
import { DisclaimerModal, isDisclaimerAccepted, acceptDisclaimer, resetDisclaimer, getDisclaimerTimestamp } from './components/modals/DisclaimerModal';
import { OnboardingTour } from './components/OnboardingTour';
import { useDocumentState } from './hooks/useDocumentState';
import { useToast } from './hooks/useToast';
import type { ColourScheme, ToolDefinition, Placement, Level, Zone, OsteotomyData, CageData, Cage, Note } from './types';

/** Data shape returned by CageModal.onConfirm */
interface CageConfirmData {
    type: string;
    height: string;
    width: string;
    length: string;
    lordosis: string;
    side: string;
}

/** Data shape returned by OsteotomyModal.onConfirm */
interface OsteotomyConfirmData {
    type: string;
    angle: string | null;
    shortLabel: string;
    reconstructionCage: string;
}

/** Detail components returned by ScrewModal's computeDetails() */
interface ScrewDetails {
    diameter: string;
    length: string;
    mode: string;
    customText: string;
}

/** Editing data can be placement data, cage data for ghost cages, or undefined for new entries */
type EditingData = string | OsteotomyData | CageData | Cage | null | undefined;

/** Paste handler for contentEditable fields — strips HTML, inserts plain text only. */
const handlePastePlainText = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
};

const App = () => {
    const [selectedTool, setSelectedTool] = useState('implant');
    const [lastUsedScrewType, setLastUsedScrewType] = useState('polyaxial');
    const [activeChart, setActiveChart] = useState(() => {
        const savedTab = localStorage.getItem('spine_planner_tab');
        return savedTab === '2' ? 'completed' : 'planned';
    }); 
    const [colourScheme, setColourScheme] = useState(() => {
        const stored = localStorage.getItem('spine_planner_theme');
        return (stored && COLOUR_SCHEMES.some(s => s.id === stored)) ? stored : 'default';
    });
    const [showFinalInventory, setShowFinalInventory] = useState(false);
    const [currentLang, setCurrentLangState] = useState(detectLanguage());

    const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
    const isRTL = RTL_LANGUAGES.includes(currentLang);

    const changeLang = (code: string) => {
        setCurrentLang(code);
        setCurrentLangState(code);
        document.documentElement.lang = code;
        document.documentElement.dir = RTL_LANGUAGES.includes(code) ? 'rtl' : 'ltr';
        localStorage.setItem('spine_planner_lang', code);
    };

    // Set initial dir attribute on mount
    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }, [isRTL]);

    const changeTheme = (id: string) => {
        setColourScheme(id);
        localStorage.setItem('spine_planner_theme', id);
    };
    const [viewMode, setViewMode] = useState('thoracolumbar');
    const [showPelvis, setShowPelvis] = useState(() => localStorage.getItem('spine_planner_pelvis') === 'true');
    const togglePelvis = () => { setShowPelvis(v => { const next = !v; localStorage.setItem('spine_planner_pelvis', String(next)); return next; }); };
    const [useRegionDefaults, setUseRegionDefaults] = useState(() => localStorage.getItem('spine_planner_region_defaults') === 'true');
    const toggleRegionDefaults = () => { setUseRegionDefaults(v => { const next = !v; localStorage.setItem('spine_planner_region_defaults', String(next)); return next; }); };
    const [confirmAndNextDefault, setConfirmAndNextDefault] = useState(() => localStorage.getItem('spine_planner_confirm_next_default') === 'true');
    const toggleConfirmAndNextDefault = () => { setConfirmAndNextDefault(v => { const next = !v; localStorage.setItem('spine_planner_confirm_next_default', String(next)); return next; }); };
    const [scale, setScale] = useState(1);
    const [incognitoMode, setIncognitoMode] = useState(false);

    // TOAST NOTIFICATIONS (via context — ToastProvider wraps App in main.tsx)
    const { showToast } = useToast();
    const lastClickRef = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const capture = (e: MouseEvent) => {
            lastClickRef.current = { x: e.clientX, y: e.clientY };
            // Deactivate keyboard navigation on mouse click
            setKbNavActive(false);
            setKbFocusLevel(null);
        };
        window.addEventListener('click', capture, true);
        return () => window.removeEventListener('click', capture, true);
    }, []);

    // DOCUMENT STATE (clinical data, sync, auto-save)
    const { state, dispatch, serialize, syncChannelRef, syncConnected, hasLoaded, canUndo, canRedo, undo, redo } = useDocumentState({
        viewMode, colourScheme, changeTheme, changeLang, incognitoMode, currentLang, setViewMode, showToast,
        showPelvis, useRegionDefaults, confirmAndNext: confirmAndNextDefault,
        setShowPelvis, setUseRegionDefaults, setConfirmAndNext: setConfirmAndNextDefault,
    });
    const {
        patientData, plannedPlacements, completedPlacements,
        plannedCages, completedCages, plannedConnectors, completedConnectors,
        plannedNotes, completedNotes, reconLabelPositions,
    } = state;
    const setPatientField = (field: string, value: string) => dispatch({ type: 'SET_PATIENT_FIELD', field, value });

    // MODALS — single discriminated state for exclusive modals
    type ModalId = 'screw' | 'osteotomy' | 'cage' | 'force' | 'help' | 'note' | 'changelog' | 'preferences' | null;
    const [openModal, setOpenModal] = useState<ModalId>(null);
    const [forcePopover, setForcePopover] = useState<{ x: number; y: number; existingTool: string | null; existingId: string | null } | null>(null);
    const [pendingNoteTool, setPendingNoteTool] = useState<{ tool: string; levelId: string; offsetX: number; offsetY: number } | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const [confirmNewPatient, setConfirmNewPatient] = useState(false);
    const [confirmClearConstruct, setConfirmClearConstruct] = useState(false);
    const [exportPicker, setExportPicker] = useState<string | null>(null);
    // Disclaimer: shown on first load and after New Patient
    const [disclaimerTick, setDisclaimerTick] = useState(0);
    const disclaimerAccepted = isDisclaimerAccepted(currentLang);

    // EDITING STATE
    // Track recently confirmed placements (not yet in rendered state) for Confirm & Next skip logic
    const recentPlacementsRef = useRef<{ levelId: string; zone: string }[]>([]);
    const [pendingPlacement, setPendingPlacement] = useState<{ levelId: string; zone: string; tool: string } | null>(null);
    const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<EditingData>(undefined);
    const [editingTool, setEditingTool] = useState<string | null>(null);
    const [editingCageLevel, setEditingCageLevel] = useState<string | null>(null);
    const [discPickerLevel, setDiscPickerLevel] = useState<{ levelId: string; x: number; y: number } | null>(null);
    const [editingAnnotation, setEditingAnnotation] = useState('');

    // KEYBOARD NAVIGATION STATE
    const [kbFocusLevel, setKbFocusLevel] = useState<number | null>(null); // index into levels array
    const [kbFocusZone, setKbFocusZone] = useState<'left' | 'right' | 'mid'>('left');
    const [kbNavActive, setKbNavActive] = useState(false); // true only when navigating via keyboard

    const [defaultDiameter, setDefaultDiameter] = useState('6.5');
    const [defaultLength, setDefaultLength] = useState('45');
    const [defaultScrewMode, setDefaultScrewMode] = useState('standard');
    const [defaultCustomText, setDefaultCustomText] = useState('');
    const [defaultOsteoType, setDefaultOsteoType] = useState('PSO');
    const [defaultOsteoAngle, setDefaultOsteoAngle] = useState('25');
    const [osteoDiscLevel, setOsteoDiscLevel] = useState<boolean | undefined>(undefined);
    const [pendingForceZone, setPendingForceZone] = useState<{ levelId: string; zone: string } | null>(null);
    
    const exportRef = useRef<HTMLDivElement>(null);
    const containerWrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const switchPortraitTab = useCallback((tab: number) => {
        setPortraitTab(tab);
        localStorage.setItem('spine_planner_tab', String(tab));
        if (tab === 1) setActiveChart('planned');
        else if (tab === 2) setActiveChart('completed');
    }, []);
    const portraitContentRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const [portraitScale, setPortraitScale] = useState(1);
    // Fixed column sizes matching the export container proportions
    const PORTRAIT_COL_W = [370, 637, 637, 637]; // demographics, plan, construct, inventory
    const PORTRAIT_COL_H = 1050;

    // Swipe gesture detection for portrait tab switching
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isPortrait) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, [isPortrait]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!isPortrait || !touchStartRef.current) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const elapsed = Date.now() - touchStartRef.current.time;
        touchStartRef.current = null;
        // Only trigger on predominantly horizontal swipes with min 50px threshold
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
            if (dx < 0 && portraitTab < 3) switchPortraitTab(portraitTab + 1);
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

        if (viewMode !== 'cervical') {
            ['L1','L2','L3','L4','L5'].forEach(l => lvls.push({ id:l, type:'L' }));
            lvls.push({ id:'S1', type:'S' });
            if (showPelvis) {
                lvls.push({ id: 'S2', type: 'S' });
                lvls.push({ id: 'S2AI', type: 'pelvic' });
                lvls.push({ id: 'Iliac', type: 'pelvic' });
                lvls.push({ id: 'SI-J', type: 'pelvic' });
            }
        }
        return lvls;
    }, [viewMode, showPelvis]);

    // KEYBOARD SHORTCUTS — only when no modal is open and no editable field is focused
    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            // Skip if any modal is open
            if (openModal !== null || forcePopover || !disclaimerAccepted) return;

            // Undo/Redo — Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y (works even when editable fields are focused)
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) { undo(); showToast(t('alert.undone'), 'info'); }
                return;
            }
            if (mod && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                if (canRedo) { redo(); showToast(t('alert.redone'), 'info'); }
                return;
            }

            // Skip remaining shortcuts if focus is in an editable field
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;

            // Arrow key navigation for spine chart
            const navLevels = levels.filter(l => l.type !== 'pelvic');
            const zoneOrder: ('left' | 'mid' | 'right')[] = ['left', 'mid', 'right'];
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                setKbNavActive(true);
                if (kbFocusLevel === null) {
                    // Start at first visible level's left zone
                    setKbFocusLevel(0);
                    setKbFocusZone('left');
                    return;
                }
                if (e.key === 'ArrowDown') {
                    setKbFocusLevel(prev => prev !== null && prev < navLevels.length - 1 ? prev + 1 : prev);
                } else if (e.key === 'ArrowUp') {
                    setKbFocusLevel(prev => prev !== null && prev > 0 ? prev - 1 : prev);
                } else if (e.key === 'ArrowRight') {
                    setKbFocusZone(prev => {
                        const idx = zoneOrder.indexOf(prev);
                        return idx < zoneOrder.length - 1 ? zoneOrder[idx + 1] : prev;
                    });
                } else if (e.key === 'ArrowLeft') {
                    setKbFocusZone(prev => {
                        const idx = zoneOrder.indexOf(prev);
                        return idx > 0 ? zoneOrder[idx - 1] : prev;
                    });
                }
                return;
            }
            // Enter/Space — activate focused zone
            if ((e.key === 'Enter' || e.key === ' ') && kbNavActive && kbFocusLevel !== null) {
                e.preventDefault();
                const focusedLvl = navLevels[kbFocusLevel];
                if (focusedLvl) {
                    if (kbFocusZone === 'mid') {
                        handleZoneClick(focusedLvl.id, 'mid');
                    } else {
                        handleZoneClick(focusedLvl.id, kbFocusZone);
                    }
                }
                return;
            }
            // Escape — clear keyboard focus
            if (e.key === 'Escape' && kbNavActive) {
                e.preventDefault();
                setKbNavActive(false);
                setKbFocusLevel(null);
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'c': setViewMode('cervical'); break;
                case 'l': setViewMode('t10_pelvis'); break;
                case 't': setViewMode('thoracolumbar'); break;
                case 'w': setViewMode('whole'); break;
                case 'p': if (viewMode !== 'cervical') togglePelvis(); break;
                case 'i': setSelectedTool('implant'); break;
                case 'n': setSelectedTool('note'); break;
                default: return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [openModal, forcePopover, disclaimerAccepted, viewMode, canUndo, canRedo, levels, kbFocusLevel, kbFocusZone, kbNavActive]);

    const heightScale = useMemo(() => calculateAutoScale(levels), [levels]);

    // Compute focused level ID for keyboard navigation (excludes pelvic levels)
    const navLevels = useMemo(() => levels.filter(l => l.type !== 'pelvic'), [levels]);
    const kbFocusLevelId = kbNavActive && kbFocusLevel !== null && kbFocusLevel < navLevels.length ? navLevels[kbFocusLevel].id : null;

    // Reset keyboard focus when view mode changes (levels change)
    useEffect(() => { setKbFocusLevel(null); setKbNavActive(false); }, [viewMode, showPelvis]);

    const scheme: ColourScheme = COLOUR_SCHEMES.find(s => s.id === colourScheme) || COLOUR_SCHEMES[0];


    // SYNC LANGUAGE ON MOUNT
    useEffect(() => {
        setCurrentLang(currentLang);
        document.documentElement.lang = currentLang;
    }, []);

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
    const allTools: ToolDefinition[] = [
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
    const handleZoneClick = (levelId: string, zone: string) => {
        const isForceZone = zone.startsWith('force');

        // Force zones → popover to pick force type, regardless of selected tool
        if (isForceZone) {
            // If force already placed here, find it for edit/replace
            const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
            const existingForce = currentPlacements.find(p => p.levelId === levelId && p.zone === zone);
            setPendingForceZone({ levelId, zone });
            setForcePopover({ x: lastClickRef.current.x, y: lastClickRef.current.y, existingTool: existingForce?.tool || null, existingId: existingForce?.id || null });
            return;
        }

        // ANNOTATION MODE: when note/pin selected, non-force clicks place notes
        if (selectedTool === 'note') {
            const levelObj = levels.find(l => l.id === levelId);
            const vertH = levelObj ? getLevelHeight(levelObj) * heightScale : 30;
            setPendingNoteTool({ tool: selectedTool, levelId, offsetX: -140, offsetY: Math.round(vertH / 2) });
            setEditingNote(null);
            setOpenModal('note');
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
            setEditingTool(lastUsedScrewType);
            setEditingAnnotation('');
            setEditingData(undefined); // ScrewModal handles region defaults internally
            setOpenModal('screw');
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
        } else if (!levelId.startsWith('S')) {
            // Default: open osteotomy modal (Schwab 3+) — not for sacral levels
            const permitted = getPermittedOsteotomyTypes(levelId);
            if (permitted !== null && permitted.length === 0) {
                showToast(t('alert.no_osteotomy_at_level'), 'error');
                return;
            }
            setPendingPlacement({ levelId, zone, tool: 'osteotomy' });
            setEditingPlacementId(null);
            setEditingData(undefined);
            setOsteoDiscLevel(false);
            setOpenModal('osteotomy');
        }
    };

    const handleForceConfirm = (forceType: string) => {
        if (pendingForceZone) {
            addPlacement(pendingForceZone.levelId, pendingForceZone.zone, forceType, null);
            setPendingForceZone(null);
        }
    };

    const handleDiscClick = (levelId: string) => {
        if (levelId === 'Oc' || levelId === 'C1' || levelId === 'S1' || levelId === 'S2' || levelId === 'Pelvis') return showToast(t('alert.no_disc_space'), 'error');

        // If disc-level osteotomy exists, edit it
        const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
        const existingOsteo = currentPlacements.find(p => p.levelId === levelId && p.zone === 'disc');
        if (existingOsteo) { handlePlacementClick(existingOsteo); return; }

        // If cage exists, edit it
        const currentCages = activeChart === 'planned' ? plannedCages : completedCages;
        const existingCage = currentCages.find(c => c.levelId === levelId);
        if (existingCage) { setEditingCageLevel(levelId); setEditingData(existingCage); setOpenModal('cage'); return; }

        // Nothing exists - show picker (cage vs osteotomy)
        // Cervical disc levels: no disc-level osteotomies permitted (Facet/Ponte blocked, Corpectomy is vertebral-body only)
        const permitted = getPermittedOsteotomyTypes(levelId);
        const hasDiscOsteo = permitted === null || permitted.some(id => id === 'Facet' || id === 'Ponte');
        if (!hasDiscOsteo) {
            // Skip picker — go straight to cage modal
            const anyPermitted = Object.values(CAGE_PERMISSIBILITY).some(arr => arr.includes(levelId));
            if (!anyPermitted) return showToast(t('alert.no_cage_types', { level: getDiscLabel(levelId, levels) }), 'error');
            setEditingCageLevel(levelId);
            setEditingData(undefined);
            setOpenModal('cage');
            return;
        }
        setDiscPickerLevel({ levelId, x: lastClickRef.current.x, y: lastClickRef.current.y });
    };
    const handleDiscPickCage = () => {
        const levelId = discPickerLevel!.levelId;
        setDiscPickerLevel(null);
        const anyPermitted = Object.values(CAGE_PERMISSIBILITY).some(arr => arr.includes(levelId));
        if (!anyPermitted) return showToast(t('alert.no_cage_types', { level: getDiscLabel(levelId, levels) }), 'error');
        setEditingCageLevel(levelId);
        setEditingData(undefined);
        setOpenModal('cage');
    };
    const handleDiscPickOsteo = () => {
        const levelId = discPickerLevel!.levelId;
        setDiscPickerLevel(null);
        setPendingPlacement({ levelId, zone: 'disc', tool: 'osteotomy' });
        setEditingPlacementId(null);
        setEditingData(undefined);
        setOsteoDiscLevel(true);
        setOpenModal('osteotomy');
    };

    const handleCageConfirm = (data: CageConfirmData) => {
        const lvl = editingCageLevel!;
        const permitted = CAGE_PERMISSIBILITY[data.type] || [];
        if (!permitted.includes(lvl)) {
            const cageType = CAGE_TYPES.find(ct => ct.id === data.type);
            return showToast(t('alert.cage_not_permitted', { cageType: cageType?.label || data.type.toUpperCase(), level: getDiscLabel(lvl, levels) }), 'error');
        }

        dispatch({
            type: 'SET_CAGE',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            cage: { id: genId(), levelId: lvl, tool: data.type, data: { height: data.height, width: data.width, length: data.length, lordosis: data.lordosis, side: data.side } },
        });
    };

    const handleDeleteCage = () => {
        dispatch({ type: 'REMOVE_CAGE', chart: activeChart === 'planned' ? 'plan' : 'construct', levelId: editingCageLevel! });
        setOpenModal(null);
    };

    const handlePlacementClick = (p: Placement) => {
        const tool = allTools.find(item => item.id === p.tool);
        const isHookType = NO_SIZE_TYPES.includes(p.tool);
        if (tool?.needsSize || isHookType) { setEditingPlacementId(p.id); setEditingData(p.data); setEditingTool(p.tool); setEditingAnnotation(p.annotation || ''); setOpenModal('screw'); }
        else if (tool?.isOsteotomy) { setEditingPlacementId(p.id); setEditingData(p.data); setOsteoDiscLevel(p.zone === 'disc' ? true : false); setOpenModal('osteotomy'); }
        else { removePlacement(p.id); }
    };

    const handleGhostClick = (ghost: Placement) => {
        // Ensure we're editing construct side
        setActiveChart('completed');

        const tool = allTools.find(item => item.id === ghost.tool);
        const isHookType = NO_SIZE_TYPES.includes(ghost.tool);

        if (tool?.needsSize || isHookType) {
            // Screws, hooks, fixation - open ScrewModal pre-filled
            setPendingPlacement({ levelId: ghost.levelId, zone: ghost.zone, tool: ghost.tool });
            setEditingPlacementId(null);
            setEditingData(ghost.data);
            setEditingTool(ghost.tool);
            setEditingAnnotation(''); // Annotations don't carry over from plan — must be deliberate
            setOpenModal('screw');
        } else if (tool?.isOsteotomy) {
            // Osteotomies - open OsteotomyModal pre-filled
            setPendingPlacement({ levelId: ghost.levelId, zone: ghost.zone, tool: ghost.tool });
            setEditingPlacementId(null);
            setEditingData(ghost.data);
            setOsteoDiscLevel(ghost.zone === 'disc' ? true : false);
            setOpenModal('osteotomy');
        }
    };

    const handleScrewConfirm = (sizeData: string | null, components: ScrewDetails | null, finalType: string, annotation: string, finalLevelId: string, finalZone: Zone) => {
        if (components) { setDefaultDiameter(components.diameter); setDefaultLength(components.length); setDefaultScrewMode(components.mode); setDefaultCustomText(components.customText || ''); }
        setLastUsedScrewType(finalType);
        if (editingPlacementId) {
            // Check if level/zone changed — need remove + add (reducer can't change levelId/zone)
            const existing = [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId);
            if (existing && (existing.levelId !== finalLevelId || existing.zone !== finalZone)) {
                removePlacement(editingPlacementId);
                addPlacement(finalLevelId, finalZone, finalType, sizeData, annotation);
            } else {
                updatePlacement(editingPlacementId, finalType, sizeData, annotation);
            }
            setEditingPlacementId(null);
        } else {
            addPlacement(finalLevelId, finalZone, finalType, sizeData, annotation);
            // Track for rapid Confirm & Next — cleared on next render
            recentPlacementsRef.current.push({ levelId: finalLevelId, zone: finalZone });
            setPendingPlacement(null);
        }
    };

    // Clear recent placements ref after React renders with updated state
    useEffect(() => {
        recentPlacementsRef.current = [];
    }, [plannedPlacements, completedPlacements]);

    const handleScrewConfirmAndNext = (confirmedLevelId: string, confirmedZone: Zone) => {
        const side = confirmedZone as 'left' | 'right';
        if (side !== 'left' && side !== 'right') { setOpenModal(null); return; }
        // Include both rendered placements AND recently confirmed (not yet rendered) ones
        const currentPlacements = activeChart === 'planned' ? plannedPlacements : completedPlacements;
        const allPlaced = [...currentPlacements, ...recentPlacementsRef.current.map(r => ({ ...r } as Placement))];
        const next = getNextEmptyLevel(confirmedLevelId, side, levels, allPlaced);
        if (next) {
            setPendingPlacement({ levelId: next.levelId, zone: next.zone, tool: lastUsedScrewType });
            setEditingPlacementId(null);
            setEditingData(undefined);
            setEditingTool(lastUsedScrewType);
            setEditingAnnotation('');
        } else {
            setOpenModal(null);
        }
    };

    const handleOsteoConfirm = (data: OsteotomyConfirmData) => {
        setDefaultOsteoType(data.type);
        const osteoData: OsteotomyData = { ...data, angle: data.angle != null ? Number(data.angle) : null };
        if (editingPlacementId) { updatePlacement(editingPlacementId, 'osteotomy', osteoData); setEditingPlacementId(null); }
        else if (pendingPlacement) { addPlacement(pendingPlacement.levelId, pendingPlacement.zone, 'osteotomy', osteoData); setPendingPlacement(null); }
    };

    const addPlacement = (levelId: string, zone: string, tool: string, data: string | OsteotomyData | null, annotation?: string) => {
        dispatch({
            type: 'ADD_PLACEMENT',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            placement: { id: genId(), levelId, zone: zone as Zone, tool, data, annotation: annotation || '' },
        });
    };
    const updatePlacement = (id: string, tool: string, data: string | OsteotomyData | null, annotation?: string) => {
        dispatch({
            type: 'UPDATE_PLACEMENT',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            id, tool, data, annotation,
        });
    };
    const removePlacement = (id: string) => {
        dispatch({
            type: 'REMOVE_PLACEMENT',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            id,
        });
        setOpenModal(null);
    };

    // CONNECTOR HANDLERS
    const addConnector = (levelId: string) => {
        dispatch({
            type: 'ADD_CONNECTOR',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            connector: { id: genId(), levelId, fraction: 0.5, tool: 'connector' },
        });
    };
    const updateConnector = (connId: string, { levelId, fraction }: { levelId: string; fraction: number }) => {
        dispatch({
            type: 'UPDATE_CONNECTOR',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            id: connId, levelId, fraction,
        });
    };
    const removeConnector = (connId: string) => {
        dispatch({
            type: 'REMOVE_CONNECTOR',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            id: connId,
        });
    };

    // NOTE HANDLERS
    const handleNoteConfirm = (text: string, showArrow: boolean) => {
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
    const handleNoteDelete = () => {
        if (editingNote) {
            dispatch({ type: 'REMOVE_NOTE', chart: activeChart === 'planned' ? 'plan' : 'construct', id: editingNote.id });
            setEditingNote(null);
            setOpenModal(null);
        }
    };
    const handleNoteClick = (note: Note) => {
        setEditingNote(note);
        setPendingNoteTool(null);
        setOpenModal('note');
    };
    const handleGhostNoteClick = (ghostNote: Note) => {
        setActiveChart('completed');
        setEditingNote({ ...ghostNote });
        setPendingNoteTool(null);
        setOpenModal('note');
    };

    const handleGhostConnectorClick = (ghostConn: { levelId: string; fraction: number }) => {
        dispatch({ type: 'ADD_CONNECTOR', chart: 'construct', connector: { id: genId(), levelId: ghostConn.levelId, fraction: ghostConn.fraction, tool: 'connector' } });
    };

    const handleGhostCageClick = (ghostCage: Cage) => {
        setActiveChart('completed');
        setEditingCageLevel(ghostCage.levelId);
        setEditingData(ghostCage);
        setOpenModal('cage');
    };
    const handlePelvisZoneClick = (levelId: string, zone: string) => {
        handleZoneClick(levelId, zone);
    };

    const updateNotePosition = (noteId: string, { offsetX, offsetY }: { offsetX: number; offsetY: number }) => {
        dispatch({ type: 'UPDATE_NOTE_POSITION', chart: activeChart === 'planned' ? 'plan' : 'construct', id: noteId, offsetX, offsetY });
    };
    const removeNote = (noteId: string) => {
        dispatch({ type: 'REMOVE_NOTE', chart: activeChart === 'planned' ? 'plan' : 'construct', id: noteId });
    };
    const updateReconLabelPosition = (reconId: string, { offsetX, offsetY }: { offsetX: number; offsetY: number }) => {
        dispatch({ type: 'SET_RECON_LABEL_POSITION', id: reconId, offsetX, offsetY });
    };

    // EXPORT (extracted to useExport hook)
    const { runExportWithChoice, saveProjectJSON, loadProjectJSON } = useExport({
        exportRef, patientData, serialize, dispatch, incognitoMode, isPortrait,
        setPortraitExporting, showToast, activeChart, setActiveChart,
        setShowFinalInventory, setViewMode, changeTheme, fileInputRef,
    });
    const promptExportJPG = () => setExportPicker('jpg');
    const promptExportPDF = () => setExportPicker('pdf');
    const handleExportWithChoice = async (format: string, useFinal: boolean) => {
        setExportPicker(null);
        await runExportWithChoice(format, useFinal);
    };

    const copyPlanToCompleted = () => {
        if (plannedPlacements.length === 0 && plannedConnectors.length === 0 && plannedNotes.length === 0 && plannedCages.length === 0) return showToast(t('alert.no_plan'));
        // Check if anything would actually change before dispatching
        const newPlacements = plannedPlacements.filter(p => !p.zone.startsWith('force') && !completedPlacements.some(cp => cp.levelId === p.levelId && cp.zone === p.zone));
        const newCages = plannedCages.filter(pc => !completedCages.some(cc => cc.levelId === pc.levelId));
        const newConnectors = plannedConnectors.filter(pc => !completedConnectors.some(cc => cc.levelId === pc.levelId));
        const newNotes = plannedNotes.filter(pn => !completedNotes.some(cn => cn.levelId === pn.levelId));
        if (newPlacements.length === 0 && newConnectors.length === 0 && newNotes.length === 0 && newCages.length === 0) {
            return showToast(t('alert.all_confirmed'));
        }
        dispatch({ type: 'COPY_PLAN_TO_CONSTRUCT', genId });
        setActiveChart('completed');
    };

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

    // --- Shared sub-elements (used in both portrait and landscape) ---
    const demographicsContent = <DemographicsPanel patientData={patientData} dispatch={dispatch} setPatientField={setPatientField} changeTheme={changeTheme} showFinalInventory={showFinalInventory} setShowFinalInventory={setShowFinalInventory} plannedPlacements={plannedPlacements} completedPlacements={completedPlacements} plannedCages={plannedCages} completedCages={completedCages} plannedConnectors={plannedConnectors} completedConnectors={completedConnectors} allTools={allTools} levels={levels} currentLang={currentLang} />;

    const planChart = <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={handleZoneClick} onPlacementClick={handlePlacementClick} tools={allTools} readOnly={isViewOnly || activeChart !== 'planned'} levels={levels} showForces={true} heightScale={heightScale} cages={plannedCages} onDiscClick={handleDiscClick} connectors={plannedConnectors} onConnectorUpdate={updateConnector} onConnectorRemove={removeConnector} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={updateNotePosition} onNoteRemove={removeNote} onNoteClick={handleNoteClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-right" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('planLeftRod', e.target.innerText)} placeholder={t('patient.plan_rod_left_placeholder')}>{patientData.planLeftRod}</div></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-left" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('planRightRod', e.target.innerText)} placeholder={t('patient.plan_rod_right_placeholder')}>{patientData.planRightRod}</div></div></React.Fragment>} reconLabelPositions={reconLabelPositions} onReconLabelUpdate={updateReconLabelPosition} onPelvisZoneClick={handlePelvisZoneClick} isActive={activeChart === 'planned'} activeBg={scheme.activeBg} activeText={scheme.activeText} focusedLevelId={activeChart === 'planned' ? kbFocusLevelId : null} focusedZone={kbFocusZone} />;

    const constructChart = <ChartPaper title={t('export.construct')} placements={completedPlacements} ghostPlacements={isPortrait ? plannedPlacements : undefined} onGhostClick={handleGhostClick} onZoneClick={handleZoneClick} onPlacementClick={handlePlacementClick} tools={allTools} readOnly={isViewOnly || activeChart !== 'completed'} levels={levels} showForces={isPortrait} forcePlacements={isPortrait ? plannedPlacements : undefined} heightScale={heightScale} cages={completedCages} onDiscClick={handleDiscClick} connectors={completedConnectors} onConnectorUpdate={updateConnector} onConnectorRemove={removeConnector} viewMode={viewMode} notes={completedNotes} onNoteUpdate={updateNotePosition} onNoteRemove={removeNote} onNoteClick={handleNoteClick} ghostConnectors={isPortrait ? plannedConnectors : undefined} onGhostConnectorClick={handleGhostConnectorClick} ghostCages={isPortrait ? plannedCages : undefined} onGhostCageClick={handleGhostCageClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-right" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('leftRod', e.target.innerText)} placeholder={t('patient.rod_left_placeholder')}>{patientData.leftRod}</div></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><div className="editable-field text-[10px] py-0.5 px-1 text-left" style={{ minWidth: '60px' }} contentEditable suppressContentEditableWarning onPaste={handlePastePlainText} onBlur={e => setPatientField('rightRod', e.target.innerText)} placeholder={t('patient.rod_right_placeholder')}>{patientData.rightRod}</div></div></React.Fragment>} reconLabelPositions={reconLabelPositions} onReconLabelUpdate={updateReconLabelPosition} onPelvisZoneClick={handlePelvisZoneClick} isActive={activeChart === 'completed'} activeBg={scheme.activeBg} activeText={scheme.activeText} focusedLevelId={activeChart === 'completed' ? kbFocusLevelId : null} focusedZone={kbFocusZone} />;

    const newPatientAction = () => setConfirmNewPatient(true);
    const executeNewPatient = () => {
        setConfirmNewPatient(false);
        dispatch({ type: 'NEW_PATIENT' });
        setActiveChart('planned');
        resetDisclaimer();
        setDisclaimerTick(n => n + 1);
        // Sync handled by auto-save effect — no manual broadcast needed
        // (manual broadcast used stale pre-dispatch state, causing bounce)
    };

    const modals = (
        <React.Fragment>
            <ScrewModal isOpen={openModal === 'screw'} onClose={() => setOpenModal(null)}
                onConfirm={handleScrewConfirm}
                onConfirmAndNext={handleScrewConfirmAndNext}
                onDelete={() => removePlacement(editingPlacementId!)}
                initialData={editingData as string | null | undefined} initialTool={editingTool ?? undefined}
                defaultDiameter={defaultDiameter} defaultLength={defaultLength}
                defaultMode={defaultScrewMode} defaultCustomText={defaultCustomText}
                initialAnnotation={editingAnnotation}
                levelId={pendingPlacement?.levelId || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.levelId : '') || ''}
                zone={(pendingPlacement?.zone || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.zone : 'left') || 'left') as Zone}
                levels={levels}
                placements={activeChart === 'planned' ? plannedPlacements : completedPlacements}
                useRegionDefaults={useRegionDefaults}
                confirmAndNextDefault={confirmAndNextDefault} />
            <OsteotomyModal isOpen={openModal === 'osteotomy'} onClose={() => { setOpenModal(null); setOsteoDiscLevel(undefined); }} onConfirm={handleOsteoConfirm} onDelete={() => removePlacement(editingPlacementId!)} initialData={editingData as OsteotomyData | null | undefined} defaultType={defaultOsteoType} defaultAngle={defaultOsteoAngle} discLevelOnly={osteoDiscLevel}
                levelId={pendingPlacement?.levelId || (editingPlacementId ? [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId)?.levelId : undefined)} />
            <CageModal isOpen={openModal === 'cage'} onClose={() => setOpenModal(null)} onConfirm={handleCageConfirm} onDelete={handleDeleteCage} initialData={editingData as { tool: string; data: CageData } | null | undefined} levelId={editingCageLevel ?? ''} levels={levels} />
            <ForceModal isOpen={openModal === 'force'} onClose={() => setOpenModal(null)} onConfirm={handleForceConfirm} />
            {forcePopover && (() => {
                const popW = 200, popH = forcePopover.existingTool ? 300 : 260;
                const px = Math.min(forcePopover.x, window.innerWidth - popW - 8);
                const py = Math.min(forcePopover.y - popH / 2, window.innerHeight - popH - 8);
                const handleForceSelect = (forceId: string) => {
                    if (forcePopover.existingId) {
                        // Replace: remove old, place new
                        const chart = activeChart === 'planned' ? 'plan' : 'construct';
                        dispatch({ type: 'REMOVE_PLACEMENT', chart, id: forcePopover.existingId });
                    }
                    handleForceConfirm(forceId);
                    setForcePopover(null);
                };
                const handleForceRemove = () => {
                    if (forcePopover.existingId) {
                        const chart = activeChart === 'planned' ? 'plan' : 'construct';
                        dispatch({ type: 'REMOVE_PLACEMENT', chart, id: forcePopover.existingId });
                    }
                    setPendingForceZone(null);
                    setForcePopover(null);
                };
                return (<Portal>
                    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true"
                        onKeyDown={e => {
                            if (e.key === 'Escape') { e.preventDefault(); setForcePopover(null); }
                            else if ((e.key === 'Delete' || e.key === 'Backspace') && forcePopover.existingId) { e.preventDefault(); handleForceRemove(); }
                            else if (e.key === 'Tab') {
                                e.preventDefault();
                                const btns = Array.from(document.querySelectorAll('.force-picker-btn')) as HTMLElement[];
                                const idx = btns.indexOf(document.activeElement as HTMLElement);
                                const next = e.shiftKey ? (idx <= 0 ? btns.length - 1 : idx - 1) : (idx >= btns.length - 1 ? 0 : idx + 1);
                                btns[next]?.focus();
                            }
                        }}
                        onClick={() => setForcePopover(null)}>
                        <div className="absolute bg-white rounded-lg shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out]"
                            style={{ left: Math.max(8, px), top: Math.max(8, py), width: popW }}
                            onClick={e => e.stopPropagation()}>
                            <div className="bg-blue-700 text-white px-3 py-1.5 text-center text-xs font-bold">{t('modal.force.title')}</div>
                            <div className="p-2 grid grid-cols-2 gap-1.5">
                                {FORCE_TYPES.map((f, i) => (
                                    <button key={f.id} onClick={() => handleForceSelect(f.id)}
                                        autoFocus={i === 0}
                                        className={`force-picker-btn flex flex-col items-center gap-1 p-2 rounded border transition-all outline-none focus:ring-2 focus:ring-blue-400 ${
                                            forcePopover.existingTool === f.id
                                                ? 'bg-blue-600 border-blue-700 text-white'
                                                : 'border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300'
                                        }`}>
                                        <InstrumentIcon type={f.icon} className="w-7 h-7" color={forcePopover.existingTool === f.id ? '#ffffff' : '#2563eb'} />
                                        <span className={`text-[9px] font-bold leading-tight text-center ${forcePopover.existingTool === f.id ? 'text-blue-100' : 'text-slate-700'}`}>{t(f.labelKey)}</span>
                                    </button>
                                ))}
                            </div>
                            {forcePopover.existingTool && (
                                <div className="px-2 pb-2">
                                    <button onClick={handleForceRemove}
                                        className="w-full px-2 py-1.5 rounded text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors">{t('button.remove')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                </Portal>);
            })()}
            <HelpModal isOpen={openModal === 'help'} onClose={() => setOpenModal(null)} />
            <PreferencesModal isOpen={openModal === 'preferences'} onClose={() => setOpenModal(null)} useRegionDefaults={useRegionDefaults} onToggleRegionDefaults={toggleRegionDefaults} confirmAndNextDefault={confirmAndNextDefault} onToggleConfirmAndNextDefault={toggleConfirmAndNextDefault} />
            <ChangeLogModal isOpen={openModal === 'changelog'} onClose={() => setOpenModal(null)} />
            {exportPicker && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: () => handleExportWithChoice(exportPicker, false), onClose: () => setExportPicker(null), onDelete: undefined, isEditing: false })} onClick={() => setExportPicker(null)} ref={el => el?.focus()}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-center">{exportPicker.toUpperCase()}</div>
                    <div className="p-3 flex flex-col gap-2">
                        <button onClick={() => handleExportWithChoice(exportPicker, false)} className="w-full px-4 py-3 rounded text-sm font-bold border transition-colors hover:brightness-95" style={{ backgroundColor: scheme.btnBg, borderColor: scheme.btnBorder }}>{t('export.plan')}</button>
                        <button onClick={() => handleExportWithChoice(exportPicker, true)} className="w-full px-4 py-3 rounded text-sm font-bold text-white bg-slate-800 hover:bg-slate-700">{t('export.construct')}</button>
                    </div>
                </div>
            </div></Portal>}
            {confirmClearConstruct && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: confirmClearConstructAction, onClose: () => setConfirmClearConstruct(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmClearConstruct(false)} ref={el => el?.focus()}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold">{t('sidebar.clear_construct')}</div>
                    <div className="p-5 text-sm text-slate-600">{t('alert.clear_construct')}</div>
                    <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                        <button onClick={() => setConfirmClearConstruct(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={confirmClearConstructAction} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-bold">{t('button.confirm')}</button>
                    </div>
                </div>
            </div></Portal>}
            {confirmNewPatient && <Portal><div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4 animate-[fadeIn_0.2s_ease-out]" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={modalKeyHandler({ onSubmit: executeNewPatient, onClose: () => setConfirmNewPatient(false), onDelete: undefined, isEditing: false })} onClick={() => setConfirmNewPatient(false)} ref={el => el?.focus()}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-700 text-white px-4 py-3 text-sm font-bold">{t('sidebar.new_patient')}</div>
                    <div className="p-5 text-sm text-slate-600">{t('alert.new_patient')}</div>
                    <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
                        <button onClick={() => setConfirmNewPatient(false)} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-200 text-sm font-bold">{t('button.cancel')}</button>
                        <button onClick={executeNewPatient} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-bold">{t('button.confirm')}</button>
                    </div>
                </div>
            </div></Portal>}
            {discPickerLevel && (() => {
                const pickerButtons = [
                    { action: handleDiscPickCage, label: t('help.cages.title'), cls: 'text-sky-800 bg-sky-50 border-sky-200 hover:bg-sky-100 focus:ring-2 focus:ring-sky-400' },
                    { action: handleDiscPickOsteo, label: t('help.osteotomies.title'), cls: 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 focus:ring-2 focus:ring-amber-400' },
                ];
                // Position popover near click, clamped to viewport
                const popW = 180, popH = 120;
                const px = Math.min(discPickerLevel.x, window.innerWidth - popW - 8);
                const py = Math.min(discPickerLevel.y - popH / 2, window.innerHeight - popH - 8);
                return (<Portal>
                    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true"
                        onKeyDown={e => {
                            if (e.key === 'Escape') { e.preventDefault(); setDiscPickerLevel(null); }
                            else if (e.key === 'Enter') {
                                e.preventDefault();
                                const focused = document.activeElement as HTMLElement;
                                if (focused?.tagName === 'BUTTON') focused.click();
                                else handleDiscPickCage();
                            }
                            else if (e.key === 'Tab') {
                                e.preventDefault();
                                const btns = Array.from(document.querySelectorAll('.disc-picker-btn')) as HTMLElement[];
                                const idx = btns.indexOf(document.activeElement as HTMLElement);
                                const next = e.shiftKey ? (idx <= 0 ? btns.length - 1 : idx - 1) : (idx >= btns.length - 1 ? 0 : idx + 1);
                                btns[next]?.focus();
                            }
                        }}
                        onClick={() => setDiscPickerLevel(null)}>
                        <div className="absolute bg-white rounded-lg shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out]"
                            style={{ left: Math.max(8, px), top: Math.max(8, py), width: popW }}
                            onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-700 text-white px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider">{getDiscLabel(discPickerLevel.levelId, levels)}</div>
                            <div className="p-1.5 flex flex-col gap-1">
                                {pickerButtons.map((btn, i) => (
                                    <button key={i} onClick={btn.action}
                                        className={`disc-picker-btn w-full px-3 py-2 rounded text-sm font-bold border transition-colors outline-none ${btn.cls}`}
                                        autoFocus={i === 0}>{btn.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Portal>);
            })()}
            <NoteModal isOpen={openModal === 'note'} onClose={() => { setOpenModal(null); setEditingNote(null); setPendingNoteTool(null); }} onConfirm={handleNoteConfirm} onDelete={handleNoteDelete} initialText={editingNote?.text || ''} initialShowArrow={editingNote ? editingNote.showArrow : undefined} isEditing={!!editingNote} />
        </React.Fragment>
    );


    // ============================================================
    // PORTRAIT LAYOUT
    // ============================================================
    if (isPortrait) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                {modals}
                <input type="file" ref={fileInputRef} onChange={loadProjectJSON} className="hidden" accept=".json" />

                <PortraitToolbar scheme={scheme} colourScheme={colourScheme} changeTheme={changeTheme} currentLang={currentLang} changeLang={changeLang} selectedTool={selectedTool} setSelectedTool={setSelectedTool} viewMode={viewMode} setViewMode={setViewMode} showPelvis={showPelvis} togglePelvis={togglePelvis} incognitoMode={incognitoMode} setIncognitoMode={setIncognitoMode} syncConnected={syncConnected} isViewOnly={isViewOnly} tools={tools} fileInputRef={fileInputRef} loadProjectJSON={loadProjectJSON} saveProjectJSON={saveProjectJSON} promptExportJPG={promptExportJPG} promptExportPDF={promptExportPDF} copyPlanToCompleted={() => { copyPlanToCompleted(); switchPortraitTab(2); }} onConfirmClearConstruct={() => setConfirmClearConstruct(true)} newPatientAction={newPatientAction} onOpenPreferences={() => setOpenModal('preferences')} onOpenHelp={() => setOpenModal('help')} onOpenChangelog={() => setOpenModal('changelog')} portraitTab={portraitTab} switchPortraitTab={switchPortraitTab} />

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
                                <div dir="ltr" className="w-full h-full flex flex-col bg-white">
                                    {planChart}
                                </div>
                            )}
                            {portraitTab === 2 && (
                                <div dir="ltr" className="w-full h-full flex flex-col bg-white">
                                    {constructChart}
                                </div>
                            )}
                            {portraitTab === 3 && (
                                <div className="w-full h-full overflow-y-auto bg-white p-8 flex flex-col">
                                    <div className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-4 text-center">{t('portrait.tab.inventory')}</div>
                                    <div className="flex-1 text-base">
                                        <ImplantInventory large placements={[...(showFinalInventory ? completedPlacements : plannedPlacements), ...(showFinalInventory ? completedCages : plannedCages).map(c => ({...c, zone: 'mid' as Zone, annotation: '', tool: c.tool, data: null})), ...(showFinalInventory ? completedConnectors : plannedConnectors).map(c => ({...c, levelId: levels[0]?.id || 'T1', zone: 'mid' as Zone, annotation: '', data: null}))] as Placement[]} tools={[...allTools, {id: 'tlif', labelKey: 'inventory.cage.tlif', icon: 'cage', type: 'cage'}, {id: 'plif', labelKey: 'inventory.cage.plif', icon: 'cage', type: 'cage'}, {id: 'acdf', labelKey: 'inventory.cage.acdf', icon: 'cage', type: 'cage'}, {id: 'xlif', labelKey: 'inventory.cage.xlif', icon: 'cage', type: 'cage'}, {id: 'olif', labelKey: 'inventory.cage.olif', icon: 'cage', type: 'cage'}, {id: 'alif', labelKey: 'inventory.cage.alif', icon: 'cage', type: 'cage'}]} title={showFinalInventory ? t('inventory.title_construct') : t('inventory.title_plan')} visibleLevelIds={levels.map(l => l.id)} levels={levels} rods={showFinalInventory ? { left: patientData.leftRod, right: patientData.rightRod } : { left: patientData.planLeftRod, right: patientData.planRightRod }} />
                                        <button onClick={() => setShowFinalInventory(!showFinalInventory)} className="mt-3 w-full text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors">{showFinalInventory ? t('inventory.view_plan') : t('inventory.view_final')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hidden off-screen export container for PDF/JPG - only mounted during export to avoid duplicate React elements */}
                {portraitExporting && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                        <div id="export-container" ref={exportRef}>
                            <div className="w-[370px] bg-white border-e border-slate-300 flex flex-col p-8">
                                <CreditsFooter lang={currentLang} />
                            </div>
                            <div dir="ltr" className="flex-[4] flex flex-col h-full min-w-0 overflow-hidden">
                                <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={true} heightScale={heightScale} cages={plannedCages} onDiscClick={() => {}} connectors={plannedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{patientData.planLeftRod}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{patientData.planRightRod}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} />
                            </div>
                            <div dir="ltr" className="flex-[3] flex flex-col h-full min-w-0 overflow-hidden">
                                <ChartPaper title={t('export.construct')} placements={completedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={false} heightScale={heightScale} cages={completedCages} onDiscClick={() => {}} connectors={completedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={completedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{patientData.leftRod}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{patientData.rightRod}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} />
                            </div>
                            <div className="absolute bottom-1 end-2 text-[8px] text-slate-300 font-mono">{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                )}
            {/* Toast notifications rendered by ToastProvider in main.tsx */}
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
                <Sidebar scheme={scheme} colourScheme={colourScheme} changeTheme={changeTheme} currentLang={currentLang} changeLang={changeLang} selectedTool={selectedTool} setSelectedTool={setSelectedTool} activeChart={activeChart} setActiveChart={setActiveChart} viewMode={viewMode} setViewMode={setViewMode} showPelvis={showPelvis} togglePelvis={togglePelvis} incognitoMode={incognitoMode} setIncognitoMode={setIncognitoMode} syncConnected={syncConnected} tools={tools} fileInputRef={fileInputRef} loadProjectJSON={loadProjectJSON} saveProjectJSON={saveProjectJSON} promptExportJPG={promptExportJPG} promptExportPDF={promptExportPDF} copyPlanToCompleted={copyPlanToCompleted} clearConstruct={clearConstruct} newPatientAction={newPatientAction} onOpenPreferences={() => setOpenModal('preferences')} onOpenHelp={() => setOpenModal('help')} onOpenChangelog={() => setOpenModal('changelog')} />

                <div ref={containerWrapperRef} id="print-wrapper" className="flex-1 flex items-center justify-center p-8 bg-slate-300 overflow-hidden relative">
                    <div style={{ transform: `scale(${scale})` }}>
                        <div id="export-container" ref={exportRef}>
                            <div className="w-[370px] bg-white border-e border-slate-300 flex flex-col p-8">{demographicsContent}</div>
                            <div dir="ltr" className="flex-[4] flex flex-col h-full min-w-0 overflow-hidden relative" style={{ borderTop: `3px solid ${activeChart === 'planned' ? scheme.activeBg : '#cbd5e1'}` }} onClick={() => activeChart !== 'planned' && setActiveChart('planned')}>
                                {planChart}
                                {activeChart !== 'planned' && !isPortrait && <div className="absolute inset-0 bg-slate-400/20 cursor-pointer z-20" data-export-hide="true" />}
                            </div>
                            <div dir="ltr" className="flex-[3] flex flex-col h-full min-w-0 overflow-hidden relative" style={{ borderTop: `3px solid ${activeChart === 'completed' ? scheme.activeBg : '#cbd5e1'}` }} onClick={() => activeChart !== 'completed' && setActiveChart('completed')}>
                                {constructChart}
                                {activeChart !== 'completed' && !isPortrait && <div className="absolute inset-0 bg-slate-400/20 cursor-pointer z-20" data-export-hide="true" />}
                            </div>
                            <div className="absolute bottom-1 end-2 text-[8px] text-slate-300 font-mono">{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Toast notifications rendered by ToastProvider in main.tsx */}
            {!disclaimerAccepted && <DisclaimerModal lang={currentLang} onLangChange={changeLang} onAccept={() => { acceptDisclaimer(currentLang); setDisclaimerTick(n => n + 1); if (syncChannelRef.current) syncChannelRef.current.postMessage({ type: 'lang_accepted', appVersion: CURRENT_VERSION, lang: currentLang }); }} />}
            {disclaimerAccepted && <OnboardingTour activeChart={activeChart} setActiveChart={setActiveChart} />}
        </div>
    );
};

export default App;
