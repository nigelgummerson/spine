import type { Level } from '../types';

/**
 * Screw trajectory options per cervical level.
 * Returns null for non-cervical levels (trajectory not applicable — always pedicle).
 * Returns an array of { id, labelKey } for levels with multiple trajectory options.
 */
export const TRAJECTORY_OPTIONS: { id: string; labelKey: string }[] = [
    { id: 'pedicle', labelKey: 'clinical.trajectory.pedicle' },
    { id: 'lateral_mass', labelKey: 'clinical.trajectory.lateral_mass' },
    { id: 'pars', labelKey: 'clinical.trajectory.pars' },
    { id: 'translaminar', labelKey: 'clinical.trajectory.translaminar' },
    { id: 'cortical', labelKey: 'clinical.trajectory.cortical' },
    { id: 'transarticular', labelKey: 'clinical.trajectory.transarticular' },
];

export function getTrajectoryOptions(levelId: string): { id: string; labelKey: string; isDefault?: boolean }[] | null {
    if (levelId === 'Oc') return null; // occipital plate — no trajectory selector
    if (levelId === 'C1') return [{ ...TRAJECTORY_OPTIONS[1], isDefault: true }]; // lateral mass only
    if (levelId === 'C2') return [
        { ...TRAJECTORY_OPTIONS[0], isDefault: true }, // pedicle (default)
        TRAJECTORY_OPTIONS[2],                          // pars
        TRAJECTORY_OPTIONS[3],                          // translaminar
        TRAJECTORY_OPTIONS[5],                          // transarticular (Magerl C2→C1)
    ];
    if (/^C[3-6]$/.test(levelId)) return [
        TRAJECTORY_OPTIONS[0],                          // pedicle
        { ...TRAJECTORY_OPTIONS[1], isDefault: true },  // lateral mass (default)
    ];
    if (levelId === 'C7') return [
        { ...TRAJECTORY_OPTIONS[0], isDefault: true },  // pedicle (default)
        TRAJECTORY_OPTIONS[1],                          // lateral mass
    ];
    if (/^L[1-5]$/.test(levelId)) return [
        { ...TRAJECTORY_OPTIONS[0], isDefault: true },  // pedicle (default)
        TRAJECTORY_OPTIONS[4],                           // cortical (CBT)
    ];
    return null; // T1-T12, S1+ — always pedicle, no selector needed
}

/**
 * Per-level screw trajectory angles (degrees).
 * transverse: positive = medial convergence, negative = lateral divergence
 * sagittal: positive = screw tip goes CAUDAD (downward in PA view),
 *           negative = screw tip goes CEPHALAD (upward in PA view)
 *
 * Note: published papers report sagittal as "cephalad tilt of the pedicle axis".
 * For pedicle screws, this results in a caudad tip direction (positive here).
 * For lateral mass (Magerl) and CBT, the tip genuinely goes cephalad (negative here).
 *
 * Sources:
 * - Pedicle (cervical): Karaikovic et al. 1997
 * - Pedicle (thoracic): Chadha et al. 2019 (Eur Spine J, PMC2200778)
 * - Pedicle (lumbar): Chadha et al. 2019, Zindrick et al. 1987
 * - Pedicle (C2): Abumi technique; Xu et al.
 * - Lateral mass: Magerl technique (An et al. 1991)
 * - CBT: Matsukawa et al. 2013 (J Neurosurg Spine)
 * - C1 lateral mass: Bunmaprasert et al. 2021 (PMC8255764)
 * - C2 pars: PMC9910137
 *
 * Entry point clock positions on pedicle ellipse (PA view):
 * - Pedicle (T1-S1): 10 o'clock (left), 2 o'clock (right) — posterior-lateral entry
 * - CBT (L1-L5): 4:30 (left), 7:30 (right) — inferior-medial entry
 * - Cervical pedicle/lateral mass: centered (no pedicle ellipse data yet)
 * - S1: centered (wide sacral pedicle)
 */
interface TrajectoryAngle { transverse: number; sagittal: number }

/** Clock hour to angle on ellipse (SVG coords: 0°=right, clockwise positive) */
function clockToAngle(hour: number): number {
    return (hour * 30 - 90) * Math.PI / 180;
}

/** Entry point offset from pedicle centre, as fraction of (pedRx, pedRy) */
export function getEntryPointOffset(trajectory: string, side: 'left' | 'right'): { fx: number; fy: number } | null {
    if (trajectory === 'pedicle') {
        // Posterior-lateral entry: Left 10 o'clock, Right 2 o'clock
        const hour = side === 'left' ? 10 : 2;
        const a = clockToAngle(hour);
        return { fx: Math.cos(a), fy: Math.sin(a) };
    }
    if (trajectory === 'cortical') {
        // Inferior-medial entry (near pars/spinous process base): Left 4:30, Right 7:30
        const hour = side === 'left' ? 4.5 : 7.5;
        const a = clockToAngle(hour);
        return { fx: Math.cos(a), fy: Math.sin(a) };
    }
    if (trajectory === 'lateral_mass') {
        // Lateral mass centre — no pedicle offset (icon stays at lateral mass position)
        return null;
    }
    return null; // cervical pedicle/pars/translaminar: centred (no pedicle ellipse data yet)
}

const TRAJECTORY_ANGLE_DATA: Record<string, Record<string, TrajectoryAngle>> = {
    // C1: lateral mass only (Goel-Harms) — no pedicle ellipse data, shank from centre
    C1:  { lateral_mass: { transverse: 15, sagittal: 0 } },
    // C2: pedicle (Abumi), pars, translaminar (Wright 2004), transarticular (Magerl C2→C1) — no pedicle ellipse data
    C2:  { pedicle: { transverse: 27, sagittal: -22 }, pars: { transverse: 10, sagittal: -45 }, translaminar: { transverse: 30, sagittal: -25 }, transarticular: { transverse: 5, sagittal: -50 } },
    // Translaminar (Wright 2004, Dorward & Wright 2011): ~25-35° medial (crosses midline into contralateral lamina), ~20-30° cephalad.
    // Entry at ipsilateral spinolaminar junction. Bilateral screws form X pattern. 4.0mm × 26-28mm typical.
    // Transarticular (Magerl & Seemann 1987): ~0-10° medial, ~45-55° cephalad. Entry at C2 inferior lateral mass.
    // C3-C7: pedicle (Karaikovic) + lateral mass (Magerl) — no pedicle ellipse data
    C3:  { pedicle: { transverse: 47, sagittal: -9 },  lateral_mass: { transverse: -25, sagittal: -45 } },
    C4:  { pedicle: { transverse: 49, sagittal: -2 },  lateral_mass: { transverse: -25, sagittal: -45 } },
    C5:  { pedicle: { transverse: 46, sagittal: 3 },   lateral_mass: { transverse: -25, sagittal: -45 } },
    C6:  { pedicle: { transverse: 43, sagittal: 5 },   lateral_mass: { transverse: -25, sagittal: -45 } },
    C7:  { pedicle: { transverse: 37, sagittal: 4 },   lateral_mass: { transverse: -25, sagittal: -45 } },
    // T1-T12: pedicle only (Chadha et al. 2019) — tip goes caudad (positive sagittal)
    T1:  { pedicle: { transverse: 28, sagittal: 11 } },
    T2:  { pedicle: { transverse: 26, sagittal: 19 } },
    T3:  { pedicle: { transverse: 23, sagittal: 17 } },
    T4:  { pedicle: { transverse: 23, sagittal: 15 } },
    T5:  { pedicle: { transverse: 18, sagittal: 18 } },
    T6:  { pedicle: { transverse: 15, sagittal: 17 } },
    T7:  { pedicle: { transverse: 13, sagittal: 13 } },
    T8:  { pedicle: { transverse: 14, sagittal: 14 } },
    T9:  { pedicle: { transverse: 12, sagittal: 13 } },
    T10: { pedicle: { transverse: 9, sagittal: 13 } },
    T11: { pedicle: { transverse: 8, sagittal: 12 } },
    T12: { pedicle: { transverse: 8, sagittal: 11 } },
    // L1-L5: pedicle tip caudad (positive), CBT tip cephalad (negative)
    L1:  { pedicle: { transverse: 8, sagittal: 6 },  cortical: { transverse: -9, sagittal: -26 } },
    L2:  { pedicle: { transverse: 12, sagittal: 5 }, cortical: { transverse: -9, sagittal: -26 } },
    L3:  { pedicle: { transverse: 15, sagittal: 5 }, cortical: { transverse: -9, sagittal: -26 } },
    L4:  { pedicle: { transverse: 19, sagittal: 3 }, cortical: { transverse: -9, sagittal: -26 } },
    L5:  { pedicle: { transverse: 24, sagittal: 3 }, cortical: { transverse: -9, sagittal: -26 } },
    // S1: pedicle only — centered entry (wide sacral pedicle)
    S1:  { pedicle: { transverse: 25, sagittal: 0 } },
};

/**
 * Get the trajectory angle for a given level and trajectory type.
 * Returns null if no angle data available (e.g. occiput, pelvic levels).
 */
export function getTrajectoryAngle(levelId: string, trajectory?: string): TrajectoryAngle | null {
    const levelData = TRAJECTORY_ANGLE_DATA[levelId];
    if (!levelData) return null;
    // Use specified trajectory, or determine default
    const traj = trajectory || (() => {
        const opts = getTrajectoryOptions(levelId);
        if (opts) return (opts.find(o => o.isDefault) || opts[0]).id;
        return 'pedicle';
    })();
    return levelData[traj] || levelData.pedicle || null;
}

/**
 * Project a screw into the PA (coronal) view.
 * Returns { dx, dy } in SVG units — the visible displacement from entry to tip.
 *
 * @param lengthMm - screw length in mm
 * @param angles - { transverse, sagittal } in degrees
 * @param side - 'left' or 'right' (determines medial convergence direction)
 * @param scale - mm-to-SVG-units scale factor (VERT_SVG_SCALE)
 */
export function projectScrewShank(
    lengthMm: number,
    angles: TrajectoryAngle,
    side: 'left' | 'right',
    scale: number
): { dx: number; dy: number } {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const θt = toRad(angles.transverse); // positive = medial convergence
    const θs = toRad(angles.sagittal);   // positive = cephalad tilt of pedicle axis
    const L = lengthMm * scale;
    // Sagittal tilt reduces effective length in axial plane: L_axial = L × cos(θs)
    // Horizontal displacement: dx = L_axial × sin(θt) = L × cos(θs) × sin(θt)
    // Medial convergence: LEFT side → dx positive (rightward), RIGHT → negative (leftward)
    const medialSign = side === 'left' ? 1 : -1;
    const dx = L * Math.cos(θs) * Math.sin(θt) * medialSign;
    // Sagittal displacement: screw tip ends up caudad to entry (pedicle entry is
    // posterior-superior, tip goes anteroinferiorly into body). Positive sagittal
    // angle → positive dy (downward in SVG coordinates).
    const dy = L * Math.sin(θs);
    return { dx, dy };
}

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

export const NOTE_PRESET_GROUPS: { labelKey: string; keys: string[] }[] = [
    { labelKey: 'modal.note.group_anatomy', keys: ['clinical.note.last_visible_rib', 'clinical.note.transitional_level', 'clinical.note.sacralized_l5', 'clinical.note.lumbarized_s1'] },
    { labelKey: 'modal.note.group_deformity', keys: ['clinical.note.end_vertebra', 'clinical.note.apex', 'clinical.note.stable_vertebra', 'clinical.note.neutral_vertebra', 'clinical.note.fractured_vertebra'] },
    { labelKey: 'modal.note.group_plan', keys: ['clinical.note.uiv', 'clinical.note.liv', 'clinical.note.rod_transition', 'clinical.note.decompression'] },
];
export const NOTE_PRESET_KEYS: string[] = NOTE_PRESET_GROUPS.flatMap(g => g.keys);

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
