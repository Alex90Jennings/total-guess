import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { describePriceObservation } from '../../src/contract/index.js';
import type { Db } from '../../src/db/client.js';
import { readPriceObservation } from '../../src/db/priceRepository.js';
import { importCurated, importOpenPrices } from '../../src/ingest/priceAndCuratedImport.js';
import { count, createTestDb, resetData } from './helpers.js';

const IMPORTED_AT = '2026-09-18T06:41:21Z';
let db: Db;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => { await resetData(db); });

function openPrice(overrides: Record<string, unknown> = {}) {
    return {
        id: 1000001, type: 'PRODUCT', product_code: '5000000000005', price: 2.5, currency: 'GBP',
        price_is_discounted: false, date: '2026-03-14', updated: '2026-03-15T10:00:00.000000Z', owner: 'some-contributor',
        location_id: 42,
        location: {
            id: 42, type: 'OSM', osm_id: 123, osm_type: 'NODE', osm_name: 'Tesco Express', osm_brand: 'Tesco',
            osm_address_postcode: 'TE1 1ST', osm_address_city: 'Testtown', osm_address_country_code: 'GB', osm_lat: 51.5,
        },
        proof: { type: 'PRICE_TAG', owner: 'some-contributor' },
        ...overrides,
    };
}

describe('Open Prices import', () => {
    it('stores historical observations that read back as valid contract objects', async () => {
        const summary = await importOpenPrices(db, [
            { raw: openPrice(), importedAt: IMPORTED_AT },
            { raw: openPrice({ id: 1000002, price: 1.5, price_is_discounted: true, price_without_discount: 2.5, discount_type: 'LOYALTY_PROGRAM' }), importedAt: IMPORTED_AT },
            { raw: openPrice({ id: 1000003, currency: 'EUR' }), importedAt: IMPORTED_AT },
            { raw: openPrice({ id: 1000004, type: 'CATEGORY', product_code: null, category_tag: 'en:apples', price_per: 'KILOGRAM' }), importedAt: IMPORTED_AT },
        ]);
        expect(summary).toMatchObject({ scanned: 4, accepted: 2, inserted: 2, rejected: 2, rejectionsByCode: { not_gbp: 1, no_product_identity: 1 } });

        const shelf = await readPriceObservation(db, '1000001');
        expect(shelf?.ok).toBe(true);
        if (shelf?.ok) expect(describePriceObservation(shelf.value)).toBe('£2.50 — observed at Tesco on 14 March 2026');

        const member = await readPriceObservation(db, '1000002');
        expect(member?.ok && member.value.offer).toMatchObject({ pricePence: 150, priceCondition: 'loyalty_member', wasPricePence: 250 });
        expect(member?.ok && describePriceObservation(member.value)).toBe('£1.50 with a loyalty card — observed at Tesco on 14 March 2026');
        expect(await count(db, 'store')).toBe(1);
    });

    it('never stores the contributor username or coordinates', async () => {
        await importOpenPrices(db, [{ raw: openPrice(), importedAt: IMPORTED_AT }]);
        const { rows } = await db.query<{ payload: unknown }>('SELECT payload FROM source_record');
        const text = JSON.stringify(rows);
        expect(text).not.toContain('some-contributor');
        expect(text).not.toContain('51.5');
    });

    it('is idempotent', async () => {
        const items = [{ raw: openPrice(), importedAt: IMPORTED_AT }];
        await importOpenPrices(db, items);
        const again = await importOpenPrices(db, items);
        expect(again).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 });
        expect(await count(db, 'price_observation')).toBe(1);
    });

    it('updates an observation when its source record changes', async () => {
        await importOpenPrices(db, [{ raw: openPrice(), importedAt: IMPORTED_AT }]);
        await importOpenPrices(db, [{ raw: openPrice({ price: 2.4 }), importedAt: '2026-09-19T06:00:00Z' }]);
        const { rows } = await db.query<{ price_pence: number }>('SELECT price_pence FROM price_observation');
        expect(rows).toEqual([{ price_pence: 240 }]);
    });
});

describe('curated import', () => {
    it('imports the real 268-item catalogue as listings with representative prices, separate from observations', async () => {
        const module = await import(resolve(__dirname, '../../../../src/data/items.js')) as { items: unknown[] };
        const summary = await importCurated(db, module.items, IMPORTED_AT);
        expect(summary).toMatchObject({ scanned: 268, accepted: 268, rejected: 0 });
        expect(await count(db, 'product_listing', `ref_kind = 'source_record' AND ref_source = 'curated'`)).toBe(268);
        expect(await count(db, 'reference_price', `kind = 'representative'`)).toBe(268);
        expect(await count(db, 'price_observation')).toBe(0);
        // No identity was established with any canonical product, and no image is displayable.
        expect(await count(db, 'product_listing', 'barcode IS NOT NULL')).toBe(0);
        expect(await count(db, 'product_listing', `jsonb_array_length(details->'images') > 0`)).toBe(0);

        const again = await importCurated(db, module.items, IMPORTED_AT);
        expect(again).toMatchObject({ inserted: 0, updated: 0, unchanged: 268 });
    });
});
