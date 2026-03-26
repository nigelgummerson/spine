import { useState } from 'react';
import type { ModalId } from '../components/ModalOrchestrator';
import type { OsteotomyData, CageData, Cage, Note } from '../types';

/** Editing data can be placement data, cage data for ghost cages, or undefined for new entries */
type EditingData = string | OsteotomyData | CageData | Cage | null | undefined;

/**
 * Centralises all modal-related state that was previously declared inline in App.tsx.
 * Returns a flat object so existing destructuring patterns work unchanged.
 */
export function useModalState() {
    // Exclusive modal discriminator
    const [openModal, setOpenModal] = useState<ModalId>(null);

    // Force popover (inline picker, not a full modal)
    const [forcePopover, setForcePopover] = useState<{ x: number; y: number; existingTool: string | null; existingId: string | null } | null>(null);

    // Note editing state
    const [pendingNoteTool, setPendingNoteTool] = useState<{ tool: string; levelId: string; offsetX: number; offsetY: number } | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    // Rod modal state
    const [rodModalOpen, setRodModalOpen] = useState(false);
    const [rodModalChart, setRodModalChart] = useState<'plan' | 'construct'>('plan');
    const [rodModalSide, setRodModalSide] = useState<'left' | 'right'>('left');

    // Confirmation dialogs
    const [confirmNewPatient, setConfirmNewPatient] = useState(false);
    const [confirmClearConstruct, setConfirmClearConstruct] = useState(false);
    const [confirmLock, setConfirmLock] = useState(false);
    const [confirmUnlock, setConfirmUnlock] = useState(false);

    // Export picker
    const [exportPicker, setExportPicker] = useState<string | null>(null);

    // Placement editing state
    const [pendingPlacement, setPendingPlacement] = useState<{ levelId: string; zone: string; tool: string } | null>(null);
    const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<EditingData>(undefined);
    const [editingTool, setEditingTool] = useState<string | null>(null);
    const [editingCageLevel, setEditingCageLevel] = useState<string | null>(null);
    const [discPickerLevel, setDiscPickerLevel] = useState<{ levelId: string; x: number; y: number } | null>(null);
    const [editingAnnotation, setEditingAnnotation] = useState('');

    // Osteotomy disc level flag
    const [osteoDiscLevel, setOsteoDiscLevel] = useState<boolean | undefined>(undefined);

    // Force zone pending state
    const [pendingForceZone, setPendingForceZone] = useState<{ levelId: string; zone: string } | null>(null);

    return {
        openModal, setOpenModal,
        forcePopover, setForcePopover,
        pendingNoteTool, setPendingNoteTool,
        editingNote, setEditingNote,
        rodModalOpen, setRodModalOpen,
        rodModalChart, setRodModalChart,
        rodModalSide, setRodModalSide,
        confirmNewPatient, setConfirmNewPatient,
        confirmClearConstruct, setConfirmClearConstruct,
        confirmLock, setConfirmLock,
        confirmUnlock, setConfirmUnlock,
        exportPicker, setExportPicker,
        pendingPlacement, setPendingPlacement,
        editingPlacementId, setEditingPlacementId,
        editingData, setEditingData,
        editingTool, setEditingTool,
        editingCageLevel, setEditingCageLevel,
        discPickerLevel, setDiscPickerLevel,
        editingAnnotation, setEditingAnnotation,
        osteoDiscLevel, setOsteoDiscLevel,
        pendingForceZone, setPendingForceZone,
    };
}
