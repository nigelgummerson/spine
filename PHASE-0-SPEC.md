# Phase 0: Merge Cages Branch and Fix Cage Implementation

## Current Problems

### 1. Permissibility logic is incomplete and incorrect

The current validation in `handleCageConfirm` (line 695-710):

```javascript
if (type === 'alif' && (lvl !== 'L4' && lvl !== 'L5')) return alert("ALIF only at L4/L5 and L5/S1.");
if (type === 'acdf' && (!lvl.startsWith('C') && lvl !== 'T1')) return alert("ACDF only Cervical/High Thoracic.");
if ((type === 'plif' || type === 'tlif' || type === 'olif') && lvl.startsWith('C')) return alert("Not permitted in Cervical.");
```

Problems:
- **XLIF has no restrictions at all** — can be placed at any level including cervical, which is nonsensical
- **OLIF at L5/S1** is permitted but should be blocked (iliac vessels obstruct access)
- **PLIF/TLIF in the thoracic spine** are permitted but are only realistic from about T12 downwards
- **XLIF at L5/S1** is permitted but should be blocked (iliac crest obstructs lateral access)
- **No distinction between thoracic and lumbar** for lateral/oblique approaches
- Dead code in `handleDiscClick`: `isCervical` and `isLumbar` variables are defined but never used, and `isLumbar` has a bug (`levelId.startsWith('T1')` matches T10, T11, T12)

### 2. Approaches are not distinguished

This is the fundamental conceptual gap. The current implementation treats all cages as interchangeable items placed in a disc space, but the **surgical approach** is the defining characteristic of each cage type:

| Approach | Cage Types | Patient Position | Key Consideration |
|---|---|---|---|
| **Posterior** | PLIF, TLIF | Prone | Same exposure as screws/rods. Done through the same incision. |
| **Anterior** | ALIF, ACDF | Supine (ALIF) or supine with head turn (ACDF) | Separate approach. Requires vascular/visceral mobilisation. Often different surgeon or combined team. May be staged (different day). |
| **Lateral** | XLIF/LLIF | Lateral decubitus | Separate approach. Psoas muscle navigation. Neuromonitoring critical. Often staged with posterior fixation. |
| **Oblique** | OLIF | Lateral decubitus or supine | Anterior to psoas. Avoids psoas traversal but near great vessels. |

Why this matters for a surgical planner:
- **Posterior cages** (PLIF/TLIF) are placed during the same operation as the screws — they are part of the same construct
- **Anterior and lateral cages** are often separate procedures, possibly separate days, possibly separate surgeons
- A plan showing "bilateral pedicle screws T12-S1 + ALIF L5/S1" implies a two-approach or staged procedure
- The planner should make this visually obvious, not bury it as identical-looking items in disc spaces

### 3. VBR is conflated with cages

The current implementation includes "VBR / Corpectomy" as a cage type in the CageModal. This is wrong:
- A **cage** replaces a **disc** (placed in the disc space between two vertebrae)
- A **VBR** replaces a **vertebral body** (placed at the level of the vertebra itself, after corpectomy)
- They occupy fundamentally different anatomical locations
- VBR should not be placed in the disc zone — it should be associated with the vertebral level
- The planner already has a separate "Corpectomy" tool in the midline category — VBR should pair with this, not with cages

### 4. No concept of laterality for cages

- **TLIF** is always from one side (left or right) — this matters for surgical planning and should be recorded
- **PLIF** is bilateral (two cages, or one cage placed centrally via bilateral approach)
- **XLIF/OLIF** are typically from the left side (due to aorta position and surgical convention)
- **ALIF** is midline
- **ACDF** is typically from the left (due to recurrent laryngeal nerve anatomy on right)

### 5. Disc space labelling

A cage placed "at L4" means the L4/L5 disc space. The disc zone renders below L4, which is visually correct, but the label on the diagram shows only "TLIF 10H 0deg" without indicating which disc space it represents. The label should show the disc level (e.g. "TLIF L4/5").

### 6. Cage dimensions and inventory

The CageModal captures height, width (M-L), length (A-P), and lordosis. The inventory label format (`TLIF 10H 0deg 10W 30L`) is functional but doesn't include the disc level. It should.

---

## Corrected Cage Permissibility Matrix

The disc space is identified by the **upper vertebra** (e.g. "L4" means the L4/L5 disc space).

### Posterior approach (PLIF, TLIF)

Placed through the same posterior incision as screws and rods.

| Disc Space | PLIF | TLIF | Notes |
|---|---|---|---|
| C2/3 to C7/T1 | No | No | Cervical discs accessed anteriorly (ACDF) |
| T1/2 to T9/10 | No | No | Thoracic cage placement via posterior approach is not standard practice. Rib cage and narrow canal make posterior interbody access hazardous. |
| T10/11 | No | Rare | Possible but unusual — small disc space, rib attachment |
| T11/12 | Yes | Yes | Thoracolumbar junction — feasible |
| T12/L1 | Yes | Yes | Common in long constructs |
| L1/2 to L4/5 | Yes | Yes | Standard levels |
| L5/S1 | Yes | Yes | Common — conus well above, wide canal |

**PLIF specifics:** Bilateral approach — two cages or single midline cage. Higher dural retraction risk than TLIF.
**TLIF specifics:** Unilateral approach (left or right) — single cage placed obliquely. Side should be recorded.

### Anterior approach (ALIF, ACDF)

Requires separate anterior exposure. Different patient position.

| Disc Space | ACDF | ALIF | Notes |
|---|---|---|---|
| C2/3 | Yes | No | Smith-Robinson approach |
| C3/4 to C6/7 | Yes | No | Standard ACDF levels |
| C7/T1 | Possible | No | Technically feasible but challenging — sternal notch, recurrent laryngeal nerve at risk |
| T1/2 to T11/12 | No | No | Thoracic anterior approach requires thoracotomy — not standard interbody fusion |
| T12/L1 to L3/4 | No | Possible | Anterior lumbar approach feasible but uncommon above L4 (retroperitoneal, great vessels) |
| L4/5 | No | Yes | Common — standard ALIF level |
| L5/S1 | No | Yes | Most common ALIF level — excellent anterior access |

**ACDF specifics:** Approach typically from left side. Usually includes plate fixation (separate from posterior screws). Standalone or combined with posterior fusion.
**ALIF specifics:** Approach via retroperitoneal (L5/S1, L4/5) or transperitoneal route. Vascular surgeon often assists. Can be standalone or combined with posterior fixation.

### Lateral approach (XLIF/LLIF)

Lateral decubitus position. Trans-psoas (XLIF) approach.

| Disc Space | XLIF/LLIF | Notes |
|---|---|---|
| Cervical | No | Lateral approach not used in cervical spine |
| T1/2 to T9/10 | No | Rib cage obstruction |
| T10/11 | Possible | May require rib resection — unusual |
| T11/12 | Yes | Feasible with rib mobilisation |
| T12/L1 | Yes | Common in deformity surgery |
| L1/2 to L3/4 | Yes | Standard XLIF levels |
| L4/5 | Yes | Feasible but higher risk — lumbar plexus proximity |
| L5/S1 | No | Iliac crest obstructs lateral access |

**XLIF specifics:** Approach typically from the left. Neuromonitoring essential (femoral nerve/lumbar plexus within psoas). Often combined with posterior screws as a staged or same-day procedure.

### Oblique approach (OLIF)

Anterior to psoas muscle. Avoids psoas traversal.

| Disc Space | OLIF | Notes |
|---|---|---|
| Cervical | No | Not applicable |
| T1/2 to T11/12 | No | Thoracic levels not accessible via oblique corridor |
| T12/L1 | Yes | Oblique corridor accessible |
| L1/2 to L4/5 | Yes | Standard OLIF levels — corridor between aorta/psoas |
| L5/S1 | No | Iliac vessels obstruct the oblique corridor |

**OLIF specifics:** Approach from the left (between aorta and psoas). Does not traverse the psoas — lower neural risk than XLIF. Cannot reach L5/S1 due to iliac bifurcation.

### Summary permissibility table (for code implementation)

```
Level  | ACDF | PLIF | TLIF | XLIF | OLIF | ALIF
-------|------|------|------|------|------|------
C2     | Yes  |  -   |  -   |  -   |  -   |  -
C3     | Yes  |  -   |  -   |  -   |  -   |  -
C4     | Yes  |  -   |  -   |  -   |  -   |  -
C5     | Yes  |  -   |  -   |  -   |  -   |  -
C6     | Yes  |  -   |  -   |  -   |  -   |  -
C7     | Yes  |  -   |  -   |  -   |  -   |  -
T1     |  -   |  -   |  -   |  -   |  -   |  -
T2-T9  |  -   |  -   |  -   |  -   |  -   |  -
T10    |  -   |  -   |  -   |  -   |  -   |  -
T11    |  -   | Yes  | Yes  | Yes  |  -   |  -
T12    |  -   | Yes  | Yes  | Yes  | Yes  |  -
L1     |  -   | Yes  | Yes  | Yes  | Yes  |  -
L2     |  -   | Yes  | Yes  | Yes  | Yes  |  -
L3     |  -   | Yes  | Yes  | Yes  | Yes  |  -
L4     |  -   | Yes  | Yes  | Yes  | Yes  | Yes
L5     |  -   | Yes  | Yes  |  -   |  -   | Yes
```

Where `-` means not permitted. The level refers to the upper vertebra of the disc space (e.g. L4 = L4/L5 disc).

Note: T1/T2 through T10/T11 disc spaces have no standard interbody cage options. Thoracic interbody fusion at these levels is done via thoracotomy with structural graft (not standard cages) and is extremely rare in the context of this tool.

---

## Proposed Changes

### 1. Implement corrected permissibility

Replace the current ad-hoc validation with a lookup table:

```javascript
const CAGE_PERMISSIBILITY = {
  acdf: ['C2','C3','C4','C5','C6','C7'],
  plif: ['T11','T12','L1','L2','L3','L4','L5'],
  tlif: ['T11','T12','L1','L2','L3','L4','L5'],
  xlif: ['T11','T12','L1','L2','L3','L4'],
  olif: ['T12','L1','L2','L3','L4'],
  alif: ['L4','L5'],
};
```

When the user clicks a disc zone, the CageModal should:
- Only show cage types that are permitted at that level (grey out or hide impossible options)
- Show a brief explanation of why certain types are unavailable

When validating on confirm, use the lookup table rather than scattered if-statements.

### 2. Add approach grouping to CageModal

Group cage types by approach direction in the modal:

```
POSTERIOR APPROACH (same exposure as screws)
  [ ] PLIF — Posterior Lumbar Interbody Fusion (bilateral)
  [ ] TLIF — Transforaminal Lumbar Interbody Fusion (unilateral)

ANTERIOR APPROACH (separate exposure)
  [ ] ACDF — Anterior Cervical Discectomy & Fusion
  [ ] ALIF — Anterior Lumbar Interbody Fusion

LATERAL APPROACH (separate exposure)
  [ ] XLIF/LLIF — Lateral Lumbar Interbody Fusion (trans-psoas)
  [ ] OLIF — Oblique Lumbar Interbody Fusion (anterior to psoas)
```

Only show groups/types that are permitted at the selected level. Disable unavailable types with a brief reason (e.g. "Not available at L5/S1 — iliac crest obstructs lateral access").

### 3. Add laterality for TLIF

When TLIF is selected, add a mandatory Left/Right toggle. This records which side the cage was placed from. Default to Left (conventional).

For PLIF, no laterality needed (bilateral approach).
For XLIF/OLIF, default to Left (standard approach side) but allow Right.
For ACDF, default to Left (standard) but allow Right.
For ALIF, always Midline.

### 4. Separate VBR from cages

Remove "VBR / Corpectomy" from the CageModal. VBR is a future feature (Phase 3) that will be associated with vertebral levels, not disc spaces. The existing Corpectomy osteotomy tool in the midline category already marks a level as corpectomised — VBR detail (expandable/static, sizing) will be added to this in a later phase.

### 5. Improve disc space labelling

The diagram label for a cage placed "at L4" should read:
```
TLIF L4/5 10H 8deg
```

Not the current:
```
TLIF 10H 0deg
```

The disc level is critical information that should always be visible. This requires knowing the level below — derive it from the levels array (the next level after the current one).

### 6. Filter cage types in CageModal based on level

When the CageModal opens, it receives the level. Use the permissibility table to:
- Show only permitted cage types in the dropdown
- If editing an existing cage that was placed before stricter rules, still show its current type but mark it as "not recommended at this level"

### 7. Smart defaults per level

When opening the CageModal at different levels, default to the most common cage type for that level:
- C3-C6: Default to ACDF
- T11-T12: Default to XLIF (lateral interbody for deformity correction)
- L1-L3: Default to XLIF
- L4: Default to TLIF
- L5: Default to ALIF or TLIF (both common)

### 8. Visual approach indicators

Consider colour-coding or shape-coding cages by approach direction on the diagram:
- Posterior (PLIF/TLIF): Current sky-blue, positioned centrally or slightly to one side for TLIF
- Anterior (ALIF/ACDF): Different shade or positioned anteriorly relative to the vertebral body
- Lateral (XLIF/OLIF): Positioned to one side of the vertebral body

This is a stretch goal for Phase 0 — if it complicates the visual layout, defer to Phase 1.

---

## Merge Status

The `feature/cages` branch was merged into `main` as part of v0.8.0-alpha. All cage fixes (corrected permissibility, approach grouping, laterality, VBR separation, disc space labels, smart defaults) were implemented during the merge and subsequent v0.7.0 to v0.8.x development cycle.

---

## Testing and Iteration

### Manual test scenarios

There is no automated test framework and adding one would conflict with the single-file, no-build-process constraint. Testing is manual, scenario-based.

#### Scenario 1: Standard lumbar degenerative (TLIF + posterior fixation)
- View: T10-Pelvis
- Pre-Op: Bilateral polyaxial screws L4-S1, TLIF L4/5 (left), TLIF L5/S1 (left)
- Post-Op: Copy plan, change L5/S1 TLIF to right side
- Verify: ACDF and XLIF not available at L5, TLIF shows side selection, labels show "TLIF L4/5" and "TLIF L5/S1"

#### Scenario 2: Cervical myelopathy (ACDF)
- View: Cervical
- Pre-Op: ACDF C5/6, ACDF C6/7
- Verify: Only ACDF available in cervical levels. PLIF/TLIF/XLIF/OLIF/ALIF all blocked. Cannot place cage at Oc/C1 or C1/C2.

#### Scenario 3: Long deformity construct with lateral interbody
- View: Thoracolumbar or Whole Spine
- Pre-Op: Bilateral screws T2-Pelvis, XLIF T12/L1, XLIF L1/2, XLIF L2/3, TLIF L4/5, ALIF L5/S1
- Verify: XLIF available T11-L4 but not L5/S1. ALIF only at L4/L5 and L5/S1. Mixed approaches visible.
- Export PDF: Check all cage labels include disc levels.

#### Scenario 4: Deformity with osteotomy
- View: Thoracolumbar
- Pre-Op: Bilateral screws T10-Pelvis, PSO at L1, XLIF L2/3, TLIF L4/5
- Verify: Osteotomy and cages coexist. Corpectomy at L1 (midline) does not interfere with disc zones above/below.

#### Scenario 5: Permissibility edge cases
- Try to place ALIF at L3 — should be blocked
- Try to place XLIF at L5 — should be blocked
- Try to place OLIF at L5 — should be blocked
- Try to place ACDF at T2 — should be blocked
- Try to place PLIF at T10 — should be blocked
- Try to place any cage at Oc, C1, S1, Pelvis — should be blocked

#### Scenario 6: Session Mode and export
- Enable Session Mode, place cages, export PDF, verify localStorage is cleared
- Load a saved JSON from pre-fix version (without laterality data) — verify backward compatibility

### Iteration process

1. **Make the change** on main branch
2. **Open in browser** (`open index.html`) and test against scenarios
3. **Fix issues**, re-test
4. **Commit** when a scenario batch passes
5. **Export test PDFs/JPGs** to verify rendering quality
6. **Dog-food**: Use it to plan a real upcoming case (with Session Mode on if patient data involved)
7. **Peer review**: Show to a colleague — does the cage type grouping make clinical sense? Are the permissibility restrictions correct?

### Regression checklist (after every change)

- [ ] Screws: Place, edit size, change type, delete — all three screw types
- [ ] Hooks: Place and remove all four types
- [ ] Osteotomy: Place, select each Schwab grade, edit angle, delete
- [ ] Corpectomy: Place in midline, verify visual
- [ ] Crosslink: Place and remove
- [ ] Forces: Place in force columns only, all six types
- [ ] Cages: Place at multiple levels, edit, delete
- [ ] Copy Plan to Post-Op: Includes cages
- [ ] View modes: All four views render correctly
- [ ] Export: JPG and PDF render correctly with cages visible
- [ ] JSON save/load: Round-trips correctly with cage data
- [ ] Session Mode: No data persists after toggle
- [ ] New Patient: Clears cages as well as placements
