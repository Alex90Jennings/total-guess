import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import { filterProducts, searchProducts } from '../../src/db/searchRepository.js';
import { importOffRecords } from '../../src/ingest/offImport.js';
import { extractUkRecords } from '../../src/sources/openFoodFacts/dump.js';
import { asJsonLines, offDumpFixture, offDumpRecord } from '../fixtures/offDump.js';
import { createTestDb } from './helpers.js';

let db: Db;
beforeAll(async () => {
    db = await createTestDb();
    const records: Record<string, unknown>[] = [];
    const fixture = [
        ...offDumpFixture(),
        // Mentions chicken only in its ingredients: must rank below a product named chicken.
        offDumpRecord({
            code: '5000000000104', product_name: 'Test Farm Mushroom Soup', product_name_en: 'Test Farm Mushroom Soup',
            ingredients_text_en: 'Water, Mushrooms, Chicken Stock, Cream', unique_scans_n: 5,
            categories_hierarchy: ['en:meals', 'en:soups', 'en:mushroom-soups'],
        }),
    ];
    await extractUkRecords(asJsonLines(fixture), (r) => { records.push(r); });
    await importOffRecords(db, async function* () { yield* records; }, { importedAt: '2026-09-18T06:39:17Z' });
});
afterAll(async () => { await db.close(); });

describe('lexical search', () => {
    it('finds products by name, stemming the query', async () => {
        const hits = await searchProducts(db, 'baked bean');
        expect(hits[0]).toMatchObject({ barcode: '05000000000005', name: 'Test Farm Baked Beans in Tomato Sauce' });
    });

    it('ranks a name match above an ingredient-only match', async () => {
        const hits = await searchProducts(db, 'chicken');
        expect(hits.map((h) => h.barcode)).toEqual(['05000000000029', '05000000000104']);
        expect(hits[0]!.rank).toBeGreaterThan(hits[1]!.rank);
    });

    it('matches canonical categories', async () => {
        expect((await searchProducts(db, 'yogurts')).map((h) => h.barcode)).toContain('05000000000012');
    });

    it('supports web-search syntax: phrases and exclusions', async () => {
        expect((await searchProducts(db, '"dark chocolate"')).map((h) => h.barcode)).toEqual(['05000000000036']);
        expect((await searchProducts(db, 'chicken -soup')).map((h) => h.barcode)).toEqual(['05000000000029']);
    });

    it('filters by tier', async () => {
        expect(await searchProducts(db, 'chocolate', { tiers: ['A'] })).toEqual([]);
        expect(await searchProducts(db, 'chocolate', { tiers: ['B'] })).toHaveLength(1);
    });

    it('returns nothing, not an error, for no match or an empty query', async () => {
        expect(await searchProducts(db, 'caviar')).toEqual([]);
        expect(await searchProducts(db, '')).toEqual([]);
    });
});

describe('numeric nutrition filters', () => {
    it('answers protein >= 20 AND kcal <= 300 deterministically', async () => {
        expect(await filterProducts(db, {
            nutrition: [{ nutrient: 'proteinG', op: '>=', value: 20 }, { nutrient: 'energyKcal', op: '<=', value: 300 }],
        })).toEqual(['05000000000029']);
    });

    it('never matches a product whose value is missing', async () => {
        // The dark chocolate has kcal but no protein, salt or sugars.
        const lowSalt = await filterProducts(db, { nutrition: [{ nutrient: 'saltG', op: '<=', value: 10 }] });
        expect(lowSalt).not.toContain('05000000000036');
        const highSalt = await filterProducts(db, { nutrition: [{ nutrient: 'saltG', op: '>', value: 10 }] });
        expect(highSalt).not.toContain('05000000000036');
    });

    it('combines text, nutrition and category filters', async () => {
        const hits = await searchProducts(db, 'yoghurt', { nutrition: [{ nutrient: 'proteinG', op: '>=', value: 8 }], category: 'en:greek-style-yogurts' });
        expect(hits.map((h) => h.barcode)).toEqual(['05000000000012']);
    });

    it('rejects constraints that are not in the fixed list', async () => {
        await expect(filterProducts(db, { nutrition: [{ nutrient: 'proteinG; DROP TABLE product' as never, op: '>=', value: 1 }] })).rejects.toThrow();
        await expect(filterProducts(db, { nutrition: [{ nutrient: 'proteinG', op: '>=', value: Number.NaN }] })).rejects.toThrow();
    });

    it('uses the nutrient indexes when the planner is told to avoid a sequential scan', async () => {
        await db.exec('SET enable_seqscan = off');
        const { rows } = await db.query<{ 'QUERY PLAN': string }>(
            'EXPLAIN SELECT barcode FROM product WHERE protein_g_100 >= 20 AND energy_kcal_100 <= 300');
        await db.exec('RESET enable_seqscan');
        expect(rows.map((r) => r['QUERY PLAN']).join('\n')).toMatch(/product_(protein|energy)/);
    });
});
