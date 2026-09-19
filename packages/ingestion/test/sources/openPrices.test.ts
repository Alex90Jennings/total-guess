import { describe, expect, it } from 'vitest';
import { describePriceObservation } from '../../src/contract/index.js';
import { mapOpenPrice } from '../../src/sources/openPrices/mapPrice.js';

const IMPORTED_AT = '2026-09-18T06:41:21Z';

/** Fictional price in the shape of an Open Prices /api/v1/prices item. */
function openPrice(overrides: Record<string, unknown> = {}) {
    return {
        id: 1000001,
        type: 'PRODUCT',
        product_code: '5000000000005',
        category_tag: null,
        price: 2.5,
        currency: 'GBP',
        price_is_discounted: false,
        price_without_discount: null,
        discount_type: null,
        price_per: null,
        date: '2026-03-14',
        created: '2026-03-15T10:00:00.000000Z',
        updated: '2026-03-15T10:00:00.000000Z',
        owner: 'some-contributor',
        location_id: 42,
        location: {
            id: 42, type: 'OSM', osm_id: 123, osm_type: 'NODE', osm_name: 'Tesco Express', osm_brand: 'Tesco',
            osm_address_city: 'Testtown', osm_address_postcode: 'TE1 1ST', osm_address_country_code: 'GB',
            osm_lat: 51.5, osm_lon: -0.1,
        },
        proof: { type: 'PRICE_TAG' },
        ...overrides,
    };
}

const map = (overrides: Record<string, unknown> = {}) => {
    const result = mapOpenPrice(openPrice(overrides), { importedAt: IMPORTED_AT });
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result;
};

describe('Open Prices -> PriceObservation', () => {
    it('maps a UK barcode price as dated evidence at a store', () => {
        expect(map().value).toEqual({
            productRef: { kind: 'barcode', barcode: '05000000000005' },
            retailer: 'tesco',
            store: {
                retailer: 'tesco', name: 'Tesco Express', sourceStoreId: '42', osm: { type: 'node', id: 123 },
                postcode: 'TE1 1ST', city: 'Testtown', countryCode: 'GB',
            },
            channel: 'in_store',
            offer: { pricePence: 250, priceCondition: 'none', wasPricePence: null, retailerUnitPrice: null, promotions: [], availability: 'unknown' },
            observedOn: '2026-03-14',
            observedAt: null,
            evidence: 'price_tag',
            provenance: {
                source: 'open_prices', sourceRecordId: '1000001', sourceUrl: 'https://prices.openfoodfacts.org/prices/1000001',
                importedAt: IMPORTED_AT, sourceUpdatedAt: '2026-03-15T10:00:00.000000Z',
                licence: 'ODbL-1.0', attribution: expect.stringContaining('Open Prices'),
            },
        });
        expect(describePriceObservation(map().value)).toBe('£2.50 — observed at Tesco on 14 March 2026');
    });

    it('never carries the contributor username or coordinates', () => {
        const text = JSON.stringify(map().value);
        expect(text).not.toContain('some-contributor');
        expect(text).not.toContain('51.5');
    });

    it('keeps an unregistered shop as a named store with no retailer', () => {
        const value = map({ location: { ...openPrice().location, osm_brand: null, osm_name: 'Corner Shop & Off Licence' } }).value;
        expect(value.retailer).toBeNull();
        expect(value.store).toMatchObject({ retailer: null, name: 'Corner Shop & Off Licence' });
    });

    it('records receipts as receipts', () => {
        expect(map({ proof: { type: 'RECEIPT' } }).value.evidence).toBe('receipt');
    });

    describe('discounts', () => {
        it('a loyalty price is a member price, never a shelf price', () => {
            const { offer } = map({ price: 1.5, price_is_discounted: true, price_without_discount: 2.5, discount_type: 'LOYALTY_PROGRAM' }).value;
            expect(offer).toMatchObject({ pricePence: 150, priceCondition: 'loyalty_member', wasPricePence: 250, promotions: [] });
        });

        it('a loyalty price with no regular price is still marked as a member price', () => {
            const { offer } = map({ price: 1.5, price_is_discounted: true, discount_type: 'LOYALTY_PROGRAM' }).value;
            expect(offer).toMatchObject({ pricePence: 150, priceCondition: 'loyalty_member', wasPricePence: null });
        });

        it('a sale with a regular price is a price reduction open to everyone', () => {
            const { offer } = map({ price: 2, price_is_discounted: true, price_without_discount: 2.5, discount_type: 'SALE' }).value;
            expect(offer).toMatchObject({
                pricePence: 200, priceCondition: 'none', wasPricePence: 250,
                promotions: [{ type: 'price_reduction', retailerPromotionId: null, text: null, endsOn: null, pricePence: 200, wasPricePence: 250 }],
            });
        });

        it('a short-dated reduction is marked as clearance', () => {
            const { offer } = map({ price: 0.5, price_is_discounted: true, price_without_discount: 2.5, discount_type: 'EXPIRES_SOON' }).value;
            expect(offer.promotions).toEqual([{ type: 'clearance', retailerPromotionId: null, text: null, endsOn: null, pricePence: 50, wasPricePence: 250 }]);
        });

        it('a discount of unknown kind keeps its code and an unknown condition', () => {
            const { offer } = map({ price: 2, price_is_discounted: true, price_without_discount: 2.5, discount_type: 'QUANTITY' }).value;
            expect(offer).toMatchObject({ priceCondition: 'unknown', promotions: [{ type: 'unparsed', sourceCode: 'QUANTITY', text: null }] });
        });

        it('a discount with no type at all is condition unknown, with a warning', () => {
            const result = map({ price: 2, price_is_discounted: true, price_without_discount: 2.5 });
            expect(result.value.offer).toMatchObject({ priceCondition: 'unknown', wasPricePence: 250, promotions: [] });
            expect(result.warnings).toContain('discount_type_not_given');
        });
    });

    it.each<[string, Record<string, unknown>]>([
        ['a non-GBP price', { currency: 'EUR' }],
        ['a loose-produce category price', { type: 'CATEGORY', product_code: null, category_tag: 'en:apples', price_per: 'KILOGRAM' }],
        ['a fractional-penny price', { price: 1.255 }],
        ['an in-store barcode', { product_code: '2012345000001' }],
        ['an invalid barcode', { product_code: '5000000000001' }],
        ['a malformed date', { date: '14/03/2026' }],
        ['an observation dated after import', { date: '2026-12-01' }],
    ])('rejects %s', (_label, overrides) => {
        expect(mapOpenPrice(openPrice(overrides), { importedAt: IMPORTED_AT }).ok).toBe(false);
    });
});
