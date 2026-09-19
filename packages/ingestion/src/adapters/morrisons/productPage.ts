/**
 * Morrisons product page -> ProductListing + PriceObservation.
 *
 * Morrisons pages carry no barcode, so the product is a ProductListing
 * identified by retailer SKU, not a canonical Product.
 *
 * Primary source: the dehydrated React Query entry ["bop", <sku>] in
 * window.__QUERY_INITIAL_STATE__ (product, bopData, bopPromotions).
 * Cross-check: the schema.org JSON-LD block. If the two disagree on SKU or
 * price, the page is rejected rather than guessed.
 *
 * Live access is disabled (docs/source-feasibility.md); this parser runs on
 * fixtures and on any captures that already exist locally.
 */
import { parse } from 'node-html-parser';
import {
    buildAllergenData, NutritionDataSchema, PriceObservationSchema, ProductListingSchema, provenanceFor, validate,
    type Nutrient, type NutritionData, type ParseResult, type PriceObservation, type ProductDetails, type ProductImage,
    type ProductListing, type ProductQuantity, type RawNutritionTable,
} from '../../contract/index.js';
import { amountToPence } from '../../normalise/money.js';
import { boldSegments, cleanText } from '../../normalise/text.js';
import type { PageContext, ProductPageResult } from '../types.js';
import { ExtractionError, extractProductPage } from './extract.js';
import { catchWeightQuantity, dietaryClaims, sizeQuantity } from './mappings.js';
import { buildOffer, crossCheckUnitPrice } from './offer.js';
import { BopQueryDataSchema, JsonLdProductSchema, QueryStateSchema } from './raw.js';

const skuFromUrl = (url: string) => new URL(url).pathname.match(/\/(\d+)\/?$/)?.[1] ?? null;

/** The UK calendar date of an instant, e.g. for a page read at 23:30 UTC in summer. */
export function ukDate(instant: string): string {
    return new Date(instant).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

/** <table class="nutrition"> -> rows of label + values. Header row becomes columns. */
export function parseNutritionTable(html: string | null | undefined): RawNutritionTable | null {
    if (!html) return null;
    const table = parse(html).querySelector('table');
    if (!table) return null;
    let columns: string[] = [];
    const rows: RawNutritionTable['rows'] = [];
    for (const tr of table.querySelectorAll('tr')) {
        const headers = tr.querySelectorAll('th').map((cell) => cleanText(cell.text) ?? '');
        if (headers.length && !tr.querySelector('td')) {
            if (!columns.length) columns = headers;
            continue;
        }
        const cells = tr.querySelectorAll('th, td').map((cell) => cleanText(cell.text) ?? '');
        const [label, ...values] = cells;
        if (label) rows.push({ label, values });
    }
    return rows.length ? { columns, rows } : null;
}

const ROW_NUTRIENTS: [RegExp, Nutrient][] = [
    [/^energy/i, 'energyKcal'],
    [/saturates/i, 'saturatesG'],
    [/^fat/i, 'fatG'],
    [/sugars/i, 'sugarsG'],
    [/^carbohydrate/i, 'carbohydrateG'],
    [/^fibre/i, 'fibreG'],
    [/^protein/i, 'proteinG'],
    [/^salt/i, 'saltG'],
];

/**
 * Numbers from the table's "per 100g/ml" column, where there is one. Only
 * exact values are read: "<0.5g" and anything unrecognised stay null. The
 * table is always kept as `raw`.
 */
export function nutritionFromTable(table: RawNutritionTable | null, quantity: ProductQuantity | null, warnings: string[]): NutritionData | null {
    if (!table) return null;
    const perColumn = table.columns.findIndex((c) => /per\s*100\s*(g|ml)/i.test(c));
    const per = perColumn >= 0 ? (/ml/i.test(table.columns[perColumn] ?? '') ? '100ml' : '100g') : quantity?.kind === 'volume' ? '100ml' : '100g';
    const values: NutritionData['values'] = {
        energyKcal: null, fatG: null, saturatesG: null, carbohydrateG: null, sugarsG: null, fibreG: null, proteinG: null, saltG: null,
    };
    if (perColumn < 0) warnings.push('nutrition_no_per_100_column');
    else {
        for (const row of table.rows) {
            const nutrient = ROW_NUTRIENTS.find(([pattern]) => pattern.test(row.label))?.[1];
            const cell = row.values[perColumn - 1];
            if (!nutrient || cell === undefined || values[nutrient] !== null) continue;
            const match = nutrient === 'energyKcal'
                ? /(\d+(?:\.\d+)?)\s*kcal/i.exec(cell)
                : /^(\d+(?:\.\d+)?)\s*g$/i.exec(cell.trim());
            if (match) values[nutrient] = Number(match[1]);
            else warnings.push(`nutrition_value_unread: ${row.label} "${cell}"`);
        }
    }
    const nutrition: NutritionData = { per, values, derived: [], raw: table };
    const checked = NutritionDataSchema.safeParse(nutrition);
    if (checked.success) return nutrition;
    warnings.push('nutrition_inconsistent: numbers dropped, table kept');
    return { ...nutrition, values: { ...values, ...Object.fromEntries(Object.keys(values).map((k) => [k, null])) } };
}

export function parseMorrisonsProductPage(html: string, context: PageContext): ParseResult<ProductPageResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fail = (message: string): ParseResult<ProductPageResult> => ({ ok: false, errors: [...errors, message], warnings });

    let blobs;
    try {
        blobs = extractProductPage(html);
    } catch (error) {
        if (error instanceof ExtractionError) return fail(error.message);
        throw error;
    }

    const state = QueryStateSchema.safeParse(blobs.queryState);
    if (!state.success) return fail('query state has an unexpected shape');
    const bopQuery = state.data.queries.find((q) => q.queryKey[0] === 'bop');
    if (!bopQuery) return fail('no ["bop", sku] query in the page state');
    const bop = BopQueryDataSchema.safeParse(bopQuery.state.data);
    if (!bop.success) {
        return fail(`product data has an unexpected shape: ${bop.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
    const { product, bopData, bopPromotions } = bop.data;

    // Identity must agree everywhere it appears.
    const urlSku = skuFromUrl(context.url);
    if (urlSku !== product.retailerProductId) {
        return fail(`SKU mismatch: URL says ${urlSku}, page data says ${product.retailerProductId}`);
    }
    const ld = blobs.jsonLd === null ? null : JsonLdProductSchema.safeParse(blobs.jsonLd);
    if (ld && !ld.success) warnings.push('json_ld_unexpected_shape');
    const jsonLd = ld?.success ? ld.data : null;
    if (!jsonLd) warnings.push('json_ld_missing: price not cross-checked');
    if (jsonLd?.sku && jsonLd.sku !== product.retailerProductId) {
        return fail(`SKU mismatch: JSON-LD says ${jsonLd.sku}, page data says ${product.retailerProductId}`);
    }
    if (jsonLd?.offers && product.price.currency === 'GBP'
        && amountToPence(jsonLd.offers.price, 'GBP') !== amountToPence(product.price.amount, 'GBP')) {
        return fail(`price mismatch: JSON-LD ${jsonLd.offers.price}, page data ${product.price.amount}`);
    }

    const fields = new Map((bopData?.fields ?? []).map((f) => [f.title, f.content]));
    const longDescriptions = new Map((bopPromotions ?? []).map((p) => [p.promoId, p.longDescription ?? null]));

    const offer = buildOffer({
        price: product.price,
        originalPrice: null, // product pages expose no structured was-price
        unitPrice: product.unitPrice ? { price: product.unitPrice.price, label: product.unitPrice.unit } : null,
        available: product.available,
        promotions: (product.promotions ?? []).map((p) => ({
            retailerPromotionId: p.retailerPromotionId ?? null,
            text: p.description,
            longText: longDescriptions.get(p.promoId) ?? null,
            requiredQuantity: p.requiredProductQuantity ?? null,
        })),
    }, errors, warnings);
    if (!offer) return { ok: false, errors, warnings };

    const quantity = product.catchweight
        ? catchWeightQuantity(product.catchweight, warnings)
        : sizeQuantity(product.packSizeDescription, warnings);
    crossCheckUnitPrice(offer, quantity, warnings);

    const ingredientsHtml = fields.get('ingredients') ?? null;
    const listedAllergens = (cleanText(fields.get('allergens')) ?? '').split(/[,;\n]/).map((a) => a.trim()).filter(Boolean);
    const jsonLdImage = Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image;
    const imageUrl = jsonLdImage ?? product.image?.src ?? null;
    const images: ProductImage[] = imageUrl?.startsWith('https://') ? [{
        url: imageUrl, role: 'front', source: 'morrisons', licence: null, attribution: null, contributor: null, sourcePageUrl: context.url,
    }] : [];

    const details: ProductDetails = {
        name: cleanText(product.name) ?? '',
        brand: cleanText(product.brand),
        quantity,
        // Morrisons breadcrumbs are not a canonical taxonomy; they go on the listing.
        categories: { canonical: [] },
        description: cleanText(bopData?.detailedDescription) ?? cleanText(jsonLd?.description),
        ingredients: cleanText(ingredientsHtml),
        allergens: buildAllergenData([...listedAllergens, ...boldSegments(ingredientsHtml)], [], ingredientsHtml !== null),
        dietary: {
            claims: dietaryClaims([...(product.attributes ?? []), ...(product.iconAttributes ?? [])]),
            inferred: { vegan: 'unknown', vegetarian: 'unknown', by: null },
        },
        nutrition: nutritionFromTable(parseNutritionTable(fields.get('nutritionalData')), quantity, warnings),
        images,
    };

    const sku = product.retailerProductId;
    const provenance = provenanceFor('morrisons', {
        sourceRecordId: sku, sourceUrl: context.url, importedAt: context.fetchedAt, sourceUpdatedAt: null,
    });
    const listing = validate(ProductListingSchema, {
        ref: { kind: 'retailer_sku', retailer: 'morrisons', sku },
        retailer: 'morrisons',
        barcode: null,
        url: context.url,
        retailerCategoryPath: (product.categoryPath ?? []).map((c) => cleanText(c)).filter((c): c is string => c !== null),
        details,
        provenance,
    } satisfies ProductListing);
    if (!listing.ok) return { ok: false, errors: listing.errors, warnings };

    const price = validate(PriceObservationSchema, {
        productRef: { kind: 'retailer_sku', retailer: 'morrisons', sku },
        retailer: 'morrisons',
        store: null,
        channel: 'online',
        offer,
        observedOn: ukDate(context.fetchedAt),
        observedAt: context.fetchedAt,
        evidence: 'retailer_page',
        provenance,
    } satisfies PriceObservation);
    if (!price.ok) return { ok: false, errors: price.errors, warnings };

    return { ok: true, value: { listing: listing.value, price: price.value }, warnings };
}
