import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import { readProductRecord } from '../../src/db/catalogueRepository.js';
import { importOffRecords, replayOffProducts } from '../../src/ingest/offImport.js';
import { importOpenPrices } from '../../src/ingest/priceAndCuratedImport.js';
import { extractUkRecords } from '../../src/sources/openFoodFacts/dump.js';
import { mapOffProduct } from '../../src/sources/openFoodFacts/mapProduct.js';
import { asJsonLines, offDumpFixture, offDumpRecord } from '../fixtures/offDump.js';
import { count, createTestDb, resetData } from './helpers.js';

const IMPORTED_AT = '2026-09-18T06:39:17Z';
type Json = Record<string, unknown>;

let db: Db;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => { await resetData(db); });

/** Fixture -> extraction (as from the dump) -> trimmed records. */
async function extracted(records: Json[] = offDumpFixture()): Promise<Json[]> {
    const out: Json[] = [];
    await extractUkRecords(asJsonLines(records), (r) => { out.push(r); });
    return out;
}
const importRecords = (records: Json[], options: { maxProducts?: number; batchSize?: number } = {}) =>
    importOffRecords(db, async function* () { yield* records; }, { importedAt: IMPORTED_AT, batchSize: 2, ...options });

const productHashes = async () => (await db.query<{ barcode: string; text_hash: string; content_hash: string; updated_at: Date }>(
    'SELECT barcode, text_hash, content_hash, updated_at FROM product ORDER BY barcode')).rows;

describe('dump extraction', () => {
    it('keeps only UK records and trims them', async () => {
        const records = await extracted();
        expect(records).toHaveLength(offDumpFixture().length - 1); // the French-only record is dropped
        const first = records[0]!;
        expect(first).not.toHaveProperty('ecoscore_data');
        expect(first).not.toHaveProperty('product_name_fr');
        expect(first).not.toHaveProperty('ingredients_text'); // English copy kept instead
        expect(first.nutriments).not.toHaveProperty('vitamin-c_100g');
        expect(first.images).toEqual({
            selected: { front: { en: { imgid: '1', rev: '7' } }, ingredients: { en: { imgid: '2', rev: '9' } } },
            uploaded: { 1: { uploader: 'test-photographer' }, 2: { uploader: 'another-photographer' } },
        });
    });

    it('keeps the newer nutrition schema, trimmed to the nutrients we read', async () => {
        const [trimmed] = await extracted([offDumpRecord({
            nutriments: undefined,
            nutrition: {
                input_sets: [{ big: 'ignored' }],
                aggregated_set: { per: '100g', preparation: 'as_sold', nutrients: {
                    proteins: { value: 8, unit: 'g', source: 'packaging', source_index: 0, value_computed: 8 },
                    cocoa: { value: 17, unit: '%' },
                } },
            },
        })]);
        expect(trimmed!.nutrition).toEqual({ aggregated_set: { per: '100g', preparation: 'as_sold', nutrients: { proteins: { value: 8, unit: 'g', source: 'packaging' } } } });
    });

    it('produces records the mapper reads identically to the full record', async () => {
        const [trimmed] = await extracted([offDumpRecord()]);
        const full = mapOffProduct(offDumpRecord(), { importedAt: IMPORTED_AT });
        const fromTrimmed = mapOffProduct(trimmed, { importedAt: IMPORTED_AT });
        expect(fromTrimmed).toEqual(full);
        expect(fromTrimmed.ok && fromTrimmed.value.product.images[0]).toMatchObject({
            url: 'https://images.openfoodfacts.org/images/products/500/000/000/0005/front_en.7.400.jpg',
            contributor: 'test-photographer', attribution: 'Photo by test-photographer, Open Food Facts',
        });
    });
});

describe('OFF import', () => {
    it('imports Tier A and B products and records why everything else was excluded', async () => {
        const summary = await importRecords(await extracted());
        expect(summary.products).toEqual({ inserted: 4, updated: 0, unchanged: 0, textChanged: 4 });
        // Tiers are counted per record, before duplicate GTINs are resolved (the duplicate is a fourth A).
        expect(summary.candidateStats.tiers).toEqual({ A: 4, B: 1, C: 2 });
        expect(summary.duplicateGtins).toBe(1);
        expect(summary.rejectionsByCode).toEqual({
            not_food: 1, obsolete: 1, invalid_gtin: 1, restricted_gtin: 1, mapper_rejected: 1, duplicate_gtin: 1, tier_c: 2,
        });
        const { rows } = await db.query<{ source_record_id: string; reason_codes: string[] }>(
            `SELECT source_record_id, reason_codes FROM ingestion_rejection WHERE 'tier_c' = ANY(reason_codes) ORDER BY 1`);
        expect(rows).toEqual([
            { source_record_id: '5000000000043', reason_codes: ['tier_c', 'missing_front_image'] },
            { source_record_id: '5000000000050', reason_codes: ['tier_c', 'missing_english_name', 'missing_english_ingredients'] },
        ]);
        const run = (await db.query<{ status: string; stats: { accepted: number } }>('SELECT status, stats FROM ingestion_run')).rows[0];
        expect(run).toMatchObject({ status: 'succeeded', stats: { accepted: 4 } });
    });

    it('keeps the more-scanned record when two codes are the same GTIN', async () => {
        await importRecords(await extracted());
        const { rows } = await db.query<{ source_record_id: string }>(
            `SELECT s.source_record_id FROM product p JOIN source_record s ON s.id = p.record_id WHERE p.barcode = '05000000000005'`);
        expect(rows[0]?.source_record_id).toBe('5000000000005');
    });

    it('respects the cap, preferring Tier A and more-scanned products', async () => {
        const summary = await importRecords(await extracted(), { maxProducts: 2 });
        expect(summary.accepted).toBe(2);
        expect(summary.rejectionsByCode.over_cap).toBe(2);
        const { rows } = await db.query<{ barcode: string }>('SELECT barcode FROM product ORDER BY barcode');
        expect(rows.map((r) => r.barcode)).toEqual(['05000000000005', '05000000000012']); // A with 120 and 300 scans
    });

    it('stores products that read back as valid contract records, equal to the mapper output', async () => {
        const records = await extracted();
        await importRecords(records);
        const stored = await readProductRecord(db, '05000000000012');
        const mapped = mapOffProduct(records.find((r) => r.code === '5000000000012'), { importedAt: IMPORTED_AT });
        expect(stored?.ok).toBe(true);
        expect(stored?.ok && mapped.ok && stored.value).toEqual(mapped.ok && mapped.value);
    });

    it('is idempotent: importing the same data again changes nothing', async () => {
        const records = await extracted();
        await importRecords(records);
        const before = await productHashes();
        const again = await importRecords(records);
        expect(again.products).toEqual({ inserted: 0, updated: 0, unchanged: 4, textChanged: 0 });
        expect(again.sourceRecords).toEqual({ inserted: 0, updated: 0, unchanged: 4 });
        expect(await productHashes()).toEqual(before);
        expect(await count(db, 'product_category')).toBe(16);
        expect(await count(db, 'product_image')).toBe(8);
    });

    it('detects semantic changes separately from other changes', async () => {
        await importRecords(await extracted());
        const before = new Map((await productHashes()).map((r) => [r.barcode, r]));

        const changed = offDumpFixture().map((r) => {
            if (r.code === '5000000000005') return { ...r, ingredients_text_en: 'Beans (52%), Tomatoes (33%), Water, Sugar, Salt' };
            if (r.code === '5000000000012') return { ...r, last_modified_t: 1790000000, unique_scans_n: 999 }; // metadata only
            if (r.code === '5000000000029') return { ...r, images: { ...(r.images as Json), selected: { front: { en: { imgid: '1', rev: '8' } } } } };
            return r;
        });
        const summary = await importRecords(await extracted(changed));
        expect(summary.sourceRecords).toEqual({ inserted: 0, updated: 3, unchanged: 1 });
        expect(summary.products).toEqual({ inserted: 0, updated: 2, unchanged: 2, textChanged: 1 });

        const after = new Map((await productHashes()).map((r) => [r.barcode, r]));
        // Ingredients changed: new text hash.
        expect(after.get('05000000000005')!.text_hash).not.toBe(before.get('05000000000005')!.text_hash);
        // Source timestamp and scan count only: product untouched.
        expect(after.get('05000000000012')).toEqual(before.get('05000000000012'));
        // New image revision: row updated, semantic hash kept (no re-embedding needed).
        expect(after.get('05000000000029')!.content_hash).not.toBe(before.get('05000000000029')!.content_hash);
        expect(after.get('05000000000029')!.text_hash).toBe(before.get('05000000000029')!.text_hash);
    });

    it('is not affected by price observations for its products', async () => {
        await importRecords(await extracted());
        const before = await productHashes();
        await importOpenPrices(db, [{
            importedAt: IMPORTED_AT,
            raw: {
                id: 1, type: 'PRODUCT', product_code: '5000000000005', price: 0.85, currency: 'GBP', date: '2026-03-14',
                location: { id: 9, type: 'OSM', osm_id: 1, osm_type: 'NODE', osm_name: 'Tesco Express', osm_brand: 'Tesco', osm_address_country_code: 'GB' },
                proof: { type: 'RECEIPT' },
            },
        }]);
        expect(await count(db, 'price_observation')).toBe(1);
        expect(await productHashes()).toEqual(before);
    });
});

describe('replay from source records', () => {
    it('rebuilds identical products without the dump', async () => {
        await importRecords(await extracted());
        const before = (await db.query('SELECT barcode, text_hash, content_hash, quality_tier, name FROM product ORDER BY barcode')).rows;
        const categoriesBefore = await count(db, 'product_category');

        await db.exec('DELETE FROM product');
        const replay = await replayOffProducts(db, { batchSize: 3 });
        expect(replay).toMatchObject({ records: 4, rejected: 0, inserted: 4, updated: 0, unchanged: 0 });
        expect((await db.query('SELECT barcode, text_hash, content_hash, quality_tier, name FROM product ORDER BY barcode')).rows).toEqual(before);
        expect(await count(db, 'product_category')).toBe(categoriesBefore);
    });

    it('changes nothing when replayed with the same mapper', async () => {
        await importRecords(await extracted());
        expect(await replayOffProducts(db)).toMatchObject({ records: 4, inserted: 0, updated: 0, unchanged: 4, textChanged: 0 });
    });
});
