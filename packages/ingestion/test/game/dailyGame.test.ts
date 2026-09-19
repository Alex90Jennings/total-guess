import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import {
    generateGames, gameNumber, isoDate, markPublished, readGame, readPool, readiness, utcDay,
} from '../../src/game/dailyGame.js';
import { importOffRecords } from '../../src/ingest/offImport.js';
import { extractUkRecords } from '../../src/sources/openFoodFacts/dump.js';
import { asJsonLines, offDumpFixture } from '../fixtures/offDump.js';
import { createTestDb } from '../db/helpers.js';

let db: Db;

/** Enough curated items to build several distinct games. */
async function seedCurated(count: number, priceFrom = 100) {
    for (let i = 0; i < count; i++) {
        const code = `te${String(i).padStart(4, '0')}`;
        const { rows } = await db.query<{ id: string }>(
            `INSERT INTO source_record (source, source_record_id, payload, payload_hash, payload_version, mapper_version, licence, attribution, imported_at)
             VALUES ('curated', $1, '{}'::jsonb, repeat('a', 64), 1, 1, 'internal', 'Total Guess', now())
             ON CONFLICT (source, source_record_id) DO UPDATE SET imported_at = now() RETURNING id`, [code]);
        const recordId = rows[0]!.id;
        await db.query(
            `INSERT INTO product_listing (ref_kind, ref_source, ref_source_id, retailer_id, name, details, record_id)
             VALUES ('source_record', 'curated', $1, 'tesco', $2, $3::jsonb, $4)`,
            [code, `Test Item ${i}`, JSON.stringify({ quantity: { raw: `${100 + i}g` } }), recordId]);
        await db.query(
            `INSERT INTO reference_price (ref_kind, ref_source, ref_source_id, retailer_id, price_pence, kind, record_id)
             VALUES ('source_record', 'curated', $1, 'tesco', $2, 'representative', $3)`,
            [code, priceFrom + i, recordId]);
    }
}

beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });

beforeEach(async () => {
    await db.exec(`TRUNCATE daily_game, reference_price, product_listing, price_observation, product_image,
        product_category, product, source_record, ingestion_run RESTART IDENTITY CASCADE`);
});

describe('the eligible pool', () => {
    it('includes curated items with a representative price and Open Food Facts products with a real one', async () => {
        await seedCurated(3);
        const trimmed: Record<string, unknown>[] = [];
        await extractUkRecords(asJsonLines(offDumpFixture()), (r) => { trimmed.push(r); });
        await importOffRecords(db, async function* () { yield* trimmed; }, { importedAt: '2026-09-18T00:00:00Z', batchSize: 10 });

        const pool = await readPool(db);
        expect(pool.length).toBeGreaterThanOrEqual(3);
        const curated = pool.find((p) => p._id.startsWith('curated:'))!;
        expect(curated).toMatchObject({ store: 'tesco', priceKind: 'representative', priceObservedOn: null });
        expect(curated.price).toBeCloseTo(1.0, 2);
        expect(curated.quantity).toBe('100g');
        // An OFF product without a price observation is not eligible, however good its record.
        expect(pool.every((p) => p.price > 0)).toBe(true);
    });

    it('gives every item everything the game must display', async () => {
        await seedCurated(1);
        const [item] = await readPool(db);
        for (const field of ['_id', 'image', 'description', 'price', 'store'] as const) {
            expect(item![field], field).toBeTruthy();
        }
    });
});

describe('generation', () => {
    beforeEach(async () => { await seedCurated(40); });

    it('fills a rolling window and is idempotent', async () => {
        const first = await generateGames(db, { from: new Date('2026-09-19T00:00:00Z'), days: 14 });
        expect(first.created).toHaveLength(14);
        expect(first.poolSize).toBe(40);

        const second = await generateGames(db, { from: new Date('2026-09-19T00:00:00Z'), days: 14 });
        expect(second.created).toEqual([]);
        expect(second.alreadyPresent).toHaveLength(14);
    });

    it('continues the original game numbering', async () => {
        await generateGames(db, { from: new Date('2023-05-05T00:00:00Z'), days: 1 });
        expect((await readGame(db, '2023-05-05'))!.gameNumber).toBe(1);
        expect(gameNumber(new Date('2023-05-06T12:00:00Z'))).toBe(2);
    });

    it('is deterministic: the same day and pool always give the same ten items', async () => {
        // A future date, because the trigger rightly refuses to delete a game that has been played.
        const future = new Date(utcDay().getTime() + 90 * 86400000);
        const date = isoDate(future);
        await generateGames(db, { from: future, days: 1 });
        const first = await readGame(db, date);
        await db.query('DELETE FROM daily_game WHERE game_date = $1', [date]);
        await generateGames(db, { from: future, days: 1 });
        expect((await readGame(db, date))!.items).toEqual(first!.items);
    });

    it('does not repeat an item until the pool has been used', async () => {
        await generateGames(db, { from: new Date('2026-09-19T00:00:00Z'), days: 4 });
        const used = new Set<string>();
        for (const date of ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']) {
            const game = await readGame(db, date);
            expect(game!.items).toHaveLength(10);
            for (const item of game!.items) {
                expect(used.has(item._id), `${item._id} repeated on ${date}`).toBe(false);
                used.add(item._id);
            }
        }
        expect(used.size).toBe(40);
    });

    it('refuses to build a game from a pool that is too small', async () => {
        await db.exec('TRUNCATE reference_price, product_listing, source_record CASCADE');
        await seedCurated(4);
        await expect(generateGames(db, { days: 1 })).rejects.toThrow(/pool holds 4 items/);
    });
});

describe('a published game never changes', () => {
    beforeEach(async () => { await seedCurated(40); });

    it('rejects an edit to a game whose date has arrived', async () => {
        await generateGames(db, { from: utcDay(), days: 1 });
        const today = isoDate(utcDay());
        await expect(db.query(`UPDATE daily_game SET items = '[]'::jsonb WHERE game_date = $1`, [today]))
            .rejects.toThrow(/cannot be changed/);
        await expect(db.query('DELETE FROM daily_game WHERE game_date = $1', [today]))
            .rejects.toThrow(/cannot be deleted/);
    });

    it('still allows it to be marked as published', async () => {
        await generateGames(db, { from: utcDay(), days: 1 });
        const today = isoDate(utcDay());
        await markPublished(db, today);
        expect((await readGame(db, today))!.publishedAt).not.toBeNull();
    });

    it('survives a catalogue refresh: prices change, played games do not', async () => {
        await generateGames(db, { from: utcDay(), days: 2 });
        const today = isoDate(utcDay());
        const before = (await readGame(db, today))!;

        // The refresh: every price moves, and an item leaves the catalogue entirely.
        await db.query('UPDATE reference_price SET price_pence = price_pence + 500');
        await db.query(`DELETE FROM reference_price WHERE ref_source_id = $1`, [before.items[0]!._id.replace('curated:', '')]);

        const after = await generateGames(db, { from: utcDay(), days: 3 });
        expect(after.created).toHaveLength(1);                       // only the day that had no game
        expect((await readGame(db, today))!.items).toEqual(before.items);  // untouched, including the withdrawn item
        expect(before.items[0]!.image).toBeTruthy();                 // and its image reference survives
    });

    it('uses the refreshed data for days that do not have a game yet', async () => {
        await generateGames(db, { from: utcDay(), days: 1 });
        await db.query('UPDATE reference_price SET price_pence = 999');
        const tomorrow = isoDate(new Date(utcDay().getTime() + 86400000));
        await generateGames(db, { from: utcDay(), days: 2 });
        expect((await readGame(db, tomorrow))!.items.every((i) => i.price === 9.99)).toBe(true);
    });
});

describe('the operational check', () => {
    it('reports today and how many days are ready ahead of it', async () => {
        await seedCurated(40);
        await generateGames(db, { from: utcDay(), days: 5 });
        const state = await readiness(db);
        expect(state.today).not.toBeNull();
        expect(state.futureDays).toBe(4);
        expect(state.publishedAhead).toBe(0);
    });

    it('notices when today has no game', async () => {
        expect((await readiness(db)).today).toBeNull();
    });
});

describe('the readiness report', () => {
    it('reports the runway an operator needs: today, how far published, how far generated, pool size', async () => {
        await seedCurated(40);
        await generateGames(db, { from: utcDay(), days: 5 });
        await markPublished(db, isoDate(utcDay()));

        const state = await readiness(db);
        expect(state.today).not.toBeNull();
        expect(state.futureDays).toBe(4);
        expect(state.publishedThrough).toBe(isoDate(utcDay()));
        expect(state.generatedThrough).toBe(isoDate(new Date(utcDay().getTime() + 4 * 86400000)));
        expect(state.poolSize).toBe(40);
    });

    it('says nothing is published before the first publish', async () => {
        await seedCurated(40);
        await generateGames(db, { from: utcDay(), days: 2 });
        expect(await readiness(db)).toMatchObject({ publishedThrough: null, publishedAhead: 0 });
    });
});
