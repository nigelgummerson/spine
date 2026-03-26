export const BONE_GRAFT_OPTIONS: string[] = [
    'Local Bone', 'Autograft', 'Allograft',
    'Synthetics', 'DBM', 'BMP' // DBM, BMP - international abbreviations, not translated
];

export const BONE_GRAFT_LABEL_KEYS: Record<string, string> = {
    'Local Bone': 'clinical.bone_graft.local_bone',
    'Autograft': 'clinical.bone_graft.autograft',
    'Allograft': 'clinical.bone_graft.allograft',
    'Synthetics': 'clinical.bone_graft.synthetics',
};

export const IMPLANT_COMPANIES: string[] = [
    'Medtronic', 'DePuy Synthes', 'Globus Medical', 'Stryker', 'VB Spine',
    'Highridge Medical', 'Orthofix', 'ATEC Spine', 'Aesculap (B. Braun)',
    'ulrich medical', 'Spinal Elements', 'Life Spine', 'Precision Spine'
];

export const SCREW_SYSTEMS: Record<string, string[]> = {
    'Medtronic': ['ModuLeX', 'Solera', 'Solera Voyager', 'LONGITUDE II', 'Infinity OCT'],
    'DePuy Synthes': ['TriALTIS', 'EXPEDIUM VERSE', 'VIPER PRIME', 'MATRIX', 'SYMPHONY OCT'],
    'Globus Medical': ['CREO', 'CREO MIS', 'REVERE', 'REVOLVE', 'Reline', 'Reline 3D', 'Precept', 'QUARTEX OCT'],
    'Stryker': ['Serrato', 'MESA 2', 'MESA Rail', 'Xia 3', 'DENALI', 'ES2', 'Everest', 'CASPIAN OCT'],
    'VB Spine': ['Serrato', 'MESA 2', 'MESA Rail', 'Xia 3', 'DENALI', 'ES2', 'Everest', 'OASYS', 'CASPIAN OCT', 'YUKON OCT'],
    'Highridge Medical': ['Vital', 'Vitality', 'Polaris', 'PathFinder NXT', 'Cypher MIS', 'LineSider', 'Virage OCT'],
    'Orthofix': ['Firebird NXG', 'Phoenix MIS', 'Mariner', 'NorthStar OCT'],
    'ATEC Spine': ['InVictus', 'InVictus OCT', 'Arsenal'],
    'Aesculap (B. Braun)': ['S4', 'Ennovate'],
    'ulrich medical': ['neon3', 'tango RS', 'uCentum', 'Momentum', 'flamenco', 'Cortium'],
    'Spinal Elements': ['Overwatch', 'Mercury', 'Lotus'],
    'Life Spine': ['CENTERLINE', 'Solstice OCT'],
    'Precision Spine': ['SureLOK', 'Reform'],
};

// --- Rod specification constants ---

export const ROD_MATERIALS = ['titanium', 'cpt', 'cobalt_chrome', 'stainless_steel', 'peek'] as const;
export const ROD_PROFILES = ['round', 'rail', 'transition'] as const;
export const ROD_CONTOURS = ['surgeon_bent', 'pre_contoured', 'patient_specific', 'straight'] as const;
export const ROD_DIAMETERS = ['3.5', '4.0', '4.5', '4.75', '5.0', '5.5', '6.0', '6.35'] as const;

/** Short display labels for rod materials (not translated — international abbreviations) */
export const ROD_MATERIAL_ABBREV: Record<string, string> = {
    titanium: 'Ti',
    cpt: 'CP-Ti',
    cobalt_chrome: 'CoCr',
    stainless_steel: 'SS',
    peek: 'PEEK',
};

import type { RodData } from '../types';

/** Create an empty RodData object */
export function createEmptyRod(): RodData {
    return { material: '', diameter: '', profile: '', length: '', contour: '', notes: '', transitionFrom: '', transitionTo: '' };
}

/** Format a RodData object into a compact display string.
 * Returns empty string if no data is set. */
export function formatRodSummary(rod: RodData): string {
    if (!rod) return '';
    const parts: string[] = [];
    // Transition rods: show "Transition 3.5→5.5mm" instead of main diameter
    if (rod.profile === 'transition' && (rod.transitionFrom || rod.transitionTo)) {
        const from = rod.transitionFrom || '?';
        const to = rod.transitionTo || '?';
        parts.push(`Transition ${from}\u2192${to}mm`);
    } else {
        if (rod.diameter) parts.push(`${rod.diameter}mm`);
        if (rod.profile === 'rail') parts.push('rail');
    }
    if (rod.material) parts.push(ROD_MATERIAL_ABBREV[rod.material] || rod.material);
    if (rod.contour) {
        const contourLabels: Record<string, string> = { surgeon_bent: 'surgeon-bent', pre_contoured: 'pre-contoured', patient_specific: 'patient-specific', straight: 'straight' };
        parts.push(contourLabels[rod.contour] || rod.contour);
    }
    if (rod.length) parts.push(`${rod.length}mm`);
    // If no structured data but notes exist, show notes as fallback
    if (parts.length === 0 && rod.notes) return rod.notes;
    return parts.join(', ');
}

/** Check whether a RodData object has any data set */
export function isRodEmpty(rod: RodData): boolean {
    if (!rod) return true;
    return !rod.material && !rod.diameter && !rod.profile && !rod.length && !rod.contour && !rod.notes && !rod.transitionFrom && !rod.transitionTo;
}

// --- Screw diameter/length options ---

export const DIAMETER_OPTIONS: string[] = [];
for (let i = 3.5; i <= 10.5; i += 0.5) DIAMETER_OPTIONS.push(i.toFixed(1));

export const LENGTH_OPTIONS: number[] = [];
for (let i = 10; i <= 35; i++) LENGTH_OPTIONS.push(i);
for (let i = 40; i <= 100; i += 5) LENGTH_OPTIONS.push(i);

/** Evidence-based screw size defaults by level.
 * Sources: Panjabi 1991, Zindrick 1986/1987, Berry 1987, Xu 1999, Lehman 2012, Kuklo 2001.
 * These are starting suggestions only — always verify against patient anatomy on CT. */
export const SCREW_DEFAULTS: Record<string, { diameter: string; length: string }> = {
    C3: { diameter: '3.5', length: '14' },
    C4: { diameter: '3.5', length: '14' },
    C5: { diameter: '3.5', length: '14' },
    C6: { diameter: '3.5', length: '14' },
    C7: { diameter: '3.5', length: '14' },
    T1: { diameter: '4.5', length: '28' },
    T2: { diameter: '4.5', length: '28' },
    T3: { diameter: '4.0', length: '28' },
    T4: { diameter: '4.0', length: '30' },
    T5: { diameter: '4.0', length: '30' },
    T6: { diameter: '4.5', length: '30' },
    T7: { diameter: '4.5', length: '32' },
    T8: { diameter: '5.0', length: '35' },
    T9: { diameter: '5.0', length: '35' },
    T10: { diameter: '5.5', length: '35' },
    T11: { diameter: '5.5', length: '40' },
    T12: { diameter: '6.0', length: '40' },
    L1: { diameter: '6.0', length: '45' },
    L2: { diameter: '6.5', length: '45' },
    L3: { diameter: '6.5', length: '45' },
    L4: { diameter: '6.5', length: '45' },
    L5: { diameter: '6.5', length: '45' },
    S1: { diameter: '7.0', length: '45' },
    S2: { diameter: '6.5', length: '35' },
    S2AI: { diameter: '7.5', length: '80' },
    Iliac: { diameter: '7.5', length: '80' },
    'SI-J': { diameter: '7.0', length: '45' },
};

/** Get screw default for a level.
 * Returns null for levels with no safe default (Oc, C1, C2, unknown). */
export function getScrewDefault(levelId: string): { diameter: string; length: string } | null {
    return SCREW_DEFAULTS[levelId] || null;
}

// --- Kit-aware screw size validation ---

export interface SystemCatalogue {
    type: 'cervical' | 'thoracolumbar' | 'oct' | 'mis';
    /** Available screw diameters in mm */
    screwDiameters: number[];
    /** Available screw lengths per diameter. Key is diameter as string (e.g. '4.0'). Values are explicit length arrays. */
    screwLengthsByDiameter: Record<string, number[]>;
    rodDiameters: number[];
    rodMaterials: string[];
    rodProfiles: string[];
    notes?: string;
}

export const SYSTEM_CATALOGUE: Record<string, SystemCatalogue> = {
    'Xia 3': {
        type: 'thoracolumbar',
        screwDiameters: [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.5, 9.5, 10.5],
        screwLengthsByDiameter: {
            '4.0':  [20, 22, 25, 30, 35, 40, 45],
            '4.5':  [20, 22, 25, 30, 35, 40, 45],
            '5.0':  [20, 25, 30, 35, 40, 45, 50],
            '5.5':  [25, 30, 35, 40, 45, 50, 55],
            '6.0':  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
            '6.5':  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
            '7.0':  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
            '7.5':  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
            '8.5':  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
            '9.5':  [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
            '10.5': [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
        },
        rodDiameters: [5.5, 6.0],
        rodMaterials: ['titanium', 'cobalt_chrome', 'cpt'],
        rodProfiles: ['round'],
        notes: 'Flagship thoracolumbar system. Vitallium = CoCr. CP-Ti rods also available.',
    },
};

/** Look up catalogue data for a screw system by name.
 * Returns null if no catalogue entry exists (most systems). */
export function getSystemCatalogue(screwSystem: string): SystemCatalogue | null {
    return SYSTEM_CATALOGUE[screwSystem] || null;
}

export interface ScrewSizeWarning {
    diameterWarning: string | null;
    lengthWarning: string | null;
}

/** Check screw diameter and length against a system catalogue.
 * Returns warning strings for out-of-range values, or null if in range / no catalogue. */
export function checkScrewSize(
    screwSystem: string,
    diameter: number,
    length: number,
): ScrewSizeWarning {
    const cat = getSystemCatalogue(screwSystem);
    if (!cat) return { diameterWarning: null, lengthWarning: null };

    let diameterWarning: string | null = null;
    let lengthWarning: string | null = null;

    // Check diameter against explicit list
    if (!cat.screwDiameters.includes(diameter)) {
        diameterWarning = 'not_available';
    }

    // Check length against per-diameter list
    const diameterKey = diameter.toFixed(1);
    const availableLengths = cat.screwLengthsByDiameter[diameterKey];
    if (availableLengths) {
        if (!availableLengths.includes(length)) {
            lengthWarning = 'not_available';
        }
    }
    // If no length data for this diameter, no warning (data incomplete)

    return { diameterWarning, lengthWarning };
}
