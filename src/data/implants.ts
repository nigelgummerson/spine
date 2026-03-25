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
    'Zimmer Biomet', 'Orthofix', 'ATEC Spine', 'SI-BONE', 'Aesculap (B. Braun)',
    'ulrich medical', 'SpineGuard', 'Spinal Elements', 'Life Spine', 'Aurora Spine', 'Precision Spine'
];

export const SCREW_SYSTEMS: Record<string, string[]> = {
    'Medtronic': ['ModuLeX', 'Solera', 'Solera Voyager', 'Infinity OCT', 'VERTEX SELECT', 'TSRH'],
    'DePuy Synthes': ['TriALTIS', 'EXPEDIUM VERSE', 'EXPEDIUM', 'VIPER PRIME', 'VIPER 2 MIS', 'ALTALYNE', 'MATRIX', 'SYMPHONY OCT'],
    'Globus Medical': ['CREO', 'CREO MIS', 'REVERE', 'REVOLVE', 'Reline', 'Reline 3D', 'Armada', 'Precept'],
    'Stryker': ['Serrato', 'MESA 2', 'MESA Rail', 'Xia 3', 'DENALI', 'ES2', 'Everest', 'CASPIAN OCT'],
    'VB Spine': ['Serrato', 'MESA 2', 'MESA Rail', 'Xia 3', 'DENALI', 'DENALI MI', 'ES2', 'Everest', 'OASYS', 'CASPIAN OCT', 'YUKON OCT'],
    'Zimmer Biomet': ['Vital', 'Vitality', 'Polaris', 'Sequoia', 'PathFinder NXT', 'Cypher MIS', 'Virage OCT'],
    'Orthofix': ['Firebird', 'Firebird NXG', 'Phoenix MIS', 'Mariner', 'NorthStar OCT'],
    'ATEC Spine': ['InVictus', 'InVictus OCT', 'Arsenal', 'Zodiac'],
    'SI-BONE': ['iFuse', 'iFuse-TORQ', 'iFuse Bedrock'],
    'Aesculap (B. Braun)': ['S4', 'Ennovate'],
    'ulrich medical': ['neon3', 'tango RS', 'uCentum', 'Momentum', 'flamenco'],
    'Spinal Elements': ['Overwatch', 'Mercury', 'Lotus', 'Karma'],
    'Life Spine': ['CENTERLINE', 'Solstice OCT'],
    'Aurora Spine': ['ZIP', 'DEXA-C'],
    'Precision Spine': ['SureLOK', 'Reform'],
};

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
    T10: { diameter: '5.5', length: '38' },
    T11: { diameter: '5.5', length: '40' },
    T12: { diameter: '6.0', length: '40' },
    L1: { diameter: '6.0', length: '45' },
    L2: { diameter: '6.5', length: '45' },
    L3: { diameter: '6.5', length: '45' },
    L4: { diameter: '6.5', length: '45' },
    L5: { diameter: '6.5', length: '45' },
    S1: { diameter: '7.0', length: '45' },
    S2: { diameter: '6.5', length: '35' },
};

/** Pelvic zone overrides — keyed by zone prefix (without _left/_right). */
const PELVIC_DEFAULTS: Record<string, { diameter: string; length: string }> = {
    s2ai: { diameter: '7.5', length: '80' },
    iliac: { diameter: '7.5', length: '80' },
    si: { diameter: '7.0', length: '45' },
};

/** Get screw default for a level, optionally considering pelvic zone.
 * Returns null for levels with no safe default (Oc, C1, C2, unknown). */
export function getScrewDefault(levelId: string, zone?: string): { diameter: string; length: string } | null {
    if (zone) {
        const prefix = zone.replace(/_left$|_right$/, '');
        if (PELVIC_DEFAULTS[prefix]) return PELVIC_DEFAULTS[prefix];
    }
    return SCREW_DEFAULTS[levelId] || null;
}
