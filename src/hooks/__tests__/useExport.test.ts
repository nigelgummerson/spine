// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createInitialState, serializeState } from '../../state/documentReducer';
import { ValidationError } from '../../state/schema';
import { CURRENT_VERSION } from '../../data/changelog';
import type { DocumentAction } from '../../types';

// --- Mocks ---

// Mock html-to-image
vi.mock('html-to-image', () => ({
    toCanvas: vi.fn().mockResolvedValue({
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,fake'),
        width: 1485,
        height: 1050,
    }),
}));

// Mock jsPDF — must use a class so `new jsPDF(...)` works
const mockPdfInstance = {
    addImage: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
};
vi.mock('jspdf', () => ({
    jsPDF: class MockPDF {
        addImage = mockPdfInstance.addImage;
        addPage = mockPdfInstance.addPage;
        save = mockPdfInstance.save;
    },
}));

// Mock checksum utils
vi.mock('../../utils/checksum', () => ({
    computeChecksum: vi.fn().mockResolvedValue('abc123hash'),
    verifyChecksum: vi.fn().mockResolvedValue('valid'),
}));

// Mock i18n
vi.mock('../../i18n/i18n', () => ({
    t: vi.fn((key: string) => key),
    formatDate: vi.fn(() => '2026-03-26'),
}));

// --- jsdom polyfills ---

// document.fonts.ready
if (typeof document !== 'undefined' && !document.fonts) {
    Object.defineProperty(document, 'fonts', {
        value: { ready: Promise.resolve() },
        writable: true,
    });
}

// requestAnimationFrame
if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
    };
}

// URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-blob');
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

// BroadcastChannel stub (jsdom doesn't implement it)
if (typeof globalThis.BroadcastChannel === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.BroadcastChannel = class { constructor() {} postMessage() {} close() {} onmessage = null; } as any;
}

// crypto.subtle for checksum (node environment may lack it)
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    // The checksum module is mocked, so this is just a safety net
    Object.defineProperty(globalThis, 'crypto', {
        value: {
            randomUUID: () => '00000000-0000-0000-0000-000000000000',
            subtle: { digest: vi.fn() },
        },
        writable: true,
    });
}

// --- Helpers ---

function makeParams(overrides: Partial<Parameters<typeof import('../useExport').useExport>[0]> = {}) {
    const exportDiv = document.createElement('div');
    // Add a demographics column mock
    const demoCol = document.createElement('div');
    demoCol.className = 'w-[370px]';
    exportDiv.appendChild(demoCol);

    return {
        exportRef: { current: exportDiv },
        patientData: createInitialState().patientData,
        serialize: vi.fn(() => {
            const state = createInitialState();
            return serializeState(state, 'plan', 'default', CURRENT_VERSION, 'en') as Record<string, unknown>;
        }),
        dispatch: vi.fn() as React.Dispatch<DocumentAction>,
        incognitoMode: false,
        isPortrait: false,
        setPortraitExporting: vi.fn(),
        showToast: vi.fn(),
        activeChart: 'planned',
        setActiveChart: vi.fn(),
        setShowFinalInventory: vi.fn(),
        setViewMode: vi.fn(),
        changeTheme: vi.fn(),
        fileInputRef: { current: document.createElement('input') },
        ...overrides,
    };
}

// --- Setup / Teardown ---

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});

afterEach(() => {
    cleanup();
});

// Lazy import so mocks are registered before module loads
async function importHook() {
    const mod = await import('../useExport');
    return mod.useExport;
}

// =============================================================================
// Tests
// =============================================================================

describe('useExport', () => {

    // -------------------------------------------------------------------------
    // saveProjectJSON
    // -------------------------------------------------------------------------

    describe('saveProjectJSON', () => {

        it('serializes state and creates a download link', async () => {
            const useExport = await importHook();
            const params = makeParams({ patientData: { ...createInitialState().patientData, name: 'John Doe' } });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(params.serialize).toHaveBeenCalledOnce();
        });

        it('adds checksum to the serialized document', async () => {
            const useExport = await importHook();
            const { computeChecksum } = await import('../../utils/checksum');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(computeChecksum).toHaveBeenCalled();
        });

        it('creates and clicks a download anchor element', async () => {
            const useExport = await importHook();
            const clickSpy = vi.fn();
            const origCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                const el = origCreateElement(tag);
                if (tag === 'a') el.click = clickSpy;
                return el;
            });

            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(clickSpy).toHaveBeenCalledOnce();
            vi.restoreAllMocks();
        });

        it('revokes blob URL in finally block', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(mockCreateObjectURL).toHaveBeenCalled();
            expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-blob');
        });

        it('removes localStorage when incognitoMode is true', async () => {
            const useExport = await importHook();
            localStorage.setItem('spine_planner_v2', '{"test":"data"}');
            const params = makeParams({ incognitoMode: true });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(localStorage.getItem('spine_planner_v2')).toBeNull();
        });

        it('shows error toast on serialization failure', async () => {
            const useExport = await importHook();
            const params = makeParams({
                serialize: vi.fn(() => { throw new Error('serialize boom'); }),
            });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(params.showToast).toHaveBeenCalledWith('Save failed', 'error');
        });

        it('generates filename from patient name', async () => {
            const useExport = await importHook();
            const links: HTMLAnchorElement[] = [];
            const origAppend = document.body.appendChild.bind(document.body);
            vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
                if (node instanceof HTMLAnchorElement) links.push(node);
                return origAppend(node);
            });
            const params = makeParams({
                patientData: { ...createInitialState().patientData, name: 'Jane Smith' },
            });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.saveProjectJSON();
            });

            expect(links.length).toBeGreaterThan(0);
            expect(links[0].download).toContain('Jane Smith');
            vi.restoreAllMocks();
        });
    });

    // -------------------------------------------------------------------------
    // loadProjectJSON
    // -------------------------------------------------------------------------

    describe('loadProjectJSON', () => {

        function makeFileEvent(content: string, filename = 'test.json'): React.ChangeEvent<HTMLInputElement> {
            const file = new File([content], filename, { type: 'application/json' });
            const input = document.createElement('input');
            Object.defineProperty(input, 'files', { value: [file] });
            Object.defineProperty(input, 'value', { value: filename, writable: true });
            return { target: input } as unknown as React.ChangeEvent<HTMLInputElement>;
        }

        async function waitForFileRead() {
            // FileReader is async — flush microtasks
            await new Promise(r => setTimeout(r, 50));
        }

        it('dispatches LOAD_DOCUMENT for valid v4 JSON', async () => {
            const useExport = await importHook();
            const state = createInitialState();
            state.patientData.name = 'V4 Patient';
            const v4json = serializeState(state, 'plan', 'default', CURRENT_VERSION, 'en');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify(v4json)));
            });
            await waitForFileRead();

            expect(params.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'LOAD_DOCUMENT' })
            );
        });

        it('shows loaded toast on success', async () => {
            const useExport = await importHook();
            const state = createInitialState();
            const v4json = serializeState(state, 'plan', 'default', CURRENT_VERSION, 'en');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify(v4json)));
            });
            await waitForFileRead();

            expect(params.showToast).toHaveBeenCalledWith('alert.loaded');
        });

        it('validates legacy v2/v3 JSON and dispatches LOAD_DOCUMENT', async () => {
            const useExport = await importHook();
            const legacyJson = {
                formatVersion: 2,
                patient: { name: 'Legacy Patient', id: '' },
                plan: { implants: [], cages: [], connectors: [], notes: [] },
                construct: { implants: [], cages: [], connectors: [], notes: [] },
            };
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify(legacyJson)));
            });
            await waitForFileRead();

            expect(params.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'LOAD_DOCUMENT' })
            );
        });

        it('shows error toast for invalid JSON', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent('not json at all{{{'));
            });
            await waitForFileRead();

            expect(params.showToast).toHaveBeenCalledWith('alert.invalid_file', 'error');
        });

        it('shows unsupported format error for unknown formatVersion', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify({ formatVersion: 1 })));
            });
            await waitForFileRead();

            expect(params.showToast).toHaveBeenCalledWith('alert.unsupported_format', 'error');
        });

        it('shows specific error message for ValidationError', async () => {
            const useExport = await importHook();
            // v4 JSON with invalid schema (missing required fields)
            const invalidV4 = {
                schema: { format: 'spinal-instrumentation', version: 4 },
                // document.id is required by Zod schema — omitting 'document' entirely
                // but the elements array has invalid data
                plan: { elements: [{ id: 123, type: 'invalid' }] },
            };
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify(invalidV4)));
            });
            await waitForFileRead();

            // ValidationError produces a specific message (not the generic alert.invalid_file)
            const call = params.showToast.mock.calls.find(
                (c: unknown[]) => c[1] === 'error' && typeof c[0] === 'string' && c[0].includes('Invalid file')
            );
            expect(call).toBeTruthy();
        });

        it('does nothing when no file is selected', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));
            const input = document.createElement('input');
            Object.defineProperty(input, 'files', { value: [] });

            act(() => {
                result.current.loadProjectJSON({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
            });
            await waitForFileRead();

            expect(params.dispatch).not.toHaveBeenCalled();
            expect(params.showToast).not.toHaveBeenCalled();
        });

        it('calls setViewMode and changeTheme from loaded document', async () => {
            const useExport = await importHook();
            const state = createInitialState();
            const v4json = serializeState(state, 'construct', 'navy', CURRENT_VERSION, 'en');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            act(() => {
                result.current.loadProjectJSON(makeFileEvent(JSON.stringify(v4json)));
            });
            await waitForFileRead();

            expect(params.setViewMode).toHaveBeenCalledWith('construct');
            expect(params.changeTheme).toHaveBeenCalledWith('navy');
        });

        it('resets file input value after reading', async () => {
            const useExport = await importHook();
            const state = createInitialState();
            const v4json = serializeState(state, 'plan', 'default', CURRENT_VERSION, 'en');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));
            const event = makeFileEvent(JSON.stringify(v4json));

            act(() => {
                result.current.loadProjectJSON(event);
            });

            // The input value is reset synchronously after reader.readAsText
            expect(event.target.value).toBe('');
        });
    });

    // -------------------------------------------------------------------------
    // prepareExportCanvas
    // -------------------------------------------------------------------------

    describe('prepareExportCanvas (via runExportJPG)', () => {

        it('syncs checkbox checked attributes in demographics column', async () => {
            const useExport = await importHook();
            const exportDiv = document.createElement('div');
            const demoCol = document.createElement('div');
            demoCol.className = 'w-[370px]';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            demoCol.appendChild(checkbox);

            const uncheckedBox = document.createElement('input');
            uncheckedBox.type = 'checkbox';
            uncheckedBox.checked = false;
            uncheckedBox.setAttribute('checked', 'checked'); // stale attribute
            demoCol.appendChild(uncheckedBox);

            exportDiv.appendChild(demoCol);
            const params = makeParams({ exportRef: { current: exportDiv } });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            expect(checkbox.getAttribute('checked')).toBe('checked');
            expect(uncheckedBox.hasAttribute('checked')).toBe(false);
        });

        it('syncs select selected attributes in demographics column', async () => {
            const useExport = await importHook();
            const exportDiv = document.createElement('div');
            const demoCol = document.createElement('div');
            demoCol.className = 'w-[370px]';

            const select = document.createElement('select');
            const opt0 = document.createElement('option');
            opt0.value = 'a'; opt0.textContent = 'A';
            const opt1 = document.createElement('option');
            opt1.value = 'b'; opt1.textContent = 'B';
            select.appendChild(opt0);
            select.appendChild(opt1);
            select.selectedIndex = 1;
            demoCol.appendChild(select);

            exportDiv.appendChild(demoCol);
            const params = makeParams({ exportRef: { current: exportDiv } });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            expect(opt1.getAttribute('selected')).toBe('selected');
            expect(opt0.hasAttribute('selected')).toBe(false);
        });

        it('sets portraitExporting when in portrait mode', async () => {
            const useExport = await importHook();
            const params = makeParams({ isPortrait: true });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            // setPortraitExporting(true) called during prepare, then (false) in finally
            expect(params.setPortraitExporting).toHaveBeenCalledWith(true);
            expect(params.setPortraitExporting).toHaveBeenCalledWith(false);
        });
    });

    // -------------------------------------------------------------------------
    // runExportJPG
    // -------------------------------------------------------------------------

    describe('runExportJPG', () => {

        it('calls htmlToImage.toCanvas with correct parameters', async () => {
            const useExport = await importHook();
            const htmlToImage = await import('html-to-image');
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            expect(htmlToImage.toCanvas).toHaveBeenCalledWith(
                params.exportRef.current,
                expect.objectContaining({
                    pixelRatio: 3508 / 1485,
                    backgroundColor: '#ffffff',
                    width: 1485,
                    height: 1050,
                })
            );
        });

        it('resets portraitExporting in finally block even on error', async () => {
            const useExport = await importHook();
            const htmlToImage = await import('html-to-image');
            vi.mocked(htmlToImage.toCanvas).mockRejectedValueOnce(new Error('canvas boom'));
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            expect(params.setPortraitExporting).toHaveBeenCalledWith(false);
            expect(params.showToast).toHaveBeenCalledWith('Export failed', 'error');
        });

        it('removes localStorage when incognitoMode is true', async () => {
            const useExport = await importHook();
            localStorage.setItem('spine_planner_v2', '{"test":"data"}');
            const params = makeParams({ incognitoMode: true });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportJPG();
            });

            expect(localStorage.getItem('spine_planner_v2')).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // runExportPDF
    // -------------------------------------------------------------------------

    describe('runExportPDF', () => {

        it('creates a landscape A4 PDF and calls save', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportPDF();
            });

            expect(mockPdfInstance.addImage).toHaveBeenCalled();
            expect(mockPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('SpinePlan_'));
        });

        it('resets portraitExporting in finally block even on error', async () => {
            const useExport = await importHook();
            const htmlToImage = await import('html-to-image');
            vi.mocked(htmlToImage.toCanvas).mockRejectedValueOnce(new Error('pdf canvas boom'));
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportPDF();
            });

            expect(params.setPortraitExporting).toHaveBeenCalledWith(false);
            expect(params.showToast).toHaveBeenCalledWith('Export failed', 'error');
        });

        it('removes localStorage when incognitoMode is true', async () => {
            const useExport = await importHook();
            localStorage.setItem('spine_planner_v2', '{"test":"data"}');
            const params = makeParams({ incognitoMode: true });
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportPDF();
            });

            expect(localStorage.getItem('spine_planner_v2')).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // runExportWithChoice
    // -------------------------------------------------------------------------

    describe('runExportWithChoice', () => {

        it('sets active chart and inventory before exporting', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportWithChoice('jpg', true);
            });

            expect(params.setActiveChart).toHaveBeenCalledWith('completed');
            expect(params.setShowFinalInventory).toHaveBeenCalledWith(true);
        });

        it('uses planned chart when useFinal is false', async () => {
            const useExport = await importHook();
            const params = makeParams();
            const { result } = renderHook(() => useExport(params));

            await act(async () => {
                await result.current.runExportWithChoice('pdf', false);
            });

            expect(params.setActiveChart).toHaveBeenCalledWith('planned');
            expect(params.setShowFinalInventory).toHaveBeenCalledWith(false);
        });
    });
});
