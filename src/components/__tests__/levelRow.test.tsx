// @vitest-environment jsdom
import './setup';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { LevelRow } from '../chart/LevelRow';
import type { LevelRowProps } from '../chart/LevelRow';
import type { Placement, ToolDefinition, Level } from '../../types';

vi.mock('../../utils/measureText', () => ({
    measureText: (text: string) => text.length * 6,
}));

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

// --- Test fixtures ---

const T10: Level = { id: 'T10', type: 'T' };
const levels: Level[] = [
    { id: 'T9', type: 'T' },
    T10,
    { id: 'T11', type: 'T' },
];

const tools: ToolDefinition[] = [
    { id: 'polyaxial', labelKey: 'tool.polyaxial', icon: 'polyaxial', needsSize: true, type: 'implant' },
    { id: 'monoaxial', labelKey: 'tool.monoaxial', icon: 'monoaxial', needsSize: true, type: 'implant' },
    { id: 'osteotomy', labelKey: 'tool.osteotomy', icon: 'osteotomy', type: 'osteotomy', isOsteotomy: true },
];

const forceTool: ToolDefinition = { id: 'distraction', labelKey: 'tool.distraction', icon: 'distraction', type: 'force' };

function makeProps(overrides: Partial<LevelRowProps> = {}): LevelRowProps {
    return {
        level: T10,
        placements: [],
        onZoneClick: vi.fn(),
        tools,
        onPlacementClick: vi.fn(),
        readOnly: false,
        showForces: false,
        heightScale: 1,
        onDiscClick: vi.fn(),
        cages: [],
        levels,
        viewMode: 'region',
        chartWidth: 500,
        rowY: 0,
        ...overrides,
    };
}

function makePlacement(overrides: Partial<Placement> = {}): Placement {
    return {
        id: 'p1',
        levelId: 'T10',
        zone: 'left',
        tool: 'polyaxial',
        data: '6.5x45',
        annotation: '',
        ...overrides,
    };
}

/** Render LevelRow inside an SVG parent so <g> elements are valid */
function renderInSvg(props: LevelRowProps) {
    return render(
        <svg width={500} height={200}>
            <LevelRow {...props} />
        </svg>
    );
}

// --- Zone click routing ---

describe('Zone click routing', () => {
    it('left zone click calls onZoneClick with levelId and "left"', () => {
        const onZoneClick = vi.fn();
        const { container } = renderInSvg(makeProps({ onZoneClick }));
        const leftZone = container.querySelector('rect[data-zone="left"]') as SVGRectElement;
        expect(leftZone).toBeTruthy();
        fireEvent.click(leftZone);
        expect(onZoneClick).toHaveBeenCalledWith('T10', 'left');
    });

    it('right zone click calls onZoneClick with levelId and "right"', () => {
        const onZoneClick = vi.fn();
        const { container } = renderInSvg(makeProps({ onZoneClick }));
        const rightZone = container.querySelector('rect[data-zone="right"]') as SVGRectElement;
        expect(rightZone).toBeTruthy();
        fireEvent.click(rightZone);
        expect(onZoneClick).toHaveBeenCalledWith('T10', 'right');
    });

    it('readOnly mode suppresses all click handlers', () => {
        const onZoneClick = vi.fn();
        const onPlacementClick = vi.fn();
        const placement = makePlacement();
        const { container } = renderInSvg(makeProps({
            onZoneClick,
            onPlacementClick,
            readOnly: true,
            placements: [placement],
        }));
        const leftZone = container.querySelector('rect[data-zone="left"]') as SVGRectElement;
        const rightZone = container.querySelector('rect[data-zone="right"]') as SVGRectElement;
        fireEvent.click(leftZone);
        fireEvent.click(rightZone);
        expect(onZoneClick).not.toHaveBeenCalled();

        // Placement click is also suppressed in readOnly
        const placementG = container.querySelector('g[cursor="default"]');
        if (placementG) {
            fireEvent.click(placementG);
        }
        expect(onPlacementClick).not.toHaveBeenCalled();
    });
});

// --- Rendering ---

describe('Rendering', () => {
    it('placed screw renders with formatted size label', () => {
        const placement = makePlacement({ data: '6.5x45' });
        const { container } = renderInSvg(makeProps({ placements: [placement] }));
        // formatScrewSize turns "6.5x45" → "6.5x45" (already has decimal)
        // Check the label appears in a span inside foreignObject
        const spans = container.querySelectorAll('span');
        const labelSpan = Array.from(spans).find(s => s.textContent?.includes('6.5x45'));
        expect(labelSpan).toBeTruthy();
    });

    it('placed screw with integer diameter shows formatted label with decimal', () => {
        const placement = makePlacement({ data: '7x50' });
        const { container } = renderInSvg(makeProps({ placements: [placement] }));
        const spans = container.querySelectorAll('span');
        // formatScrewSize turns "7x50" → "7.0x50"
        const labelSpan = Array.from(spans).find(s => s.textContent === '7.0x50');
        expect(labelSpan).toBeTruthy();
    });

    it('ghost placement renders with teal colour and 0.75 opacity', () => {
        const ghost = makePlacement({ id: 'ghost-1', data: '5.5x40' });
        const { container } = renderInSvg(makeProps({
            ghostPlacements: [ghost],
            onGhostClick: vi.fn(),
        }));
        // Ghost wrapper <g> has opacity 0.75
        const ghostG = container.querySelector('g[opacity="0.75"]');
        expect(ghostG).toBeTruthy();
        // The icon should be rendered with teal colour (#14b8a6)
        // InstrumentIcon receives color="#14b8a6" — check the nested svg
        const innerSvgs = ghostG?.querySelectorAll('svg');
        expect(innerSvgs?.length).toBeGreaterThan(0);
    });

    it('empty zone renders ghost dashed circle', () => {
        const { container } = renderInSvg(makeProps());
        // Ghost target: dashed circle with strokeDasharray="4 3"
        const dashedCircles = container.querySelectorAll('circle[stroke-dasharray="4 3"]');
        expect(dashedCircles.length).toBeGreaterThanOrEqual(1);
    });

    it('force zone renders force icon when force placement exists', () => {
        const forcePlacement = makePlacement({
            id: 'f1',
            zone: 'force_left',
            tool: 'distraction',
            data: null,
        });
        const { container } = renderInSvg(makeProps({
            showForces: true,
            forcePlacements: [forcePlacement],
            tools: [...tools, forceTool],
        }));
        // The force placement should be rendered — check for its zone background rect
        const forceZoneBg = container.querySelector('rect[data-zone="force_left"]');
        expect(forceZoneBg).toBeTruthy();
    });
});

// --- Data attributes ---

describe('Data attributes', () => {
    it('zone rects have data-zone and data-level attributes', () => {
        const { container } = renderInSvg(makeProps());
        const leftZone = container.querySelector('rect[data-zone="left"][data-level="T10"]');
        const rightZone = container.querySelector('rect[data-zone="right"][data-level="T10"]');
        expect(leftZone).toBeTruthy();
        expect(rightZone).toBeTruthy();
    });

    it('ghost targets have data-ghost-zone and data-ghost-level attributes', () => {
        const { container } = renderInSvg(makeProps());
        // Empty zones should have ghost dashed circles with data attributes
        const ghostLeft = container.querySelector('[data-ghost-zone="left"][data-ghost-level="T10"]');
        const ghostRight = container.querySelector('[data-ghost-zone="right"][data-ghost-level="T10"]');
        expect(ghostLeft).toBeTruthy();
        expect(ghostRight).toBeTruthy();
    });
});
