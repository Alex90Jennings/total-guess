/**
 * Nutrition as numbers, so filters like "protein >= 20 g per 100 g" are plain
 * comparisons. Missing values are null, never 0, and a comparison against a
 * missing value is `null` (unknown), never a pass.
 */
import { z } from 'zod';

export const NUTRIENTS = ['energyKcal', 'fatG', 'saturatesG', 'carbohydrateG', 'sugarsG', 'fibreG', 'proteinG', 'saltG'] as const;
export type Nutrient = (typeof NUTRIENTS)[number];

/** The seven values a UK front-of-pack/back-of-pack label must give (fibre is optional). */
export const UK_LABEL_NUTRIENTS = ['energyKcal', 'fatG', 'saturatesG', 'carbohydrateG', 'sugarsG', 'proteinG', 'saltG'] as const satisfies readonly Nutrient[];

const value = z.number().finite().nonnegative().nullable();

export const RawNutritionTableSchema = z.strictObject({
    columns: z.array(z.string()),
    rows: z.array(z.strictObject({ label: z.string().min(1), values: z.array(z.string()) })).min(1),
});
export type RawNutritionTable = z.infer<typeof RawNutritionTableSchema>;

export const NutritionDataSchema = z
    .strictObject({
        /** What the numbers are per. */
        per: z.enum(['100g', '100ml']),
        values: z.strictObject({
            energyKcal: value, fatG: value, saturatesG: value, carbohydrateG: value,
            sugarsG: value, fibreG: value, proteinG: value, saltG: value,
        }),
        /** Values we calculated deterministically rather than read (e.g. kcal from kJ). */
        derived: z.array(z.enum(NUTRIENTS)),
        /** The source's own table, when it gave one as text. */
        raw: RawNutritionTableSchema.nullable(),
    })
    .refine((n) => n.derived.every((k) => n.values[k] !== null), { message: 'a derived value cannot be null', path: ['derived'] })
    .refine((n) => n.values.saturatesG === null || n.values.fatG === null || n.values.saturatesG <= n.values.fatG + 1e-9,
        { message: 'saturates cannot exceed fat', path: ['values', 'saturatesG'] })
    .refine((n) => n.values.sugarsG === null || n.values.carbohydrateG === null || n.values.sugarsG <= n.values.carbohydrateG + 1e-9,
        { message: 'sugars cannot exceed carbohydrate', path: ['values', 'sugarsG'] });
export type NutritionData = z.infer<typeof NutritionDataSchema>;

export function hasCompleteLabelNutrition(nutrition: NutritionData | null): boolean {
    return nutrition !== null && UK_LABEL_NUTRIENTS.every((k) => nutrition.values[k] !== null);
}

export type Comparison = '<' | '<=' | '>=' | '>';

/** true / false, or null when the value (or the whole panel) is missing. */
export function compareNutrient(nutrition: NutritionData | null, nutrient: Nutrient, op: Comparison, threshold: number): boolean | null {
    const v = nutrition?.values[nutrient];
    if (v === null || v === undefined) return null;
    switch (op) {
        case '<': return v < threshold;
        case '<=': return v <= threshold;
        case '>=': return v >= threshold;
        case '>': return v > threshold;
    }
}

/** EU/UK labelling conversion factor. */
export const KJ_PER_KCAL = 4.184;
