import { describe, expect, it } from 'vitest';
import {
    OfferDataSchema, PriceObservationSchema, ProductListingSchema, ProductRecordSchema, ProductReferenceSchema,
    ReferencePriceSchema, referenceKey, validate,
} from '../src/contract/index.js';
import { validPriceObservation, validProductRecord } from './fixtures/observation.js';

type Mutate = (o: any) => void;
const rejects = (schema: { safeParse(v: unknown): { success: boolean } }, base: unknown, mutate: Mutate) => {
    const copy = structuredClone(base);
    mutate(copy);
    return schema.safeParse(copy).success === false;
};

describe('ProductRecord', () => {
    it('accepts a well-formed record', () => {
        expect(ProductRecordSchema.safeParse(validProductRecord()).success).toBe(true);
    });

    it.each<[string, Mutate]>([
        ['a barcode that is not canonical', (r) => { r.product.barcode = '5000000000005'; }],
        ['a barcode with a wrong check digit', (r) => { r.product.barcode = '05000000000006'; }],
        ['an in-store barcode', (r) => { r.product.barcode = '02012345000001'; }],
        ['an empty name', (r) => { r.product.name = ''; }],
        ['an inconsistent quantity total', (r) => { r.product.quantity.total = 400; }],
        ['a retailer breadcrumb as a canonical category', (r) => { r.product.categories.canonical = ['Food Cupboard']; }],
        ['nutrition as text', (r) => { r.product.nutrition.values.proteinG = '8.5g'; }],
        ['an unknown dietary claim', (r) => { r.product.dietary.claims = ['keto']; }],
        ['an allergen outside the UK 14', (r) => { r.product.allergens.contains = ['strawberry']; }],
        ['"listed" allergens with nothing listed', (r) => { r.product.allergens.contains = []; }],
        ['an http image', (r) => { r.product.images[0].url = 'http://images.openfoodfacts.org/x.jpg'; }],
        ['provenance from an unknown source', (r) => { r.provenance.source = 'tesco_api'; }],
        ['a non-UTC import time', (r) => { r.provenance.importedAt = '2026-09-18T07:41:21+01:00'; }],
        ['a price on a product', (r) => { r.product.pricePence = 250; }],
        ['a retailer on a product', (r) => { r.product.retailer = 'tesco'; }],
    ])('rejects %s', (_label, mutate) => {
        expect(rejects(ProductRecordSchema, validProductRecord(), mutate)).toBe(true);
    });
});

describe('PriceObservation', () => {
    it('accepts a well-formed observation', () => {
        expect(PriceObservationSchema.safeParse(validPriceObservation()).success).toBe(true);
    });

    it.each<[string, Mutate]>([
        ['a store belonging to another retailer', (o) => { o.store.retailer = 'asda'; }],
        ['a retailer outside the registry', (o) => { o.retailer = 'b_and_m'; o.store.retailer = 'b_and_m'; }],
        ['an observation date after import', (o) => { o.observedOn = '2026-12-01'; }],
        ['a timestamp as the observation date', (o) => { o.observedOn = '2026-03-14T10:00:00Z'; }],
        ['a missing observation date', (o) => { delete o.observedOn; }],
        ['a fractional price', (o) => { o.offer.pricePence = 249.5; }],
        ['an unknown price condition', (o) => { o.offer.priceCondition = 'member'; }],
        ['a SKU reference for another retailer', (o) => { o.productRef = { kind: 'retailer_sku', retailer: 'morrisons', sku: '1' }; }],
        ['coordinates on a store', (o) => { o.store.lat = 51.5; }],
    ])('rejects %s', (_label, mutate) => {
        expect(rejects(PriceObservationSchema, validPriceObservation(), mutate)).toBe(true);
    });

    it('allows an unknown or independent shop: no retailer, name kept', () => {
        const o = validPriceObservation();
        o.retailer = null;
        o.store = { ...o.store!, retailer: null, name: 'Corner Shop & Off Licence' };
        expect(PriceObservationSchema.safeParse(o).success).toBe(true);
    });
});

describe('OfferData', () => {
    const offer = validPriceObservation().offer;
    it.each<[string, Mutate]>([
        ['a was-price below the price', (o) => { o.wasPricePence = 100; }],
        ['a loyalty promotion above the shelf price', (o) => { o.promotions = [{ type: 'loyalty_price', retailerPromotionId: null, text: null, endsOn: null, scheme: 'clubcard', pricePence: 300 }]; }],
        ['an unparsed promotion with neither text nor code', (o) => { o.promotions = [{ type: 'unparsed', retailerPromotionId: null, text: null, endsOn: null, sourceCode: null }]; }],
        ['a multibuy without a promotion id', (o) => { o.promotions = [{ type: 'multibuy', retailerPromotionId: null, text: 'Buy 2 for £4', endsOn: null, quantity: 2, pricePence: 400 }]; }],
        ['a free-text promotion type', (o) => { o.promotions = [{ type: 'bogof', retailerPromotionId: null, text: 'BOGOF', endsOn: null }]; }],
    ])('rejects %s', (_label, mutate) => {
        expect(rejects(OfferDataSchema, offer, mutate)).toBe(true);
    });
});

describe('ProductReference', () => {
    it.each([
        [{ kind: 'barcode', barcode: '05000000000005' }, 'barcode:05000000000005'],
        [{ kind: 'retailer_sku', retailer: 'morrisons', sku: '112436491' }, 'retailer_sku:morrisons:112436491'],
        [{ kind: 'source_record', source: 'curated', id: 'te0004' }, 'source_record:curated:te0004'],
    ] as const)('%j is valid and has key %s', (ref, key) => {
        expect(ProductReferenceSchema.parse(ref)).toEqual(ref);
        expect(referenceKey(ref)).toBe(key);
    });

    it.each([
        { kind: 'barcode', barcode: '5000000000005' },
        { kind: 'retailer_sku', retailer: 'morrisons' },
        { kind: 'retailer_sku', retailer: 'costco', sku: '1' },
        { kind: 'gtin', value: '05000000000005' },
    ])('rejects %j', (ref) => {
        expect(ProductReferenceSchema.safeParse(ref).success).toBe(false);
    });
});

describe('ProductListing and ReferencePrice', () => {
    const listing = () => ({
        ref: { kind: 'retailer_sku', retailer: 'morrisons', sku: '900000001' },
        retailer: 'morrisons',
        barcode: null,
        url: 'https://groceries.morrisons.com/products/x/900000001',
        retailerCategoryPath: ['Food Cupboard', 'Tomatoes'],
        details: { ...validProductRecord().product, barcode: undefined },
        provenance: { ...validProductRecord().provenance, source: 'morrisons', licence: null, attribution: null },
    });
    it('keeps the retailer breadcrumb on the listing, separate from canonical categories', () => {
        const value: any = listing();
        delete value.details.barcode;
        expect(ProductListingSchema.safeParse(value).success).toBe(true);
    });

    it('rejects a listing whose SKU belongs to another retailer', () => {
        const value: any = listing();
        delete value.details.barcode;
        value.retailer = 'tesco';
        expect(ProductListingSchema.safeParse(value).success).toBe(false);
    });

    it('a representative price is not an observation: it has no date and no store', () => {
        const ref = { productRef: { kind: 'source_record', source: 'curated', id: 'te0004' }, retailer: 'tesco', pricePence: 150, kind: 'representative', provenance: validProductRecord().provenance };
        expect(ReferencePriceSchema.safeParse(ref).success).toBe(true);
        expect(ReferencePriceSchema.safeParse({ ...ref, observedOn: '2023-05-05' }).success).toBe(false);
        expect(PriceObservationSchema.safeParse(ref).success).toBe(false);
    });
});

describe('validate', () => {
    it('reports every issue with its path', () => {
        const bad = structuredClone(validPriceObservation()) as any;
        bad.offer.pricePence = -1;
        bad.channel = 'phone';
        const result = validate(PriceObservationSchema, bad);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.startsWith('channel:'))).toBe(true);
            expect(result.errors.some((e) => e.startsWith('offer.pricePence:'))).toBe(true);
        }
    });
});
