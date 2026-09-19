/**
 * Candidate gates and quality tiers for Open Food Facts records.
 *
 * Gates decide whether a record can be a catalogue product at all. Tiers
 * decide whether it is good enough for the initial AI/retrieval corpus.
 * Every outcome carries machine-readable reason codes.
 *
 *   Tier A  strong retrieval candidate: every check below passes
 *   Tier B  useful but incomplete: English name, quantity, displayable front
 *           image, a useful category, and either English ingredients or
 *           energy + protein
 *   Tier C  valid product, too incomplete for the initial corpus
 */
import { hasCompleteLabelNutrition, toBarcode, type ProductRecord } from '../../contract/index.js';

export const GATE_CODES = ['not_food', 'obsolete', 'invalid_gtin', 'restricted_gtin', 'mapper_rejected', 'duplicate_gtin'] as const;
export type GateCode = (typeof GATE_CODES)[number];

export const QUALITY_CHECKS = [
    'english_name',
    'quantity',
    'front_image',
    'english_ingredients',
    'complete_nutrition',
    'nutrition_consistent',
    'useful_category',
] as const;
export type QualityCheck = (typeof QUALITY_CHECKS)[number];
export type Tier = 'A' | 'B' | 'C';

type Raw = Record<string, unknown>;

/** Gate failures that can be decided from the raw record, before mapping. */
export function gateRecord(raw: Raw): GateCode | null {
    if (typeof raw.product_type === 'string' && raw.product_type !== 'food') return 'not_food';
    if (raw.obsolete === true || raw.obsolete === 'on' || raw.obsolete === 1) return 'obsolete';
    const barcode = toBarcode(typeof raw.code === 'string' ? raw.code : null);
    if (barcode.barcode === null) return barcode.reason.startsWith('restricted') ? 'restricted_gtin' : 'invalid_gtin';
    return null;
}

/** OFF data-quality errors that mean the nutrition numbers contradict each other. */
function hasNutritionQualityError(raw: Raw): boolean {
    const tags = Array.isArray(raw.data_quality_errors_tags) ? raw.data_quality_errors_tags : [];
    return tags.some((t) => typeof t === 'string' && /nutrition|energy|nutrient|sugars|saturated|salt|protein|fat|carbohydrate/.test(t));
}

export type Assessment = { tier: Tier; passed: QualityCheck[]; failed: QualityCheck[] };

export function assessQuality(raw: Raw, record: ProductRecord): Assessment {
    const p = record.product;
    const checks: Record<QualityCheck, boolean> = {
        // The mapper falls back to the main-language name; only an English one counts here.
        english_name: typeof raw.product_name_en === 'string' && raw.product_name_en.trim() !== ''
            || (raw.lang === 'en' && typeof raw.product_name === 'string' && raw.product_name.trim() !== ''),
        quantity: p.quantity !== null,
        front_image: p.images.some((i) => i.role === 'front' && i.licence !== null && i.attribution !== null),
        english_ingredients: p.ingredients !== null,
        complete_nutrition: hasCompleteLabelNutrition(p.nutrition),
        nutrition_consistent: p.nutrition !== null && !hasNutritionQualityError(raw),
        // A top-level group alone ("plant based foods") says little; require a more specific entry.
        useful_category: p.categories.canonical.length >= 2,
    };
    const passed = QUALITY_CHECKS.filter((c) => checks[c]);
    const failed = QUALITY_CHECKS.filter((c) => !checks[c]);

    const hasEnergyAndProtein = p.nutrition?.values.energyKcal != null && p.nutrition.values.proteinG != null;
    const tier: Tier = failed.length === 0
        ? 'A'
        : checks.english_name && checks.quantity && checks.front_image && checks.useful_category
            && (checks.english_ingredients || hasEnergyAndProtein)
            ? 'B'
            : 'C';
    return { tier, passed, failed };
}
