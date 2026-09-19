/**
 * Open Food Facts nightly JSONL dump -> trimmed UK records.
 *
 * The dump (openfoodfacts-products.jsonl.gz, ~13 GB compressed, one product
 * per line, sorted by barcode) is streamed: never held in memory and never
 * written to disk whole. Only lines mentioning the UK are parsed, and each
 * kept record is trimmed to the fields the mapper reads. The trimmed record is
 * what source_record.payload stores, so products can be rebuilt without
 * downloading the dump again.
 *
 * Licence: ODbL (database), DbCL (contents), CC BY-SA (images).
 * https://world.openfoodfacts.org/data
 */
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';

export const OFF_DUMP_URL = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';

/** Bump when trimOffRecord keeps different fields; stored as source_record.payload_version. */
export const OFF_PAYLOAD_VERSION = 2; // v2: keeps nutrition.aggregated_set (schema 1004) and categories_tags

const UK_TAG = 'en:united-kingdom';

/** Nutriments the mapper reads (per 100 g/ml). */
const NUTRIMENT_KEYS = [
    'energy-kcal_100g', 'energy-kj_100g', 'fat_100g', 'saturated-fat_100g', 'carbohydrates_100g',
    'sugars_100g', 'fiber_100g', 'proteins_100g', 'salt_100g',
];

const SCALAR_FIELDS = [
    'code', 'product_type', 'lang', 'obsolete', 'product_name', 'product_name_en', 'generic_name', 'generic_name_en',
    'brands', 'quantity', 'product_quantity', 'product_quantity_unit', 'ingredients_text_en', 'nutrition_data_per',
    'last_modified_t', 'unique_scans_n', 'completeness', 'schema_version',
    // API-shaped image fields, kept if a record carries them.
    'image_front_url', 'image_ingredients_url', 'image_nutrition_url',
];

const TAG_FIELDS = [
    'categories_hierarchy', 'categories_tags', 'allergens_tags', 'traces_tags', 'labels_tags', 'ingredients_analysis_tags',
    'countries_tags', 'stores_tags', 'data_quality_errors_tags',
];

const IMAGE_ROLES = ['front', 'ingredients', 'nutrition'] as const;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Keeps only selected images (front/ingredients/nutrition) in English and the
 * product's own language, with just the ids and revisions needed to build
 * URLs, and the uploader of each image for attribution.
 */
function trimImages(images: unknown, lang: unknown): Json | undefined {
    if (!isObject(images) || !isObject(images.selected)) return undefined;
    const langs = new Set(['en', typeof lang === 'string' ? lang : 'en']);
    const selected: Json = {};
    const imgids = new Set<string>();
    for (const role of IMAGE_ROLES) {
        const byLang = images.selected[role];
        if (!isObject(byLang)) continue;
        const kept: Json = {};
        for (const l of langs) {
            const entry = byLang[l];
            if (isObject(entry) && entry.imgid !== undefined && entry.rev !== undefined) {
                kept[l] = { imgid: String(entry.imgid), rev: String(entry.rev) };
                imgids.add(String(entry.imgid));
            }
        }
        if (Object.keys(kept).length) selected[role] = kept;
    }
    if (!Object.keys(selected).length) return undefined;
    const uploaded: Json = {};
    const source = isObject(images.uploaded) ? images.uploaded : {};
    for (const id of imgids) {
        const entry = source[id];
        if (isObject(entry) && typeof entry.uploader === 'string') uploaded[id] = { uploader: entry.uploader };
    }
    return { selected, uploaded };
}

/** OFF's newer nutrition schema (schema_version >= 1003): nutrition.aggregated_set, with explicit units. */
const AGGREGATED_KEYS = ['energy-kcal', 'energy-kj', 'fat', 'saturated-fat', 'carbohydrates', 'sugars', 'fiber', 'proteins', 'salt'];

function trimAggregatedNutrition(nutrition: unknown): Json | undefined {
    const set = isObject(nutrition) && isObject(nutrition.aggregated_set) ? nutrition.aggregated_set : null;
    if (!set || !isObject(set.nutrients)) return undefined;
    const nutrients: Json = {};
    for (const key of AGGREGATED_KEYS) {
        const n = set.nutrients[key];
        if (!isObject(n)) continue;
        const kept: Json = {};
        for (const field of ['value', 'unit', 'modifier', 'source']) if (n[field] !== undefined) kept[field] = n[field];
        nutrients[key] = kept;
    }
    return Object.keys(nutrients).length ? { preparation: set.preparation, per: set.per, nutrients } : undefined;
}

/** The subset of an OFF dump record that we store and map. */
export function trimOffRecord(record: Json): Json {
    const out: Json = {};
    for (const field of SCALAR_FIELDS) if (record[field] !== undefined && record[field] !== '') out[field] = record[field];
    for (const field of TAG_FIELDS) if (Array.isArray(record[field]) && record[field].length) out[field] = record[field];
    // Main-language ingredients are only useful when the main language is English.
    if (record.lang === 'en' && typeof record.ingredients_text === 'string' && typeof record.ingredients_text_en !== 'string') {
        out.ingredients_text = record.ingredients_text;
    }
    if (isObject(record.nutriments)) {
        const nutriments: Json = {};
        for (const key of NUTRIMENT_KEYS) if (record.nutriments[key] !== undefined) nutriments[key] = record.nutriments[key];
        if (Object.keys(nutriments).length) out.nutriments = nutriments;
    }
    const aggregated = trimAggregatedNutrition(record.nutrition);
    if (aggregated) out.nutrition = { aggregated_set: aggregated };
    const images = trimImages(record.images, record.lang);
    if (images) out.images = images;
    return out;
}

export type ExtractStats = {
    linesScanned: number;
    prefilterHits: number;
    parseErrors: number;
    ukRecords: number;
    bytesWritten: number;
};

/**
 * Streams JSON lines, keeps UK-tagged records, trims them, and hands each to
 * `write`. Only lines containing the UK tag are parsed.
 */
export async function extractUkRecords(
    lines: Readable,
    write: (trimmed: Json) => void | Promise<void>,
    options: { maxLines?: number; onProgress?: (stats: ExtractStats) => void; progressEvery?: number } = {},
): Promise<ExtractStats> {
    const stats: ExtractStats = { linesScanned: 0, prefilterHits: 0, parseErrors: 0, ukRecords: 0, bytesWritten: 0 };
    const reader = createInterface({ input: lines, crlfDelay: Infinity });
    for await (const line of reader) {
        stats.linesScanned++;
        if (options.maxLines && stats.linesScanned > options.maxLines) break;
        if (options.onProgress && stats.linesScanned % (options.progressEvery ?? 100_000) === 0) options.onProgress(stats);
        if (!line.includes(UK_TAG)) continue;
        stats.prefilterHits++;
        let record: unknown;
        try {
            record = JSON.parse(line);
        } catch {
            stats.parseErrors++;
            continue;
        }
        if (!isObject(record) || !Array.isArray(record.countries_tags) || !record.countries_tags.includes(UK_TAG)) continue;
        stats.ukRecords++;
        const trimmed = trimOffRecord(record);
        stats.bytesWritten += JSON.stringify(trimmed).length + 1;
        await write(trimmed);
    }
    reader.close();
    return stats;
}
