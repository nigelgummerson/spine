# Screw System Specification Guide

How to populate JSON spec files for spinal screw systems. Each file describes one screw system from one manufacturer.

## File location

```
tools/screw-specs/<manufacturer>/<system>.json
```

Folder and file names are kebab-case (e.g. `depuy-synthes/expedium-verse.json`). The `system` and `manufacturer` fields inside the file must match the names used in `implants.ts` exactly.

---

## System type

```json
"type": "thoracolumbar"
```

| Value | Meaning |
|-------|---------|
| `thoracolumbar` | Standard posterior pedicle screw system (T1-sacrum/pelvis). Most systems are this. |
| `cervical` | Lateral mass / cervical pedicle screw system (Oc-C7). Smaller diameters, shorter lengths. |
| `oct` | Occipitocervical. Upper cervical fixation including occipital plates, C1 lateral mass, C2 pars/pedicle. Often a separate product line from the same manufacturer. |
| `mis` | Minimally invasive / percutaneous. Cannulated screws placed through small incisions with fluoroscopic guidance. Same diameters as thoracolumbar but the delivery mechanism differs. |

A manufacturer may sell the same screw sizes under both an open and MIS system (e.g. Globus CREO vs CREO MIS). Create separate spec files for each — the available sizes often differ.

---

## Screws

### Diameters

```json
"diameters": [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.5, 9.5, 10.5]
```

The outer diameter of the screw shaft in millimetres. Listed ascending. Common ranges:

| Region | Typical diameters |
|--------|-------------------|
| Cervical (lateral mass) | 3.5, 4.0 |
| Cervical (pedicle) | 3.5, 4.0, 4.5 |
| Upper thoracic (T1-T4) | 4.0, 4.5, 5.0 |
| Mid thoracic (T5-T9) | 4.5, 5.0, 5.5 |
| Lower thoracic (T10-T12) | 5.5, 6.0, 6.5 |
| Lumbar | 6.0, 6.5, 7.0, 7.5 |
| Sacral / pelvic | 7.0, 7.5, 8.5, 9.5, 10.5 |

Not every system covers the full range. Gaps are significant — the Xia 3 has no 8.0mm diameter (jumps from 7.5 to 8.5). Record exactly what the manufacturer offers; the app uses this to flag out-of-catalogue selections.

### Lengths per diameter

```json
"lengthsByDiameter": {
    "4.0": [20, 22, 25, 30, 35, 40, 45],
    "8.5": [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
}
```

Screw length in millimetres, keyed by diameter as a string with one decimal place (e.g. `"6.0"` not `"6"`). Listed ascending within each diameter.

Key points:
- **Smaller diameters have fewer and shorter lengths** — a 4.0mm screw is not made in 90mm because the shaft would be too thin.
- **Larger diameters extend longer** — 8.5mm+ screws are used for sacral/iliac fixation where 80-100mm is common.
- **Lengths are not uniform across diameters.** Always record the exact set from the manufacturer catalogue. Do not assume or interpolate.
- **Every diameter in the `diameters` array must have a matching entry in `lengthsByDiameter`**, and vice versa. The validation script checks this.

### Screw head types

Screw head type (monoaxial, polyaxial, uniplanar) is **not** recorded in the spec file. Most modern systems offer all three head types in the same diameter/length matrix. The surgeon selects head type per screw at planning time; the spec file only needs to define what sizes exist.

If a system has different size availability per head type (rare), note this in the `notes` field.

---

## Rods

### Diameters

```json
"diameters": [5.5, 6.0]
```

Rod outer diameter in millimetres. This determines which screws and connectors are compatible. Common values:

| Diameter | Typical use |
|----------|-------------|
| 3.5 | Cervical, occipitocervical |
| 4.0 | Cervical |
| 4.75 | Some cervical/upper thoracic systems |
| 5.5 | Standard thoracolumbar |
| 6.0 | High-load thoracolumbar (long constructs, osteotomy, deformity) |
| 6.35 | Some legacy systems (quarter-inch) |

Most thoracolumbar systems offer 5.5 and 6.0. Some offer only 5.5. A few deformity-focused systems add 6.35. Cervical systems typically offer 3.5 or 4.0.

### Materials

```json
"materials": ["titanium", "cobalt_chrome", "cpt"]
```

| Value | Full name | Abbreviation | Properties |
|-------|-----------|--------------|------------|
| `titanium` | Titanium alloy (Ti-6Al-4V) | Ti | Standard. MRI-compatible. Moderate stiffness. Most common. |
| `cpt` | Commercially pure titanium | CP-Ti | Softer than Ti alloy. Easier to contour. Lower fatigue strength. |
| `cobalt_chrome` | Cobalt-chromium alloy (CoCr) | CoCr | Stiffer than titanium. Better fatigue resistance. Used for long constructs and osteotomy corrections. Some manufacturers brand this (e.g. Stryker "Vitallium"). More MRI artefact than Ti. |
| `stainless_steel` | Stainless steel (316L) | SS | Legacy. Stiffest metal option. Significant MRI artefact. Rarely used in new systems but still in some catalogues. |
| `peek` | Polyether ether ketone | PEEK | Radiolucent. Semi-rigid. Used in motion-sparing constructs. Uncommon for posterior rods. |

Record only the materials the manufacturer actually offers for this system. Most systems offer titanium; many also offer CoCr. CP-Ti and PEEK are less common.

### Profiles

```json
"profiles": ["round"]
```

| Value | Description |
|-------|-------------|
| `round` | Standard cylindrical rod. Universal. All systems offer this. |
| `rail` | Flat or rectangular cross-section. Used in some lateral plate/rod hybrid systems (e.g. Stryker MESA Rail). Prevents rotation at the screw-rod junction. |
| `transition` | Rod that changes diameter along its length (e.g. 3.5mm proximally transitioning to 5.5mm distally). Used for cervicothoracic junction constructs. Specify which diameters using `transitionFrom`/`transitionTo` in the planning app. |

Most systems only offer `round`. Only include `rail` or `transition` if the system actually provides them.

---

## Metadata fields

| Field | Required | Description |
|-------|----------|-------------|
| `system` | Yes | System name, matching `SCREW_SYSTEMS` in `implants.ts` |
| `manufacturer` | Yes | Primary manufacturer, matching `IMPLANT_COMPANIES` in `implants.ts` |
| `alsoSoldBy` | No | Other companies selling this system (e.g. VB Spine distributes Stryker systems) |
| `type` | Yes | `cervical`, `thoracolumbar`, `oct`, or `mis` |
| `status` | No | `active` (current), `discontinued` (no longer made), `legacy` (still sold but superseded) |
| `notes` | No | Free text — trade names for materials, compatibility notes, anything not captured by structured fields |
| `source` | No | Document the data was taken from (surgical technique guide, product catalogue, IFU) |
| `lastVerified` | No | ISO date when the data was last checked against manufacturer documentation |

---

## Workflow

1. Create `tools/screw-specs/<manufacturer>/<system>.json` using `xia-3.json` as a template
2. Fill in screw diameters and per-diameter lengths from the surgical technique guide or product catalogue
3. Fill in rod options
4. Validate: `npx tsx tools/screw-specs/sync-catalogue.ts validate`
5. Import into app: `npx tsx tools/screw-specs/sync-catalogue.ts import`
6. Run tests: `npm test`

---

## Where to find the data

The best source is the manufacturer's **Surgical Technique Guide** or **Implant Catalogue** (usually a PDF). These contain tables listing every diameter/length combination. Other sources:

- **Instructions for Use (IFU)** — regulatory document listing all implant variants
- **Hospital kit lists** — the physical trays list exactly which sizes are stocked
- **Rep documentation** — manufacturer representatives often have quick-reference cards

Avoid relying on memory or general knowledge — even experienced surgeons may not know the exact catalogue boundaries (e.g. that Xia 3 jumps from 7.5 to 8.5mm with no 8.0mm). Always verify against a published document and record it in the `source` field.
