export const BONE_GRAFT_OPTIONS = [
    'Local Bone', 'Autograft', 'Allograft',
    'Synthetics', 'DBM', 'BMP' // DBM, BMP - international abbreviations, not translated
];

export const BONE_GRAFT_LABEL_KEYS = {
    'Local Bone': 'clinical.bone_graft.local_bone',
    'Autograft': 'clinical.bone_graft.autograft',
    'Allograft': 'clinical.bone_graft.allograft',
    'Synthetics': 'clinical.bone_graft.synthetics',
};

export const IMPLANT_COMPANIES = [
    'Medtronic', 'DePuy Synthes', 'Globus Medical', 'Stryker', 'VB Spine',
    'Zimmer Biomet', 'Orthofix', 'ATEC Spine', 'SI-BONE', 'Aesculap (B. Braun)',
    'ulrich medical', 'SpineGuard', 'Spinal Elements', 'Life Spine', 'Aurora Spine', 'Precision Spine'
];

export const SCREW_SYSTEMS = {
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

// Light sidebar = Apple-style light chrome with colour accent
// Dark sidebar = dark mode variant for preference
// textPrimary/textSecondary/textMuted control sidebar text colours
// btnBg/btnBorder control inactive button backgrounds
const _light = { textPrimary: '#1d1d1f', textSecondary: 'rgba(0,0,0,0.55)', textMuted: 'rgba(0,0,0,0.35)', btnBg: 'rgba(0,0,0,0.06)', btnBorder: 'rgba(0,0,0,0.1)', hoverBg: 'rgba(0,0,0,0.08)', titleText: '#1d1d1f' };
const _dark  = { textPrimary: '#FFFFFF', textSecondary: 'rgba(255,255,255,0.7)', textMuted: 'rgba(255,255,255,0.5)', btnBg: 'rgba(255,255,255,0.12)', btnBorder: 'rgba(255,255,255,0.25)', hoverBg: 'rgba(255,255,255,0.15)', titleText: '#FFFFFF' };
const COLOUR_SCHEMES = [
    // --- Corporate themes (light sidebar, real brand colours) ---
    { id: 'default', label: 'Default',        sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#e8e8ed', activeBg: '#005EB8', activeBorder: '#003087', activeText: '#FFFFFF', accent: '#005EB8', swatch: '#005EB8', ..._light },
    { id: 'navy',    label: 'Medtronic',       sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#140F4B', activeBg: '#1010EB', activeBorder: '#140F4B', activeText: '#FFFFFF', accent: '#1010EB', swatch: '#140F4B', ..._light, titleText: '#FFFFFF' },
    { id: 'red',     label: 'DePuy Synthes',   sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#A01000', activeBg: '#D71600', activeBorder: '#A01000', activeText: '#FFFFFF', accent: '#D71600', swatch: '#D71600', ..._light, titleText: '#FFFFFF' },
    { id: 'gold',    label: 'Stryker',         sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#1a1a1a', activeBg: '#FFB600', activeBorder: '#CC9200', activeText: '#000000', accent: '#FFB600', swatch: '#FFB600', ..._light, titleText: '#FFFFFF' },
    { id: 'purple',  label: 'VB Spine',        sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#4A2570', activeBg: '#663399', activeBorder: '#4A2570', activeText: '#FFFFFF', accent: '#663399', swatch: '#663399', ..._light, titleText: '#FFFFFF' },
    { id: 'midnight',label: 'Globus Medical',  sidebarBg: '#f5f5f7', sidebarBorder: '#d1d1d6', sidebarTitleBg: '#001D4A', activeBg: '#CF2E2E', activeBorder: '#001D4A', activeText: '#FFFFFF', accent: '#CF2E2E', swatch: '#002F73', ..._light, titleText: '#FFFFFF' },
    // --- Non-corporate themes (dark sidebar) ---
    { id: 'dark',    label: 'Dark',            sidebarBg: '#1c1c1e', sidebarBorder: '#38383a', sidebarTitleBg: '#141414', activeBg: '#0a84ff', activeBorder: '#0070e0', activeText: '#FFFFFF', accent: '#0a84ff', swatch: '#1c1c1e', ..._dark },
    { id: 'forest',  label: 'Forest',          sidebarBg: '#1c1c1e', sidebarBorder: '#38383a', sidebarTitleBg: '#141414', activeBg: '#059669', activeBorder: '#047857', activeText: '#FFFFFF', accent: '#059669', swatch: '#059669', ..._dark },
    { id: 'teal',    label: 'Coral',            sidebarBg: '#1c1c1e', sidebarBorder: '#38383a', sidebarTitleBg: '#141414', activeBg: '#f97316', activeBorder: '#ea580c', activeText: '#1c1c1e', accent: '#f97316', swatch: '#f97316', ..._dark },
    { id: 'steel',   label: 'Ice',              sidebarBg: '#1c1c1e', sidebarBorder: '#38383a', sidebarTitleBg: '#141414', activeBg: '#38bdf8', activeBorder: '#0ea5e9', activeText: '#1c1c1e', accent: '#38bdf8', swatch: '#38bdf8', ..._dark },
];

// Set to false to disable automatic theme switching when a company is selected
const AUTO_THEME_FROM_COMPANY = true;

const COMPANY_THEME_MAP = {
    'Medtronic': 'navy',
    'DePuy Synthes': 'red',
    'Stryker': 'gold',
    'VB Spine': 'purple',
    'Globus Medical': 'midnight',
};

export const DIAMETER_OPTIONS = [];
for (let i = 3.5; i <= 10.5; i += 0.5) DIAMETER_OPTIONS.push(i.toFixed(1));

export const LENGTH_OPTIONS = [];
for (let i = 10; i <= 35; i++) LENGTH_OPTIONS.push(i);
for (let i = 40; i <= 100; i += 5) LENGTH_OPTIONS.push(i);
