/**
 * The RetrievalPlan: everything the model is allowed to ask for.
 *
 * The model never writes SQL, never names a product id, never picks a filter
 * policy and never invents a number. It produces this structure; TypeScript
 * decides what it means. A plan that does not validate is rejected, repaired
 * once, and otherwise abandoned in favour of a deterministic fallback.
 *
 * The filter shape is flat (vegan/vegetarian as booleans, plain numeric
 * bounds) rather than mirroring RetrievalFilters, because policy choices —
 * claims vs inference, how "unknown" is treated — are ours to make, not the
 * model's to request. `toRetrievalFilters` performs that mapping.
 */
import { z } from 'zod';
import { AllergenSchema, type Allergen } from '../contract/allergens.js';
import type { RetrievalFilters } from '../retrieval/filters.js';
import { STRATEGIES } from '../retrieval/search.js';
import { explicitNumbers, thresholdsFor, type NutritionThreshold } from './thresholds.js';

export const PLAN_INTENTS = ['exact_product', 'category', 'similarity', 'ingredient', 'meal_use', 'discovery'] as const;
export type PlanIntent = (typeof PLAN_INTENTS)[number];

const bounded = (max: number) => z.number().finite().nonnegative().max(max);

export const planFiltersSchema = z.object({
    minProteinG100: bounded(100).optional(),
    maxKcal100: bounded(1000).optional(),
    maxSaltG100: bounded(100).optional(),
    maxSugarsG100: bounded(100).optional(),
    maxFatG100: bounded(100).optional(),
    minFibreG100: bounded(100).optional(),
    vegetarian: z.boolean().optional(),
    vegan: z.boolean().optional(),
    glutenFree: z.boolean().optional(),
    excludeAllergens: z.array(AllergenSchema).max(14).optional(),
}).strict();

export const retrievalPlanSchema = z.object({
    intent: z.enum(PLAN_INTENTS),
    /**
     * One search per distinct product type the request needs. Decomposition
     * lives here: "cheese for a toastie" is a search for cheese, not for
     * toasties, with the use recorded as the purpose.
     */
    searches: z.array(z.object({
        query: z.string().min(1).max(80),
        purpose: z.string().min(1).max(160),
    })).min(1).max(4),
    filters: planFiltersSchema.default({}),
    /** A suggestion. Deterministic routing decides unless routing is explicitly set to the model's choice. */
    strategy: z.enum(STRATEGIES).optional(),
    explanation: z.string().max(400).optional(),
}).strict();

export type RetrievalPlan = z.infer<typeof retrievalPlanSchema>;
export type PlanFilters = z.infer<typeof planFiltersSchema>;

/** The JSON Schema handed to the provider, so the model is constrained by the same definition that validates it. */
export const retrievalPlanJsonSchema = (): Record<string, unknown> =>
    z.toJSONSchema(retrievalPlanSchema, { io: 'input' }) as Record<string, unknown>;

/**
 * Numeric filters must come from the user's own words: a documented threshold
 * for a vague phrase, or a number they stated. Anything else the model
 * proposed is dropped and reported — a filter invented by the model would
 * silently exclude products for a reason nobody can justify.
 */
export type FilterAudit = {
    applied: RetrievalFilters;
    thresholdsUsed: NutritionThreshold[];
    /** Filters the model asked for that the user's request does not support. */
    dropped: { filter: string; value: number; reason: 'not_stated_by_user' }[];
    /** Filters whose value the model got wrong, corrected to the documented threshold. */
    corrected: { filter: string; from: number; to: number }[];
};

const NUMERIC_FILTERS = ['minProteinG100', 'maxKcal100', 'maxSaltG100', 'maxSugarsG100', 'maxFatG100', 'minFibreG100'] as const;

export function toRetrievalFilters(plan: RetrievalPlan, userQuery: string): FilterAudit {
    const thresholds = thresholdsFor(userQuery);
    const stated = explicitNumbers(userQuery);
    const applied: RetrievalFilters = {};
    const dropped: FilterAudit['dropped'] = [];
    const corrected: FilterAudit['corrected'] = [];

    for (const filter of NUMERIC_FILTERS) {
        const requested = plan.filters[filter];
        const threshold = thresholds.find((t) => t.filter === filter);
        const statedValue = stated[filter];
        if (statedValue !== undefined) {
            // The user gave a number: it wins, whatever the model proposed.
            applied[filter] = statedValue;
            if (requested !== undefined && requested !== statedValue) corrected.push({ filter, from: requested, to: statedValue });
        } else if (threshold) {
            applied[filter] = threshold.value;
            if (requested !== undefined && requested !== threshold.value) corrected.push({ filter, from: requested, to: threshold.value });
        } else if (requested !== undefined) {
            dropped.push({ filter, value: requested, reason: 'not_stated_by_user' });
        }
    }

    // Dietary policy is ours. Claims plus recorded inference for vegan/vegetarian;
    // gluten-free stays claim-only, because inferring it from an ingredient list is not safe.
    if (plan.filters.vegan || plan.filters.vegetarian || plan.filters.glutenFree) {
        applied.dietary = {
            ...(plan.filters.vegan ? { vegan: true } : {}),
            ...(plan.filters.vegetarian ? { vegetarian: true } : {}),
            ...(plan.filters.glutenFree ? { glutenFree: true } : {}),
            policy: 'claims_or_inferred',
        };
    }
    if (plan.filters.excludeAllergens?.length) {
        applied.excludeAllergens = [...new Set(plan.filters.excludeAllergens)] as Allergen[];
    }
    return { applied, thresholdsUsed: thresholds, dropped, corrected };
}
