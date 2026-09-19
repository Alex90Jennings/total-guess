/*
 * Dates and game numbers only.
 *
 * The basket itself is NOT built here. It is generated once per day, frozen in
 * the daily_game table and published, so that every player on a given date gets
 * exactly the same ten items. A second generator in the browser would quietly
 * produce a different basket — a different total, a different score, a
 * different share — whenever it ran, so there isn't one.
 */

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
