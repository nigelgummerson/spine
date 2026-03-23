import { t } from '../i18n/i18n';

export const CAGE_PERMISSIBILITY = {
  acdf: ['C2','C3','C4','C5','C6','C7'],
  plif: ['T11','T12','L1','L2','L3','L4','L5'],
  tlif: ['T11','T12','L1','L2','L3','L4','L5'],
  xlif: ['T5','T6','T7','T8','T9','T10','T11','T12','L1','L2','L3','L4'],
  olif: ['T12','L1','L2','L3','L4'],
  alif: ['L4','L5'],
};

export const HOOK_TYPES = ['pedicle_hook','tp_hook','tp_hook_up','sl_hook','il_hook'];
export const NO_SIZE_TYPES = [...HOOK_TYPES, 'band', 'wire', 'cable'];

export const NOTE_PRESET_KEYS = [
    'clinical.note.last_visible_rib', 'clinical.note.end_vertebra', 'clinical.note.apex',
    'clinical.note.transitional_level', 'clinical.note.stable_vertebra', 'clinical.note.neutral_vertebra'
];

export const CAGE_TYPES = [ // International abbreviations - not translated
  { id: 'acdf', label: 'ACDF', descKey: 'clinical.cage.acdf.desc', approach: 'anterior', defaultSide: 'midline', defaults: { height:'6', width:'16', length:'14', lordosis:'0' } },
  { id: 'plif', label: 'PLIF', descKey: 'clinical.cage.plif.desc', approach: 'posterior', defaultSide: 'bilateral', sideOptions: null, defaults: { height:'10', width:'10', length:'25', lordosis:'0' } },
  { id: 'tlif', label: 'TLIF', descKey: 'clinical.cage.tlif.desc', approach: 'posterior', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'10', length:'30', lordosis:'0' } },
  { id: 'xlif', label: 'XLIF/LLIF', descKey: 'clinical.cage.xlif.desc', approach: 'lateral', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'18', length:'50', lordosis:'0' } },
  { id: 'olif', label: 'OLIF', descKey: 'clinical.cage.olif.desc', approach: 'lateral', defaultSide: 'left', sideOptions: ['left','right'], defaults: { height:'10', width:'18', length:'45', lordosis:'0' } },
  { id: 'alif', label: 'ALIF', descKey: 'clinical.cage.alif.desc', approach: 'anterior', defaultSide: 'midline', sideOptions: null, defaults: { height:'12', width:'35', length:'25', lordosis:'10' } },
];

export const APPROACH_GROUPS = [
  { labelKey: 'clinical.approach.posterior', descKey: 'clinical.approach.posterior.desc', types: ['plif','tlif'] },
  { labelKey: 'clinical.approach.anterior', descKey: 'clinical.approach.anterior.desc', types: ['acdf','alif'] },
  { labelKey: 'clinical.approach.lateral', descKey: 'clinical.approach.lateral.desc', types: ['xlif','olif'] },
];

export const getDiscLabel = (levelId, levels) => {
  const idx = levels.findIndex(l => l.id === levelId);
  const nextLevel = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
  if (!nextLevel) return levelId;
  const nextNum = nextLevel.id.replace(/^[A-Z]+/, '');
  return `${levelId}/${nextNum}`;
};

export const FORCE_TYPES = [
    { id: 'translate_left', labelKey: 'clinical.force.translate_left', icon: 'translate_left' },
    { id: 'translate_right', labelKey: 'clinical.force.translate_right', icon: 'translate_right' },
    { id: 'compression', labelKey: 'clinical.force.compression', icon: 'compression' },
    { id: 'distraction', labelKey: 'clinical.force.distraction', icon: 'distraction' },
    { id: 'derotate_cw', labelKey: 'clinical.force.derotate_cw', icon: 'derotate_cw' },
    { id: 'derotate_ccw', labelKey: 'clinical.force.derotate_ccw', icon: 'derotate_ccw' },
];

export const INVENTORY_CATEGORIES = [
    { key: 'screws', labelKey: 'inventory.screws', toolIds: ['monoaxial','polyaxial','uniplanar'] },
    { key: 'hooks', labelKey: 'inventory.hooks', toolIds: HOOK_TYPES },
    { key: 'cages', labelKey: 'inventory.cages', toolIds: ['acdf','plif','tlif','xlif','olif','alif'] },
    { key: 'fixation', labelKey: 'inventory.fixation', toolIds: ['band','wire','cable'] },
    { key: 'other', labelKey: 'inventory.other', toolIds: ['connector','unstable'] },
];
