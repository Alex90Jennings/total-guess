/**
 * Lexical product search and deterministic nutrition filters.
 *
 * This is the baseline later vector and hybrid retrieval will be measured
 * against. Ranking is PostgreSQL's ts_rank_cd over a weighted tsvector:
 * name (A) > brand and categories (B) > description (C) > ingredients (D).
 *
 * Nutrition constraints are plain SQL comparisons. A missing value is NULL,
 * and NULL >= 20 is not true, so products without the value never match;
 * the same rule as compareNutrient in the contract.
 */
import type { Nutrient } from '../contract/nutrition.js';
import type { Db } from './client.js';
import type { Tier } from './catalogueRepository.js';

export const NUTRIENT_COLUMN: Record<Nutrient, string> = {
    energyKcal: 'energy_kcal_100', fatG: 'fat_g_100', saturatesG: 'saturates_g_100', carbohydrateG: 'carbohydrate_g_100',
    sugarsG: 'sugars_g_100', fibreG: 'fibre_g_100', proteinG: 'protein_g_100', saltG: 'salt_g_100',
};
const OPERATORS = { '<': '<', '<=': '<=', '>=': '>=', '>': '>' } as const;

export type NutritionConstraint = { nutrient: Nutrient; op: keyof typeof OPERATORS; value: number };

export type ProductFilters = {
    tiers?: Tier[];
    nutrition?: NutritionConstraint[];
    /** Canonical category id, e.g. "en:breakfast-cereals". */
    category?: string;
    limit?: number;
};

export type SearchHit = {
    barcode: string;
    name: string;
    brand: string | null;
    quantity: string | null;
    tier: Tier;
    rank: number;
};

/** Builds WHERE clauses with bound parameters; column and operator names come from fixed tables, never input. */
function filterSql(filters: ProductFilters, params: unknown[]): string[] {
    const where: string[] = [];
    if (filters.tiers?.length) {
        params.push(filters.tiers);
        where.push(`p.quality_tier = ANY($${params.length}::text[])`);
    }
    for (const c of filters.nutrition ?? []) {
        const column = NUTRIENT_COLUMN[c.nutrient];
        const op = OPERATORS[c.op];
        if (!column || !op || !Number.isFinite(c.value)) throw new Error(`invalid nutrition constraint: ${JSON.stringify(c)}`);
        params.push(c.value);
        where.push(`p.${column} ${op} $${params.length}`);
    }
    if (filters.category) {
        params.push(filters.category);
        where.push(`EXISTS (SELECT 1 FROM product_category c WHERE c.barcode = p.barcode AND c.category_id = $${params.length})`);
    }
    return where;
}

const limitOf = (filters: ProductFilters) => Math.min(Math.max(Math.trunc(filters.limit ?? 10), 1), 100);

export async function searchProducts(db: Db, text: string, filters: ProductFilters = {}): Promise<SearchHit[]> {
    const params: unknown[] = [text];
    const where = ['p.search @@ q', ...filterSql(filters, params)];
    params.push(limitOf(filters));
    const { rows } = await db.query<{ barcode: string; name: string; brand: string | null; quantity_raw: string | null; quality_tier: Tier; rank: number }>(
        `SELECT p.barcode, p.name, p.brand, p.quantity_raw, p.quality_tier, ts_rank_cd(p.search, q) AS rank
         FROM product p, websearch_to_tsquery('english', $1) AS q
         WHERE ${where.join(' AND ')}
         ORDER BY rank DESC, p.barcode
         LIMIT $${params.length}`,
        params,
    );
    return rows.map((r) => ({ barcode: r.barcode, name: r.name, brand: r.brand, quantity: r.quantity_raw, tier: r.quality_tier, rank: Number(r.rank) }));
}

/** Products matching only structured filters (no text), e.g. protein >= 20 AND kcal <= 300. */
export async function filterProducts(db: Db, filters: ProductFilters): Promise<string[]> {
    const params: unknown[] = [];
    const where = filterSql(filters, params);
    params.push(limitOf(filters));
    const { rows } = await db.query<{ barcode: string }>(
        `SELECT p.barcode FROM product p ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY p.barcode LIMIT $${params.length}`,
        params,
    );
    return rows.map((r) => r.barcode);
}
