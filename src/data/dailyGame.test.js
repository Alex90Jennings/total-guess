import { items } from './items';
import { ITEMS_PER_GAME, gameNumber, getGameForDate, isoDate } from './dailyGame';

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

describe('the daily basket', () => {
    test('always holds exactly ten items', () => {
        for (const d of [LAUNCH, day(2024, 1, 1), day(2025, 7, 14), day(2030, 12, 31)]) {
            expect(getGameForDate(d).items).toHaveLength(ITEMS_PER_GAME);
        }
    });

    test('never repeats an item within a basket', () => {
        for (let offset = 0; offset < 40; offset++) {
            const basket = getGameForDate(new Date(LAUNCH.getTime() + offset * 86400000));
            const ids = basket.items.map(item => item._id);
            expect(new Set(ids).size).toBe(ITEMS_PER_GAME);
        }
    });

    test('everybody gets the same basket on the same day', () => {
        const a = getGameForDate(day(2025, 3, 9)).items.map(i => i._id);
        const b = getGameForDate(day(2025, 3, 9)).items.map(i => i._id);
        expect(a).toEqual(b);
    });

    test('a different day is a different basket', () => {
        const a = getGameForDate(day(2025, 3, 9)).items.map(i => i._id);
        const b = getGameForDate(day(2025, 3, 10)).items.map(i => i._id);
        expect(a).not.toEqual(b);
    });

    test('works through the catalogue before any basket comes round again', () => {
        const cycleLength = Math.floor(items.length / ITEMS_PER_GAME);
        const seen = new Set();

        for (let offset = 0; offset < cycleLength; offset++) {
            for (const item of getGameForDate(new Date(LAUNCH.getTime() + offset * 86400000)).items) {
                seen.add(item._id);
            }
        }

        expect(seen.size).toBe(cycleLength * ITEMS_PER_GAME);
    });

    test('every item carries what the screen needs to render it', () => {
        for (const item of getGameForDate(day(2025, 6, 1)).items) {
            expect(typeof item._id).toBe('string');
            expect(typeof item.description).toBe('string');
            expect(item.description.length).toBeGreaterThan(0);
            expect(Number.isFinite(item.price)).toBe(true);
            expect(item.price).toBeGreaterThan(0);
            expect(typeof item.image).toBe('string');   // the photo filename
            expect(typeof item.store).toBe('string');   // shown beside the product
        }
    });

    test('the id is stable for a given day, so replays are detectable', () => {
        expect(getGameForDate(day(2025, 3, 9))._id).toBe(getGameForDate(day(2025, 3, 9))._id);
        expect(getGameForDate(day(2025, 3, 9))._id).not.toBe(getGameForDate(day(2025, 3, 10))._id);
    });
});
