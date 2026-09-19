/**
 * Structured filters: the authoritative part of retrieval. Nutrition,
 * dietary status, allergens, categories and tiers are enforced here in SQL,
 * never inferred from text or embeddings. Every retrieval strategy applies
 * the same clause, so strategies differ only in how they rank.
 *
 * Unknown never passes:
 *   - a nutrition bound excludes products whose value is missing;
 *   - a dietary requirement needs a claim (or, under 'claims_or_inferred', an inference of "yes");
 *   - an allergen exclusion needs allergen information, and excludes "may contain" too.
 */
import type { Allergen } from '../contract/allergens.js';
import type { DietaryPolicy } from '../contract/dietary.js';

export type RetrievalFilters = {
    minProteinG100?: number;
    maxKcal100?: number;
    maxSaltG100?: number;
    maxSugarsG100?: number;
    maxFatG100?: number;
    maxSaturatesG100?: number;
    minFibreG100?: number;
    dietary?: { vegan?: boolean; vegetarian?: boolean; glutenFree?: boolean; policy?: DietaryPolicy };
    /**
     * Products that could contain any of these are excluded. Conservative: a
     * product passes only if its allergen status is known ("listed" or
     * "none_listed"), none of the allergens is declared or in "may contain",
     * and it has no unrecognised allergen terms. "none_listed" still carries
     * the caveat that the source listed none; it is not a guarantee.
     */
    excludeAllergens?: Allergen[];
    /** Canonical category ids; a product must have at least one. */
    categories?: string[];
    tiers?: ('A' | 'B' | 'C')[];
};

const BOUNDS: [keyof RetrievalFilters, string, '>=' | '<='][] = [
    ['minProteinG100', 'protein_g_100', '>='],
    ['maxKcal100', 'energy_kcal_100', '<='],
    ['maxSaltG100', 'salt_g_100', '<='],
    ['maxSugarsG100', 'sugars_g_100', '<='],
    ['maxFatG100', 'fat_g_100', '<='],
    ['maxSaturatesG100', 'saturates_g_100', '<='],
    ['minFibreG100', 'fibre_g_100', '>='],
];

/**
 * SQL conditions on a `product` row aliased `alias`, appending bound
 * parameters to `params`. Column names come from the fixed table above.
 */
export function filterConditions(filters: RetrievalFilters | undefined, params: unknown[], alias = 'p'): string[] {
    if (!filters) return [];
    const where: string[] = [];
    const bind = (value: unknown) => {
        params.push(value);
        return `$${params.length}`;
    };
    for (const [key, column, op] of BOUNDS) {
        const value = filters[key];
        if (value === undefined) continue;
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a finite number`);
        where.push(`${alias}.${column} ${op} ${bind(value)}`);
    }

    const dietary = filters.dietary;
    if (dietary) {
        const inferred = (dietary.policy ?? 'claims_or_inferred') === 'claims_or_inferred';
        if (dietary.vegan) {
            where.push(`('vegan' = ANY(${alias}.dietary_claims)${inferred ? ` OR ${alias}.inferred_vegan = 'yes'` : ''})`);
        }
        if (dietary.vegetarian) {
            where.push(`('vegetarian' = ANY(${alias}.dietary_claims) OR 'vegan' = ANY(${alias}.dietary_claims)`
                + `${inferred ? ` OR ${alias}.inferred_vegetarian = 'yes' OR ${alias}.inferred_vegan = 'yes'` : ''})`);
        }
        // Gluten-free cannot be inferred from ingredients: claims only, whatever the policy.
        if (dietary.glutenFree) where.push(`'gluten_free' = ANY(${alias}.dietary_claims)`);
    }

    if (filters.excludeAllergens?.length) {
        const list = bind(filters.excludeAllergens);
        where.push(`${alias}.allergen_status <> 'unknown'`
            + ` AND NOT (${alias}.allergens_contains && ${list}::text[])`
            + ` AND NOT (${alias}.allergens_may_contain && ${list}::text[])`
            + ` AND cardinality(${alias}.allergens_unrecognised) = 0`);
    }

    if (filters.categories?.length) {
        where.push(`EXISTS (SELECT 1 FROM product_category fc WHERE fc.barcode = ${alias}.barcode AND fc.category_id = ANY(${bind(filters.categories)}::text[]))`);
    }
    if (filters.tiers?.length) where.push(`${alias}.quality_tier = ANY(${bind(filters.tiers)}::text[])`);
    return where;
}
