import type { Level } from '../types';

/**
 * Returns the osteotomy type IDs permitted at a given spinal level.
 * - Oc, C1, C2: no osteotomies (complex anatomy, out of scope)
 * - C3-C7: Corpectomy only (anterior). No posterior osteotomies.
 * - T1 and below: all types permitted.
 */
export const getPermittedOsteotomyTypes = (levelId: string): string[] | null => {
    if (levelId === 'Oc' || levelId === 'C1' || levelId === 'C2') return [];
    if (/^C[3-7]$/.test(levelId)) return ['Corpectomy'];
    return null; // null = no restriction (all types permitted)
};

export const CAGE_PERMISSIBILITY: Record<string, string[]> = {
  acdf: ['C2','C3','C4','C5','C6','C7'],
  plif: ['T11','T12','L1','L2','L3','L4','L5'],
  tlif: ['T11','T12','L1','L2','L3','L4','L5'],
  xlif: ['T5','T6','T7','T8','T9','T10','T11','T12','L1','L2','L3','L4'],
  olif: ['T12','L1','L2','L3','L4'],
  alif: ['L3','L4','L5'],
};

export const HOOK_TYPES: string[] = ['pedicle_hook','tp_hook','tp_hook_up','sl_hook','il_hook'];
export const NO_SIZE_TYPES: string[] = [...HOOK_TYPES, 'band', 'wire', 'cable'];

export const NOTE_PRESET_KEYS: string[] = [
    'clinical.note.uiv', 'clinical.note.liv',
    'clinical.note.last_visible_rib', 'clinical.note.end_vertebra', 'clinical.note.apex',
    'clinical.note.transitional_level', 'clinical.note.stable_vertebra', 'clinical.note.neutral_vertebra'
];

interface CageDefaults {
    height: string;
    width: string;
    length: string;
    lordosis: string;
}

interface CageType {
    id: string;
    label: string;
    descKey: string;
    approach: string;
    defaultSide: string;
    sideOptions?: string[] | null;
    defaults: CageDefaults;
}

export const CAGE_TYPES: CageType[] = [
  { id: 'acdf', label: 'ACDF', descKey: 'clinical.cage.acdf.desc', approach: 'anterior', defaultSide: 'midline', defaults: { height:'6', width:'16', length:'14', lordosis:'0' } },
  { id: 'plif', label: 'PLIF', descKey: 'clinical.cage.plif.desc', approach: 'posterior', defaultSide: 'bilateral', sideOptions: null, defaults: { height:'10', width:'10', length:'25', lordosis:'0' } },
  { id: 'tlif', label: 'TLIF', descKey: 'clinical.cage.tlif.desc', approach: 'posterior', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'10', length:'30', lordosis:'0' } },
  { id: 'xlif', label: 'XLIF/LLIF', descKey: 'clinical.cage.xlif.desc', approach: 'lateral', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'18', length:'50', lordosis:'0' } },
  { id: 'olif', label: 'OLIF', descKey: 'clinical.cage.olif.desc', approach: 'lateral', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'18', length:'45', lordosis:'0' } },
  { id: 'alif', label: 'ALIF', descKey: 'clinical.cage.alif.desc', approach: 'anterior', defaultSide: 'midline', sideOptions: null, defaults: { height:'12', width:'35', length:'25', lordosis:'10' } },
];

interface ApproachGroup {
    labelKey: string;
    descKey: string;
    types: string[];
}

export const APPROACH_GROUPS: ApproachGroup[] = [
  { labelKey: 'clinical.approach.posterior', descKey: 'clinical.approach.posterior.desc', types: ['plif','tlif'] },
  { labelKey: 'clinical.approach.anterior', descKey: 'clinical.approach.anterior.desc', types: ['acdf','alif'] },
  { labelKey: 'clinical.approach.lateral', descKey: 'clinical.approach.lateral.desc', types: ['xlif','olif'] },
];

export const getDiscLabel = (levelId: string, levels: Level[]): string => {
  const idx = levels.findIndex(l => l.id === levelId);
  const nextLevel = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
  if (!nextLevel) return levelId;
  const nextNum = nextLevel.id.replace(/^[A-Z]+/, '');
  return `${levelId}/${nextNum}`;
};

interface ForceType {
    id: string;
    labelKey: string;
    icon: string;
}

export const FORCE_TYPES: ForceType[] = [
    { id: 'translate_left', labelKey: 'clinical.force.translate_left', icon: 'translate_left' },
    { id: 'translate_right', labelKey: 'clinical.force.translate_right', icon: 'translate_right' },
    { id: 'compression', labelKey: 'clinical.force.compression', icon: 'compression' },
    { id: 'distraction', labelKey: 'clinical.force.distraction', icon: 'distraction' },
    { id: 'derotate_cw', labelKey: 'clinical.force.derotate_cw', icon: 'derotate_cw' },
    { id: 'derotate_ccw', labelKey: 'clinical.force.derotate_ccw', icon: 'derotate_ccw' },
];

interface InventoryCategory {
    key: string;
    labelKey: string;
    toolIds: string[];
}

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
    { key: 'screws', labelKey: 'inventory.screws', toolIds: ['monoaxial','polyaxial','uniplanar'] },
    { key: 'hooks', labelKey: 'inventory.hooks', toolIds: HOOK_TYPES },
    { key: 'cages', labelKey: 'inventory.cages', toolIds: ['acdf','plif','tlif','xlif','olif','alif'] },
    { key: 'fixation', labelKey: 'inventory.fixation', toolIds: ['band','wire','cable'] },
    { key: 'other', labelKey: 'inventory.other', toolIds: ['connector','unstable'] },
];
