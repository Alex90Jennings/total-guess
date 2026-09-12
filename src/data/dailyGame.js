import { items } from './items';

export const ITEMS_PER_GAME = 10;

// The game launched on this date; game #1 was the first day.
const EPOCH = Date.UTC(2023, 4, 5); // 5 May 2023
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC today, which is when the game rolls over. */
export function todayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** ISO date (YYYY-MM-DD) used as the key for "have I played today?". */
export function isoDate(date = todayUtc()) {
    return date.toISOString().slice(0, 10);
}

/** Day number since launch, so the header can keep showing a game number. */
export function gameNumber(date = todayUtc()) {
    return Math.floor((date.getTime() - EPOCH) / DAY_MS) + 1;
}

/**
 * Deterministic shuffle: everyone gets the same basket on the same day, and the
 * order is stable, because the seed is the day number rather than Math.random().
 * Mulberry32 — small, fast, and good enough for picking groceries.
 */
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Ten items for the given day. The pool is walked in a seeded shuffle so a
 * basket never repeats an item, and consecutive days do not overlap until the
 * whole catalogue has been used.
 */
export function getGameForDate(date = todayUtc()) {
    const day = gameNumber(date);
    const cycleLength = Math.floor(items.length / ITEMS_PER_GAME);
    const cycle = Math.floor((day - 1) / cycleLength);
    const indexInCycle = (day - 1) % cycleLength;

    const random = seededRandom(cycle + 1);
    const order = items.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    const start = indexInCycle * ITEMS_PER_GAME;
    const picked = order.slice(start, start + ITEMS_PER_GAME).map((index) => items[index]);

    return {
        _id: `game-${isoDate(date)}`,
        date: date.toISOString(),
        gameMode: 'groceries',
        gameNumber: day,
        items: picked,
    };
}

/** The game everyone is playing right now. */
export function getGameOfTheDay() {
    return getGameForDate(todayUtc());
}
