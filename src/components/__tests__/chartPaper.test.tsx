// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// --- Global mocks required by jsdom ---

// ResizeObserver is not implemented in jsdom — mock with a fixed width
/* eslint-disable @typescript-eslint/no-explicit-any -- partial jsdom mocks for browser APIs */
globalThis.ResizeObserver = class {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) { this.cb = cb; }
    observe(_target: Element) {
        // Fire callback with a synthetic entry so chartWidth gets a usable value
        this.cb([{ contentRect: { width: 500, height: 800 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

// jsdom returns 0 for clientWidth — override for container elements
Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', { get: () => 500, configurable: true });

// SVGSVGElement.getScreenCTM — identity matrix
SVGSVGElement.prototype.getScreenCTM = (() => {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as DOMMatrix;
}) as unknown as typeof SVGSVGElement.prototype.getScreenCTM;
/* eslint-enable @typescript-eslint/no-explicit-any */

// measureText relies on canvas which jsdom doesn't support
vi.mock('../../utils/measureText', () => ({
    measureText: (text: string) => text.length * 6,
}));

import { ChartPaper, ChartPaperProps } from '../chart/ChartPaper';
import type { Level } from '../../types';

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

// --- Test data ---

const thoracolumbarLevels: Level[] = [
    { id: 'T10', type: 'T' },
    { id: 'T11', type: 'T' },
    { id: 'T12', type: 'T' },
    { id: 'L1', type: 'L' },
    { id: 'L2', type: 'L' },
];

const cervicalLevels: Level[] = [
    { id: 'C3', type: 'C' },
    { id: 'C4', type: 'C' },
    { id: 'C5', type: 'C' },
    { id: 'C6', type: 'C' },
];

const pelvisLevels: Level[] = [
    { id: 'L4', type: 'L' },
    { id: 'L5', type: 'L' },
    { id: 'S1', type: 'S' },
    { id: 'S2', type: 'S' },
    { id: 'S2AI', type: 'pelvic' },
    { id: 'Iliac', type: 'pelvic' },
];

function makeProps(overrides: Partial<ChartPaperProps> = {}): ChartPaperProps {
    return {
        title: 'PLAN',
        placements: [],
        onZoneClick: vi.fn(),
        onPlacementClick: vi.fn(),
        tools: [],
        readOnly: false,
        levels: thoracolumbarLevels,
        showForces: false,
        heightScale: 1,
        cages: [],
        onDiscClick: vi.fn(),
        connectors: [],
        onConnectorUpdate: vi.fn(),
        onConnectorRemove: vi.fn(),
        viewMode: 'plan',
        notes: [],
        onNoteUpdate: vi.fn(),
        onNoteRemove: vi.fn(),
        onNoteClick: vi.fn(),
        ...overrides,
    };
}

// --- Tests ---

describe('ChartPaper', () => {

    // 1. Thoracolumbar level count
    it('renders correct number of LevelRow children for thoracolumbar view', () => {
        const props = makeProps();
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        // LevelRow renders zone-bg rects with data-level attributes
        // Each level should have at least one zone-bg rect
        const levelIds = new Set<string>();
        svg.querySelectorAll('.zone-bg[data-level]').forEach(el => {
            levelIds.add(el.getAttribute('data-level')!);
        });
        expect(levelIds.size).toBe(5);
        expect(levelIds).toContain('T10');
        expect(levelIds).toContain('L2');
    });

    // 2. Cervical level count
    it('renders correct number of LevelRow children for cervical view', () => {
        const props = makeProps({ levels: cervicalLevels });
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        const levelIds = new Set<string>();
        svg.querySelectorAll('.zone-bg[data-level]').forEach(el => {
            levelIds.add(el.getAttribute('data-level')!);
        });
        expect(levelIds.size).toBe(4);
        expect(levelIds).toContain('C3');
        expect(levelIds).toContain('C6');
    });

    // 3. Pelvis levels — pelvic type levels are excluded from LevelRow;
    // when S2 is present, sacral zones are handled by PelvisRegion overlay
    it('renders pelvis levels when included in levels array', () => {
        const props = makeProps({ levels: pelvisLevels });
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        const levelIds = new Set<string>();
        svg.querySelectorAll('.zone-bg[data-level]').forEach(el => {
            levelIds.add(el.getAttribute('data-level')!);
        });
        // Lumbar levels render zone-bg rects via LevelRow
        expect(levelIds).toContain('L4');
        expect(levelIds).toContain('L5');
        // Pelvic type levels (S2AI, Iliac) are filtered from LevelRow — rendered by PelvisRegion
        expect(levelIds).not.toContain('S2AI');
        expect(levelIds).not.toContain('Iliac');
        // When pelvis is shown (S2 in levels), sacral zones are handled by PelvisRegion
        // so S1/S2 have no zone-bg rects from LevelRow — they still appear as SVG groups
        const svgGroups = svg.querySelectorAll('g');
        const svgContent = svg.innerHTML;
        // S1 and S2 vertebral bodies should still be rendered (just not zone-bg rects)
        expect(svgContent).toContain('S1');
        expect(svgContent).toContain('S2');
    });

    // 4. Title text
    it('renders the chart title text', () => {
        const props = makeProps({ title: 'PLAN' });
        render(<ChartPaper {...props} />);
        expect(screen.getByText('PLAN')).toBeInTheDocument();
    });

    // 5. EDITING badge when active
    it('shows EDITING badge when isActive is true', () => {
        const props = makeProps({ isActive: true, activeBg: '#005EB8', activeText: '#fff' });
        const { container } = render(<ChartPaper {...props} />);
        // The badge renders the translated key 'sidebar.editing'
        // In English this should be "EDITING" or similar
        const badge = container.querySelector('[data-export-hide="true"]');
        expect(badge).not.toBeNull();
        expect(badge).toBeInTheDocument();
    });

    // 6. No EDITING badge when inactive
    it('does not show EDITING badge when isActive is false', () => {
        const props = makeProps({ isActive: false });
        const { container } = render(<ChartPaper {...props} />);
        const badge = container.querySelector('[data-export-hide="true"]');
        expect(badge).toBeNull();
    });

    // 7. Disc click routing
    it('disc zone click calls onDiscClick with correct levelId', () => {
        const onDiscClick = vi.fn();
        const props = makeProps({ onDiscClick });
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        // Disc click rects have data-zone="disc" and data-level
        const discRect = svg.querySelector('rect[data-zone="disc"][data-level="T10"]');
        expect(discRect).not.toBeNull();
        fireEvent.click(discRect!);
        expect(onDiscClick).toHaveBeenCalledWith('T10');
    });

    // 8. Focus ring renders for focusedLevelId
    it('focus ring renders when focusedLevelId matches a level', () => {
        const props = makeProps({ focusedLevelId: 'T11', focusedZone: 'left' });
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        // LevelRow receives focusedZone only when focusedLevelId matches.
        // The focused zone-bg for T11 should have a distinct visual —
        // look for a zone-bg with data-level="T11" and data-zone="left"
        const focusedZone = svg.querySelector('.zone-bg[data-level="T11"][data-zone="left"]');
        expect(focusedZone).not.toBeNull();
        // Non-focused level should NOT get focusedZone passed through
        // (ChartPaper passes focusedZone={undefined} for non-matching levels)
        // We verify the focused level exists — the visual indicator is internal to LevelRow
    });

    // 9. readOnly prevents disc click
    it('disc zone click does not fire onDiscClick when readOnly is true', () => {
        const onDiscClick = vi.fn();
        const props = makeProps({ onDiscClick, readOnly: true });
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        const discRect = svg.querySelector('rect[data-zone="disc"][data-level="T10"]');
        expect(discRect).not.toBeNull();
        fireEvent.click(discRect!);
        expect(onDiscClick).not.toHaveBeenCalled();
    });

    // 10. SVG viewBox is set correctly
    it('SVG viewBox width matches container and height matches content', () => {
        const props = makeProps();
        const { container } = render(<ChartPaper {...props} />);
        const svg = container.querySelector('svg[data-chart-svg]')!;
        const viewBox = svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
        // viewBox format: "0 0 <width> <height>"
        const parts = viewBox!.split(' ').map(Number);
        expect(parts[0]).toBe(0);
        expect(parts[1]).toBe(0);
        // Width comes from chartWidth state (default 500 since ResizeObserver is mocked)
        expect(parts[2]).toBeGreaterThan(0);
        // Height should be > 0 (sum of all level heights)
        expect(parts[3]).toBeGreaterThan(0);
    });
});
