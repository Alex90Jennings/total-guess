/**
 * Open Food Facts product -> ProductRecord.
 *
 * Accepts both shapes OFF publishes: API responses (image_front_url, and
 * images keyed "front_en") and the nightly dump (images.selected /
 * images.uploaded, from which image URLs are built).
 *
 * Data: ODbL (database) / DbCL (contents). Images: CC BY-SA, credited to the
 * uploader where OFF names one. Only English text is used: other-language
 * ingredients are left null rather than presented as English.
 */
import { z } from 'zod';
import {
    buildAllergenData, makeQuantity, NO_DIETARY_INFORMATION, NutritionDataSchema, ProductRecordSchema, provenanceFor,
    toBarcode, validate, CategoryIdSchema, DATA_SOURCES, KJ_PER_KCAL,
    type DietaryClaim, type DietaryData, type Inference, type Nutrient, type NutritionData, type ParseResult,
    type ProductImage, type ProductQuantity, type ProductRecord,
} from '../../contract/index.js';
import { parseQuantity } from '../../normalise/quantity.js';
import { cleanText } from '../../normalise/text.js';

const tags = z.array(z.string()).nullish();

export const OffProductSchema = z.object({
    code: z.string(),
    product_type: z.string().nullish(),
    lang: z.string().nullish(),
    product_name: z.string().nullish(),
    product_name_en: z.string().nullish(),
    generic_name: z.string().nullish(),
    generic_name_en: z.string().nullish(),
    brands: z.string().nullish(),
    quantity: z.string().nullish(),
    product_quantity: z.union([z.number(), z.string()]).nullish(),
    product_quantity_unit: z.string().nullish(),
    categories_hierarchy: tags,
    categories_tags: tags,
    /** OFF's newer nutrition schema: nutrition.aggregated_set.{per, preparation, nutrients}. */
    nutrition: z.record(z.string(), z.unknown()).nullish(),
    ingredients_text: z.string().nullish(),
    ingredients_text_en: z.string().nullish(),
    allergens_tags: tags,
    traces_tags: tags,
    labels_tags: tags,
    ingredients_analysis_tags: tags,
    nutriments: z.record(z.string(), z.unknown()).nullish(),
    nutrition_data_per: z.string().nullish(),
    image_front_url: z.string().nullish(),
    image_ingredients_url: z.string().nullish(),
    image_nutrition_url: z.string().nullish(),
    /** Present only when requested; used to credit image uploaders. */
    images: z.record(z.string(), z.unknown()).nullish(),
    last_modified_t: z.number().nullish(),
});
export type OffProduct = z.infer<typeof OffProductSchema>;

export type OffContext = { importedAt: string };

/** Bump whenever mapping logic changes; stored on source_record so stale rows can be found and replayed. */
export const OFF_MAPPER_VERSION = 3; // v2: new nutrition schema, English-only categories; v3: lowercase taxonomy ids only

/** Placeholder categories that carry no meaning. */
const JUNK_CATEGORIES = new Set(['en:null', 'en:undefined', 'en:unknown']);

/** OFF nutriment keys (per 100 g/ml) -> our nutrients. */
const NUTRIMENT_KEYS: Record<Nutrient, string> = {
    energyKcal: 'energy-kcal_100g',
    fatG: 'fat_100g',
    saturatesG: 'saturated-fat_100g',
    carbohydrateG: 'carbohydrates_100g',
    sugarsG: 'sugars_100g',
    fibreG: 'fiber_100g',
    proteinG: 'proteins_100g',
    saltG: 'salt_100g',
};

const CLAIM_LABELS: Record<string, DietaryClaim> = {
    'en:vegan': 'vegan',
    'en:vegetarian': 'vegetarian',
    'en:gluten-free': 'gluten_free',
    'en:no-gluten': 'gluten_free',
};

function number(raw: unknown): number | null {
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

function quantityFrom(off: OffProduct, warnings: string[]): ProductQuantity | null {
    const text = off.quantity?.trim();
    if (text) {
        // European decimal commas ("1,5 L") are common in OFF.
        const parsed = parseQuantity(text.replace(/(\d),(\d)/g, '$1.$2'));
        if (parsed) return { ...parsed, raw: text };
    }
    const amount = number(off.product_quantity);
    const unit = off.product_quantity_unit?.toLowerCase();
    if (amount && (unit === 'g' || unit === 'ml')) {
        return makeQuantity({ kind: unit === 'g' ? 'mass' : 'volume', perPack: amount, packCount: 1, raw: text || `${amount} ${unit}` });
    }
    warnings.push(text ? `quantity_unparsed: "${text}"` : 'quantity_missing');
    return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Our nutrients -> keys in nutrition.aggregated_set.nutrients, with the only unit accepted for each. */
const AGGREGATED: Record<Nutrient, [string, string]> = {
    energyKcal: ['energy-kcal', 'kcal'], fatG: ['fat', 'g'], saturatesG: ['saturated-fat', 'g'], carbohydrateG: ['carbohydrates', 'g'],
    sugarsG: ['sugars', 'g'], fibreG: ['fiber', 'g'], proteinG: ['proteins', 'g'], saltG: ['salt', 'g'],
};

/**
 * The newer schema. Only declared values in the expected unit are read;
 * bounds ("<0.5") and OFF's own estimates stay null rather than becoming numbers.
 */
function aggregatedNutrition(off: OffProduct, warnings: string[]): NutritionData | null | undefined {
    const set = isObject(off.nutrition?.aggregated_set) ? off.nutrition.aggregated_set : null;
    if (!set || !isObject(set.nutrients)) return undefined;
    if (set.preparation !== 'as_sold' || (set.per !== '100g' && set.per !== '100ml')) {
        warnings.push(`nutrition_not_per_100_as_sold: ${String(set.per)}/${String(set.preparation)}`);
        return null;
    }
    const nutrients = set.nutrients;
    const read = (key: string, unit: string): number | null => {
        const n = nutrients[key];
        if (!isObject(n) || n.unit !== unit || n.source === 'estimate') return null;
        if (n.modifier !== undefined && n.modifier !== '~') return null;
        return number(n.value);
    };
    const values = Object.fromEntries(
        Object.entries(AGGREGATED).map(([nutrient, [key, unit]]) => [nutrient, read(key, unit)]),
    ) as NutritionData['values'];
    const derived: Nutrient[] = [];
    const kj = read('energy-kj', 'kJ');
    if (values.energyKcal === null && kj !== null) {
        values.energyKcal = Math.round((kj / KJ_PER_KCAL) * 10) / 10;
        derived.push('energyKcal');
    }
    return checkedNutrition({ per: set.per, values, derived, raw: null }, warnings);
}

function checkedNutrition(nutrition: NutritionData, warnings: string[]): NutritionData | null {
    if (Object.values(nutrition.values).every((v) => v === null)) return null;
    const checked = NutritionDataSchema.safeParse(nutrition);
    if (!checked.success) {
        warnings.push(`nutrition_inconsistent: ${checked.error.issues.map((i) => i.message).join('; ')}`);
        return null;
    }
    return nutrition;
}

function nutritionFrom(off: OffProduct, quantity: ProductQuantity | null, warnings: string[]): NutritionData | null {
    const aggregated = aggregatedNutrition(off, warnings);
    if (aggregated !== undefined) return aggregated;
    if (off.nutrition_data_per === 'serving') {
        warnings.push('nutrition_per_serving_only');
        return null;
    }
    const values = Object.fromEntries(
        Object.entries(NUTRIMENT_KEYS).map(([nutrient, key]) => [nutrient, number(off.nutriments?.[key])]),
    ) as NutritionData['values'];
    const derived: Nutrient[] = [];
    const kj = number(off.nutriments?.['energy-kj_100g']);
    if (values.energyKcal === null && kj !== null) {
        // Labels print whole kcal; 0.1 kcal keeps the conversion free of float noise (418.4 kJ -> 100).
        values.energyKcal = Math.round((kj / KJ_PER_KCAL) * 10) / 10;
        derived.push('energyKcal');
    }
    // The older schema does not say whether values are per 100 g or 100 ml; drinks are measured by volume.
    return checkedNutrition({ per: quantity?.kind === 'volume' ? '100ml' : '100g', values, derived, raw: null }, warnings);
}

/** OFF's ingredient analysis ("en:vegan", "en:maybe-vegetarian", "en:non-vegan"...). */
function inferenceFrom(analysis: string[], diet: 'vegan' | 'vegetarian'): Inference {
    if (analysis.includes(`en:${diet}`)) return 'yes';
    if (analysis.includes(`en:non-${diet}`)) return 'no';
    if (analysis.includes(`en:maybe-${diet}`)) return 'maybe';
    return 'unknown';
}

function dietaryFrom(off: OffProduct, hasIngredients: boolean): DietaryData {
    const claims = [...new Set((off.labels_tags ?? []).map((t) => CLAIM_LABELS[t]).filter((c): c is DietaryClaim => !!c))];
    const analysis = hasIngredients ? off.ingredients_analysis_tags ?? [] : [];
    const vegan = inferenceFrom(analysis, 'vegan');
    const vegetarian = inferenceFrom(analysis, 'vegetarian');
    const inferred = vegan === 'unknown' && vegetarian === 'unknown'
        ? NO_DIETARY_INFORMATION.inferred
        : { vegan, vegetarian, by: 'open_food_facts' as const };
    return { claims, inferred };
}

type ImageRole = 'front' | 'ingredients' | 'nutrition';

/**
 * OFF's image folder: the code padded to 13 digits, then split 3/3/3/rest:
 * "5025125000006" -> "502/512/500/0006", "01318180" -> "000/000/131/8180".
 * Checked against 300 URLs returned by the OFF API.
 */
export function offImageFolder(code: string): string {
    return code.padStart(13, '0').replace(/^(\d{3})(\d{3})(\d{3})(\d+)$/, '$1/$2/$3/$4');
}

/** The 400px rendition of a selected image. */
export function offImageUrl(code: string, role: ImageRole, lang: string, rev: string): string {
    return `https://images.openfoodfacts.org/images/products/${offImageFolder(code)}/${role}_${lang}.${rev}.400.jpg`;
}

/** Dump shape: images.selected[role][lang] = {imgid, rev}; images.uploaded[imgid].uploader. */
function dumpImage(off: OffProduct, role: ImageRole): { url: string; uploader: string | null } | null {
    const selected = isObject(off.images?.selected) ? off.images.selected : null;
    const byLang = selected && isObject(selected[role]) ? selected[role] : null;
    if (!byLang) return null;
    const lang = ['en', off.lang ?? 'en', ...Object.keys(byLang)].find((l) => isObject(byLang[l]));
    const entry = lang ? byLang[lang] : undefined;
    if (!lang || !isObject(entry) || entry.imgid === undefined || entry.rev === undefined) return null;
    const uploaded = isObject(off.images?.uploaded) ? off.images.uploaded : {};
    const upload = uploaded[String(entry.imgid)];
    const uploader = isObject(upload) && typeof upload.uploader === 'string' && upload.uploader ? upload.uploader : null;
    return { url: offImageUrl(off.code, role, lang, String(entry.rev)), uploader };
}

/** API shape: images["front_en"].imgid -> images[imgid].uploader */
function apiUploader(off: OffProduct, role: ImageRole): string | null {
    const images = off.images ?? {};
    const selected = images[`${role}_${off.lang ?? 'en'}`] ?? images[`${role}_en`];
    const imgid = (selected as { imgid?: unknown } | undefined)?.imgid;
    const uploader = imgid !== undefined ? (images[String(imgid)] as { uploader?: unknown } | undefined)?.uploader : undefined;
    return typeof uploader === 'string' && uploader ? uploader : null;
}

function imagesFrom(off: OffProduct, pageUrl: string): ProductImage[] {
    const apiUrls: Record<ImageRole, string | null | undefined> = {
        front: off.image_front_url, ingredients: off.image_ingredients_url, nutrition: off.image_nutrition_url,
    };
    return (['front', 'ingredients', 'nutrition'] as const).flatMap((role): ProductImage[] => {
        const api = apiUrls[role];
        const found = api?.startsWith('https://') ? { url: api, uploader: apiUploader(off, role) } : dumpImage(off, role);
        if (!found) return [];
        return [{
            url: found.url,
            role,
            source: 'open_food_facts',
            licence: DATA_SOURCES.open_food_facts.imageLicence,
            attribution: found.uploader ? `Photo by ${found.uploader}, Open Food Facts` : 'Photo: Open Food Facts contributors',
            contributor: found.uploader,
            sourcePageUrl: pageUrl,
        }];
    });
}

export function mapOffProduct(input: unknown, context: OffContext): ParseResult<ProductRecord> {
    const warnings: string[] = [];
    const parsed = OffProductSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings };
    }
    const off = parsed.data;
    const barcode = toBarcode(off.code);
    if (barcode.barcode === null) return { ok: false, errors: [barcode.reason], warnings };
    if (off.product_type && off.product_type !== 'food') return { ok: false, errors: [`not a food product (${off.product_type})`], warnings };

    const english = off.lang === 'en';
    const pageUrl = `https://world.openfoodfacts.org/product/${off.code}`;
    const ingredients = cleanText(off.ingredients_text_en) ?? (english ? cleanText(off.ingredients_text) : null);
    if (!ingredients && off.ingredients_text) warnings.push('ingredients_not_in_english');
    const hasIngredientInformation = Boolean(off.ingredients_text || off.ingredients_text_en);
    const quantity = quantityFrom(off, warnings);

    // Only English taxonomy ids are canonical. "fr:pates-a-tartiner" is untranslated text, and taxonomy ids
    // are always lowercase, so "en:Groceries" is a contributor's free-text tag that OFF did not recognise.
    const categories = (off.categories_hierarchy ?? off.categories_tags ?? [])
        .filter((id) => id.startsWith('en:') && id === id.toLowerCase() && !JUNK_CATEGORIES.has(id) && CategoryIdSchema.safeParse(id).success);
    const record: ProductRecord = {
        product: {
            barcode: barcode.barcode,
            name: cleanText(off.product_name_en) ?? cleanText(off.product_name) ?? '',
            brand: cleanText(off.brands?.split(',')[0]),
            quantity,
            categories: { canonical: categories },
            description: cleanText(off.generic_name_en) ?? (english ? cleanText(off.generic_name) : null),
            ingredients,
            allergens: buildAllergenData(off.allergens_tags ?? [], off.traces_tags ?? [], hasIngredientInformation),
            dietary: dietaryFrom(off, hasIngredientInformation),
            nutrition: nutritionFrom(off, quantity, warnings),
            images: imagesFrom(off, pageUrl),
        },
        provenance: provenanceFor('open_food_facts', {
            sourceRecordId: off.code,
            sourceUrl: pageUrl,
            importedAt: context.importedAt,
            sourceUpdatedAt: off.last_modified_t ? new Date(off.last_modified_t * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z') : null,
        }),
    };
    return validate(ProductRecordSchema, record, warnings);
}
