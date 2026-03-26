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

// --- Element type-specific sub-objects (loose validation with passthrough) ---

const screwObj = z.object({
    headType: z.string(),
    diameter: z.number().optional(),
    length: z.number().optional(),
}).passthrough().optional();

const hookObj = z.object({
    hookType: z.string(),
}).passthrough().optional();

const fixationObj = z.object({
    fixationType: z.string(),
    description: z.string().optional(),
}).passthrough().optional();

const cageObj = z.object({
    approach: z.string(),
    height: z.number().optional(),
    width: z.number().optional(),
    length: z.number().optional(),
    lordosis: z.number().optional(),
}).passthrough().optional();

const osteotomyObj = z.object({
    osteotomyType: z.string(),
    schwabGrade: z.number().optional(),
    correctionAngle: z.number().optional(),
    reconstructionCage: z.string().optional(),
}).passthrough().optional();

const connectorObj = z.object({
    connectorType: z.string(),
    fraction: z.number().min(0).max(1).optional(),
}).passthrough().optional();

// --- Element ---

const elementType = z.enum(['screw', 'hook', 'fixation', 'cage', 'osteotomy', 'connector', 'marker']);

const element = z.object({
    id: z.string(),
    type: elementType,
    level,
    side,
    annotation: z.string().optional(),
    screw: screwObj,
    hook: hookObj,
    fixation: fixationObj,
    cage: cageObj,
    osteotomy: osteotomyObj,
    connector: connectorObj,
}).passthrough();

// --- Force ---

const force = z.object({
    id: z.string(),
    type: z.string(),
    level,
    side,
    direction: z.string().optional(),
}).passthrough();

// --- Rod ---

const rod = z.object({
    side: z.string(),
    id: z.string().optional(),
    freeText: z.string().optional(),
    material: z.string().optional(),
    diameter: z.number().optional(),
    profile: z.string().optional(),
    length: z.number().optional(),
    contour: z.string().optional(),
    notes: z.string().optional(),
    transitionFrom: z.number().optional(),
    transitionTo: z.number().optional(),
}).passthrough();

// --- Note ---

const note = z.object({
    id: z.string(),
    level,
    text: z.string(),
    showArrow: z.boolean().optional(),
}).passthrough();

// --- Bone graft ---

const boneGraft = z.object({
    types: z.array(z.string()).optional(),
    notes: z.string().optional(),
}).passthrough().optional();

// --- Construct data (plan or construct) ---

const constructData = z.object({
    elements: z.array(element).optional(),
    forces: z.array(force).optional(),
    rods: z.array(rod).optional(),
    notes: z.array(note).optional(),
    boneGraft: boneGraft,
}).passthrough().optional();

// --- Top-level v4 schema ---

export const v4Schema = z.object({
    schema: z.object({
        format: z.literal('spinal-instrumentation'),
        version: z.literal(4),
    }).passthrough(),
    document: z.object({
        id: z.string(),
        created: z.string(),
        modified: z.string().optional(),
        language: z.string().optional(),
    }).passthrough().optional(),
    patient: z.object({
        name: z.string().optional(),
        identifier: z.string().optional(),
    }).passthrough().optional(),
    case: z.object({
        date: z.string().optional(),
        surgeon: z.string().optional(),
        location: z.string().optional(),
    }).passthrough().optional(),
    implantSystem: z.object({
        manufacturer: z.string().optional(),
        system: z.string().optional(),
    }).passthrough().optional(),
    plan: constructData,
    construct: constructData,
    ui: z.object({
        viewMode: z.string().optional(),
        colourScheme: z.string().optional(),
        notePositions: z.record(z.string(), z.any()).optional(),
    }).passthrough().optional(),
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
