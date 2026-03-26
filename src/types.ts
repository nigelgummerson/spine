export type LevelId = string;

export type Zone = 'left' | 'right' | 'mid' | 'disc' | 'force_left' | 'force_right';

export type Side = 'left' | 'right' | 'bilateral' | 'midline';

export type Chart = 'plan' | 'construct';

export interface OsteotomyData {
    type: string;
    shortLabel: string;
    angle: number | null;
    reconstructionCage: string;
}

export interface Placement {
    id: string;
    levelId: string;
    zone: Zone;
    tool: string;
    data: string | OsteotomyData | null;
    annotation: string;
}

export interface CageData {
    height: string;
    lordosis: string;
    side: string;
    width?: string;
    length?: string;
    expandable?: boolean;
}

export interface Cage {
    id: string;
    levelId: string;
    tool: string;
    data: CageData;
}

export interface Connector {
    id: string;
    levelId: string;
    fraction: number;
    tool: string;
}

export interface Note {
    id: string;
    levelId: string;
    tool: string;
    text: string;
    offsetX: number;
    offsetY: number;
    showArrow: boolean;
}

export interface BoneGraft {
    types: string[];
    notes: string;
}

export interface RodData {
    material: string;      // 'titanium' | 'cpt' | 'cobalt_chrome' | 'stainless_steel' | 'peek' | 'ultra' | ''
    diameter: string;      // e.g., '5.5' or ''
    profile: string;       // 'round' | 'rail' | 'transition' | ''
    length: string;        // mm, e.g., '120' or ''
    contour: string;       // 'surgeon_bent' | 'pre_contoured' | 'pre_bent_generic' | 'patient_specific' | 'straight' | ''
    notes: string;         // free text for anything else
    transitionFrom?: string;  // e.g., '3.5' (diameter in mm) — only when profile === 'transition'
    transitionTo?: string;    // e.g., '5.5' (diameter in mm) — only when profile === 'transition'
}

export interface PatientData {
    name: string;
    id: string;
    surgeon: string;
    location: string;
    date: string;
    company: string;
    screwSystem: string;
    leftRod: RodData;
    rightRod: RodData;
    planLeftRod: RodData;
    planRightRod: RodData;
    boneGraft: BoneGraft;
}

export interface DocumentState {
    documentId: string;
    documentCreated: string;
    lockedAt: string | null;
    patientData: PatientData;
    plannedPlacements: Placement[];
    completedPlacements: Placement[];
    plannedCages: Cage[];
    completedCages: Cage[];
    plannedConnectors: Connector[];
    completedConnectors: Connector[];
    plannedNotes: Note[];
    completedNotes: Note[];
    reconLabelPositions: Record<string, { offsetX: number; offsetY: number }>;
}

export type DocumentAction =
    | { type: 'ADD_PLACEMENT'; chart: Chart; placement: Placement }
    | { type: 'UPDATE_PLACEMENT'; chart: Chart; id: string; tool: string; data: string | OsteotomyData | null; annotation?: string }
    | { type: 'REMOVE_PLACEMENT'; chart: Chart; id: string }
    | { type: 'SET_CAGE'; chart: Chart; cage: Cage }
    | { type: 'REMOVE_CAGE'; chart: Chart; levelId: string }
    | { type: 'ADD_CONNECTOR'; chart: Chart; connector: Connector }
    | { type: 'UPDATE_CONNECTOR'; chart: Chart; id: string; levelId: string; fraction: number }
    | { type: 'REMOVE_CONNECTOR'; chart: Chart; id: string }
    | { type: 'ADD_NOTE'; chart: Chart; note: Note }
    | { type: 'UPDATE_NOTE'; chart: Chart; id: string; text: string; showArrow: boolean }
    | { type: 'UPDATE_NOTE_POSITION'; chart: Chart; id: string; offsetX: number; offsetY: number }
    | { type: 'REMOVE_NOTE'; chart: Chart; id: string }
    | { type: 'SET_PATIENT_FIELD'; field: string; value: string }
    | { type: 'SET_ROD'; chart: Chart; side: 'left' | 'right'; rod: RodData }
    | { type: 'SET_BONE_GRAFT'; types: string[]; notes: string }
    | { type: 'SET_RECON_LABEL_POSITION'; id: string; offsetX: number; offsetY: number }
    | { type: 'NEW_PATIENT' }
    | { type: 'COPY_PLAN_TO_CONSTRUCT'; genId: () => string }
    | { type: 'CLEAR_CONSTRUCT' }
    | { type: 'LOCK_DOCUMENT' }
    | { type: 'UNLOCK_DOCUMENT' }
    | { type: 'LOAD_DOCUMENT'; document: DocumentState }
    | { type: 'UNDO' }
    | { type: 'REDO' };

export interface ColourScheme {
    id: string;
    label: string;
    sidebarBg: string;
    sidebarBorder: string;
    sidebarTitleBg: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    accent: string;
    swatch: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    btnBg: string;
    btnBorder: string;
    hoverBg: string;
    titleText: string;
}

export interface Level {
    id: string;
    type: string;
}

export interface ToolDefinition {
    id: string;
    labelKey: string;
    icon: string;
    needsSize?: boolean;
    type: string;
    isOsteotomy?: boolean;
}
