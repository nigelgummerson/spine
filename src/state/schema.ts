// src/state/schema.ts
import { z } from 'zod';

// --- ValidationError ---

export class ValidationError extends Error {
    issues: z.ZodIssue[];

    constructor(issues: z.ZodIssue[]) {
        const first = issues[0];
        const path = first?.path?.join('.') || 'unknown';
        const msg = first?.message || 'validation failed';
        super(`Invalid file: ${issues.length} error${issues.length === 1 ? '' : 's'} found. First: ${path} — ${msg}`);
        this.name = 'ValidationError';
        this.issues = issues;
    }
}

// --- Vertebral level pattern ---
// Matches: Oc, C1-C7, T1-T12, L1-L5, S1-S5, Pelvis, S2AI, Iliac, SI-J
const levelPattern = /^(Oc|C[1-7]|T([1-9]|1[0-2])|L[1-5]|S[1-5]|Pelvis|S2AI|Iliac|SI-J)$/;
const level = z.string().regex(levelPattern, 'Invalid vertebral level');

// --- Side enum ---
const side = z.enum(['left', 'right', 'bilateral', 'midline']);

// --- Positive number refinement for clinical measurements ---
const positiveNumber = z.number().positive('Must be a positive number');

// --- Element type-specific sub-objects ---
// These shapes are fully known — .strict() rejects unknown fields.

const screwObj = z.object({
    headType: z.string(),
    diameter: positiveNumber.optional(),
    length: positiveNumber.optional(),
}).strict().optional();

const hookObj = z.object({
    hookType: z.string(),
}).strict().optional();

const fixationObj = z.object({
    fixationType: z.string(),
    description: z.string().optional(),
}).strict().optional();

const cageObj = z.object({
    approach: z.string(),
    height: positiveNumber.optional(),
    width: positiveNumber.optional(),
    length: positiveNumber.optional(),
    lordosis: z.number().optional(),
    expandable: z.boolean().optional(),
}).strict().optional();

const osteotomyObj = z.object({
    osteotomyType: z.string(),
    schwabGrade: z.number().optional(),
    correctionAngle: z.number().optional(),
    reconstructionCage: z.string().optional(),
}).strict().optional();

const connectorObj = z.object({
    connectorType: z.string(),
    fraction: z.number().min(0).max(1).optional(),
}).strict().optional();

// --- Element ---

const elementType = z.enum(['screw', 'hook', 'fixation', 'cage', 'osteotomy', 'connector', 'marker']);

// Element zone — the internal placement zone written by the serializer
// Includes legacy pelvic zones (s2ai_left etc.) which the serializer may write for
// old pelvic placements stored on S1; these are migrated on deserialization.
const elementZone = z.enum([
    'left', 'right', 'mid', 'disc', 'force_left', 'force_right',
    's2ai_left', 's2ai_right', 'iliac_left', 'iliac_right', 'si_left', 'si_right',
]).optional();

const element = z.object({
    id: z.string(),
    type: elementType,
    level,
    side,
    zone: elementZone,
    annotation: z.string().optional(),
    trajectory: z.string().optional(),
    screw: screwObj,
    hook: hookObj,
    fixation: fixationObj,
    cage: cageObj,
    osteotomy: osteotomyObj,
    connector: connectorObj,
    markerType: z.string().optional(),
}).strict();

// --- Force ---

const force = z.object({
    id: z.string(),
    type: z.string(),
    level,
    side,
    direction: z.string().optional(),
}).strict();

// --- Rod ---

const rod = z.object({
    side: z.string(),
    id: z.string().optional(),
    freeText: z.string().optional(),
    material: z.string().optional(),
    diameter: positiveNumber.optional(),
    profile: z.string().optional(),
    length: positiveNumber.optional(),
    contour: z.string().optional(),
    notes: z.string().optional(),
    transitionFrom: positiveNumber.optional(),
    transitionTo: positiveNumber.optional(),
}).strict();

// --- Note ---

const note = z.object({
    id: z.string(),
    level,
    text: z.string(),
    showArrow: z.boolean().optional(),
}).strict();

// --- Bone graft ---

const boneGraft = z.object({
    types: z.array(z.string()).optional(),
    notes: z.string().optional(),
}).strict().optional();

// --- Construct data (plan or construct) ---

const constructData = z.object({
    elements: z.array(element).optional(),
    forces: z.array(force).optional(),
    rods: z.array(rod).optional(),
    notes: z.array(note).optional(),
    boneGraft: boneGraft,
}).strict().optional();

// --- Schema metadata ---

const generator = z.object({
    name: z.string(),
    version: z.string(),
    url: z.string().optional(),
}).strict().optional();

// --- Top-level v4 schema ---
// .passthrough() on root: forward compatibility — newer app versions may add top-level
// sections (e.g. "outcomes", "imaging") that older versions should preserve on load/save.

export const v4Schema = z.object({
    schema: z.object({
        format: z.literal('spinal-instrumentation'),
        version: z.literal(4),
        schemaUrl: z.string().optional(),
        generator: generator,
    }).strict(),
    document: z.object({
        id: z.string(),
        created: z.string(),
        modified: z.string().optional(),
        language: z.string().optional(),
        lockedAt: z.string().optional(),
        disclaimerAcceptedAt: z.string().optional(),
    }).strict().optional(),
    patient: z.object({
        name: z.string().optional(),
        identifier: z.string().optional(),
    }).strict().optional(),
    case: z.object({
        date: z.string().optional(),
        surgeon: z.string().optional(),
        location: z.string().optional(),
    }).strict().optional(),
    implantSystem: z.object({
        manufacturer: z.string().optional(),
        system: z.string().optional(),
    }).strict().optional(),
    plan: constructData,
    construct: constructData,
    ui: z.object({
        viewMode: z.string().optional(),
        colourScheme: z.string().optional(),
        notePositions: z.record(z.string(), z.object({ offsetX: z.number(), offsetY: z.number() }).passthrough()).optional(),
        preferences: z.object({
            showPelvis: z.boolean().optional(),
            useRegionDefaults: z.boolean().optional(),
            confirmAndNext: z.boolean().optional(),
        }).strict().optional(),
    }).strict().optional(),
}).passthrough();

// --- Inferred type ---

export type V4Document = z.infer<typeof v4Schema>;

// --- Validate v4 ---

export function validateV4(json: unknown): V4Document {
    const result = v4Schema.safeParse(json);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}

// --- Legacy v2/v3 schema (loose — validates basic shape only) ---
// Legacy schemas use .passthrough() throughout because v2/v3 files may contain
// any number of extra fields from older app versions that we don't fully document.

const legacyZone = z.enum(['left', 'right', 'mid', 'disc', 'force_left', 'force_right',
    's2ai_left', 's2ai_right', 'iliac_left', 'iliac_right', 'si_left', 'si_right']);

const legacyPlacement = z.object({
    id: z.string(),
    levelId: z.string(),
    zone: legacyZone,
    tool: z.string(),
}).passthrough();

const legacyCage = z.object({
    id: z.string(),
    levelId: z.string(),
}).passthrough();

const legacyConnector = z.object({
    id: z.string(),
}).passthrough();

const legacyNote = z.object({
    id: z.string(),
    levelId: z.string(),
    text: z.string(),
}).passthrough();

const legacyChartData = z.object({
    implants: z.array(legacyPlacement).optional(),
    cages: z.array(legacyCage).optional(),
    connectors: z.array(legacyConnector).optional(),
    notes: z.array(legacyNote).optional(),
}).passthrough().optional();

const legacyPatient = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
}).passthrough().optional();

export const legacySchema = z.object({
    formatVersion: z.number().min(2).max(3),
    patient: legacyPatient,
    plan: legacyChartData,
    construct: legacyChartData,
}).passthrough();

export type LegacyDocument = z.infer<typeof legacySchema>;

// --- Validate legacy ---

export function validateLegacy(json: unknown): LegacyDocument {
    const result = legacySchema.safeParse(json);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}
