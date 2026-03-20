# Portrait Mode — Responsive Layout for Spine Planner

**Status:** Implemented in v1.1.0-beta
**Created:** 2026-03-20
**Implemented:** 2026-03-20

## Context

The spine planner is a single-file HTML app (index.html, ~1790 lines) designed for landscape displays. On portrait-oriented screens (rotated desktop monitors, tablets held upright), the fixed 1485x1050px export container scales down to an unusably small size. This plan adds a portrait-responsive layout so the app is usable on both orientations across desktop monitors and tablets, with full editing capability.

**Concurrent work:** Another agent is adding multilingual support. This plan must not conflict — changes are primarily structural (layout/CSS) rather than content/text, so conflicts should be minimal. Coordinate at integration time by checking for i18n wrappers on any UI text added here.

## Design Decisions

- **Detection:** CSS media query `(orientation: portrait)` + JS `matchMedia` listener for React state
- **Breakpoint:** Orientation-based, not width-based — portrait triggers the responsive layout regardless of screen size
- **Target devices:** Both desktop monitors (rotated to portrait) and tablets (iPad etc.)
- **Export:** Always landscape 1485x1050px — portrait mode only affects the interactive UI
- **Editing:** Full editing in portrait mode (all implant placement, modals, fields work)
- **Column switching:** Tab bar + swipe gestures

## Current Layout (Landscape)

```
┌──────────┬──────────────────────────────────────────┐
│          │  Col 1 (340px)  │  Col 2 (flex-4) │ Col 3│
│ Sidebar  │  Demographics   │  Plan            │Final │
│  w-64    │  & Inventory    │  Instrumentation │Const.│
│ (256px)  │                 │                  │      │
│          │                 │                  │      │
└──────────┴──────────────────────────────────────────┘
```

## Proposed Portrait Layout

```
┌─────────────────────────────────┐
│  Toolbar (horizontal, compact)  │
│  [Region] [Tools] [Actions]     │
├─────────────────────────────────┤
│  [Demographics] [Plan] [Const.] │  ← Tab bar
├─────────────────────────────────┤
│                                 │
│     Active column               │
│     (full width, scrollable)    │
│                                 │
│                                 │
│     Swipe left/right to switch  │
│                                 │
└─────────────────────────────────┘
```

## Implementation Plan

### Step 1: Orientation Detection

**File:** `index.html` (within React App component)

Add a `usePortrait` hook using `window.matchMedia('(orientation: portrait)')`:

```js
function usePortrait() {
  const [isPortrait, setIsPortrait] = React.useState(
    () => window.matchMedia('(orientation: portrait)').matches
  );
  React.useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isPortrait;
}
```

Add `isPortrait` state to the App component. All layout branching flows from this single boolean.

### Step 2: Refactor Sidebar into Conditional Layout

**Current:** `<aside>` is a fixed `w-64` vertical sidebar (lines ~2118-2232).

**Portrait mode:** Convert to a horizontal toolbar at the top of the screen.

- Restructure sidebar content into collapsible/compact horizontal groups
- Region buttons: horizontal row
- Tool palette: horizontal scrollable strip or dropdown
- Action buttons (Save/Load/Export): compact icon-only row or overflow menu
- Theme selector: dropdown (already is)
- Plan/Construct toggle: stays as-is (already compact)

**Approach:** Wrap the sidebar in a component that renders vertically (landscape) or horizontally (portrait) based on `isPortrait`. The toolbar content is the same — only the layout container changes.

Key considerations:
- Toolbar height should be compact (~100-120px max) to maximise column viewing area
- Tool palette may need a collapsible drawer or popover in portrait to avoid taking too much vertical space
- Colour scheme theming applies to the toolbar the same way it does to the sidebar

### Step 3: Tab Bar + Column Switcher

Add a tab bar component below the toolbar in portrait mode:

```js
function ColumnTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'demographics', label: 'Demographics' },
    { id: 'plan', label: 'Plan' },
    { id: 'construct', label: 'Construct' }
  ];
  // Render segmented control style tabs
}
```

- `activeTab` state in App component (only used when `isPortrait`)
- Tabs styled to match the active colour scheme
- Active tab has accent-coloured underline/background

### Step 4: Swipe Gesture Support

Add touch swipe detection for column switching:

- Track `touchstart` and `touchend` X coordinates on the column container
- Horizontal swipe threshold: ~50px minimum, with velocity check
- Swipe left → next tab, swipe right → previous tab
- Optional: CSS transition for slide animation between columns
- Prevent vertical scroll interference (only trigger on predominantly horizontal swipes)

No external library needed — vanilla touch events are sufficient for this.

### Step 5: Portrait Content Rendering

In portrait mode, the export container changes:

- **Do not render** the fixed 1485x1050 container for the interactive view
- Instead, render each column as a **full-width, full-height panel**
- Only the `activeTab` column is visible; others are hidden (or translated off-screen for swipe animation)
- Each column gets appropriate portrait styling:
  - **Demographics:** Full-width form fields, inventory below, scrollable
  - **Plan:** Full-width ChartPaper, spine visualisation scales to fill available width
  - **Construct:** Same as Plan column treatment

**Scaling approach in portrait:**
- Each column scales independently to fill available width
- ChartPaper columns: calculate scale from `availableWidth / originalColumnWidth`
- Demographics column: reflow naturally (it's mostly form elements)

### Step 6: Export Path (Unchanged)

Export (PDF/JPG) always uses the landscape 1485x1050 container:

- When exporting in portrait mode, temporarily render the full 3-column export container off-screen
- Run the existing `html-to-image` capture on that off-screen container
- Remove after capture
- This is similar to the current approach where the export container may already be scaled/transformed

No changes to `prepareExportCanvas()`, `jsPDF` flow, or export dimensions.

### Step 7: Modal Compatibility

Verify all modals work in portrait:

- **ScrewModal:** Currently positioned relative to click location — may need repositioning logic for portrait (centre on screen instead of anchored to click point)
- **CageModal:** Same consideration
- **OsteotomyModal:** Same
- **Help modal:** Already full-screen overlay — should work
- **Theme dropdown:** May need repositioning from sidebar-relative to toolbar-relative

### Step 8: CSS Media Queries (Supplementary)

Add CSS `@media (orientation: portrait)` rules for:

- Hiding elements that are JS-toggled (fallback/progressive enhancement)
- Print styles (ensure print still uses landscape layout)
- Any Tailwind utilities that need orientation variants

Most layout changes are handled in React via `isPortrait`, but CSS media queries provide a safety net and handle non-React elements.

## Critical Files

| File | Changes |
|------|---------|
| `index.html` (lines 17-85) | Add portrait CSS media queries |
| `index.html` (App component, ~line 2108) | Add `isPortrait` state, conditional layout branching |
| `index.html` (sidebar, ~lines 2118-2232) | Refactor into sidebar/toolbar dual layout |
| `index.html` (export container, ~lines 2234-2270) | Portrait: render single column; landscape: unchanged |
| `index.html` (ResizeObserver, ~lines 1796-1808) | Update scale calculation for portrait single-column view |

## Multilingual Coordination

The multilingual work being done concurrently will likely:
- Add translation wrappers (`t('key')`) around UI text strings
- Add a language selector (probably in the sidebar/toolbar)
- May add RTL support

**Integration points:**
- Any new text added for portrait mode (tab labels like "Demographics", "Plan", "Construct") should use whatever i18n pattern is established
- The language selector should appear in both sidebar (landscape) and toolbar (portrait) layouts
- If RTL support is added, the swipe direction and tab order should respect it

**Strategy:** Implement portrait layout with plain English strings. At integration time, wrap new strings in the i18n system.

## Verification

1. Open `index.html` in Chrome DevTools, toggle device toolbar to a portrait tablet (e.g. iPad 768x1024)
2. Verify toolbar renders horizontally at top
3. Verify tab bar shows three tabs, switching works via tap and swipe
4. Place implants in each column view — verify modals open correctly
5. Export PDF — verify it produces the standard landscape 1485x1050 output
6. Rotate to landscape — verify standard layout restores seamlessly
7. Test on a real iPad if available
8. Test with a desktop browser window resized to portrait aspect ratio

## Risks & Considerations

- **Single-file constraint:** All changes must stay within `index.html`. No external CSS files or JS modules.
- **Touch events + mouse events:** Must handle both — desktop portrait monitors use mouse, tablets use touch. Swipe should be touch-only; tabs work with both.
- **Performance:** Rendering all 3 columns and hiding 2 is simpler but heavier. Rendering only the active column is more performant but requires careful state management.
- **Export in portrait:** The off-screen render approach for export needs testing — `html-to-image` may need the container to be in the DOM (just off-screen) rather than unmounted.
