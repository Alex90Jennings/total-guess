import { describe, expect, it } from 'vitest';
import { morrisonsAdapter, nutritionFromTable, ukDate } from '../../src/adapters/morrisons/index.js';
import { describePriceObservation } from '../../src/contract/index.js';
import { productTextHash } from '../../src/documents/productDocument.js';
import {
    foodBopData, foodJsonLd, foodProduct, OBSERVED_AT, PRODUCT_URL, productPageHtml,
} from '../fixtures/morrisonsPages.js';

const parse = (html: string, url = PRODUCT_URL) => morrisonsAdapter.parseProductPage(html, { url, fetchedAt: OBSERVED_AT });
const ok = (html: string) => {
    const result = parse(html);
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result;
};

describe('Morrisons product page -> ProductListing + PriceObservation', () => {
    it('identifies the product by retailer SKU, since the page has no barcode', () => {
        const { listing } = ok(productPageHtml()).value;
        expect(listing).toMatchObject({
            ref: { kind: 'retailer_sku', retailer: 'morrisons', sku: '900000001' },
            retailer: 'morrisons',
            barcode: null,
            url: PRODUCT_URL,
            retailerCategoryPath: ['Food Cupboard', 'Tins, Cans & Packets', 'Tomatoes', 'Chopped Tomatoes'],
            provenance: { source: 'morrisons', sourceRecordId: '900000001', sourceUrl: PRODUCT_URL, importedAt: OBSERVED_AT, licence: null, attribution: null },
        });
    });

    it('normalises the product details', () => {
        expect(ok(productPageHtml()).value.listing.details).toEqual({
            name: 'Test Farm Chopped Tomatoes 4 x 400g',
            brand: 'Test Farm',
            quantity: { kind: 'mass', unit: 'g', perPack: 400, packCount: 4, total: 1600, variableWeight: null, raw: '4 x 400g' },
            categories: { canonical: [] }, // retailer breadcrumbs are not canonical
            description: 'Italian tomatoes, chopped & packed in juice.',
            ingredients: 'Tomatoes (65%), Tomato Juice, Celery Salt, Acidity Regulator: Citric Acid',
            allergens: { status: 'listed', contains: ['celery'], mayContain: [], unrecognised: [] },
            dietary: { claims: [], inferred: { vegan: 'unknown', vegetarian: 'unknown', by: null } },
            nutrition: {
                per: '100g',
                values: { energyKcal: 22, fatG: null, saturatesG: null, carbohydrateG: null, sugarsG: null, fibreG: null, proteinG: 1.2, saltG: null },
                derived: [],
                raw: { columns: ['Typical Values', 'Per 100g'], rows: [{ label: 'Energy', values: ['92kJ/22kcal'] }, { label: 'Protein', values: ['1.2g'] }] },
            },
            images: [{
                url: 'https://groceries.morrisons.com/images-v3/x/y/500x500.jpg', role: 'front', source: 'morrisons',
                licence: null, attribution: null, contributor: null, sourcePageUrl: PRODUCT_URL,
            }],
        });
    });

    it('records the price as an observation from the retailer page', () => {
        const { price, listing } = ok(productPageHtml()).value;
        expect(price).toEqual({
            productRef: { kind: 'retailer_sku', retailer: 'morrisons', sku: '900000001' },
            retailer: 'morrisons',
            store: null,
            channel: 'online',
            offer: {
                pricePence: 180,
                priceCondition: 'none',
                retailerUnitPrice: { pence: 113, basis: 'kg', source: 'retailer' },
                wasPricePence: null,
                promotions: [{ type: 'multibuy', retailerPromotionId: '1000000001', text: 'Buy 2 for £3', endsOn: '2026-09-30', quantity: 2, pricePence: 300 }],
                availability: 'in_stock',
            },
            observedOn: '2026-09-18',
            observedAt: OBSERVED_AT,
            evidence: 'retailer_page',
            provenance: listing.provenance,
        });
        expect(describePriceObservation(price)).toBe('£1.80 — observed at Morrisons on 18 September 2026');
    });

    it('keeps More Card prices as loyalty promotions, not as the shelf price', () => {
        const html = productPageHtml({
            product: foodProduct({ promotions: [{ promoId: 'p-2', retailerPromotionId: 'EE-1', description: '£1.50 - More Card Price', type: 'OFFER' }] }),
            bopPromotions: [],
        });
        expect(ok(html).value.price.offer).toMatchObject({
            pricePence: 180,
            priceCondition: 'none',
            promotions: [{ type: 'loyalty_price', scheme: 'more_card', pricePence: 150 }],
        });
    });

    it('reads GBX unit prices as pence', () => {
        const html = productPageHtml({ product: foodProduct({ unitPrice: { price: { amount: '90.0', currency: 'GBX' }, unit: 'fop.price.per.kg' }, price: { amount: '1.44', currency: 'GBP' } }), jsonLd: foodJsonLd({ offers: { price: '1.44', priceCurrency: 'GBP' } }) });
        expect(ok(html).value.price.offer.retailerUnitPrice).toEqual({ pence: 90, basis: 'kg', source: 'retailer' });
    });

    it('warns, but keeps the observation, when the retailer unit price implies a different pack size', () => {
        const result = ok(productPageHtml({ product: foodProduct({ unitPrice: { price: { amount: '4.50', currency: 'GBP' }, unit: 'fop.price.per.kg' } }) }));
        expect(result.warnings.some((w) => w.startsWith('unit_price_mismatch'))).toBe(true);
    });

    it('drops unsupported unit-price bases instead of converting them', () => {
        const result = ok(productPageHtml({ product: foodProduct({ unitPrice: { price: { amount: '9.33', currency: 'GBP' }, unit: 'fop.price.per.75cl' } }) }));
        expect(result.value.price.offer.retailerUnitPrice).toBeNull();
        expect(result.warnings).toContain('unit_price_basis_unsupported: fop.price.per.75cl');
    });

    it('gives the same text hash when only the price and promotions change', () => {
        const before = ok(productPageHtml());
        const after = ok(productPageHtml({
            product: foodProduct({ price: { amount: '1.25', currency: 'GBP' }, promotions: [] }),
            jsonLd: foodJsonLd({ offers: { price: '1.25', priceCurrency: 'GBP' } }),
        }));
        expect(after.value.price.offer.pricePence).not.toBe(before.value.price.offer.pricePence);
        expect(productTextHash(after.value.listing.details)).toBe(productTextHash(before.value.listing.details));
    });

    describe('rejects rather than guesses', () => {
        it.each<[string, string, string?]>([
            ['state script missing', productPageHtml({ omitQueryState: true })],
            ['SKU in URL differs from the page', productPageHtml(), 'https://groceries.morrisons.com/products/other/123'],
            ['JSON-LD SKU differs', productPageHtml({ jsonLd: foodJsonLd({ sku: '999' }) })],
            ['JSON-LD price differs', productPageHtml({ jsonLd: foodJsonLd({ offers: { price: '2.00', priceCurrency: 'GBP' } }) })],
            ['price in an unexpected format', productPageHtml({ product: foodProduct({ price: { amount: '£1.80', currency: 'GBP' } }) })],
            ['price in an unknown currency', productPageHtml({ product: foodProduct({ price: { amount: '1.80', currency: 'EUR' } }) })],
            ['product data missing', productPageHtml({ product: { retailerProductId: '900000001' } })],
            ['an empty name', productPageHtml({ product: foodProduct({ name: '   ' }) })],
        ])('%s', (_label, html, url) => {
            expect(parse(html, url).ok).toBe(false);
        });
    });

    it('works without JSON-LD, with a warning that the price was not cross-checked', () => {
        const result = ok(productPageHtml({ jsonLd: null }));
        expect(result.warnings).toContain('json_ld_missing: price not cross-checked');
        expect(result.value.listing.details.images[0]?.url).toBe('https://groceries.morrisons.com/images-v3/x/y/300x300.jpg');
    });

    it('marks allergens unknown, not absent, when there are no ingredients', () => {
        const result = ok(productPageHtml({ product: foodProduct({ promotions: [] }), bopData: foodBopData({ fields: [] }), bopPromotions: [] }));
        expect(result.value.listing.details).toMatchObject({ ingredients: null, nutrition: null, allergens: { status: 'unknown' } });
        expect(result.value.price.offer.promotions).toEqual([]);
    });
});

describe('Morrisons nutrition table', () => {
    const table = (columns: string[], rows: [string, string][]) => ({ columns, rows: rows.map(([label, value]) => ({ label, values: [value] })) });

    it('reads exact values from the per-100 column and keeps the table', () => {
        const warnings: string[] = [];
        const n = nutritionFromTable(table(['Typical Values', 'Per 100ml'], [
            ['Energy', '180kJ/43kcal'], ['Fat', '1.5g'], ['of which saturates', '0.2g'], ['Carbohydrate', '6.7g'],
            ['of which sugars', '<0.5g'], ['Protein', '1.0g'], ['Salt', '0.10g'],
        ]), null, warnings)!;
        expect(n.per).toBe('100ml');
        expect(n.values).toMatchObject({ energyKcal: 43, fatG: 1.5, saturatesG: 0.2, carbohydrateG: 6.7, sugarsG: null, proteinG: 1, saltG: 0.1 });
        expect(warnings).toEqual(['nutrition_value_unread: of which sugars "<0.5g"']);
    });

    it('keeps only the raw table when there is no per-100 column', () => {
        const warnings: string[] = [];
        const n = nutritionFromTable(table(['Typical Values', 'Per pack'], [['Protein', '9g']]), null, warnings)!;
        expect(n.values.proteinG).toBeNull();
        expect(n.raw?.rows).toHaveLength(1);
        expect(warnings).toContain('nutrition_no_per_100_column');
    });
});

describe('ukDate', () => {
    it('uses the UK calendar date, not the UTC one', () => {
        expect(ukDate('2026-09-18T23:30:00Z')).toBe('2026-09-19'); // 00:30 BST
        expect(ukDate('2026-12-18T23:30:00Z')).toBe('2026-12-18'); // GMT
    });
});
