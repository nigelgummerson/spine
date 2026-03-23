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
// Matches: Oc, C1-C7, T1-T12, L1-L5, S1-S5, Pelvis
const levelPattern = /^(Oc|C[1-7]|T([1-9]|1[0-2])|L[1-5]|S[1-5]|Pelvis)$/;
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

const elementType = z.enum(['screw', 'hook', 'fixation', 'cage', 'osteotomy', 'connector']);

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

// --- Validate ---

export function validateV4(json: unknown): V4Document {
    const result = v4Schema.safeParse(json);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}
