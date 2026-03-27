# Adding Your Screw System

Thank you for helping us add your system to the Spinal Instrumentation Planner. We need a short file listing the screw sizes and rod options your system offers. It takes about 10 minutes if you have your surgical technique guide or product catalogue to hand.

## How it works

Each screw system has a small text file (JSON format) that lists every available diameter, the lengths offered at each diameter, and the rod options. The app uses this to check the surgeon's selections against your catalogue.

There is a completed example to follow: **stryker/xia-3.json** in this folder.

## Step by step

### 1. Copy the template

Create a new file in a folder named after your company. Use the system name as the filename. For example:

```
tools/screw-specs/
    medtronic/
        solera.json
    depuy-synthes/
        expedium-verse.json
```

Folder and file names should be lowercase with hyphens (no spaces).

Start by copying `stryker/xia-3.json` and replacing the values with your own.

### 2. Fill in the system details

The top section identifies your system:

```json
{
  "$schema": "../screw-spec-schema.json",
  "system": "Your System Name",
  "manufacturer": "Your Company Name",
  "type": "thoracolumbar",
  "status": "active",
  "notes": "Any useful notes about the system.",
  "source": "Name of the document you got the data from",
  "lastVerified": "2026-03-27",
```

**type** — pick one:

| Value | Meaning |
|-------|---------|
| `thoracolumbar` | Pedicle screw system for T1 down to sacrum/pelvis |
| `cervical` | Lateral mass or cervical pedicle screw system |
| `oct` | Occipitocervical (upper cervical including occipital plate) |
| `mis` | Minimally invasive / percutaneous |

**status** — pick one: `active`, `discontinued`, or `legacy` (still sold but superseded).

**alsoSoldBy** — if another company sells the same system under the same name, add them:

```json
  "alsoSoldBy": ["Other Company Name"],
```

If not, leave this line out.

### 3. Fill in the screw sizes

This is the main part. You need two things from your size matrix:

**a) The list of diameters offered (in mm):**

```json
  "screws": {
    "diameters": [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.5, 9.5, 10.5],
```

**b) The lengths available at each diameter (in mm):**

```json
    "lengthsByDiameter": {
      "4.0":  [20, 22, 25, 30, 35, 40, 45],
      "5.5":  [25, 30, 35, 40, 45, 50, 55],
      "8.5":  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
    }
```

**Where to find this:** look for the size matrix in your surgical technique guide or product catalogue — the table with diameters down one side and lengths across the top. List every size that has a tick or part number.

A few things to note:
- List every diameter and every length, not just the commonly used ones
- Diameters are written with one decimal place: `6.0` not `6`
- Lengths are whole numbers: `45` not `45.0`
- Both lists should be smallest to largest
- Every diameter in the `diameters` list needs a matching entry in `lengthsByDiameter`
- You don't need to separate monoaxial / polyaxial / uniplanar — the size matrix is usually the same across head types. If it differs, mention it in `notes`.

### 4. Fill in the rod options

```json
  "rods": {
    "diameters": [5.5, 6.0],
    "materials": ["titanium", "cobalt_chrome"],
    "profiles": ["round"]
  }
```

**diameters** — the rod diameters offered (in mm). Common values: 3.5, 4.0, 5.5, 6.0.

**materials** — pick from this list (use these exact values):

| Value | What it means |
|-------|---------------|
| `titanium` | Titanium alloy (Ti-6Al-4V) — the standard |
| `cpt` | Commercially pure titanium (softer, easier to bend) |
| `cobalt_chrome` | Cobalt-chrome — your company may brand this differently (e.g. Vitallium) |
| `stainless_steel` | Stainless steel |
| `peek` | PEEK polymer |

**profiles** — almost always just `["round"]`. Add `"rail"` or `"transition"` only if your system offers them.

### 5. Check your work

If you have Node.js installed, you can validate the file:

```bash
npx tsx tools/screw-specs/sync-catalogue.ts validate
```

This checks that the diameters and lengths are consistent and the material/profile values are recognised. If you don't have Node.js, don't worry — we'll validate it when we receive it.

### 6. Send it to us

Either:
- Open a pull request on GitHub if you're comfortable with that
- Email the JSON file to **skeletalsurgery@icloud.com**

## Quick checklist

- [ ] System name and manufacturer match your official product name
- [ ] Type is correct (thoracolumbar / cervical / oct / mis)
- [ ] Every screw diameter from your catalogue is listed
- [ ] Every length for each diameter is listed (not just common sizes)
- [ ] Rod diameters, materials, and profiles are filled in
- [ ] Source document is noted so we can reference it later
- [ ] File is saved as `<company>/<system>.json` in this folder

## If your catalogue changes

Send us an updated file or email whenever sizes are added or discontinued. We'll update the app in the next release.
