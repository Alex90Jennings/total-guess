import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import { migrate } from '../../src/db/migrate.js';
import { count, createTestDb, resetData } from './helpers.js';

let db: Db;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => { await resetData(db); });

async function sourceRecord(id = '1', source = 'open_food_facts'): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO source_record (source, source_record_id, imported_at, payload, payload_version, payload_hash, mapper_version)
         VALUES ($1, $2, now(), '{}', 1, repeat('a', 64), 1) RETURNING id`, [source, id]);
    return Number(rows[0]!.id);
}

const PRODUCT = {
    barcode: '05000000000005', name: 'Test', allergen_status: 'unknown', allergens_contains: '{}', allergens_may_contain: '{}',
    allergens_unrecognised: '{}', dietary_claims: '{}', inferred_vegan: 'unknown', inferred_vegetarian: 'unknown',
    quality_tier: 'A', document_version: 2, text_hash: 'a'.repeat(64), content_hash: 'b'.repeat(64),
};

async function insertProduct(overrides: Record<string, unknown> = {}) {
    const row = { ...PRODUCT, record_id: await sourceRecord(String(Math.random())), ...overrides };
    const columns = Object.keys(row);
    await db.query(`INSERT INTO product (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(row));
}

const rejects = async (action: () => Promise<unknown>) => {
    await expect(action()).rejects.toThrow();
};

describe('migrations', () => {
    it('are recorded and re-running them is a no-op', async () => {
        expect(await migrate(db)).toEqual([]);
        const files = readdirSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'db', 'migrations'))
            .filter((f) => f.endsWith('.sql'));
        expect(await count(db, 'schema_migration')).toBe(files.length);
    });

    it('seed sources, retailers and aliases from the registries', async () => {
        expect(await count(db, 'data_source')).toBe(4);
        expect(await count(db, 'retailer')).toBe(10);
        const { rows } = await db.query<{ retailer_id: string }>(`SELECT retailer_id FROM retailer_alias WHERE alias = 'tesco express'`);
        expect(rows[0]?.retailer_id).toBe('tesco');
        const morrisons = await db.query<{ status: string }>(`SELECT status FROM data_source WHERE id = 'morrisons'`);
        expect(morrisons.rows[0]?.status).toBe('disabled');
    });

    it('agree with the TypeScript GTIN rules', async () => {
        const { rows } = await db.query<Record<string, boolean>>(`SELECT
            gtin14_is_valid('05000112637922') AS valid, gtin14_is_valid('05000112637923') AS bad_check,
            gtin14_is_valid('5000112637922') AS thirteen, gtin14_is_restricted('02012345000001') AS restricted`);
        expect(rows[0]).toEqual({ valid: true, bad_check: false, thirteen: false, restricted: true });
    });
});

describe('product constraints', () => {
    it('accepts a minimal valid product', async () => {
        await insertProduct();
        expect(await count(db, 'product')).toBe(1);
    });

    it.each<[string, Record<string, unknown>]>([
        ['a wrong check digit', { barcode: '05000000000006' }],
        ['an in-store barcode', { barcode: '02012345000001' }],
        ['an empty name', { name: '  ' }],
        ['a quantity total that is not perPack x packCount', { quantity_kind: 'mass', quantity_unit: 'g', quantity_per_pack: 400, quantity_pack_count: 4, quantity_total: 400, quantity_raw: '4 x 400g' }],
        ['a unit that does not match the kind', { quantity_kind: 'mass', quantity_unit: 'ml', quantity_per_pack: 400, quantity_pack_count: 1, quantity_total: 400, quantity_raw: '400g' }],
        ['half a quantity', { quantity_kind: 'mass' }],
        ['a weight range with one end missing', { quantity_kind: 'mass', quantity_unit: 'g', quantity_per_pack: 340, quantity_pack_count: 1, quantity_total: 340, quantity_raw: '340 G', quantity_min_g: 200 }],
        ['"listed" allergens with none listed', { allergen_status: 'listed' }],
        ['an allergen outside the UK 14', { allergen_status: 'listed', allergens_contains: '{strawberry}' }],
        ['an inference with nobody making it', { inferred_vegan: 'yes' }],
        ['nutrition values without a basis', { protein_g_100: 5 }],
        ['negative nutrition', { nutrition_per: '100g', salt_g_100: -1 }],
        ['saturates above fat', { nutrition_per: '100g', fat_g_100: 1, saturates_g_100: 2 }],
        ['an unknown dietary claim', { dietary_claims: '{keto}' }],
    ])('rejects %s', async (_label, overrides) => {
        await rejects(() => insertProduct(overrides));
    });

    it('marks only licensed, attributed images as displayable', async () => {
        await insertProduct();
        await db.query(`INSERT INTO product_image (barcode, position, role, url, source, licence, attribution)
            VALUES ('05000000000005', 0, 'front', 'https://x/a.jpg', 'open_food_facts', 'CC-BY-SA', 'Photo: OFF'),
                   ('05000000000005', 1, 'front', 'https://x/b.jpg', 'morrisons', NULL, NULL)`);
        const { rows } = await db.query<{ displayable: boolean }>('SELECT displayable FROM product_image ORDER BY position');
        expect(rows.map((r) => r.displayable)).toEqual([true, false]);
        await rejects(() => db.query(`INSERT INTO product_image (barcode, position, role, url, source) VALUES ('05000000000005', 2, 'front', 'http://x/c.jpg', 'open_food_facts')`));
    });
});

describe('price observation constraints', () => {
    const insertObservation = async (overrides: Record<string, unknown>) => {
        const row = {
            ref_kind: 'barcode', ref_barcode: '05000000000005', channel: 'in_store', price_pence: 250, price_condition: 'none',
            availability: 'unknown', observed_on: '2026-03-14', evidence: 'price_tag', record_id: await sourceRecord(String(Math.random()), 'open_prices'),
            ...overrides,
        };
        const columns = Object.keys(row);
        await db.query(`INSERT INTO price_observation (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(row));
    };

    it('accepts a barcode reference to a product that is not in the corpus', async () => {
        await insertObservation({});
        expect(await count(db, 'price_observation')).toBe(1);
    });

    it.each<[string, Record<string, unknown>]>([
        ['a barcode reference without a barcode', { ref_barcode: null }],
        ['two references at once', { ref_retailer_id: 'tesco', ref_sku: '1' }],
        ['a SKU reference for another retailer', { ref_kind: 'retailer_sku', ref_barcode: null, ref_retailer_id: 'morrisons', ref_sku: '1', retailer_id: 'tesco' }],
        ['a source reference with no id', { ref_kind: 'source_record', ref_barcode: null, ref_source: 'curated' }],
        ['a zero price', { price_pence: 0 }],
        ['a was-price below the price', { was_price_pence: 100 }],
        ['an unknown price condition', { price_condition: 'member' }],
        ['a unit price without its basis', { retailer_unit_price_pence: 113 }],
        ['promotions that are not a list', { promotions: '{}' }],
    ])('rejects %s', async (_label, overrides) => {
        await rejects(() => insertObservation(overrides));
    });

    it('rejects a store that belongs to another retailer', async () => {
        const { rows } = await db.query<{ id: number }>(`INSERT INTO store (source, source_store_id, retailer_id) VALUES ('open_prices', '1', 'asda') RETURNING id`);
        await rejects(() => insertObservation({ retailer_id: 'tesco', store_id: rows[0]!.id }));
        await insertObservation({ retailer_id: 'asda', store_id: rows[0]!.id });
    });

    it('keeps one observation per source record', async () => {
        const recordId = await sourceRecord('dup', 'open_prices');
        await insertObservation({ record_id: recordId });
        await rejects(() => insertObservation({ record_id: recordId }));
    });
});

describe('reference prices and runs', () => {
    it('only allows representative reference prices', async () => {
        const recordId = await sourceRecord('te0004', 'curated');
        await rejects(() => db.query(`INSERT INTO reference_price (ref_kind, ref_source, ref_source_id, price_pence, kind, record_id)
            VALUES ('source_record', 'curated', 'te0004', 150, 'observed', $1)`, [recordId]));
    });

    it('requires a finished run to have a finish time, and a failed run an error', async () => {
        await rejects(() => db.query(`INSERT INTO ingestion_run (source, kind, status) VALUES ('open_prices', 'x', 'succeeded')`));
        await rejects(() => db.query(`INSERT INTO ingestion_run (source, kind, status, finished_at) VALUES ('open_prices', 'x', 'failed', now())`));
    });
});
