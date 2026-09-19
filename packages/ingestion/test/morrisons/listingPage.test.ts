import { describe, expect, it } from 'vitest';
import { parseMorrisonsListingEntries } from '../../src/adapters/morrisons/index.js';
import { LISTING_URL, listingEntity, listingPageHtml, OBSERVED_AT } from '../fixtures/morrisonsPages.js';

const parse = (entities: Record<string, unknown>[], linkedSkus?: string[]) =>
    parseMorrisonsListingEntries(listingPageHtml(entities, linkedSkus), { url: LISTING_URL, fetchedAt: OBSERVED_AT });

describe('Morrisons listing -> PriceObservation', () => {
    it('produces a price observation keyed by retailer SKU, plus catalogue hints', () => {
        const [entry] = parse([listingEntity()]);
        expect(entry?.result).toEqual({
            ok: true,
            warnings: [],
            value: {
                productRef: { kind: 'retailer_sku', retailer: 'morrisons', sku: '900000002' },
                retailer: 'morrisons',
                store: null,
                channel: 'online',
                offer: {
                    pricePence: 55,
                    priceCondition: 'none',
                    retailerUnitPrice: { pence: 110, basis: 'kg', source: 'retailer' }, // "110.0" GBX
                    wasPricePence: null,
                    promotions: [],
                    availability: 'in_stock',
                },
                observedOn: '2026-09-18',
                observedAt: OBSERVED_AT,
                evidence: 'retailer_page',
                provenance: {
                    source: 'morrisons', sourceRecordId: '900000002',
                    sourceUrl: 'https://groceries.morrisons.com/products/test-product/900000002',
                    importedAt: OBSERVED_AT, sourceUpdatedAt: null, licence: null, attribution: null,
                },
            },
        });
        expect(entry?.hints).toMatchObject({
            name: 'Test Farm Passata (500g)',
            quantity: { kind: 'mass', total: 500 },
            dietaryClaims: ['vegetarian', 'vegan'], // "organic" is not a dietary claim
        });
    });

    it('takes the structured was-price and checks the promotion text against it', () => {
        const [entry] = parse([listingEntity({
            price: {
                current: { amount: '4.20', currency: 'GBP' },
                original: { amount: '6.00', currency: 'GBP' },
                unit: { label: 'fop.price.per.kg', current: { amount: '87.5', currency: 'GBX' } },
            },
            size: { value: '12 x 400g' },
            offers: [{ id: 'o', retailerPromotionId: '1000000002', description: 'Now £4.20, Was £6', type: 'OFFER' }],
        })]);
        expect(entry?.result.ok && entry.result.value.offer).toMatchObject({
            pricePence: 420,
            wasPricePence: 600,
            retailerUnitPrice: { pence: 87.5, basis: 'kg' },
            promotions: [{ type: 'price_reduction', pricePence: 420, wasPricePence: 600 }],
        });
        expect(entry?.result.warnings).toEqual([]);
    });

    it('models catch-weight products as a typical weight with a range', () => {
        const [entry] = parse([listingEntity({
            name: 'Test Farm Chicken Fillets 450g',
            price: { current: { amount: '6.12', currency: 'GBP' }, unit: { label: 'fop.price.per.kg', current: { amount: '18.00', currency: 'GBP' } } },
            size: { value: '340', uom: 'G', catchWeight: true },
            catchweight: {
                minQuantity: { value: '0.25', uom: 'KG' },
                typicalQuantity: { value: '340', uom: 'G' },
                maxQuantity: { value: '0.45', uom: 'KG' },
            },
        })]);
        expect(entry?.hints?.quantity).toEqual({
            kind: 'mass', unit: 'g', perPack: 340, packCount: 1, total: 340,
            variableWeight: { min: 250, max: 450 }, raw: '340 G (0.25 KG-0.45 KG)',
        });
        expect(entry?.result.warnings).toEqual([]); // 18.00/kg x 0.34 kg = £6.12
    });

    it('flags "each" unit prices that have no quantity to anchor them', () => {
        const [entry] = parse([listingEntity({
            size: null,
            price: { current: { amount: '3.90', currency: 'GBP' }, unit: { label: 'fop.price.per.each', current: { amount: '3.90', currency: 'GBP' } } },
        })]);
        expect(entry?.result.ok).toBe(true);
        expect(entry?.result.warnings).toEqual(['quantity_missing', 'unit_price_each_ambiguous: no quantity to say what "each" counts']);
    });

    it('rejects one malformed entity without losing the rest of the page', () => {
        const entries = parse([
            listingEntity(),
            listingEntity({ retailerProductId: '900000003', price: { current: { amount: 'free', currency: 'GBP' } } }),
        ]);
        expect(entries.map((e) => e.result.ok)).toEqual([true, false]);
    });

    it('rejects an entity with no product link, since the observation needs a URL', () => {
        const [entry] = parse([listingEntity()], []);
        expect(entry?.result).toMatchObject({ ok: false, errors: ['no product link for this SKU on the listing page'] });
    });
});
