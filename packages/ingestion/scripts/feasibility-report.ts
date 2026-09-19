/**
 * Source feasibility test, analysis half. Offline: runs the Contract v2
 * mappers over what feasibility-fetch.ts saved in .captures/ and measures
 * coverage. Makes no network requests.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    hasCompleteLabelNutrition, observationAgeDays, referenceKey, retailerName,
    type ParseResult, type PriceObservation, type ProductRecord,
} from '../src/contract/index.js';
import { mapOffProduct } from '../src/sources/openFoodFacts/mapProduct.js';
import { mapOpenPrice } from '../src/sources/openPrices/mapPrice.js';

const here = dirname(fileURLToPath(import.meta.url));
const captures = join(here, '..', '.captures');
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const files = (dir: string, prefix: string) => readdirSync(join(captures, dir))
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .map((f) => join(captures, dir, f));
/** When the capture was fetched: the file's modification time. */
const fetchedAt = (path: string) => statSync(path).mtime.toISOString().replace(/\.\d{3}Z$/, 'Z');

const today = process.env.FEASIBILITY_TODAY ?? new Date().toISOString().slice(0, 10);
const AGE_BUCKETS: [string, number][] = [['0-7 days', 7], ['8-30 days', 30], ['31-90 days', 90], ['91-180 days', 180], ['181-365 days', 365], ['over 1 year', Infinity]];
const bucket = (days: number) => AGE_BUCKETS.find(([, max]) => days <= max)![0];
const tally = (values: (string | null | undefined)[]) => {
    const out: Record<string, number> = {};
    for (const v of values) out[v ?? '(none)'] = (out[v ?? '(none)'] ?? 0) + 1;
    return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};
const where = (o: PriceObservation) => (o.retailer ? retailerName(o.retailer) : `other: ${o.store?.name ?? 'unknown'}`);
const reason = (e: string) => e.replace(/"[^"]*"/g, '"…"').replace(/\(.*\)/, '(…)').replace(/[\d.]+$/, 'N');

// ---------- Open Prices: every GBP observation ----------
const priceResults: ParseResult<PriceObservation>[] = files('openprices', 'gbp-p').flatMap((path) =>
    read(path).items.map((raw: unknown) => mapOpenPrice(raw, { importedAt: fetchedAt(path) })));
const observations = priceResults.flatMap((r) => (r.ok ? [r.value] : []));
const byProduct = new Map<string, PriceObservation[]>();
for (const o of observations) byProduct.set(referenceKey(o.productRef), [...(byProduct.get(referenceKey(o.productRef)) ?? []), o]);
const recent = (days: number) => observations.filter((o) => observationAgeDays(o, today) <= days);

const openPrices = {
    gbpObservations: priceResults.length,
    mapped: observations.length,
    rejected: tally(priceResults.flatMap((r) => (r.ok ? [] : [reason(r.errors[0] ?? '')]))),
    distinctProducts: byProduct.size,
    distinctProductsLast90Days: new Set(recent(90).map((o) => referenceKey(o.productRef))).size,
    distinctProductsLast30Days: new Set(recent(30).map((o) => referenceKey(o.productRef))).size,
    productsAtTwoOrMoreRetailers: [...byProduct.values()].filter((list) => new Set(list.map(where)).size >= 2).length,
    byRetailer: tally(observations.map(where)),
    byRetailerLast90Days: tally(recent(90).map(where)),
    unregisteredShops: observations.filter((o) => o.retailer === null).length,
    priceCondition: tally(observations.map((o) => o.offer.priceCondition)),
    promotions: tally(observations.flatMap((o) => o.offer.promotions.map((p) => p.type))),
    evidence: tally(observations.map((o) => o.evidence)),
    channel: tally(observations.map((o) => o.channel)),
    ageByObservationDate: tally(observations.map((o) => bucket(observationAgeDays(o, today)))),
    newestObservation: observations.map((o) => o.observedOn).sort().at(-1),
    oldestObservation: observations.map((o) => o.observedOn).sort()[0],
};

// ---------- Open Food Facts: the 100-product sample ----------
const sampleCodes: string[] = read(join(captures, 'openfoodfacts', 'sample-codes.json'));
const offRaw = new Map<string, { raw: unknown; importedAt: string }>();
for (const path of files('openfoodfacts', 'search-p')) {
    for (const p of read(path).products) offRaw.set(p.code, { raw: p, importedAt: fetchedAt(path) });
}
const offResults = sampleCodes.map((code) => {
    const entry = offRaw.get(code);
    return entry ? mapOffProduct(entry.raw, { importedAt: entry.importedAt }) : { ok: false as const, errors: ['not captured'], warnings: [] };
});
const products = offResults.flatMap((r) => (r.ok ? [r.value] : [])) as ProductRecord[];
const count = (predicate: (r: ProductRecord) => boolean) => products.filter(predicate).length;
const pricesFor = (r: ProductRecord) => byProduct.get(`barcode:${r.product.barcode}`) ?? [];
const priced = products.filter((r) => pricesFor(r).length > 0);

const openFoodFacts = {
    requested: sampleCodes.length,
    normalised: products.length,
    rejected: tally(offResults.flatMap((r) => (r.ok ? [] : [reason(r.errors[0] ?? '')]))),
    withImage: count((r) => r.product.images.length > 0),
    withAttributedImage: count((r) => r.product.images.some((i) => i.licence !== null && i.attribution !== null)),
    withEnglishIngredients: count((r) => r.product.ingredients !== null),
    withAnyNutrition: count((r) => r.product.nutrition !== null),
    withCompleteLabelNutrition: count((r) => hasCompleteLabelNutrition(r.product.nutrition)),
    withProteinValue: count((r) => r.product.nutrition?.values.proteinG != null),
    withUsableQuantity: count((r) => r.product.quantity !== null),
    withCanonicalCategories: count((r) => r.product.categories.canonical.length > 0),
    withDescription: count((r) => r.product.description !== null),
    allergenStatus: tally(products.map((r) => r.product.allergens.status)),
    withMayContain: count((r) => r.product.allergens.mayContain.length > 0),
    withDietaryClaim: count((r) => r.product.dietary.claims.length > 0),
    withDietaryInference: count((r) => r.product.dietary.inferred.by !== null),
    claimVsInferenceConflicts: count((r) => (['vegan', 'vegetarian'] as const).some((d) => r.product.dietary.claims.includes(d) && r.product.dietary.inferred[d] === 'no')),
    warnings: tally(offResults.flatMap((r) => r.warnings).map(reason)),
    withAtLeastOneUkPrice: priced.length,
    withUkPriceLast90Days: priced.filter((r) => pricesFor(r).some((o) => observationAgeDays(o, today) <= 90)).length,
    ukPricesForSampleByAge: tally(priced.flatMap(pricesFor).map((o) => bucket(observationAgeDays(o, today)))),
};

writeFileSync(join(captures, 'feasibility-report.json'), JSON.stringify({ today, openFoodFacts, openPrices }, null, 2));
console.log(JSON.stringify({ today, openFoodFacts, openPrices }, null, 2));
