import { gameNumber, isoDate } from './dailyGame';

const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const LAUNCH = day(2023, 5, 5);

describe('game numbering', () => {
    test('launch day is game 1', () => {
        expect(gameNumber(LAUNCH)).toBe(1);
    });

    test('advances by one per day', () => {
        expect(gameNumber(day(2023, 5, 6))).toBe(2);
        expect(gameNumber(day(2023, 6, 4))).toBe(31);
    });

    test('does not skip or repeat across a leap day', () => {
        expect(gameNumber(day(2024, 3, 1)) - gameNumber(day(2024, 2, 28))).toBe(2);
    });

    test('the ISO key is the UTC date, not the local one', () => {
        expect(isoDate(day(2024, 1, 1))).toBe('2024-01-01');
    });
});

/*
 * The basket itself is no longer built here.
 *
 * It is generated once per day from the catalogue, frozen in the daily_game
 * table and published as a file, so the browser only fetches it. The
 * guarantees this file used to assert are still tested, in the places that now
 * own them:
 *
 *   ten items, never duplicated within a basket
 *       packages/ingestion/test/game/dailyGame.test.ts, plus a CHECK
 *       constraint on the table itself
 *   the same basket for everybody on a given day
 *       structural: there is one published file per date, and
 *       src/api/dailyGame.test.js proves the app will not substitute another
 *   a different basket each day, stable for that day
 *       packages/ingestion/test/game/dailyGame.test.ts ("is deterministic")
 *   the whole catalogue used before anything repeats
 *       same file ("does not repeat an item until the pool has been used");
 *       measured at 114 days between repeats across two years of games
 *   every item carries what the screen needs
 *       asserted on both sides: in the pool query and in src/api/dailyGame.test.js
 */
