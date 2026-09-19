/**
 * The daily game: one frozen row per calendar day.
 *
 * Generation copies everything a game needs — name, price, shop, quantity,
 * image, and where each came from — into the row. Play time is a single
 * lookup by date. Nothing joins back to the catalogue, so refreshing products
 * or prices cannot alter a game that already exists, and a broken refresh
 * cannot stop today's game from working.
 *
 * The selection is deterministic and the game number continues the series the
 * original game started in May 2023, so nothing visible to a player changes.
 */
import type { Db } from '../db/client.js';

export const ITEMS_PER_GAME = 10;
/** Game #1 was 5 May 2023. Kept identical to the frontend so numbering is continuous. */
export const EPOCH_UTC = Date.UTC(2023, 4, 5);
const DAY_MS = 24 * 60 * 60 * 1000;

export type GameItem = {
    /** Stable across refreshes: "curated:al0001" or "off:05000000000005". */
    _id: string;
    /** A curated photo code (served from /items/<code>.jpg) or an absolute image URL. */
    image: string;
    description: string;
    quantity: string | null;
    /** Pounds, to the penny — the figure the player is guessing. */
    price: number;
    store: string;
    priceKind: 'representative' | 'observed';
    /** When the price was seen in a shop. Null for the curated representative prices. */
    priceObservedOn: string | null;
    priceSource: string;
    imageLicence: string | null;
    imageAttribution: string | null;
};

export type DailyGame = {
    gameDate: string;
    gameNumber: number;
    items: GameItem[];
    generatedAt: string;
    publishedAt: string | null;
    poolSize: number;
};

export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function utcDay(date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function gameNumber(date: Date): number {
    return Math.floor((utcDay(date).getTime() - EPOCH_UTC) / DAY_MS) + 1;
}

/** Mulberry32, the same generator the frontend uses, so a day's pick is reproducible anywhere. */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffled<T>(values: T[], seed: number): T[] {
    const out = [...values];
    const random = seededRandom(seed);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}

type PoolRow = {
    item_id: string; description: string; quantity: string | null; price_pence: number; store: string;
    image: string; price_kind: GameItem['priceKind']; price_observed_on: Date | string | null;
    price_source: string; image_licence: string | null; image_attribution: string | null;
};

const toItem = (row: PoolRow): GameItem => ({
    _id: row.item_id,
    image: row.image,
    description: row.description,
    quantity: row.quantity,
    price: Math.round(Number(row.price_pence)) / 100,
    store: row.store,
    priceKind: row.price_kind,
    priceObservedOn: row.price_observed_on ? isoDate(new Date(row.price_observed_on)) : null,
    priceSource: row.price_source,
    imageLicence: row.image_licence,
    imageAttribution: row.image_attribution,
});

export async function readPool(db: Db): Promise<GameItem[]> {
    const { rows } = await db.query<PoolRow>(
        `SELECT item_id, description, quantity, price_pence, store, image,
                price_kind, price_observed_on, price_source, image_licence, image_attribution
         FROM eligible_game_item ORDER BY item_id`);
    return rows.map(toItem);
}

/** Items used by the most recent games, so a basket does not repeat until the pool is used up. */
async function recentlyUsed(db: Db, games: number): Promise<Set<string>> {
    const { rows } = await db.query<{ item_id: string }>(
        `SELECT DISTINCT jsonb_array_elements(items) ->> '_id' AS item_id
         FROM (SELECT items FROM daily_game ORDER BY game_date DESC LIMIT $1) recent`, [Math.max(games, 0)]);
    return new Set(rows.map((r) => r.item_id));
}

export type GenerateOptions = {
    /** First day to fill. Defaults to today (UTC). */
    from?: Date;
    /** How many days, inclusive of `from`. A fortnight is enough to absorb a failed refresh. */
    days?: number;
};

export type GenerateResult = {
    created: string[];
    alreadyPresent: string[];
    poolSize: number;
};

/**
 * Fills any missing day in the window. Existing rows are never regenerated:
 * once a day has a game, that game is what it is, which is what makes a
 * catalogue refresh safe.
 */
export async function generateGames(db: Db, options: GenerateOptions = {}): Promise<GenerateResult> {
    const from = utcDay(options.from ?? new Date());
    const days = options.days ?? 14;
    const pool = await readPool(db);
    if (pool.length < ITEMS_PER_GAME) {
        throw new Error(`the eligible pool holds ${pool.length} items; a game needs ${ITEMS_PER_GAME}`);
    }

    const created: string[] = [];
    const alreadyPresent: string[] = [];
    const cycleLength = Math.floor(pool.length / ITEMS_PER_GAME);

    for (let offset = 0; offset < days; offset++) {
        const date = new Date(from.getTime() + offset * DAY_MS);
        const gameDate = isoDate(date);
        const { rows: existing } = await db.query<{ game_date: string }>(
            'SELECT game_date FROM daily_game WHERE game_date = $1', [gameDate]);
        if (existing.length) { alreadyPresent.push(gameDate); continue; }

        // Prefer items this cycle has not used; when the pool is exhausted, start it again.
        const used = await recentlyUsed(db, cycleLength - 1);
        const unused = pool.filter((item) => !used.has(item._id));
        const candidates = unused.length >= ITEMS_PER_GAME ? unused : pool;
        const items = shuffled(candidates, gameNumber(date)).slice(0, ITEMS_PER_GAME);

        await db.query(
            `INSERT INTO daily_game (game_date, game_number, items, pool_size) VALUES ($1, $2, $3, $4)`,
            [gameDate, gameNumber(date), JSON.stringify(items), pool.length]);
        created.push(gameDate);
    }
    return { created, alreadyPresent, poolSize: pool.length };
}

const toGame = (row: { game_date: Date | string; game_number: number; items: GameItem[]; generated_at: Date; published_at: Date | null; pool_size: number }): DailyGame => ({
    gameDate: typeof row.game_date === 'string' ? row.game_date : isoDate(row.game_date),
    gameNumber: row.game_number,
    items: row.items,
    generatedAt: new Date(row.generated_at).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    poolSize: row.pool_size,
});

export async function readGame(db: Db, gameDate: string): Promise<DailyGame | null> {
    const { rows } = await db.query<Parameters<typeof toGame>[0]>(
        'SELECT * FROM daily_game WHERE game_date = $1', [gameDate]);
    return rows[0] ? toGame(rows[0]) : null;
}

export async function readGamesFrom(db: Db, gameDate: string): Promise<DailyGame[]> {
    const { rows } = await db.query<Parameters<typeof toGame>[0]>(
        'SELECT * FROM daily_game WHERE game_date >= $1 ORDER BY game_date', [gameDate]);
    return rows.map(toGame);
}

export async function markPublished(db: Db, gameDate: string, at = new Date()): Promise<void> {
    await db.query('UPDATE daily_game SET published_at = $2 WHERE game_date = $1', [gameDate, at.toISOString()]);
}

export type Readiness = {
    today: DailyGame | null;
    /** Days with a game after today. */
    futureDays: number;
    /** Days published to Appwrite, today included. */
    publishedAhead: number;
    /** The last date that has been published, which is how far ahead the app can actually serve. */
    publishedThrough: string | null;
    /** The last date that has a game at all, published or not. */
    generatedThrough: string | null;
    poolSize: number;
};

/** The operational check: is today ready, and how much runway is there. */
export async function readiness(db: Db, today = utcDay()): Promise<Readiness> {
    const games = await readGamesFrom(db, isoDate(today));
    const published = games.filter((g) => g.publishedAt !== null);
    const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM eligible_game_item');
    return {
        today: games.find((g) => g.gameDate === isoDate(today)) ?? null,
        futureDays: games.filter((g) => g.gameDate > isoDate(today)).length,
        publishedAhead: published.length,
        publishedThrough: published.length ? published[published.length - 1]!.gameDate : null,
        generatedThrough: games.length ? games[games.length - 1]!.gameDate : null,
        poolSize: rows[0]!.n,
    };
}
