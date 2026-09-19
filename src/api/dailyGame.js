/**
 * Today's game.
 *
 * The game for a date is generated once, frozen and published, so there is
 * exactly one correct answer to "what is today's basket?". This module's only
 * job is to obtain that game — never to invent one.
 *
 * Three ways it can succeed, in order:
 *   1. the published row for today;
 *   2. a copy of that same row cached in this browser from earlier today;
 *   3. it doesn't, and the caller says so honestly.
 *
 * There is deliberately no local generator. Building a basket in the browser
 * would give a different ten items, a different total and a different share
 * from everybody else's, which is a worse failure than showing an error: the
 * player would never know their score was not comparable.
 */
import { isoDate, todayUtc } from '../data/dailyGame';
import { gameUrl, readGameFile } from './gameFile';

/**
 * Published games are static files deployed with the app, so they come from
 * the same CDN as the page itself: if this page loaded, its game will load.
 */
const CACHE_PREFIX = 'tgGame:';

/** The stored row, in the shape the game has always used. */
function toGame(row) {
    const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error('stored game has no items');
    return {
        _id: `game-${row.game_date}`,
        date: `${row.game_date}T00:00:00.000Z`,
        gameMode: 'groceries',
        gameNumber: row.game_number,
        items,
    };
}

/** Keeps today's game only: it is a resilience measure, not a history. */
function cache(today, game) {
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + today) localStorage.removeItem(key);
        }
        localStorage.setItem(CACHE_PREFIX + today, JSON.stringify(game));
    } catch {
        // Private browsing or blocked storage: the game still plays online.
    }
}

function cached(today) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + today);
        if (!raw) return null;
        const game = JSON.parse(raw);
        // Only ever reuse a game stored under this same date.
        return Array.isArray(game?.items) && game.items.length && game._id === `game-${today}` ? game : null;
    } catch {
        return null;
    }
}

/**
 * The published game for a date, or null if it cannot be obtained.
 * Null means "show the player an error", never "make something up".
 */
export async function fetchGameOfTheDay(date = todayUtc()) {
    const today = isoDate(date);

    try {
        const response = await fetch(await gameUrl(today), { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const game = toGame(await readGameFile(today, await response.json()));
        cache(today, game);
        return { ...game, source: 'published' };
    } catch (error) {
        console.warn("could not load today's published game", error?.message ?? error);
    }

    const fromCache = cached(today);
    if (fromCache) return { ...fromCache, source: 'cache' };
    return null;
}
