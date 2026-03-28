import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { t, detectLanguage, setCurrentLang, SUPPORTED_LANGUAGES } from './i18n/i18n';
import { genId } from './utils/id';
import usePortrait from './hooks/usePortrait';
import { useExport } from './hooks/useExport';
import { CURRENT_VERSION } from './data/changelog';
import { COLOUR_SCHEMES } from './data/themes';
import { CAGE_PERMISSIBILITY, NO_SIZE_TYPES, CAGE_TYPES,
         getDiscLabel, getPermittedOsteotomyTypes } from './data/clinical';
import { getLevelHeight, calculateAutoScale } from './data/anatomy';
import { getNextEmptyLevel } from './utils/screwNavigation';
import { ModalOrchestrator } from './components/ModalOrchestrator';
import type { ModalId } from './components/ModalOrchestrator';
import { CreditsFooter } from './components/CreditsFooter';
import { DemographicsPanel } from './components/DemographicsPanel';
import { ImplantInventory } from './components/ImplantInventory';
import { Sidebar } from './components/Sidebar';
import { PortraitToolbar } from './components/PortraitToolbar';
import { ChartPaper } from './components/chart/ChartPaper';
import { DisclaimerModal, isDisclaimerAccepted, acceptDisclaimer, resetDisclaimer, getDisclaimerTimestamp } from './components/modals/DisclaimerModal';
import { OnboardingTour } from './components/OnboardingTour';
import { useDocumentState } from './hooks/useDocumentState';
import { useModalState } from './hooks/useModalState';
import { useToast } from './hooks/useToast';
import { RodModal } from './components/modals/RodModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { formatRodSummary, isRodEmpty, createEmptyRod } from './data/implants';
import type { ColourScheme, ToolDefinition, Placement, Level, Zone, OsteotomyData, Cage, Note, RodData } from './types';

/** Data shape returned by CageModal.onConfirm */
interface CageConfirmData {
    type: string;
    height: string;
    width: string;
    length: string;
    lordosis: string;
    side: string;
    expandable: boolean;
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
    const [showGhosts, setShowGhosts] = useState(true);
    const [currentLang, setCurrentLangState] = useState(detectLanguage());

    const RTL_LANGUAGES = ['ar', 'he'];
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

    // MODALS — all modal/editing state centralised in useModalState
    const {
        openModal, setOpenModal,
        forcePopover, setForcePopover,
        pendingNoteTool, setPendingNoteTool,
        editingNote, setEditingNote,
        rodModalOpen, setRodModalOpen,
        rodModalChart, setRodModalChart,
        rodModalSide, setRodModalSide,
        confirmNewPatient, setConfirmNewPatient,
        confirmClearConstruct, setConfirmClearConstruct,
        confirmLock, setConfirmLock,
        confirmUnlock, setConfirmUnlock,
        exportPicker, setExportPicker,
        pendingPlacement, setPendingPlacement,
        editingPlacementId, setEditingPlacementId,
        editingData, setEditingData,
        editingTool, setEditingTool,
        editingCageLevel, setEditingCageLevel,
        discPickerLevel, setDiscPickerLevel,
        editingAnnotation, setEditingAnnotation,
        osteoDiscLevel, setOsteoDiscLevel,
        pendingForceZone, setPendingForceZone,
    } = useModalState();
    const openRodModal = (chart: 'plan' | 'construct', side: 'left' | 'right') => {
        setRodModalChart(chart); setRodModalSide(side); setRodModalOpen(true);
    };
    const handleRodConfirm = (side: 'left' | 'right', rod: RodData) => {
        dispatch({ type: 'SET_ROD', chart: rodModalChart, side, rod });
    };
    const handleRodDelete = (side: 'left' | 'right') => {
        dispatch({ type: 'SET_ROD', chart: rodModalChart, side, rod: createEmptyRod() });
    };

    // Record lock state
    const isLocked = !!state.lockedAt;
    // Disclaimer: shown on first load and after New Patient
    const [disclaimerTick, setDisclaimerTick] = useState(0);
    const disclaimerAccepted = isDisclaimerAccepted(currentLang);

    // Track recently confirmed placements (not yet in rendered state) for Confirm & Next skip logic
    const recentPlacementsRef = useRef<{ levelId: string; zone: string }[]>([]);

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

    const exportRef = useRef<HTMLDivElement>(null);
    const containerWrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveProjectJSONRef = useRef<(() => void) | null>(null);

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

            // Global shortcuts (work even when locked)
            switch (e.key) {
                case 'f': e.preventDefault(); if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); return;
                case 's': e.preventDefault(); saveProjectJSONRef.current?.(); return;
                case 'e': e.preventDefault(); setExportPicker('choose'); return;
                case ',': e.preventDefault(); setOpenModal('preferences'); return;
                case '?': e.preventDefault(); setOpenModal('help'); return;
                case 'h': e.preventDefault(); setOpenModal('help'); return;
                case 'r': e.preventDefault(); setRodModalChart(activeChart === 'planned' ? 'plan' : 'construct'); setRodModalSide('left'); setRodModalOpen(true); return;
                case 'd': e.preventDefault(); switchPortraitTab(0); return;
                case 'g': e.preventDefault(); setShowGhosts(prev => !prev); return;
                case '1': e.preventDefault(); switchPortraitTab(0); return;
                case '2': e.preventDefault(); switchPortraitTab(1); return;
                case '3': e.preventDefault(); switchPortraitTab(2); return;
                case '4': e.preventDefault(); switchPortraitTab(3); return;
            }

            // Skip placement shortcuts when document is locked
            if (isLocked) return;

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

            switch (e.key) {
                // Views
                case 'c': setViewMode('cervical'); break;
                case 'l': setViewMode('t10_pelvis'); break;
                case 't': setViewMode('thoracolumbar'); break;
                case 'w': setViewMode('whole'); break;
                case 'p': if (viewMode !== 'cervical') togglePelvis(); break;
                // Tools
                case 'i': setSelectedTool('implant'); break;
                case 'n': setSelectedTool('note'); break;
                case 'x': setSelectedTool('connector'); break;
                case 'u': setSelectedTool('unstable'); break;
                case 'o': setSelectedTool('osteotomy'); break;
                default: return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [openModal, forcePopover, disclaimerAccepted, viewMode, canUndo, canRedo, levels, kbFocusLevel, kbFocusZone, kbNavActive, isLocked, isPortrait, activeChart]);

    // calculateAutoScale is O(n) but levels identity only changes on viewMode/showPelvis,
    // not on ResizeObserver fires, so useMemo already prevents redundant recalculation.
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

    // ALL TOOL DEFINITIONS (for rendering and lookup) — memoised to preserve reference identity
    const allTools: ToolDefinition[] = useMemo(() => [
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
    ], []);

    // SIDEBAR PALETTE
    const tools = [
        { categoryKey: 'sidebar.category.tools', items: allTools.filter(item => ['implant','connector','unstable','osteotomy','note'].includes(item.id)) },
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
            cage: { id: genId(), levelId: lvl, tool: data.type, data: { height: data.height, width: data.width, length: data.length, lordosis: data.lordosis, side: data.side, expandable: data.expandable || undefined } },
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

    const handleScrewConfirm = (sizeData: string | null, components: ScrewDetails | null, finalType: string, annotation: string, finalLevelId: string, finalZone: Zone, trajectory?: string) => {
        if (components) { setDefaultDiameter(components.diameter); setDefaultLength(components.length); setDefaultScrewMode(components.mode); setDefaultCustomText(components.customText || ''); }
        setLastUsedScrewType(finalType);
        if (editingPlacementId) {
            // Check if level/zone changed — need remove + add (reducer can't change levelId/zone)
            const existing = [...plannedPlacements, ...completedPlacements].find(p => p.id === editingPlacementId);
            if (existing && (existing.levelId !== finalLevelId || existing.zone !== finalZone)) {
                removePlacement(editingPlacementId);
                addPlacement(finalLevelId, finalZone, finalType, sizeData, annotation, trajectory);
            } else {
                updatePlacement(editingPlacementId, finalType, sizeData, annotation, trajectory);
            }
            setEditingPlacementId(null);
        } else {
            addPlacement(finalLevelId, finalZone, finalType, sizeData, annotation, trajectory);
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

    const addPlacement = (levelId: string, zone: string, tool: string, data: string | OsteotomyData | null, annotation?: string, trajectory?: string) => {
        dispatch({
            type: 'ADD_PLACEMENT',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            placement: { id: genId(), levelId, zone: zone as Zone, tool, data, annotation: annotation || '', trajectory },
        });
    };
    const updatePlacement = (id: string, tool: string, data: string | OsteotomyData | null, annotation?: string, trajectory?: string) => {
        dispatch({
            type: 'UPDATE_PLACEMENT',
            chart: activeChart === 'planned' ? 'plan' : 'construct',
            id, tool, data, annotation, trajectory,
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
    saveProjectJSONRef.current = saveProjectJSON;
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

    // --- Stable callback refs for ChartPaper (prevents memo-busting on unrelated re-renders) ---
    const chartHandlersRef = useRef({
        handleZoneClick, handlePlacementClick, handleGhostClick, handleDiscClick,
        handleNoteClick, handleGhostNoteClick,
        handleGhostConnectorClick, handleGhostCageClick, handlePelvisZoneClick,
        updateConnector, removeConnector, updateNotePosition, removeNote, updateReconLabelPosition,
    });
    chartHandlersRef.current = {
        handleZoneClick, handlePlacementClick, handleGhostClick, handleDiscClick,
        handleNoteClick, handleGhostNoteClick, handleGhostConnectorClick, handleGhostCageClick,
        handlePelvisZoneClick, updateConnector, removeConnector, updateNotePosition, removeNote,
        updateReconLabelPosition,
    };
    const stableZoneClick = useCallback((levelId: string, zone: string) => chartHandlersRef.current.handleZoneClick(levelId, zone), []);
    const stablePlacementClick = useCallback((p: Placement) => chartHandlersRef.current.handlePlacementClick(p), []);
    const stableGhostClick = useCallback((p: Placement) => chartHandlersRef.current.handleGhostClick(p), []);
    const stableDiscClick = useCallback((levelId: string) => chartHandlersRef.current.handleDiscClick(levelId), []);
    const stableNoteClick = useCallback((note: Note) => chartHandlersRef.current.handleNoteClick(note), []);
    const stableGhostNoteClick = useCallback((note: Note) => chartHandlersRef.current.handleGhostNoteClick?.(note), []);
    const stableGhostConnectorClick = useCallback((conn: { levelId: string; fraction: number }) => chartHandlersRef.current.handleGhostConnectorClick(conn), []);
    const stableGhostCageClick = useCallback((cage: Cage) => chartHandlersRef.current.handleGhostCageClick(cage), []);
    const stablePelvisZoneClick = useCallback((levelId: string, zone: string) => chartHandlersRef.current.handlePelvisZoneClick(levelId, zone), []);
    const stableConnectorUpdate = useCallback((id: string, pos: { levelId: string; fraction: number }) => chartHandlersRef.current.updateConnector(id, pos), []);
    const stableConnectorRemove = useCallback((id: string) => chartHandlersRef.current.removeConnector(id), []);
    const stableNoteUpdate = useCallback((id: string, pos: { offsetX: number; offsetY: number }) => chartHandlersRef.current.updateNotePosition(id, pos), []);
    const stableNoteRemove = useCallback((id: string) => chartHandlersRef.current.removeNote(id), []);
    const stableReconLabelUpdate = useCallback((id: string, pos: { offsetX: number; offsetY: number }) => chartHandlersRef.current.updateReconLabelPosition(id, pos), []);

    // --- Shared sub-elements (used in both portrait and landscape) ---
    const demographicsContent = <DemographicsPanel patientData={patientData} dispatch={dispatch} setPatientField={setPatientField} changeTheme={changeTheme} showFinalInventory={showFinalInventory} setShowFinalInventory={setShowFinalInventory} plannedPlacements={plannedPlacements} completedPlacements={completedPlacements} plannedCages={plannedCages} completedCages={completedCages} plannedConnectors={plannedConnectors} completedConnectors={completedConnectors} allTools={allTools} levels={levels} currentLang={currentLang} />;

    const planChart = <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={stableZoneClick} onPlacementClick={stablePlacementClick} tools={allTools} readOnly={isLocked || isViewOnly || activeChart !== 'planned'} levels={levels} showForces={true} heightScale={heightScale} cages={plannedCages} onDiscClick={stableDiscClick} connectors={plannedConnectors} onConnectorUpdate={stableConnectorUpdate} onConnectorRemove={stableConnectorRemove} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={stableNoteUpdate} onNoteRemove={stableNoteRemove} onNoteClick={stableNoteClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1 cursor-pointer hover:bg-slate-50 rounded px-1" onClick={() => openRodModal('plan', 'left')}><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className={`text-[10px] py-0.5 px-1 text-right ${isRodEmpty(patientData.planLeftRod) ? 'text-slate-300 italic' : 'text-slate-700'}`} style={{ minWidth: '60px' }}>{isRodEmpty(patientData.planLeftRod) ? t('patient.click_to_set') : formatRodSummary(patientData.planLeftRod)}</span></div><div className="flex items-center justify-start gap-1 cursor-pointer hover:bg-slate-50 rounded px-1" onClick={() => openRodModal('plan', 'right')}><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className={`text-[10px] py-0.5 px-1 text-left ${isRodEmpty(patientData.planRightRod) ? 'text-slate-300 italic' : 'text-slate-700'}`} style={{ minWidth: '60px' }}>{isRodEmpty(patientData.planRightRod) ? t('patient.click_to_set') : formatRodSummary(patientData.planRightRod)}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} onReconLabelUpdate={stableReconLabelUpdate} onPelvisZoneClick={stablePelvisZoneClick} isActive={activeChart === 'planned'} activeBg={scheme.activeBg} activeText={scheme.activeText} focusedLevelId={activeChart === 'planned' ? kbFocusLevelId : null} focusedZone={kbFocusZone} isLocked={isLocked} />;

    const constructChart = <ChartPaper title={t('export.construct')} placements={completedPlacements} ghostPlacements={(isPortrait && showGhosts) ? plannedPlacements : undefined} onGhostClick={stableGhostClick} onZoneClick={stableZoneClick} onPlacementClick={stablePlacementClick} tools={allTools} readOnly={isLocked || isViewOnly || activeChart !== 'completed'} levels={levels} showForces={isPortrait} forcePlacements={isPortrait ? plannedPlacements : undefined} heightScale={heightScale} cages={completedCages} onDiscClick={stableDiscClick} connectors={completedConnectors} onConnectorUpdate={stableConnectorUpdate} onConnectorRemove={stableConnectorRemove} viewMode={viewMode} notes={completedNotes} onNoteUpdate={stableNoteUpdate} onNoteRemove={stableNoteRemove} onNoteClick={stableNoteClick} ghostConnectors={(isPortrait && showGhosts) ? plannedConnectors : undefined} onGhostConnectorClick={stableGhostConnectorClick} ghostCages={(isPortrait && showGhosts) ? plannedCages : undefined} onGhostCageClick={stableGhostCageClick} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1 cursor-pointer hover:bg-slate-50 rounded px-1" onClick={() => { if (isRodEmpty(patientData.leftRod) && !isRodEmpty(patientData.planLeftRod)) { dispatch({ type: 'SET_ROD', chart: 'construct', side: 'left', rod: { ...patientData.planLeftRod } }); showToast(t('alert.undone') ? 'Rod confirmed from plan' : 'Rod confirmed', 'info'); } else { openRodModal('construct', 'left'); } }}><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className={`text-[10px] py-0.5 px-1 text-right ${isRodEmpty(patientData.leftRod) ? (isRodEmpty(patientData.planLeftRod) ? 'text-slate-300 italic' : 'text-teal-500 italic opacity-75') : 'text-slate-700'}`} style={{ minWidth: '60px' }}>{isRodEmpty(patientData.leftRod) ? (isRodEmpty(patientData.planLeftRod) ? t('patient.click_to_set') : formatRodSummary(patientData.planLeftRod)) : formatRodSummary(patientData.leftRod)}</span></div><div className="flex items-center justify-start gap-1 cursor-pointer hover:bg-slate-50 rounded px-1" onClick={() => { if (isRodEmpty(patientData.rightRod) && !isRodEmpty(patientData.planRightRod)) { dispatch({ type: 'SET_ROD', chart: 'construct', side: 'right', rod: { ...patientData.planRightRod } }); showToast('Rod confirmed from plan', 'info'); } else { openRodModal('construct', 'right'); } }}><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className={`text-[10px] py-0.5 px-1 text-left ${isRodEmpty(patientData.rightRod) ? (isRodEmpty(patientData.planRightRod) ? 'text-slate-300 italic' : 'text-teal-500 italic opacity-75') : 'text-slate-700'}`} style={{ minWidth: '60px' }}>{isRodEmpty(patientData.rightRod) ? (isRodEmpty(patientData.planRightRod) ? t('patient.click_to_set') : formatRodSummary(patientData.planRightRod)) : formatRodSummary(patientData.rightRod)}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} onReconLabelUpdate={stableReconLabelUpdate} onPelvisZoneClick={stablePelvisZoneClick} isActive={activeChart === 'completed'} activeBg={scheme.activeBg} activeText={scheme.activeText} focusedLevelId={activeChart === 'completed' ? kbFocusLevelId : null} focusedZone={kbFocusZone} isLocked={isLocked} />;

    const finishCaseAction = () => setConfirmLock(true);
    const executeFinishCase = () => {
        setConfirmLock(false);
        dispatch({ type: 'LOCK_DOCUMENT' });
        showToast(t('sidebar.finish_case'), 'info');
    };
    const unlockRecordAction = () => setConfirmUnlock(true);
    const executeUnlockRecord = () => {
        setConfirmUnlock(false);
        dispatch({ type: 'UNLOCK_DOCUMENT' });
        showToast(t('sidebar.unlock_record'), 'info');
    };

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

    const handleForceSelectFromPopover = (forceId: string) => {
        if (forcePopover?.existingId) {
            const chart = activeChart === 'planned' ? 'plan' : 'construct';
            dispatch({ type: 'REMOVE_PLACEMENT', chart, id: forcePopover.existingId });
        }
        handleForceConfirm(forceId);
        setForcePopover(null);
    };
    const handleForceRemoveFromPopover = () => {
        if (forcePopover?.existingId) {
            const chart = activeChart === 'planned' ? 'plan' : 'construct';
            dispatch({ type: 'REMOVE_PLACEMENT', chart, id: forcePopover.existingId });
        }
        setPendingForceZone(null);
        setForcePopover(null);
    };

    const closeModal = useCallback(() => setOpenModal(null), []);
    const modals = <ErrorBoundary onReset={closeModal} fallbackMessage="Something went wrong — close and try again."><ModalOrchestrator
        openModal={openModal} setOpenModal={setOpenModal}
        editingData={editingData} editingTool={editingTool}
        editingPlacementId={editingPlacementId} editingAnnotation={editingAnnotation}
        editingCageLevel={editingCageLevel} pendingPlacement={pendingPlacement}
        osteoDiscLevel={osteoDiscLevel} pendingNoteTool={pendingNoteTool} editingNote={editingNote}
        discPickerLevel={discPickerLevel} setDiscPickerLevel={setDiscPickerLevel}
        forcePopover={forcePopover} setForcePopover={setForcePopover}
        confirmNewPatient={confirmNewPatient} setConfirmNewPatient={setConfirmNewPatient}
        confirmClearConstruct={confirmClearConstruct} setConfirmClearConstruct={setConfirmClearConstruct}
        exportPicker={exportPicker} setExportPicker={setExportPicker}
        onScrewConfirm={handleScrewConfirm} onScrewConfirmAndNext={handleScrewConfirmAndNext}
        onScrewDelete={() => removePlacement(editingPlacementId!)}
        onOsteoConfirm={handleOsteoConfirm} onOsteoDelete={() => removePlacement(editingPlacementId!)}
        onOsteoClose={() => { setOpenModal(null); setOsteoDiscLevel(undefined); }}
        onCageConfirm={handleCageConfirm} onCageDelete={handleDeleteCage}
        onForceConfirm={handleForceConfirm} onForceSelect={handleForceSelectFromPopover}
        onForceRemove={handleForceRemoveFromPopover} setPendingForceZone={setPendingForceZone}
        onNoteConfirm={handleNoteConfirm} onNoteDelete={handleNoteDelete}
        setEditingNote={setEditingNote} setPendingNoteTool={setPendingNoteTool}
        onDiscPickCage={handleDiscPickCage} onDiscPickOsteo={handleDiscPickOsteo}
        onConfirmNewPatient={executeNewPatient} onConfirmClearConstruct={confirmClearConstructAction}
        confirmLock={confirmLock} setConfirmLock={setConfirmLock} confirmUnlock={confirmUnlock} setConfirmUnlock={setConfirmUnlock}
        onConfirmLock={executeFinishCase} onConfirmUnlock={executeUnlockRecord}
        onExportWithChoice={handleExportWithChoice}
        useRegionDefaults={useRegionDefaults} onToggleRegionDefaults={toggleRegionDefaults}
        confirmAndNextDefault={confirmAndNextDefault} onToggleConfirmAndNextDefault={toggleConfirmAndNextDefault}
        levels={levels} scheme={scheme}
        plannedPlacements={plannedPlacements} completedPlacements={completedPlacements}
        activeChart={activeChart}
        defaultDiameter={defaultDiameter} defaultLength={defaultLength}
        defaultScrewMode={defaultScrewMode} defaultCustomText={defaultCustomText}
        defaultOsteoType={defaultOsteoType} defaultOsteoAngle={defaultOsteoAngle}
        screwSystem={patientData.screwSystem}
    /></ErrorBoundary>;


    // ============================================================
    // PORTRAIT LAYOUT
    // ============================================================
    if (isPortrait) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                {modals}
                <RodModal isOpen={rodModalOpen} onClose={() => setRodModalOpen(false)} onConfirm={handleRodConfirm} onDelete={handleRodDelete} initialSide={rodModalSide} leftRod={rodModalChart === 'plan' ? patientData.planLeftRod : patientData.leftRod} rightRod={rodModalChart === 'plan' ? patientData.planRightRod : patientData.rightRod} isEditing={true} />
                <input type="file" ref={fileInputRef} onChange={loadProjectJSON} className="hidden" accept=".json" />

                <PortraitToolbar scheme={scheme} colourScheme={colourScheme} changeTheme={changeTheme} currentLang={currentLang} changeLang={changeLang} selectedTool={selectedTool} setSelectedTool={setSelectedTool} viewMode={viewMode} setViewMode={setViewMode} showPelvis={showPelvis} togglePelvis={togglePelvis} incognitoMode={incognitoMode} setIncognitoMode={setIncognitoMode} syncConnected={syncConnected} isViewOnly={isViewOnly} tools={tools} fileInputRef={fileInputRef} loadProjectJSON={loadProjectJSON} saveProjectJSON={saveProjectJSON} promptExportJPG={promptExportJPG} promptExportPDF={promptExportPDF} copyPlanToCompleted={() => { copyPlanToCompleted(); switchPortraitTab(2); }} onConfirmClearConstruct={() => setConfirmClearConstruct(true)} newPatientAction={newPatientAction} onOpenPreferences={() => setOpenModal('preferences')} onOpenHelp={() => setOpenModal('help')} onOpenChangelog={() => setOpenModal('changelog')} portraitTab={portraitTab} switchPortraitTab={switchPortraitTab} isLocked={isLocked} onFinishCase={finishCaseAction} onUnlockRecord={unlockRecordAction} />

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
                                <ChartPaper title={t('export.plan')} placements={plannedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={true} heightScale={heightScale} cages={plannedCages} onDiscClick={() => {}} connectors={plannedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={plannedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{formatRodSummary(patientData.planLeftRod)}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{formatRodSummary(patientData.planRightRod)}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} />
                            </div>
                            <div dir="ltr" className="flex-[3] flex flex-col h-full min-w-0 overflow-hidden">
                                <ChartPaper title={t('export.construct')} placements={completedPlacements} onZoneClick={() => {}} onPlacementClick={() => {}} tools={allTools} readOnly={true} levels={levels} showForces={false} heightScale={heightScale} cages={completedCages} onDiscClick={() => {}} connectors={completedConnectors} onConnectorUpdate={() => {}} onConnectorRemove={() => {}} viewMode={viewMode} notes={completedNotes} onNoteUpdate={() => {}} onNoteRemove={() => {}} onNoteClick={() => {}} rodHeader={<React.Fragment><div className="flex items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-right">{formatRodSummary(patientData.leftRod)}</span></div><div className="flex items-center justify-start gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t('patient.rod')}:</span><span className="text-[10px] py-0.5 px-1 text-left">{formatRodSummary(patientData.rightRod)}</span></div></React.Fragment>} reconLabelPositions={reconLabelPositions} />
                            </div>
                            <div className="absolute bottom-1 end-2 text-[8px] text-slate-300 font-mono">{state.lockedAt ? `${t('export.record_finalised')}: ${state.lockedAt.replace('T',' ').substring(0,19)} | ` : ''}{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                )}
            {/* Toast notifications rendered by ToastProvider in main.tsx */}
            {!disclaimerAccepted && <DisclaimerModal lang={currentLang} onLangChange={changeLang} onAccept={() => { acceptDisclaimer(currentLang); dispatch({ type: 'ACCEPT_DISCLAIMER' }); setDisclaimerTick(n => n + 1); if (syncChannelRef.current) syncChannelRef.current.postMessage({ type: 'lang_accepted', appVersion: CURRENT_VERSION, lang: currentLang }); }} />}
            </div>
        );
    }

    // ============================================================
    // LANDSCAPE LAYOUT (unchanged)
    // ============================================================
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {modals}
            <RodModal isOpen={rodModalOpen} onClose={() => setRodModalOpen(false)} onConfirm={handleRodConfirm} onDelete={handleRodDelete} initialSide={rodModalSide} leftRod={rodModalChart === 'plan' ? patientData.planLeftRod : patientData.leftRod} rightRod={rodModalChart === 'plan' ? patientData.planRightRod : patientData.rightRod} isEditing={true} />

            <div className="flex-1 overflow-hidden bg-slate-200 flex relative">
                <Sidebar scheme={scheme} colourScheme={colourScheme} changeTheme={changeTheme} currentLang={currentLang} changeLang={changeLang} selectedTool={selectedTool} setSelectedTool={setSelectedTool} activeChart={activeChart} setActiveChart={setActiveChart} viewMode={viewMode} setViewMode={setViewMode} showPelvis={showPelvis} togglePelvis={togglePelvis} incognitoMode={incognitoMode} setIncognitoMode={setIncognitoMode} syncConnected={syncConnected} tools={tools} fileInputRef={fileInputRef} loadProjectJSON={loadProjectJSON} saveProjectJSON={saveProjectJSON} promptExportJPG={promptExportJPG} promptExportPDF={promptExportPDF} copyPlanToCompleted={copyPlanToCompleted} clearConstruct={clearConstruct} newPatientAction={newPatientAction} onOpenPreferences={() => setOpenModal('preferences')} onOpenHelp={() => setOpenModal('help')} onOpenChangelog={() => setOpenModal('changelog')} isLocked={isLocked} onFinishCase={finishCaseAction} onUnlockRecord={unlockRecordAction} />

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
                            <div className="absolute bottom-1 end-2 text-[8px] text-slate-300 font-mono">{state.lockedAt ? `${t('export.record_finalised')}: ${state.lockedAt.replace('T',' ').substring(0,19)} | ` : ''}{getDisclaimerTimestamp() ? `${t('disclaimer.accepted_label')} ${getDisclaimerTimestamp()}` : ''} | {new Date().toISOString().replace('T',' ').substring(0,19)} | {CURRENT_VERSION}</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Toast notifications rendered by ToastProvider in main.tsx */}
            {!disclaimerAccepted && <DisclaimerModal lang={currentLang} onLangChange={changeLang} onAccept={() => { acceptDisclaimer(currentLang); dispatch({ type: 'ACCEPT_DISCLAIMER' }); setDisclaimerTick(n => n + 1); if (syncChannelRef.current) syncChannelRef.current.postMessage({ type: 'lang_accepted', appVersion: CURRENT_VERSION, lang: currentLang }); }} />}
            {disclaimerAccepted && <OnboardingTour activeChart={activeChart} setActiveChart={setActiveChart} />}
        </div>
    );
};

export default App;
