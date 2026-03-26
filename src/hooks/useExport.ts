// src/hooks/useExport.ts
import { RefObject } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { t, formatDate } from '../i18n/i18n';
import { deserializeDocument } from '../state/documentReducer';
import { validateV4, validateLegacy, ValidationError } from '../state/schema';
import { computeChecksum, verifyChecksum } from '../utils/checksum';
import type { PatientData, DocumentAction } from '../types';

interface UseExportParams {
    exportRef: RefObject<HTMLDivElement | null>;
    patientData: PatientData;
    serialize: () => Record<string, unknown>;
    dispatch: React.Dispatch<DocumentAction>;
    incognitoMode: boolean;
    isPortrait: boolean;
    setPortraitExporting: (v: boolean) => void;
    showToast: (msg: string, type?: string) => void;
    activeChart: string;
    setActiveChart: (chart: string) => void;
    setShowFinalInventory: (v: boolean) => void;
    setViewMode: (v: string) => void;
    changeTheme: (id: string) => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
}

export function useExport({
    exportRef,
    patientData,
    serialize,
    dispatch,
    incognitoMode,
    isPortrait,
    setPortraitExporting,
    showToast,
    activeChart,
    setActiveChart,
    setShowFinalInventory,
    setViewMode,
    changeTheme,
    fileInputRef,
}: UseExportParams) {

    const prepareExportCanvas = async () => {
        await document.fonts.ready;
        // In portrait mode, mount the off-screen export container temporarily
        if (isPortrait) {
            setPortraitExporting(true);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        }
        const element = exportRef.current!;
        // Sync demographics form state to DOM attributes (checkboxes, selects)
        // Chart columns are SVG-native and don't need this
        const demoCol = element.querySelector('.w-\\[370px\\]');
        if (demoCol) {
            demoCol.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
                if ((cb as HTMLInputElement).checked) cb.setAttribute('checked', 'checked');
                else cb.removeAttribute('checked');
            });
            demoCol.querySelectorAll('select').forEach((sel) => {
                const selectEl = sel as HTMLSelectElement;
                Array.from(selectEl.options).forEach((opt: HTMLOptionElement, i: number) => {
                    if (i === selectEl.selectedIndex) opt.setAttribute('selected', 'selected');
                    else opt.removeAttribute('selected');
                });
            });
        }
        // 300 DPI: A4 landscape (297x210mm) at 300 DPI = 3508x2480px
        const canvas = await htmlToImage.toCanvas(element, {
            pixelRatio: 3508 / 1485,
            backgroundColor: '#ffffff',
            width: 1485,
            height: 1050,
            filter: (node: HTMLElement) => !node.dataset?.exportHide
        });
        return canvas;
    };

    const runExportJPG = async () => {
        try {
            const canvas = await prepareExportCanvas();
            const link = document.createElement('a');
            link.download = `SpinePlan_${patientData.name || 'Patient'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.85);
            link.click();
            if (incognitoMode) localStorage.removeItem('spine_planner_v2');
        } catch (err) {
            console.error('JPG export failed:', err);
            showToast('Export failed', 'error');
        } finally {
            setPortraitExporting(false);
        }
    };

    const runExportPDF = async () => {
        let invPage: HTMLElement | null = null;
        try {
            const canvas = await prepareExportCanvas();
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
            // Check if demographics panel overflows — if so, add inventory page
            const demoCol = exportRef.current?.querySelector('.w-\\[370px\\]');
            if (demoCol && demoCol.scrollHeight > demoCol.clientHeight + 20) {
                // Build a standalone inventory page off-screen
                invPage = document.createElement('div');
                invPage.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:595px;height:842px;background:white;padding:40px;font-family:Inter,sans-serif;box-sizing:border-box;';
                invPage.innerHTML = `<div style="border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:16px"><div style="font-weight:700;font-size:16px;color:#1e293b">${patientData.name || 'Patient'}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${patientData.id ? patientData.id + ' — ' : ''}${formatDate(patientData.date)}${patientData.surgeon ? ' — ' + patientData.surgeon : ''}</div></div>`;
                // Clone the inventory content
                const invSource = demoCol.querySelector('.mt-2.border-t');
                if (invSource) {
                    const invClone = invSource.cloneNode(true) as HTMLElement;
                    invClone.style.cssText = 'columns:1;margin:0;padding:0;';
                    // Remove 2-column layout for full-page rendering
                    const colDiv = invClone.querySelector('[style*="columns"]') as HTMLElement | null;
                    if (colDiv) colDiv.style.columns = '2';
                    invPage.appendChild(invClone);
                }
                document.body.appendChild(invPage);
                try {
                    const invCanvas = await htmlToImage.toCanvas(invPage, { pixelRatio: 2, backgroundColor: '#ffffff', width: 595, height: 842 });
                    pdf.addPage('a4', 'portrait');
                    pdf.addImage(invCanvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
                } catch (e) { console.error('Inventory page export failed:', e); }
            }
            pdf.save(`SpinePlan_${patientData.name || 'Patient'}.pdf`);
            if (incognitoMode) localStorage.removeItem('spine_planner_v2');
        } catch (err) {
            console.error('PDF export failed:', err);
            showToast('Export failed', 'error');
        } finally {
            if (invPage && invPage.parentNode) document.body.removeChild(invPage);
            setPortraitExporting(false);
        }
    };

    const runExportWithChoice = async (format: string, useFinal: boolean) => {
        setActiveChart(useFinal ? 'completed' : 'planned');
        setShowFinalInventory(useFinal);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        try {
            if (format === 'jpg') await runExportJPG();
            else await runExportPDF();
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Export failed', 'error');
            setPortraitExporting(false);
        }
    };

    const saveProjectJSON = async () => {
        let link: HTMLAnchorElement | null = null;
        let blobUrl: string | null = null;
        try {
            const data = serialize() as Record<string, unknown>;
            const checksum = await computeChecksum(data);
            (data.document as Record<string, unknown>).checksum = checksum;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            link = document.createElement('a');
            blobUrl = URL.createObjectURL(blob);
            link.href = blobUrl;
            link.download = `SpineProject_${(patientData.name || 'Unnamed').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Unnamed'}.json`;
            document.body.appendChild(link);
            link.click();
            if (incognitoMode) localStorage.removeItem('spine_planner_v2');
        } catch (err) {
            console.error('Save failed:', err);
            showToast('Save failed', 'error');
        } finally {
            if (link && link.parentNode) document.body.removeChild(link);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        }
    };

    const loadProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (json.schema?.version === 4) {
                    validateV4(json);
                    const checksumResult = await verifyChecksum(json);
                    if (checksumResult === 'mismatch') {
                        showToast(t('alert.checksum_mismatch'), 'error');
                    }
                    const result = deserializeDocument(json);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                } else if (json.formatVersion >= 2) {
                    validateLegacy(json);
                    const result = deserializeDocument(json);
                    dispatch({ type: 'LOAD_DOCUMENT', document: result.state });
                    if (result.viewMode) setViewMode(result.viewMode);
                    if (result.colourScheme) changeTheme(result.colourScheme);
                } else {
                    showToast(t('alert.unsupported_format'), 'error');
                    return;
                }
                showToast(t('alert.loaded'));
            } catch (err) {
                if (err instanceof ValidationError) {
                    console.error('Schema validation failed:', err.issues);
                    showToast(err.message, 'error');
                } else {
                    showToast(t('alert.invalid_file'), 'error');
                }
            }
        };
        reader.readAsText(file); e.target.value = '';
    };

    return {
        runExportJPG,
        runExportPDF,
        runExportWithChoice,
        saveProjectJSON,
        loadProjectJSON,
    };
}
