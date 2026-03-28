import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/i18n';

const STORAGE_KEY = 'spine_planner_onboarding_done';

export function resetOnboardingTour(): void {
    localStorage.removeItem(STORAGE_KEY);
}

interface SpotPosition {
    x: number;
    y: number;
    r: number;
}

interface StepDef {
    textKey: string;
    findTarget: () => DOMRect | null;
    radius?: number;
}

function findInPlanChart(selector: string): Element | null {
    // Plan column is the 2nd child of #export-container
    const container = document.getElementById('export-container');
    if (!container || container.children.length < 2) return null;
    const planCol = container.children[1];
    return planCol.querySelector(selector);
}

function pickMiddleElement(elements: NodeListOf<Element> | Element[]): Element | null {
    const arr = Array.from(elements);
    if (arr.length === 0) return null;
    // Pick one roughly 55-60% down the list (mid-lumbar area in most views)
    return arr[Math.min(Math.floor(arr.length * 0.55), arr.length - 1)];
}

const STEPS: StepDef[] = [
    {
        textKey: 'onboarding.step1',
        findTarget: () => {
            // Find a ghost dashed circle icon in the plan chart (left pedicle zone)
            const container = document.getElementById('export-container');
            if (!container || container.children.length < 2) return null;
            const planCol = container.children[1];
            const ghosts = planCol.querySelectorAll('[data-ghost-zone="left"]');
            const ghost = pickMiddleElement(ghosts);
            if (!ghost) return null;
            // Target the dashed circle inside the <g>, not the <g> itself
            const circle = ghost.querySelector('circle');
            return circle?.getBoundingClientRect() || ghost.getBoundingClientRect();
        },
        radius: 30,
    },
    {
        textKey: 'onboarding.step2',
        findTarget: () => {
            // Find a disc zone rect in the plan chart
            const container = document.getElementById('export-container');
            if (!container || container.children.length < 2) return null;
            const planCol = container.children[1];
            const discs = planCol.querySelectorAll('[data-zone="disc"]');
            const disc = pickMiddleElement(discs);
            return disc?.getBoundingClientRect() || null;
        },
        radius: 25,
    },
    {
        textKey: 'onboarding.step3',
        findTarget: () => {
            const confirmText = t('sidebar.confirm_all');
            const buttons = document.querySelectorAll('aside button');
            for (const btn of buttons) {
                if (btn.textContent?.includes(confirmText)) {
                    return btn.getBoundingClientRect();
                }
            }
            return null;
        },
        radius: 45,
    },
];

interface OnboardingTourProps {
    activeChart: string;
    setActiveChart: (chart: 'planned' | 'completed') => void;
}

export const OnboardingTour = ({ activeChart, setActiveChart }: OnboardingTourProps) => {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const [spot, setSpot] = useState<SpotPosition | null>(null);

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY) !== 'true') {
            // Ensure Plan is the active chart so zones and ghost icons are visible
            if (activeChart !== 'planned') setActiveChart('planned');
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (!visible) return;
        const updatePosition = () => {
            const stepDef = STEPS[step];
            const targetRect = stepDef.findTarget();
            if (targetRect) {
                const cx = targetRect.left + targetRect.width / 2;
                const cy = targetRect.top + targetRect.height / 2;
                setSpot({ x: cx, y: cy, r: stepDef.radius || 50 });
            } else {
                setSpot({ x: window.innerWidth / 2, y: window.innerHeight / 2, r: 50 });
            }
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [visible, step]);

    const dismiss = useCallback(() => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    }, []);

    const advance = useCallback(() => {
        if (step >= STEPS.length - 1) {
            dismiss();
        } else {
            setStep(s => s + 1);
        }
    }, [step, dismiss]);

    useEffect(() => {
        if (!visible) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dismiss();
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [visible, dismiss, advance]);

    if (!visible || !spot) return null;

    const isLast = step === STEPS.length - 1;

    // Position tooltip: prefer right of spot, fall back to left if near right edge
    const tooltipW = 280;
    const tooltipLeft = spot.x + spot.r + 24 + tooltipW > window.innerWidth
        ? Math.max(16, spot.x - spot.r - tooltipW - 8)
        : spot.x + spot.r + 24;
    const tooltipTop = Math.max(16, Math.min(spot.y - 40, window.innerHeight - 160));

    return createPortal(
        <div className="fixed inset-0 z-[100]" onClick={advance}>
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="onboarding-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <circle cx={spot.x} cy={spot.y} r={spot.r} fill="black" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#onboarding-mask)" />
                <circle cx={spot.x} cy={spot.y} r={spot.r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
            </svg>

            <div
                className="absolute bg-white rounded-lg shadow-xl p-4"
                style={{ left: tooltipLeft, top: tooltipTop, width: tooltipW }}
                onClick={e => e.stopPropagation()}
            >
                <p className="text-sm text-slate-700 mb-3">{t(STEPS[step].textKey)}</p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{step + 1}/{STEPS.length}</span>
                    <div className="flex items-center gap-3">
                        <button onClick={dismiss} className="text-xs text-slate-400 hover:text-slate-600">
                            {t('onboarding.skip')}
                        </button>
                        <button onClick={advance} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                            {isLast ? t('onboarding.done') : t('onboarding.next')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
