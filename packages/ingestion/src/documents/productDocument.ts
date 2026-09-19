/**
 * The text a product is embedded as, and the hash that decides when it needs
 * re-embedding.
 *
 * Built from ProductDetails only. Prices, retailers, stores, timestamps,
 * provenance and image URLs live elsewhere (PriceObservation, Provenance,
 * ProductImage) and cannot reach the hash, so a new price observation never
 * triggers a re-embed. Barcodes are left out too: they identify a product but
 * mean nothing to a semantic search.
 *
 * Bump DOCUMENT_VERSION whenever the layout changes, so every product is
 * deliberately re-embedded once rather than drifting.
 */
import { createHash } from 'node:crypto';
import type { Allergen } from '../contract/allergens.js';
import { categoryLabel } from '../contract/categories.js';
import type { DietaryData } from '../contract/dietary.js';
import type { NutritionData } from '../contract/nutrition.js';
import type { ProductDetails } from '../contract/product.js';
import type { ProductQuantity } from '../contract/quantity.js';

export const DOCUMENT_VERSION = 2;

function describeQuantity(q: ProductQuantity): string {
    const amount = `${q.total} ${q.unit}`;
    if (q.kind === 'count') return q.packCount > 1 ? `${amount} (${q.packCount} x ${q.perPack})` : amount;
    const pack = q.packCount > 1 ? ` (${q.packCount} x ${q.perPack} ${q.unit})` : '';
    const variable = q.kind === 'mass' && q.variableWeight ? `, sold by weight (${q.variableWeight.min}-${q.variableWeight.max} g)` : '';
    return `${amount}${pack}${variable}`;
}

const LABEL: Record<string, string> = { vegan: 'vegan', vegetarian: 'vegetarian', gluten_free: 'gluten free' };

function describeDietary(d: DietaryData): string | null {
    const parts = [...d.claims].sort().map((c) => `${LABEL[c]} (labelled)`);
    for (const diet of ['vegan', 'vegetarian'] as const) {
        if (d.claims.includes(diet) || (diet === 'vegetarian' && d.claims.includes('vegan'))) continue;
        const status = d.inferred[diet];
        if (status === 'yes') parts.push(`${diet} (from ingredients)`);
        if (status === 'no') parts.push(`not ${diet} (from ingredients)`);
        if (status === 'maybe') parts.push(`possibly ${diet} (from ingredients)`);
    }
    return parts.length ? parts.join(', ') : null;
}

const allergenText = (list: Allergen[]) => [...list].sort().map((a) => a.replace('_', ' ')).join(', ');

function describeNutrition(n: NutritionData): string | null {
    const v = n.values;
    const parts = [
        v.energyKcal !== null ? `${v.energyKcal} kcal` : null,
        v.proteinG !== null ? `protein ${v.proteinG} g` : null,
        v.fatG !== null ? `fat ${v.fatG} g` : null,
        v.saturatesG !== null ? `saturates ${v.saturatesG} g` : null,
        v.carbohydrateG !== null ? `carbohydrate ${v.carbohydrateG} g` : null,
        v.sugarsG !== null ? `sugars ${v.sugarsG} g` : null,
        v.fibreG !== null ? `fibre ${v.fibreG} g` : null,
        v.saltG !== null ? `salt ${v.saltG} g` : null,
    ].filter((p): p is string => p !== null);
    return parts.length ? `per ${n.per}: ${parts.join(', ')}` : null;
}

export function buildProductDocument(product: ProductDetails): string {
    const lines: [string, string | null][] = [
        ['Product', product.name],
        ['Brand', product.brand],
        ['Size', product.quantity ? describeQuantity(product.quantity) : null],
        ['Category', product.categories.canonical.length ? product.categories.canonical.map(categoryLabel).join(' > ') : null],
        ['Dietary', describeDietary(product.dietary)],
        ['Contains', product.allergens.contains.length ? allergenText(product.allergens.contains) : null],
        ['May contain', product.allergens.mayContain.length ? allergenText(product.allergens.mayContain) : null],
        ['Nutrition', product.nutrition ? describeNutrition(product.nutrition) : null],
        ['Description', product.description],
        ['Ingredients', product.ingredients],
    ];
    return lines
        .filter((line): line is [string, string] => line[1] !== null)
        .map(([label, value]) => `${label}: ${value.replace(/\s+/g, ' ').trim()}`)
        .join('\n');
}

export function productTextHash(product: ProductDetails): string {
    return createHash('sha256')
        .update(`product-document-v${DOCUMENT_VERSION}\n${buildProductDocument(product)}`)
        .digest('hex');
}
