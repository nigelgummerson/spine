# Design Review Prompt — Spine Planner

## Context

You are reviewing a single-file HTML web application (React + Tailwind CSS via CDN) used by spinal surgeons for preoperative planning. The app runs in desktop browsers and is deployed via GitHub Pages.

**File:** `index.html` (single-file app, ~7000 lines)
**Live:** https://nigelgummerson.github.io/spine-planner
**Users:** Consultant spinal surgeons in clinical settings (bright rooms, often in a hurry, sometimes on shared hospital computers)

## Task

Perform a comprehensive design review of this application against three frameworks:

### 1. Apple Human Interface Guidelines (Relevant Sections)

Fetch and apply principles from these HIG sections (at developer.apple.com/design/human-interface-guidelines/):

- **Foundations**
  - Color — semantic use, contrast, dark/light adaptability
  - Typography — hierarchy, readability, font sizing, line length
  - Layout — spacing, alignment, visual grouping, responsive behaviour
  - Accessibility — VoiceOver compatibility, Dynamic Type concepts, reduced motion
  - Icons — clarity, consistency, recognition
  - Materials — visual depth, layering
- **Components**
  - Buttons — sizing, tap/click targets, states (hover, active, disabled)
  - Text fields & forms — labels, placeholders, validation feedback
  - Menus & navigation — discoverability, hierarchy
  - Modals / sheets — appropriate use, dismissal patterns
  - Toolbars — organisation, grouping related actions
- **Patterns**
  - Entering data — efficiency for expert users, error prevention
  - Providing feedback — status, confirmation, error states
  - Navigation — wayfinding, back/undo, state preservation
  - Offering help — onboarding, progressive disclosure

### 2. WCAG 2.1 Accessibility (AA minimum, note AAA where relevant)

Extract all colour values from the code and perform these checks:

- **Colour contrast ratios** (calculate actual ratios using the hex/RGB values in the code):
  - Normal text (< 18pt): minimum 4.5:1 (AA), ideal 7:1 (AAA)
  - Large text (≥ 18pt or ≥ 14pt bold): minimum 3:1 (AA), ideal 4.5:1 (AAA)
  - UI components and graphical objects: minimum 3:1 against adjacent colours
  - Non-text contrast: icons, borders, focus indicators
- **Text legibility**:
  - Minimum font sizes (is anything below 12px?)
  - Line height / letter spacing
  - Maximum line length (optimal: 45–75 characters)
  - Font weight sufficiency for readability
- **Interactive elements**:
  - Minimum touch/click target size (44x44px Apple standard, 24x24px WCAG minimum)
  - Focus indicators visible and sufficient contrast
  - Keyboard navigability
  - ARIA labels and roles where needed
- **Colour independence**:
  - Information conveyed by colour alone? (e.g. status indicators)
  - Would the app be usable for colour-blind users? (protanopia, deuteranopia, tritanopia)
- **Motion and animation**:
  - Respect for prefers-reduced-motion
  - Any auto-playing animations or transitions

### 3. Nielsen's Usability Heuristics

Evaluate against all 10:

1. Visibility of system status
2. Match between system and the real world (especially medical/surgical terminology)
3. User control and freedom (undo, cancel, escape routes)
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use (expert shortcuts)
8. Aesthetic and minimalist design
9. Help users recognise, diagnose, and recover from errors
10. Help and documentation

## Clinical Context to Consider

- Surgeons are expert users — efficiency matters more than hand-holding
- Planning sessions may be done in clinic rooms with variable lighting
- Data entry involves anatomical measurements and implant specifications
- Errors in surgical planning have real patient safety implications
- The app may be demonstrated to trainees or in MDT meetings (projected on screens)
- Hospital screens may be lower quality/resolution than personal devices
- Export/print quality matters — plans are referenced in theatre

## Output Format

Structure your review as:

### Executive Summary
- Overall assessment (1-2 paragraphs)
- Top 5 most impactful issues (ranked by clinical/usability impact)

### Colour & Contrast Audit
- Table of all colour pairings found with calculated contrast ratios
- Pass/fail against AA and AAA for each
- Specific problem areas with screenshots/line references

### Typography & Legibility
- Font stack assessment
- Size hierarchy review
- Line length / spacing analysis

### Component Review
- Buttons, forms, modals, navigation — each assessed
- Target size measurements
- State visibility (hover, focus, active, disabled, error)

### Layout & Visual Design
- Spacing consistency
- Visual hierarchy effectiveness
- Information density assessment

### Accessibility
- Keyboard navigation
- Screen reader compatibility
- Colour independence
- Motion sensitivity

### Usability Heuristics
- Each of Nielsen's 10 heuristics scored 1-5 with brief justification

### Recommendations
- Prioritised list: Critical / High / Medium / Low
- Each with: what's wrong, why it matters clinically, suggested fix
- Quick wins vs larger refactors clearly distinguished
