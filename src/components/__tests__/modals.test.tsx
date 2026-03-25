// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// Portalled content persists in document.body across tests — clean up manually
afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});
import { HelpModal } from '../modals/HelpModal';
import type { Zone } from '../../types';

const defaultScrewProps = {
    levelId: 'L4',
    zone: 'left' as Zone,
    levels: [{ id: 'L3', type: 'L' }, { id: 'L4', type: 'L' }, { id: 'L5', type: 'L' }],
    placements: [] as any[],
    useRegionDefaults: false,
};
import { ChangeLogModal } from '../modals/ChangeLogModal';
import { ForceModal } from '../modals/ForceModal';
import { NoteModal } from '../modals/NoteModal';
import { ScrewModal } from '../modals/ScrewModal';
import { DisclaimerModal } from '../modals/DisclaimerModal';

// --- Rendering ---

describe('Modal rendering', () => {

    it('HelpModal renders nothing when closed', () => {
        const { container } = render(<HelpModal isOpen={false} onClose={() => {}} />);
        expect(container.innerHTML).toBe('');
    });

    it('HelpModal renders dialog when open', () => {
        render(<HelpModal isOpen={true} onClose={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('ChangeLogModal renders nothing when closed', () => {
        const { container } = render(<ChangeLogModal isOpen={false} onClose={() => {}} />);
        expect(container.innerHTML).toBe('');
    });

    it('ChangeLogModal renders dialog when open', () => {
        render(<ChangeLogModal isOpen={true} onClose={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('ForceModal renders nothing when closed', () => {
        const { container } = render(<ForceModal isOpen={false} onClose={() => {}} onConfirm={() => {}} />);
        expect(container.innerHTML).toBe('');
    });

    it('ForceModal renders dialog when open', () => {
        render(<ForceModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('NoteModal renders nothing when closed', () => {
        const { container } = render(<NoteModal isOpen={false} onClose={() => {}} onConfirm={() => {}} onDelete={() => {}} initialText="" isEditing={false} />);
        expect(container.innerHTML).toBe('');
    });

    it('NoteModal renders dialog when open', () => {
        render(<NoteModal isOpen={true} onClose={() => {}} onConfirm={() => {}} onDelete={() => {}} initialText="" isEditing={false} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('ScrewModal renders nothing when closed', () => {
        const { container } = render(<ScrewModal isOpen={false} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        expect(container.innerHTML).toBe('');
    });

    it('ScrewModal renders dialog when open', () => {
        render(<ScrewModal isOpen={true} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('DisclaimerModal always renders (no isOpen prop)', () => {
        render(<DisclaimerModal lang="en" onLangChange={() => {}} onAccept={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});

// --- Portal rendering ---

describe('Modal portal rendering', () => {

    it('modal content is portalled to document.body', () => {
        const { container } = render(
            <div data-testid="parent">
                <HelpModal isOpen={true} onClose={() => {}} />
            </div>
        );
        // The dialog should NOT be inside the parent div — it's portalled
        const parent = screen.getByTestId('parent');
        expect(parent.querySelector('[role="dialog"]')).toBeNull();
        // But it should exist in the document
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});

// --- Keyboard: Escape closes ---

describe('Modal keyboard: Escape closes', () => {

    it('HelpModal calls onClose on Escape', () => {
        const onClose = vi.fn();
        render(<HelpModal isOpen={true} onClose={onClose} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('ChangeLogModal calls onClose on Escape', () => {
        const onClose = vi.fn();
        render(<ChangeLogModal isOpen={true} onClose={onClose} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('ScrewModal calls onClose on Escape', () => {
        const onClose = vi.fn();
        render(<ScrewModal isOpen={true} onClose={onClose} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('ForceModal calls onClose on Escape', () => {
        const onClose = vi.fn();
        render(<ForceModal isOpen={true} onClose={onClose} onConfirm={() => {}} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('NoteModal calls onClose on Escape', () => {
        const onClose = vi.fn();
        render(<NoteModal isOpen={true} onClose={onClose} onConfirm={() => {}} onDelete={() => {}} initialText="" isEditing={false} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});

// --- Keyboard: Enter submits ---

describe('Modal keyboard: Enter submits', () => {

    it('ScrewModal calls onConfirm on Enter', () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();
        render(<ScrewModal isOpen={true} onClose={onClose} onConfirm={onConfirm} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
        expect(onConfirm).toHaveBeenCalled();
    });

    it('DisclaimerModal calls onAccept on Enter', () => {
        const onAccept = vi.fn();
        render(<DisclaimerModal lang="en" onLangChange={() => {}} onAccept={onAccept} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
        expect(onAccept).toHaveBeenCalled();
    });

    it('HelpModal calls onClose on Enter (dismiss)', () => {
        const onClose = vi.fn();
        render(<HelpModal isOpen={true} onClose={onClose} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
        expect(onClose).toHaveBeenCalled();
    });
});

// --- Focus trap (Tab cycling) ---

describe('Modal focus trap', () => {

    it('ScrewModal traps Tab within modal', () => {
        render(<ScrewModal isOpen={true} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        const dialog = screen.getByRole('dialog');
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled])')) as HTMLElement[];
        expect(focusable.length).toBeGreaterThan(1);

        // Focus the first focusable element
        focusable[0].focus();
        expect(document.activeElement).toBe(focusable[0]);

        // Tab should move to next
        fireEvent.keyDown(dialog, { key: 'Tab' });
        expect(document.activeElement).toBe(focusable[1]);
    });

    it('ScrewModal wraps Tab from last to first', () => {
        render(<ScrewModal isOpen={true} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        const dialog = screen.getByRole('dialog');
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled])')) as HTMLElement[];
        expect(focusable.length).toBeGreaterThan(1);

        // Focus the last element
        const last = focusable[focusable.length - 1];
        last.focus();
        expect(document.activeElement).toBe(last);

        // Tab should wrap to first
        fireEvent.keyDown(dialog, { key: 'Tab' });
        expect(document.activeElement).toBe(focusable[0]);
    });

    it('ScrewModal wraps Shift+Tab from first to last', () => {
        render(<ScrewModal isOpen={true} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        const dialog = screen.getByRole('dialog');
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled])')) as HTMLElement[];

        // Focus the first element
        focusable[0].focus();
        expect(document.activeElement).toBe(focusable[0]);

        // Shift+Tab should wrap to last
        fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    });
});

// --- Overlay click closes ---

describe('Modal overlay click', () => {

    it('HelpModal calls onClose when overlay clicked', () => {
        const onClose = vi.fn();
        render(<HelpModal isOpen={true} onClose={onClose} />);
        // Click the overlay (the dialog element itself, not inner content)
        fireEvent.click(screen.getByRole('dialog'));
        expect(onClose).toHaveBeenCalled();
    });

    it('HelpModal does NOT close when inner content clicked', () => {
        const onClose = vi.fn();
        render(<HelpModal isOpen={true} onClose={onClose} />);
        // Click the inner white card (stopPropagation should prevent close)
        const buttons = screen.getAllByRole('button');
        const closeBtn = buttons[buttons.length - 1]; // Close button
        fireEvent.click(closeBtn);
        // onClose is called because the Close button calls it — but only once
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

// --- ARIA attributes ---

describe('Modal accessibility', () => {

    it('modals have aria-modal="true"', () => {
        render(<ScrewModal isOpen={true} onClose={() => {}} onConfirm={() => {}} defaultDiameter="6.5" defaultLength="45" {...defaultScrewProps} />);
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('modals have role="dialog"', () => {
        render(<HelpModal isOpen={true} onClose={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
