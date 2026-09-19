import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import { HashingEmbedder } from '../../src/embeddings/embedder.js';
import { embedProducts } from '../../src/embeddings/embedProducts.js';
import { importOffRecords } from '../../src/ingest/offImport.js';
import { searchProducts } from '../../src/retrieval/search.js';
import { extractUkRecords } from '../../src/sources/openFoodFacts/dump.js';
import { asJsonLines, offDumpFixture, offDumpRecord } from '../fixtures/offDump.js';
import { count, createTestDb, resetData } from '../db/helpers.js';

const IMPORTED_AT = '2026-09-18T06:39:17Z';
const embedder = new HashingEmbedder(256);
type Json = Record<string, unknown>;

let db: Db;

/** A product whose only spelling is the American "canned", to test terminology normalisation. */
const CANNED_TOMATOES = offDumpRecord({
    code: '5000000000111', product_name: 'Test Farm Canned Chopped Tomatoes', product_name_en: 'Test Farm Canned Chopped Tomatoes',
    categories_hierarchy: ['en:plant-based-foods-and-beverages', 'en:canned-foods', 'en:canned-tomatoes'],
    ingredients_text_en: 'Tomatoes, Tomato Juice, Citric Acid', unique_scans_n: 7,
});

async function importFixture(records: Json[] = [...offDumpFixture(), CANNED_TOMATOES]) {
    const trimmed: Json[] = [];
    await extractUkRecords(asJsonLines(records), (r) => { trimmed.push(r); });
    return importOffRecords(db, async function* () { yield* trimmed; }, { importedAt: IMPORTED_AT, batchSize: 10 });
}

beforeAll(async () => {
    db = await createTestDb();
    await importFixture();
    await embedProducts(db, embedder);
});
afterAll(async () => { await db.close(); });

const barcodes = (hits: { barcode: string }[]) => hits.map((h) => h.barcode);

describe('embedding persistence', () => {
    it('stores one vector per product with its model, dimensions, document version and text hash', async () => {
        const { rows } = await db.query<{ model: string; dimensions: number; document_version: number; text_hash: string; dims: number; barcode: string }>(
            `SELECT e.model, e.dimensions, e.document_version, e.text_hash, vector_dims(e.embedding) AS dims, e.barcode
             FROM product_embedding e JOIN product p USING (barcode) WHERE p.text_hash = e.text_hash ORDER BY e.barcode`);
        expect(rows).toHaveLength(await count(db, 'product'));
        expect(rows[0]).toMatchObject({ model: embedder.id, dimensions: embedder.dimensions, document_version: 2, dims: embedder.dimensions });
    });

    it('records the run that produced them', async () => {
        const { rows } = await db.query<{ n: number }>(
            `SELECT count(*)::int AS n FROM product_embedding e
             JOIN ingestion_run r ON r.id = e.run_id WHERE r.kind = 'embed_products' AND r.status = 'succeeded'`);
        expect(rows[0]!.n).toBe(await count(db, 'product'));
    });

    it('is idempotent: a second run embeds nothing and does not rewrite rows', async () => {
        const before = (await db.query<{ barcode: string; embedded_at: Date }>('SELECT barcode, embedded_at FROM product_embedding ORDER BY barcode')).rows;
        const stats = await embedProducts(db, embedder);
        expect(stats).toMatchObject({ embedded: 0, failed: 0, alreadyFresh: before.length });
        expect((await db.query('SELECT barcode, embedded_at FROM product_embedding ORDER BY barcode')).rows).toEqual(before);
    });

    it('re-embeds only the products whose semantic text changed', async () => {
        const changed = [...offDumpFixture(), CANNED_TOMATOES].map((r) => (r.code === '5000000000005'
            ? { ...r, ingredients_text_en: 'Beans (60%), Tomatoes, Water, Sea Salt' } : r));
        const imported = await importFixture(changed);
        expect(imported.products.textChanged).toBe(1);

        const stats = await embedProducts(db, embedder);
        expect(stats).toMatchObject({ embedded: 1, failed: 0 });
        const { rows } = await db.query<{ n: number }>(
            `SELECT count(*)::int AS n FROM product_embedding e JOIN product p USING (barcode) WHERE e.text_hash <> p.text_hash`);
        expect(rows[0]!.n).toBe(0);
    });

    it('reports a product whose stored text hash does not match its document, instead of embedding it', async () => {
        const original = (await db.query<{ text_hash: string }>(
            `SELECT text_hash FROM product WHERE barcode = '05000000000029'`)).rows[0]!.text_hash;
        await db.query(`UPDATE product SET text_hash = repeat('f', 64) WHERE barcode = '05000000000029'`);
        const stats = await embedProducts(db, embedder);
        expect(stats.embedded).toBe(0);
        expect(stats.failures).toEqual([{ barcode: '05000000000029', reason: 'text_hash_mismatch' }]);
        // Re-importing would not repair this: change detection compares content_hash, which is unaffected
        // by tampering with text_hash. Only the stored hash is wrong, so restore it directly.
        await db.query(`UPDATE product SET text_hash = $1 WHERE barcode = '05000000000029'`, [original]);
        expect((await embedProducts(db, embedder)).embedded).toBe(0);
    });
});

describe('strategies', () => {
    it('vector search returns products with their rank (the test embedder hashes words, so ranking is not semantic)', async () => {
        const hits = await searchProducts(db, { query: 'baked beans in tomato sauce', strategy: 'vector', limit: 5 }, { embedder });
        expect(barcodes(hits)).toContain('05000000000005');
        expect(hits[0]).toMatchObject({ vectorRank: 1, lexicalRank: null });
        expect(hits.map((h) => h.vectorRank)).toEqual([1, 2, 3, 4, 5]);
    });

    it('vector search ignores embeddings that no longer match the product text', async () => {
        await db.query(`UPDATE product_embedding SET text_hash = repeat('a', 64) WHERE barcode = '05000000000005'`);
        const hits = await searchProducts(db, { query: 'baked beans in tomato sauce', strategy: 'vector', limit: 5 }, { embedder });
        expect(barcodes(hits)).not.toContain('05000000000005');
        await embedProducts(db, embedder); // refresh for later tests
        expect(barcodes(await searchProducts(db, { query: 'baked beans', strategy: 'vector', limit: 5 }, { embedder }))).toContain('05000000000005');
    });

    it('hybrid merges both lists and records where each hit came from', async () => {
        const hits = await searchProducts(db, { query: 'baked beans', strategy: 'hybrid', limit: 5 }, { embedder });
        const beans = hits.find((h) => h.barcode === '05000000000005')!;
        expect(beans.lexicalRank).not.toBeNull();
        expect(beans.vectorRank).not.toBeNull();
        expect(hits.some((h) => h.lexicalRank === null || h.vectorRank === null)).toBe(true);
    });

    it('needs an embedder for vector and hybrid, but not for lexical strategies', async () => {
        await expect(searchProducts(db, { query: 'beans', strategy: 'vector' })).rejects.toThrow(/embedder/);
        await expect(searchProducts(db, { query: 'beans', strategy: 'hybrid' })).rejects.toThrow(/embedder/);
        expect(await searchProducts(db, { query: 'beans', strategy: 'fts' })).toBeTruthy();
    });

    it('normalised FTS finds a product the plain query misses', async () => {
        // Nothing in the corpus says "tinned"; the product and its category say "canned".
        expect(await searchProducts(db, { query: 'tinned tomatoes', strategy: 'fts' })).toEqual([]);
        expect(barcodes(await searchProducts(db, { query: 'tinned tomatoes', strategy: 'fts_normalised' }))).toContain('05000000000111');
    });
});

describe('structured filters apply to every strategy', () => {
    const strategies = ['fts', 'fts_normalised', 'vector', 'hybrid'] as const;

    it.each(strategies)('%s honours a nutrition bound and never passes a missing value', async (strategy) => {
        const highProtein = await searchProducts(db, { query: 'chicken', strategy, limit: 10, filters: { minProteinG100: 20 } }, { embedder });
        expect(barcodes(highProtein)).toEqual(['05000000000029']);
        // The dark chocolate has no protein value: it must not match either bound.
        const anyProtein = await searchProducts(db, { query: 'dark chocolate', strategy, limit: 10, filters: { minProteinG100: 0 } }, { embedder });
        expect(barcodes(anyProtein)).not.toContain('05000000000036');
    });

    it.each(strategies)('%s honours dietary claims, and inference only when allowed', async (strategy) => {
        const claimed = await searchProducts(db, { query: 'beans', strategy, limit: 10, filters: { dietary: { vegan: true, policy: 'claims_only' } } }, { embedder });
        expect(barcodes(claimed)).toContain('05000000000005'); // labelled vegan
        const yoghurtByClaim = await searchProducts(db, { query: 'yoghurt', strategy, limit: 10, filters: { dietary: { vegan: true, policy: 'claims_only' } } }, { embedder });
        expect(barcodes(yoghurtByClaim)).not.toContain('05000000000012'); // vegetarian only

        // Chicken is inferred non-vegetarian and claims nothing: excluded under either policy.
        for (const policy of ['claims_only', 'claims_or_inferred'] as const) {
            const veggie = await searchProducts(db, { query: 'chicken', strategy, limit: 10, filters: { dietary: { vegetarian: true, policy } } }, { embedder });
            expect(barcodes(veggie)).not.toContain('05000000000029');
        }
    });

    it.each(strategies)('%s excludes a product that may contain the allergen, and one with no allergen information', async (strategy) => {
        const nutFree = await searchProducts(db, { query: 'chocolate', strategy, limit: 10, filters: { excludeAllergens: ['tree_nuts'] } }, { embedder });
        expect(barcodes(nutFree)).not.toContain('05000000000036'); // "may contain nuts"
        const milkFree = await searchProducts(db, { query: 'yoghurt', strategy, limit: 10, filters: { excludeAllergens: ['milk'] } }, { embedder });
        expect(barcodes(milkFree)).not.toContain('05000000000012'); // contains milk
    });

    it('reports how well allergens are known, so a caller can caveat "none listed"', async () => {
        const hits = await searchProducts(db, { query: 'baked beans', strategy: 'fts', limit: 5 });
        expect(hits[0]!.allergenEvidence).toBe('none_listed');
    });

    it('rejects a filter that is not in the fixed list', async () => {
        await expect(searchProducts(db, { query: 'beans', strategy: 'fts', filters: { minProteinG100: Number.NaN } })).rejects.toThrow();
    });
});
