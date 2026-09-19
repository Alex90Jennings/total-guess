import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PriceObservationSchema } from '../../src/contract/index.js';
import { mapCuratedItem } from '../../src/sources/curated/mapItem.js';

const IMPORTED_AT = '2026-09-18T06:41:21Z';
const map = (row: unknown) => mapCuratedItem(row, { importedAt: IMPORTED_AT });

describe('curated catalogue -> ProductListing + ReferencePrice', () => {
    it('maps a legacy item without inventing a barcode, date or details', () => {
        const result = map({ _id: 'te0004', image: 'te0004', description: 'Test Farm Cream of Chicken Soup 4 x 400g', price: 1.8, store: 'tesco' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const { listing, referencePrice } = result.value;
        expect(listing).toMatchObject({
            ref: { kind: 'source_record', source: 'curated', id: 'te0004' },
            retailer: 'tesco',
            barcode: null,
            details: {
                name: 'Test Farm Cream of Chicken Soup 4 x 400g',
                quantity: { kind: 'mass', perPack: 400, packCount: 4, total: 1600 },
                allergens: { status: 'unknown' },
                dietary: { claims: [], inferred: { vegan: 'unknown', vegetarian: 'unknown', by: null } },
                nutrition: null,
                images: [], // legacy photos have no known licence
            },
            provenance: { source: 'curated', sourceRecordId: 'te0004', licence: null },
        });
        expect(referencePrice).toMatchObject({ pricePence: 180, kind: 'representative', retailer: 'tesco' });
        expect(PriceObservationSchema.safeParse(referencePrice).success).toBe(false);
    });

    it('maps legacy store slugs through the retailer registry', () => {
        const result = map({ _id: 'oa0003', description: 'Test Sandwich', price: 3.5, store: 'mands' });
        expect(result.ok && result.value.listing.retailer).toBe('mands');
        expect(result.warnings).toContain('quantity_not_in_name');
    });

    it.each([
        { _id: 'xx0001', description: 'Thing', price: 1, store: 'spar' },
        { _id: 'te0004', description: 'Thing', price: -1, store: 'tesco' },
        { _id: 'TE-4', description: 'Thing', price: 1, store: 'tesco' },
    ])('rejects %j', (row) => {
        expect(map(row).ok).toBe(false);
    });

    it('maps every item in the real curated catalogue', async () => {
        const module = await import(resolve(__dirname, '../../../../src/data/items.js')) as { items: unknown[] };
        const results = module.items.map(map);
        expect(results.filter((r) => !r.ok)).toEqual([]);
        expect(results).toHaveLength(268);
    });
});
