/**
 * Dietary information, keeping two kinds of evidence apart:
 *
 *   claims    what the packaging/source explicitly states ("Suitable for vegans")
 *   inferred  a deterministic reading of the ingredient list, with who did it
 *
 * They can disagree, and both are kept. Queries choose a policy explicitly
 * (dietaryMatch), so "vegetarian: true" never hides which kind it was.
 * Gluten-free is claim-only: it cannot be inferred from ingredients.
 */
import { z } from 'zod';
import { DataSourceIdSchema } from './dataSource.js';

export const DIETARY_CLAIMS = ['vegan', 'vegetarian', 'gluten_free'] as const;
export const DietaryClaimSchema = z.enum(DIETARY_CLAIMS);
export type DietaryClaim = z.infer<typeof DietaryClaimSchema>;

/** yes / no / maybe (ingredients ambiguous) / unknown (no ingredients, or not analysed). */
export const InferenceSchema = z.enum(['yes', 'no', 'maybe', 'unknown']);
export type Inference = z.infer<typeof InferenceSchema>;

export const DietaryDataSchema = z.strictObject({
    claims: z.array(DietaryClaimSchema),
    inferred: z.strictObject({
        vegan: InferenceSchema,
        vegetarian: InferenceSchema,
        /** Who produced the inference; null when nothing was inferred. */
        by: DataSourceIdSchema.nullable(),
    }).refine((i) => i.by !== null || (i.vegan === 'unknown' && i.vegetarian === 'unknown'), {
        message: 'an inference must say who made it', path: ['by'],
    }),
});
export type DietaryData = z.infer<typeof DietaryDataSchema>;

export const NO_DIETARY_INFORMATION: DietaryData = {
    claims: [],
    inferred: { vegan: 'unknown', vegetarian: 'unknown', by: null },
};

export type DietaryPolicy = 'claims_only' | 'claims_or_inferred';

/**
 * Does the product meet a dietary requirement? 'yes' only with evidence, and
 * 'unknown' is never treated as 'yes'. An explicit claim always wins; under
 * 'claims_or_inferred', the inference decides only when there is no claim.
 * Conflicts stay visible in the data (claims and inferred are both stored).
 */
export function dietaryMatch(dietary: DietaryData, requirement: DietaryClaim, policy: DietaryPolicy): 'yes' | 'no' | 'unknown' {
    if (dietary.claims.includes(requirement)) return 'yes';
    // Vegan products are vegetarian by definition.
    if (requirement === 'vegetarian' && dietary.claims.includes('vegan')) return 'yes';
    if (policy === 'claims_only' || requirement === 'gluten_free') return 'unknown';
    const inferred = dietary.inferred[requirement];
    return inferred === 'yes' ? 'yes' : inferred === 'no' ? 'no' : 'unknown';
}
