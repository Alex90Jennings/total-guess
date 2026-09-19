/**
 * Morrisons PoC: run the adapter over everything in .captures/morrisons and
 * write a raw -> normalised review to .captures/morrisons/poc-report.json.
 * Makes no network requests. The report contains Morrisons data, so it stays
 * in the gitignored captures folder.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMorrisonsListingEntries, parseMorrisonsProductPage } from '../src/adapters/morrisons/index.js';
import { buildProductDocument, productTextHash } from '../src/documents/productDocument.js';
import { comparableUnitPrice, unitPricesAgree } from '../src/normalise/unitPrice.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '.captures', 'morrisons');
// The sample list names Morrisons products, so it lives with the local-only captures.
const sample: { retailerSku: string }[] = JSON.parse(readFileSync(join(root, 'sample.json'), 'utf8'));
const sampleSkus = new Set(sample.map((s) => s.retailerSku));

const htmlFiles = (dir: string) => existsSync(join(root, dir))
    ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.html')).map((f) => join(root, dir, f))
    : [];
const context = (htmlPath: string) => {
    const meta = JSON.parse(readFileSync(htmlPath.replace(/\.html$/, '.meta.json'), 'utf8'));
    return { url: meta.url as string, fetchedAt: new Date(meta.fetchedAt).toISOString().replace(/\.\d{3}Z$/, 'Z') };
};
const count = (map: Record<string, number>, key: string) => { map[key] = (map[key] ?? 0) + 1; };

/** The raw fields a reviewer needs to check each normalised value against. */
function rawSummary(raw: any) {
    return {
        name: raw.name,
        size: raw.size ?? null,
        catchweight: raw.catchweight ?? null,
        price: raw.price,
        offers: (raw.offers ?? []).map((o: any) => ({ retailerPromotionId: o.retailerPromotionId, description: o.description })),
        attributes: (raw.attributes ?? []).map((a: any) => a.icon),
        categoryPath: raw.categoryPath,
    };
}

const productPages = htmlFiles('products').map((path) => {
    const html = readFileSync(path, 'utf8');
    const result = parseMorrisonsProductPage(html, context(path));
    return {
        file: path.slice(root.length + 1),
        result,
        document: result.ok ? buildProductDocument(result.value.listing.details) : null,
        textHash: result.ok ? productTextHash(result.value.listing.details) : null,
    };
});

const stats = {
    listingEntities: 0, valid: 0, rejected: 0,
    warnings: {} as Record<string, number>,
    promotionTypes: {} as Record<string, number>,
    quantityKinds: {} as Record<string, number>,
    unitPriceChecks: { agree: 0, disagree: 0, notComparable: 0 },
};
const samples: unknown[] = [];

for (const path of htmlFiles('listings')) {
    for (const entry of parseMorrisonsListingEntries(readFileSync(path, 'utf8'), context(path))) {
        stats.listingEntities++;
        entry.result.ok ? stats.valid++ : stats.rejected++;
        for (const w of entry.result.warnings) count(stats.warnings, w.replace(/"[^"]*"/g, '"…"').replace(/\d+(\.\d+)?/g, 'N'));
        count(stats.quantityKinds, entry.hints?.quantity?.kind ?? 'none');

        const offer = entry.result.ok ? entry.result.value.offer : null;
        for (const p of offer?.promotions ?? []) count(stats.promotionTypes, p.type);
        const quantity = entry.hints?.quantity ?? null;
        const calculated = offer && quantity ? comparableUnitPrice(offer.pricePence, quantity) : null;
        if (!calculated || !offer?.retailerUnitPrice) stats.unitPriceChecks.notComparable++;
        else if (unitPricesAgree(offer.retailerUnitPrice, calculated)) stats.unitPriceChecks.agree++;
        else stats.unitPriceChecks.disagree++;

        if (entry.retailerSku && sampleSkus.has(entry.retailerSku) && !samples.some((s: any) => s.retailerSku === entry.retailerSku)) {
            samples.push({
                retailerSku: entry.retailerSku,
                source: path.slice(root.length + 1),
                raw: rawSummary(entry.raw),
                normalised: {
                    hints: entry.hints,
                    observation: entry.result.ok ? entry.result.value : null,
                    errors: entry.result.ok ? [] : entry.result.errors,
                    warnings: entry.result.warnings,
                    calculatedUnitPrice: calculated,
                },
            });
        }
    }
}

const missing = [...sampleSkus].filter((sku) => !samples.some((s: any) => s.retailerSku === sku));
writeFileSync(join(root, 'poc-report.json'), JSON.stringify({ stats, productPages, samples, missing }, null, 2));

console.log(`product pages: ${productPages.filter((p) => p.result.ok).length}/${productPages.length} valid`);
console.log(`listing entities: ${stats.valid}/${stats.listingEntities} valid, ${stats.rejected} rejected`);
console.log('quantity kinds:', stats.quantityKinds);
console.log('promotion types:', stats.promotionTypes);
console.log('unit price checks:', stats.unitPriceChecks);
console.log('warnings:', stats.warnings);
console.log(`sample: ${samples.length}/${sampleSkus.size} found${missing.length ? `, missing ${missing.join(', ')}` : ''}`);
console.log(`report: ${join(root, 'poc-report.json')}`);
