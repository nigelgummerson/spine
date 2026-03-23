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
